let currentTemplateId = null;
let availableTextModels = [];
let availableImageModels = [];
let multiFileModels = [];
let imageGenerationModels = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkSystemStatus();
    await loadTemplates();
    await loadModels();
    setupEventListeners();
});

// Check system status
async function checkSystemStatus() {
    const statusContent = document.getElementById('statusContent');
    
    try {
        const response = await fetch('/api/health');
        const health = await response.json();
        
        const statusHTML = `
            <div class="status-item">
                <div class="status-indicator ${health.server === 'running' ? 'success' : 'error'}"></div>
                <div class="status-label">Server Status:</div>
                <div class="status-value">${health.server === 'running' ? '✅ Running' : '❌ Offline'}</div>
            </div>
            
            <div class="status-item">
                <div class="status-indicator ${health.envFileLoaded ? 'success' : 'error'}"></div>
                <div class="status-label">.env File:</div>
                <div class="status-value">${health.envFileLoaded ? '✅ Loaded' : '❌ Not Loaded - Check PM2 configuration'}</div>
            </div>
            
            <div class="status-item">
                <div class="status-indicator ${health.apiKey === 'configured' ? 'success' : 'error'}"></div>
                <div class="status-label">API Key:</div>
                <div class="status-value">
                    ${health.apiKey === 'configured' ? 
                        `✅ Configured (${health.apiKeyPrefix || 'hidden'})` : 
                        '❌ Missing - Please add OPENROUTER_API_KEY to .env'}
                </div>
            </div>
            
            <div class="status-item">
                <div class="status-indicator ${health.apiKeyValid ? 'success' : health.apiKey === 'configured' ? 'error' : 'warning'}"></div>
                <div class="status-label">OpenRouter API:</div>
                <div class="status-value">
                    ${health.apiKeyValid ? '✅ Connected & Valid (Test successful)' : 
                      health.openRouter === 'error' ? '❌ Connection Failed: ' + (health.error || 'Unknown error') :
                      health.openRouter === 'no-key' ? '⚠️ API Key not configured' :
                      '❌ Invalid API Key'}
                </div>
            </div>
            
            <div class="status-item">
                <div class="status-indicator success"></div>
                <div class="status-label">Last Check:</div>
                <div class="status-value">${new Date(health.timestamp).toLocaleString()}</div>
            </div>
        `;
        
        statusContent.innerHTML = statusHTML;
        
        // Update panel color based on overall status
        const panel = document.getElementById('statusPanel');
        if (health.apiKeyValid) {
            panel.style.borderLeftColor = '#28a745';
        } else if (health.apiKey === 'configured') {
            panel.style.borderLeftColor = '#dc3545';
        } else {
            panel.style.borderLeftColor = '#ffc107';
        }
        
    } catch (error) {
        statusContent.innerHTML = `
            <div class="status-item">
                <div class="status-indicator error"></div>
                <div class="status-label">Error:</div>
                <div class="status-value">❌ Failed to check system status: ${error.message}</div>
            </div>
        `;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshStatusBtn').addEventListener('click', checkSystemStatus);
    document.getElementById('templateSelect').addEventListener('change', handleTemplateSelect);
    document.getElementById('previewTemplateBtn').addEventListener('click', handlePreviewTemplate);
    document.getElementById('downloadTemplateBtn').addEventListener('click', handleDownloadTemplate);
    document.getElementById('viewOriginalBtn').addEventListener('click', handleViewOriginal);
    document.getElementById('viewFilesBtn').addEventListener('click', handleViewFiles);
    document.getElementById('scrapeBtn').addEventListener('click', handleScrape);
    document.getElementById('numVariants').addEventListener('input', (e) => {
        document.getElementById('numVariantsValue').textContent = e.target.value;
    });
    document.getElementById('generateImagesCheck').addEventListener('change', (e) => {
        document.getElementById('imageModelGroup').style.display = e.target.checked ? 'block' : 'none';
    });
    // NEW: Multi-File Cursor event listeners
    document.getElementById('methodSelect').addEventListener('change', handleMethodChange);
    document.getElementById('multiGenerateImagesCheck').addEventListener('change', handleMultiImageCheckChange);
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);
}

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">Select template...</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.title} (${new Date(template.createdAt).toLocaleDateString()})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading templates:', error);
        showStatus('scrapeStatus', 'Error loading templates', 'error');
    }
}

// Load models from OpenRouter
async function loadModels() {
    try {
        // Load text models
        const textResponse = await fetch('/api/models/text');
        availableTextModels = await textResponse.json();
        
        const textSelect = document.getElementById('textModelSelect');
        textSelect.innerHTML = '<option value="">Auto (try multiple models)</option>';
        
        // Add top models first
        const topModels = availableTextModels.filter(m => 
            m.id.includes('qwen3') || m.id.includes('claude-3.5') || m.id.includes('gpt-4')
        ).slice(0, 15);
        
        topModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            textSelect.appendChild(option);
        });

        // Load image models
        const imageResponse = await fetch('/api/models/image');
        availableImageModels = await imageResponse.json();
        
        const imageSelect = document.getElementById('imageModelSelect');
        imageSelect.innerHTML = '<option value="">Auto (try multiple models)</option>';
        
        availableImageModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            imageSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Handle template selection
async function handleTemplateSelect() {
    const templateId = document.getElementById('templateSelect').value;
    const templateActions = document.getElementById('templateActions');
    const filesContainer = document.getElementById('templateFilesContainer');
    
    if (!templateId) {
        templateActions.style.display = 'none';
        filesContainer.style.display = 'none';
        document.getElementById('settingsSection').style.display = 'none';
        return;
    }

    currentTemplateId = templateId;
    templateActions.style.display = 'flex';
    filesContainer.style.display = 'none'; // Hide until "Access Files" is clicked
    document.getElementById('settingsSection').style.display = 'block';
    
    // Update file links
    updateFileLinks(templateId);
}

// Update file links for the selected template
function updateFileLinks(templateId) {
    document.getElementById('originalHtmlLink').href = `/api/templates/${templateId}/file/original.html`;
    document.getElementById('templateJsonLink').href = `/api/templates/${templateId}/file/template.json`;
    document.getElementById('contextJsonLink').href = `/api/templates/${templateId}/file/context.json`;
}

// Handle template preview
async function handlePreviewTemplate() {
    if (!currentTemplateId) return;

    const previewContainer = document.getElementById('templatePreviewContainer');
    const previewFrame = document.getElementById('templatePreviewFrame');

    try {
        const response = await fetch(`/api/templates/${currentTemplateId}`);
        const template = await response.json();
        
        previewContainer.style.display = 'block';
        
        if (template.originalHtml) {
            previewFrame.srcdoc = template.originalHtml;
        } else {
            previewFrame.srcdoc = '<html><body><p>Preview not available</p></body></html>';
        }
    } catch (error) {
        console.error('Error loading template preview:', error);
        previewFrame.srcdoc = '<html><body><p style="color: red;">Error loading preview</p></body></html>';
    }
}

// Handle template download
async function handleDownloadTemplate() {
    if (!currentTemplateId) return;

    const downloadBtn = document.getElementById('downloadTemplateBtn');
    const originalText = downloadBtn.textContent;
    
    try {
        downloadBtn.textContent = 'Preparing Download...';
        downloadBtn.disabled = true;

        // Trigger download
        window.location.href = `/api/templates/${currentTemplateId}/download`;
        
        // Reset button after a short delay
        setTimeout(() => {
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Error downloading template:', error);
        alert('Error downloading template: ' + error.message);
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    }
}

// Handle view original HTML
async function handleViewOriginal() {
    if (!currentTemplateId) return;
    
    window.open(`/api/templates/${currentTemplateId}/view`, '_blank');
}

// Handle view files
function handleViewFiles() {
    const filesContainer = document.getElementById('templateFilesContainer');
    if (filesContainer.style.display === 'none' || !filesContainer.style.display) {
        filesContainer.style.display = 'block';
    } else {
        filesContainer.style.display = 'none';
    }
}

// Handle scrape
async function handleScrape() {
    const url = document.getElementById('urlInput').value;
    if (!url) {
        showStatus('scrapeStatus', 'Please enter a URL', 'error');
        return;
    }

    showStatus('scrapeStatus', 'Scraping page...', 'info');
    
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        if (data.success) {
            showStatus('scrapeStatus', 'Template created successfully!', 'success');
            currentTemplateId = data.templateId;
            
            await loadTemplates();
            document.getElementById('templateSelect').value = data.templateId;
            document.getElementById('settingsSection').style.display = 'block';
        } else {
            showStatus('scrapeStatus', data.error || 'Scraping error', 'error');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        showStatus('scrapeStatus', 'Scraping error: ' + error.message, 'error');
    }
}

// Handle generate
async function handleGenerate() {
    // NEW: Route to appropriate method
    const method = document.getElementById('methodSelect').value;
    if (method === 'multi') {
        return await handleGenerateMulti();
    }

    // EXISTING: Simple method continues below
    if (!currentTemplateId) {
        showStatus('generateStatus', 'Please select a template first', 'error');
        return;
    }

    const numVariants = parseInt(document.getElementById('numVariants').value);
    const language = document.getElementById('languageSelect').value;
    const country = document.getElementById('countrySelect').value;
    const textModel = document.getElementById('textModelSelect').value || null;
    const generateImages = document.getElementById('generateImagesCheck').checked;
    const imageModel = generateImages ? (document.getElementById('imageModelSelect').value || null) : null;

    showProgress(true, 0, `Generating ${numVariants} variant(s)...`);
    
    const variants = [];
    
    for (let i = 0; i < numVariants; i++) {
        try {
            updateProgress((i / numVariants) * 100, `Generating variant ${i + 1}/${numVariants}...`);
            
            const response = await fetch('/api/generate-variant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: currentTemplateId,
                    language,
                    country,
                    textModel,
                    imageModel,
                    generateImages
                })
            });

            const data = await response.json();
            
            if (data.success) {
                variants.push(data);
            } else {
                console.error(`Error generating variant ${i + 1}:`, data.error);
            }
        } catch (error) {
            console.error(`Error generating variant ${i + 1}:`, error);
        }
    }

    updateProgress(100, `Completed! Generated ${variants.length}/${numVariants} variant(s)`);
    
    setTimeout(() => {
        showProgress(false);
        displayResults(variants);
    }, 1000);
}

// Display results
function displayResults(variants) {
    document.getElementById('resultsSection').style.display = 'block';
    const container = document.getElementById('variantsList');
    container.innerHTML = '';

    variants.forEach((variant, index) => {
        const div = document.createElement('div');
        div.className = 'variant-card';
        div.innerHTML = `
            <h3>Variant ${index + 1}</h3>
            <p><strong>Language:</strong> ${variant.metadata.targetLanguage}</p>
            <p><strong>Country:</strong> ${variant.metadata.targetCountry}</p>
            <p><strong>Model:</strong> ${variant.metadata.textModel}</p>
            <p><strong>API Calls:</strong> ${variant.metadata.apiCalls}</p>
            <p><strong>Modified Elements:</strong> ${variant.metadata.elementsModified}</p>
            <p><strong>Comments:</strong> ${variant.metadata.commentsModified}</p>
            <div style="margin-top: 15px;">
                <button class="btn btn-primary" onclick="previewVariant('${variant.variantId}')">Preview</button>
                <button class="btn btn-success" onclick="downloadVariant('${variant.variantId}')">Download ZIP</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Preview variant
window.previewVariant = async function(variantId) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:white;width:90%;height:90%;border-radius:10px;padding:20px;position:relative;">
            <button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:10px;right:10px;padding:10px 20px;background:#dc3545;color:white;border:none;border-radius:5px;cursor:pointer;">Close</button>
            <iframe id="previewFrame" style="width:100%;height:calc(100% - 50px);border:1px solid #ccc;margin-top:30px;"></iframe>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        const response = await fetch(`/api/variants/${variantId}`);
        const variant = await response.json();
        document.getElementById('previewFrame').srcdoc = variant.html;
    } catch (error) {
        console.error('Error loading preview:', error);
    }
};

// Download variant
window.downloadVariant = function(variantId) {
    window.location.href = `/api/variants/${variantId}/download`;
};

// Show/hide progress
function showProgress(show, percent = 0, text = '') {
    const container = document.getElementById('progressContainer');
    container.style.display = show ? 'block' : 'none';
    if (show) {
        updateProgress(percent, text);
    }
}

// Update progress
function updateProgress(percent, text) {
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = text;
}

// Show status
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
}

// ========================================
// Multi-File Cursor Functions (NEW)
// ========================================

// Load multi-file models
async function loadMultiFileModels() {
    try {
        const response = await fetch('/api/models/multi-file');
        multiFileModels = await response.json();

        const select = document.getElementById('multiModelSelect');
        select.innerHTML = multiFileModels.map(model => `
            <option value="${model.id}" ${model.recommended ? 'selected' : ''}>
                ${model.name}
            </option>
        `).join('');
    } catch (error) {
        console.error('Error loading multi-file models:', error);
    }
}

// Load image generation models
async function loadImageGenerationModels() {
    try {
        const response = await fetch('/api/models/image-generation');
        imageGenerationModels = await response.json();

        const select = document.getElementById('multiImageModelSelect');
        select.innerHTML = imageGenerationModels.map(model => `
            <option value="${model.id}" ${model.recommended ? 'selected' : ''}>
                ${model.name}
            </option>
        `).join('');
    } catch (error) {
        console.error('Error loading image models:', error);
    }
}

// Handle method selection change
function handleMethodChange() {
    const method = document.getElementById('methodSelect').value;
    const simpleOptions = document.getElementById('simpleMethodOptions');
    const multiOptions = document.getElementById('multiFileOptions');

    if (method === 'multi') {
        simpleOptions.style.display = 'none';
        multiOptions.style.display = 'block';
        loadMultiFileModels();
        loadImageGenerationModels();
    } else {
        simpleOptions.style.display = 'block';
        multiOptions.style.display = 'none';
    }
}

// Handle image generation checkbox for multi-file
function handleMultiImageCheckChange() {
    const checked = document.getElementById('multiGenerateImagesCheck').checked;
    document.getElementById('multiImageModelGroup').style.display = 
        checked ? 'block' : 'none';
}

// Generate variant with Multi-File Cursor
async function handleGenerateMulti() {
    const templateId = document.getElementById('templateSelect').value;
    const targetLanguage = document.getElementById('targetLanguage').value;
    const targetCountry = document.getElementById('targetCountry').value;
    const model = document.getElementById('multiModelSelect').value;
    const generateImages = document.getElementById('multiGenerateImagesCheck').checked;
    const imageModel = generateImages ? document.getElementById('multiImageModelSelect').value : null;
    const numVariants = parseInt(document.getElementById('numVariants').value);

    if (!templateId) {
        showStatus('generateStatus', 'Please select a template', 'error');
        return;
    }

    showProgress(true, 0, 'Initializing Multi-File Cursor...');
    document.getElementById('generateBtn').disabled = true;

    const results = [];
    const errors = [];

    for (let i = 1; i <= numVariants; i++) {
        try {
            showProgress(true, (i - 1) / numVariants * 100, 
                `Generating variant ${i}/${numVariants} with Multi-File Cursor...`);

            const response = await fetch('/api/generate-variant-multi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId,
                    targetLanguage,
                    targetCountry,
                    writingStyle: 'professional and friendly',
                    targetAudience: 'general users',
                    model,
                    generateImages,
                    imageModel
                })
            });

            const result = await response.json();

            if (result.success) {
                results.push(result);
                console.log(`✅ Variant ${i} created:`, result.variantId);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error(`Error generating variant ${i}:`, error);
            errors.push(`Variant ${i}: ${error.message}`);
        }
    }

    showProgress(true, 100, 'Complete!');
    document.getElementById('generateBtn').disabled = false;

    if (results.length > 0) {
        showStatus('generateStatus', 
            `✅ Created ${results.length} variant(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`, 
            'success');
        await loadVariants();
    } else {
        showStatus('generateStatus', `❌ All variants failed: ${errors.join('; ')}`, 'error');
    }

    setTimeout(() => showProgress(false), 2000);
}

