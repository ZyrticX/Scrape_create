// ========================================
// Web Scraper Pro - Frontend
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const urlInput = document.getElementById('urlInput');
    const maxPagesInput = document.getElementById('maxPages');
    const maxPagesValue = document.getElementById('maxPagesValue');
    const scrapeBtn = document.getElementById('scrapeBtn');
    const progressCard = document.getElementById('progressCard');
    const progressTitle = document.getElementById('progressTitle');
    const progressUrl = document.getElementById('progressUrl');
    const progressFill = document.getElementById('progressFill');
    const progressActions = document.getElementById('progressActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const pagesCount = document.getElementById('pagesCount');
    const resourcesCount = document.getElementById('resourcesCount');
    const statusText = document.getElementById('statusText');
    const sitesList = document.getElementById('sitesList');
    const refreshBtn = document.getElementById('refreshBtn');

    let currentJobId = null;
    let pollInterval = null;

    // ========================================
    // Event Listeners
    // ========================================

    // Update range value display
    maxPagesInput.addEventListener('input', () => {
        maxPagesValue.textContent = maxPagesInput.value;
    });

    // Start scraping
    scrapeBtn.addEventListener('click', startScraping);

    // Enter key to start
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startScraping();
    });

    // Refresh sites list
    refreshBtn.addEventListener('click', loadSites);

    // Download button
    downloadBtn.addEventListener('click', () => {
        if (currentJobId) {
            window.location.href = `/api/download/${currentJobId}`;
        }
    });

    // ========================================
    // Scraping Functions
    // ========================================

    async function startScraping() {
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a URL');
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            showError('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        // Disable button and show progress
        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = '<span class="btn-icon spinner">⚙️</span> Starting...';
        
        progressCard.style.display = 'block';
        progressUrl.textContent = url;
        progressTitle.textContent = 'Starting...';
        progressFill.style.width = '5%';
        progressActions.style.display = 'none';
        pagesCount.textContent = '0';
        resourcesCount.textContent = '0';
        statusText.textContent = 'Starting';
        statusText.className = 'stat-value';

        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    maxPages: parseInt(maxPagesInput.value)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to start scraping');
            }

            currentJobId = data.jobId;
            startPolling();

        } catch (error) {
            showError(error.message);
            resetScrapingUI();
        }
    }

    function startPolling() {
        // Clear any existing interval
        if (pollInterval) clearInterval(pollInterval);

        // Poll every second
        pollInterval = setInterval(pollJobStatus, 1000);
        pollJobStatus(); // Immediate first poll
    }

    async function pollJobStatus() {
        if (!currentJobId) return;

        try {
            const response = await fetch(`/api/jobs/${currentJobId}`);
            const job = await response.json();

            // Update UI
            updateProgressUI(job);

            // Check if job is done
            if (job.status === 'completed' || job.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;

                if (job.status === 'completed') {
                    onScrapingComplete(job);
                } else {
                    onScrapingFailed(job);
                }
            }

        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    function updateProgressUI(job) {
        pagesCount.textContent = job.pagesScraped || 0;
        resourcesCount.textContent = job.resourcesDownloaded || 0;
        
        const statusMap = {
            'starting': 'Starting',
            'scraping': 'Scraping',
            'completed': 'Done!',
            'failed': 'Failed'
        };
        
        statusText.textContent = statusMap[job.status] || job.status;
        statusText.className = `stat-value status-${job.status}`;

        // Update progress bar
        if (job.status === 'scraping') {
            progressTitle.textContent = 'Scraping in Progress';
            // Animate progress based on pages (estimate)
            const progress = Math.min(90, (job.pagesScraped / parseInt(maxPagesInput.value)) * 100);
            progressFill.style.width = `${Math.max(10, progress)}%`;
        } else if (job.status === 'completed') {
            progressFill.style.width = '100%';
        }
    }

    function onScrapingComplete(job) {
        progressTitle.textContent = '✅ Scraping Complete!';
        progressFill.style.width = '100%';
        progressActions.style.display = 'block';
        
        scrapeBtn.disabled = false;
        scrapeBtn.innerHTML = '<span class="btn-icon">🚀</span> Start Scraping';

        // Reload sites list
        loadSites();
    }

    function onScrapingFailed(job) {
        progressTitle.textContent = '❌ Scraping Failed';
        statusText.textContent = job.error || 'Unknown error';
        
        resetScrapingUI();
    }

    function resetScrapingUI() {
        scrapeBtn.disabled = false;
        scrapeBtn.innerHTML = '<span class="btn-icon">🚀</span> Start Scraping';
    }

    function showError(message) {
        alert(message);
    }

    // ========================================
    // Sites List Functions
    // ========================================

    async function loadSites() {
        try {
            sitesList.innerHTML = '<div class="loading">Loading...</div>';
            
            const response = await fetch('/api/sites');
            const sites = await response.json();

            if (sites.length === 0) {
                sitesList.innerHTML = '<div class="empty">No scraped sites yet. Start by scraping a website above!</div>';
                return;
            }

            sitesList.innerHTML = sites.map(site => `
                <div class="site-item" data-folder="${site.folder}">
                    <div class="site-info">
                        <div class="site-domain">${site.domain}</div>
                        <div class="site-meta">
                            <span>📄 ${site.totalPages} pages</span>
                            <span>📦 ${site.totalResources} files</span>
                            <span>🕐 ${formatDate(site.scrapedAt)}</span>
                        </div>
                    </div>
                    <div class="site-actions">
                        ${site.hasZip ? `
                            <button class="btn btn-ghost btn-sm download-site" data-folder="${site.folder}">
                                <span class="btn-icon">📥</span>
                                ZIP
                            </button>
                        ` : ''}
                        <button class="btn btn-ghost btn-sm browse-site" data-folder="${site.folder}">
                            <span class="btn-icon">👁️</span>
                            Browse
                        </button>
                        <button class="btn btn-ghost btn-sm btn-danger delete-site" data-folder="${site.folder}">
                            <span class="btn-icon">🗑️</span>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            document.querySelectorAll('.download-site').forEach(btn => {
                btn.addEventListener('click', () => {
                    const folder = btn.dataset.folder;
                    window.location.href = `/output/${folder}.zip`;
                });
            });

            document.querySelectorAll('.browse-site').forEach(btn => {
                btn.addEventListener('click', () => {
                    const folder = btn.dataset.folder;
                    window.open(`/output/${folder}/index.html`, '_blank');
                });
            });

            document.querySelectorAll('.delete-site').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const folder = btn.dataset.folder;
                    if (confirm('Delete this scraped site?')) {
                        await deleteSite(folder);
                    }
                });
            });

        } catch (error) {
            console.error('Error loading sites:', error);
            sitesList.innerHTML = '<div class="empty">Error loading sites</div>';
        }
    }

    async function deleteSite(folder) {
        try {
            await fetch(`/api/sites/${folder}`, { method: 'DELETE' });
            loadSites();
        } catch (error) {
            alert('Failed to delete site');
        }
    }

    function formatDate(isoDate) {
        const date = new Date(isoDate);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ========================================
    // Initialize
    // ========================================
    
    loadSites();
});
