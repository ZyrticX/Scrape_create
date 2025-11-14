let currentTemplateId = null;
let currentVariantId = null;
let availableSections = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadTemplates();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Template source selection
    document.querySelectorAll('input[name="templateSource"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'existing') {
                document.getElementById('existingTemplate').style.display = 'block';
                document.getElementById('newTemplate').style.display = 'none';
            } else {
                document.getElementById('existingTemplate').style.display = 'none';
                document.getElementById('newTemplate').style.display = 'block';
            }
        });
    });

    // Scrape button
    document.getElementById('scrapeBtn').addEventListener('click', handleScrape);

    // Template selection
    document.getElementById('templateSelect').addEventListener('change', handleTemplateSelect);

    // Preview template button
    document.getElementById('previewTemplateBtn').addEventListener('click', handlePreviewTemplate);

    // Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);

    // Continue to step 3 button
    document.getElementById('continueToStep3Btn').addEventListener('click', handleContinueToStep3);
}

// Load templates
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">בחר Template...</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.title} (${new Date(template.createdAt).toLocaleDateString('he-IL')})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading templates:', error);
        showStatus('scrapeStatus', 'שגיאה בטעינת templates', 'error');
    }
}

// Handle scrape
async function handleScrape() {
    const url = document.getElementById('urlInput').value;
    if (!url) {
        showStatus('scrapeStatus', 'אנא הזן URL', 'error');
        return;
    }

    showStatus('scrapeStatus', 'מבצע scraping...', 'info');
    
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        
        if (data.success) {
            showStatus('scrapeStatus', 'Template נוצר בהצלחה!', 'success');
            currentTemplateId = data.templateId;
            availableSections = data.sections || [];
            
            // Reload templates and select the new one
            await loadTemplates();
            document.getElementById('templateSelect').value = data.templateId;
            
            // Move to step 2
            showStep(2);
            renderSections();
        } else {
            showStatus('scrapeStatus', data.error || 'שגיאה ב-scraping', 'error');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        showStatus('scrapeStatus', 'שגיאה ב-scraping: ' + error.message, 'error');
    }
}

// Handle template selection
async function handleTemplateSelect() {
    const templateId = document.getElementById('templateSelect').value;
    const previewBtn = document.getElementById('previewTemplateBtn');
    const previewContainer = document.getElementById('templatePreviewContainer');
    
    if (!templateId) {
        previewBtn.style.display = 'none';
        previewContainer.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/templates/${templateId}`);
        const template = await response.json();
        
        currentTemplateId = templateId;
        
        // Show preview button
        previewBtn.style.display = 'inline-block';
        
        // Get available sections from template context
        // Try availableSections first, then fallback to sections.bySection keys
        if (template.context && template.context.availableSections) {
            availableSections = template.context.availableSections;
        } else if (template.context && template.context.sections && template.context.sections.bySection) {
            availableSections = Object.keys(template.context.sections.bySection).filter(
                key => template.context.sections.bySection[key] > 0
            );
        } else {
            // Fallback: use default sections
            availableSections = ['header', 'main', 'footer'];
        }
        
        // Show step 2
        showStep(2);
        renderSections();
    } catch (error) {
        console.error('Error loading template:', error);
        showStatus('scrapeStatus', 'שגיאה בטעינת template', 'error');
    }
}

// Handle template preview
async function handlePreviewTemplate() {
    const templateId = document.getElementById('templateSelect').value;
    if (!templateId) return;

    const previewContainer = document.getElementById('templatePreviewContainer');
    const previewFrame = document.getElementById('templatePreviewFrame');

    try {
        const response = await fetch(`/api/templates/${templateId}`);
        const template = await response.json();
        
        // Show preview container
        previewContainer.style.display = 'block';
        
        // Load HTML into iframe
        if (template.originalHtml) {
            previewFrame.srcdoc = template.originalHtml;
        } else {
            previewFrame.srcdoc = '<html><body><p>תצוגה מקדימה לא זמינה</p></body></html>';
        }
    } catch (error) {
        console.error('Error loading template preview:', error);
        previewFrame.srcdoc = '<html><body><p style="color: red;">שגיאה בטעינת תצוגה מקדימה</p></body></html>';
    }
}

// Render sections
function renderSections() {
    const container = document.getElementById('sectionsList');
    container.innerHTML = '';
    
    if (!availableSections || availableSections.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">לא נמצאו sections זמינים. אנא בחר template אחר או צור template חדש.</p>';
        return;
    }
    
    const sectionNames = {
        header: 'Header',
        main: 'תוכן ראשי',
        footer: 'Footer',
        forms: 'טפסים',
        sidebar: 'Sidebar',
        other: 'אחר'
    };
    
    availableSections.forEach(section => {
        const div = document.createElement('div');
        div.className = 'section-checkbox';
        const checkboxId = `section-${section}`;
        div.innerHTML = `
            <input type="checkbox" id="${checkboxId}" value="${section}">
            <label for="${checkboxId}">${sectionNames[section] || section}</label>
        `;
        
        const checkbox = div.querySelector('input');
        
        // Handle checkbox change
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                div.classList.add('checked');
            } else {
                div.classList.remove('checked');
            }
        });
        
        // Handle click on div (toggle checkbox)
        div.addEventListener('click', (e) => {
            // Don't toggle if clicking directly on checkbox (it will toggle itself)
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        container.appendChild(div);
    });
}

// Handle generate
async function handleGenerate() {
    const sections = Array.from(document.querySelectorAll('#sectionsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    if (sections.length === 0) {
        showStatus('generateStatus', 'אנא בחר לפחות section אחד', 'error');
        return;
    }

    const language = document.getElementById('languageSelect').value;
    const country = document.getElementById('countrySelect').value;

    showStatus('generateStatus', 'יוצר ורסיה... זה עשוי לקחת כמה דקות', 'info');
    
    try {
        const response = await fetch('/api/generate-variant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateId: currentTemplateId,
                sections,
                language,
                country: country || null
            })
        });

        const data = await response.json();
        
        if (data.success) {
            currentVariantId = data.variantId;
            showStatus('generateStatus', 'ורסיה נוצרה בהצלחה!', 'success');
            
            // Load and show preview
            await showPreview(data.variantId);
            showStep(4);
        } else {
            showStatus('generateStatus', data.error || 'שגיאה ביצירת ורסיה', 'error');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showStatus('generateStatus', 'שגיאה ביצירת ורסיה: ' + error.message, 'error');
    }
}

// Show preview
async function showPreview(variantId) {
    try {
        const response = await fetch(`/api/variants/${variantId}`);
        const variant = await response.json();
        
        const iframe = document.getElementById('previewFrame');
        iframe.srcdoc = variant.html;
    } catch (error) {
        console.error('Error loading preview:', error);
    }
}

// Handle continue to step 3
function handleContinueToStep3() {
    const selectedSections = Array.from(document.querySelectorAll('#sectionsList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    if (selectedSections.length === 0) {
        showStatus('step2Status', 'אנא בחר לפחות section אחד להמשך', 'error');
        return;
    }
    
    // Hide error if exists
    const statusEl = document.getElementById('step2Status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
    
    // Move to step 3
    showStep(3);
}

// Handle download
function handleDownload() {
    if (!currentVariantId) return;
    
    window.location.href = `/api/variants/${currentVariantId}/download`;
}

// Show step
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach((step, index) => {
        if (index + 1 === stepNumber) {
            step.style.display = 'block';
        } else {
            step.style.display = 'none';
        }
    });
}

// Show status
function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
}


