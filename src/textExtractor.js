import * as cheerio from 'cheerio';

/**
 * Extracts text content from HTML organized by sections with metadata
 * Groups related texts together by section instead of extracting each element separately
 * @param {string} html - The HTML content
 * @param {Object} context - Page context (from contextAnalyzer)
 * @returns {Object} Extracted texts organized by sections
 */
export function extractTextsBySections(html, context) {
    const $ = cheerio.load(html);
    
    const sections = {
        header: [],
        main: [],
        footer: [],
        forms: [],
        sidebar: [],
        other: []
    };
    
    /**
     * Groups texts by section - extracts all text from a section container
     */
    function extractSectionTexts(selector, sectionName) {
        $(selector).each((i, container) => {
            const $container = $(container);
            const texts = [];
            
            // Extract headings
            $container.find('h1, h2, h3, h4, h5, h6').each((j, elem) => {
                const text = $(elem).clone().children().remove().end().text().trim();
                if (text && text.length >= 5) {
                    texts.push({ type: 'heading', text, level: elem.name });
                }
            });
            
            // Extract paragraphs
            $container.find('p').each((j, elem) => {
                const text = $(elem).clone().children().remove().end().text().trim();
                if (text && text.length >= 10) {
                    texts.push({ type: 'paragraph', text });
                }
            });
            
            // Extract buttons and CTAs
            $container.find('button, a.button, a[class*="btn"]').each((j, elem) => {
                const text = $(elem).clone().children().remove().end().text().trim();
                if (text && text.length >= 5) {
                    texts.push({ type: 'button', text });
                }
            });
            
            // Extract list items
            $container.find('li').each((j, elem) => {
                const text = $(elem).clone().children().remove().end().text().trim();
                if (text && text.length >= 10) {
                    texts.push({ type: 'list-item', text });
                }
            });
            
            // Group texts by section if we found meaningful content
            if (texts.length > 0) {
                sections[sectionName].push({
                    section: sectionName,
                    texts: texts,
                    containerId: $container.attr('id') || null,
                    containerClasses: $container.attr('class') || null,
                    context: {
                        pageTopic: context.topic,
                        pagePurpose: context.purpose,
                        writingStyle: context.writingStyle,
                        tone: context.tone
                    }
                });
            }
        });
    }

    /**
     * Determines which section an element belongs to
     */
    function getSection(element) {
        const $elem = $(element);
        const tag = element.name || '';
        const id = $elem.attr('id') || '';
        const classes = $elem.attr('class') || '';
        const parent = $elem.parent();
        const parentTag = parent[0]?.name || '';
        const parentId = parent.attr('id') || '';
        const parentClasses = parent.attr('class') || '';

        // Check for explicit section tags
        if (tag === 'header' || parentTag === 'header' || 
            id.includes('header') || classes.includes('header') ||
            parentId.includes('header') || parentClasses.includes('header')) {
            return 'header';
        }
        
        if (tag === 'footer' || parentTag === 'footer' ||
            id.includes('footer') || classes.includes('footer') ||
            parentId.includes('footer') || parentClasses.includes('footer')) {
            return 'footer';
        }
        
        if (tag === 'form' || parentTag === 'form' ||
            id.includes('form') || classes.includes('form')) {
            return 'forms';
        }
        
        if (tag === 'aside' || parentTag === 'aside' ||
            id.includes('sidebar') || classes.includes('sidebar')) {
            return 'sidebar';
        }
        
        if (tag === 'main' || parentTag === 'main' ||
            tag === 'article' || parentTag === 'article' ||
            tag === 'section' || parentTag === 'section') {
            return 'main';
        }

        // Default to main if in body
        return 'main';
    }

    /**
     * Extracts text from an element with metadata
     */
    function extractTextElement(element, section) {
        const $elem = $(element);
        const tag = element.name || '';
        const text = $elem.clone().children().remove().end().text().trim();
        
        if (!text || text.length < 3) {
            return null;
        }

        // Skip script, style, and other non-content tags
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
            return null;
        }

        // Determine element type
        let elementType = 'text';
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            elementType = 'heading';
        } else if (tag === 'p') {
            elementType = 'paragraph';
        } else if (tag === 'a') {
            elementType = 'link';
        } else if (tag === 'button') {
            elementType = 'button';
        } else if (tag === 'li') {
            elementType = 'list-item';
        }

        // Determine role/importance
        let role = 'content';
        if (elementType === 'heading') {
            role = 'heading';
        } else if (elementType === 'button' || (tag === 'a' && $elem.attr('class')?.includes('button'))) {
            role = 'call-to-action';
        } else if ($elem.attr('class')?.includes('title') || $elem.attr('class')?.includes('headline')) {
            role = 'title';
        }

        return {
            text,
            elementType,
            tag,
            section,
            role,
            id: $elem.attr('id') || null,
            classes: $elem.attr('class') || null,
            context: {
                // Link to page context
                pageTopic: context.topic,
                pagePurpose: context.purpose,
                writingStyle: context.writingStyle,
                tone: context.tone
            }
        };
    }

    // Extract texts by section containers (smarter grouping)
    // Header section
    extractSectionTexts('header, [role="banner"], #header, .header, [class*="header"]', 'header');
    
    // Main content sections - look for semantic containers
    extractSectionTexts('main, [role="main"], #main, .main, article, section:not(footer):not(header)', 'main');
    
    // Footer section
    extractSectionTexts('footer, [role="contentinfo"], #footer, .footer, [class*="footer"]', 'footer');
    
    // Sidebar
    extractSectionTexts('aside, [role="complementary"], #sidebar, .sidebar, [class*="sidebar"]', 'sidebar');
    
    // Forms
    extractSectionTexts('form, .form, [class*="form"]', 'forms');
    
    // If no sections found with containers, fall back to element-by-element extraction
    const hasSections = Object.values(sections).some(arr => Array.isArray(arr) && arr.length > 0);
    if (!hasSections) {
        console.log('No section containers found, falling back to element-by-element extraction');
        
        // Extract texts from different sections
        $('body').find('h1, h2, h3, h4, h5, h6, p, a, button, li').each((i, elem) => {
            const section = getSection(elem);
            const textElement = extractTextElement(elem, section);
            
            if (textElement && textElement.text && typeof textElement.text === 'string' && textElement.text.length > 0) {
                if (!sections[section]) {
                    sections[section] = [];
                }
                sections[section].push(textElement);
            }
        });
    }

    // Also extract form labels and placeholders
    $('form').each((i, form) => {
        const $form = $(form);
        $form.find('label, input[placeholder], textarea[placeholder]').each((j, elem) => {
            const $elem = $(elem);
            const text = $elem.text().trim() || $elem.attr('placeholder') || '';
            
            if (text.length > 0) {
                sections.forms.push({
                    text,
                    elementType: elem.name === 'label' ? 'label' : 'placeholder',
                    tag: elem.name || 'label',
                    section: 'forms',
                    role: 'form-element',
                    id: $elem.attr('id') || null,
                    classes: $elem.attr('class') || null,
                    context: {
                        pageTopic: context.topic,
                        pagePurpose: context.purpose,
                        writingStyle: context.writingStyle,
                        tone: context.tone
                    }
                });
            }
        });
    });

    // Filter out duplicates and very short texts
    Object.keys(sections).forEach(sectionKey => {
        if (!sections[sectionKey] || !Array.isArray(sections[sectionKey])) {
            sections[sectionKey] = [];
            return;
        }
        
        sections[sectionKey] = sections[sectionKey]
            .filter(item => item && item.text && typeof item.text === 'string') // Safety check
            .filter((item, index, self) => 
                index === self.findIndex(t => t && t.text && t.text === item.text)
            )
            .filter(item => item.text.length >= 10) // Increased minimum length from 5 to 10 characters
            .filter(item => {
                // Skip very common/generic texts that don't need translation
                const lowerText = item.text.toLowerCase();
                const skipPatterns = [
                    'click here', 'read more', 'learn more', 'view more',
                    'cookie', 'privacy', 'terms', 'copyright',
                    'menu', 'navigation', 'skip to', 'back to top'
                ];
                return !skipPatterns.some(pattern => lowerText.includes(pattern));
            });
    });

    return {
        sections,
        summary: {
            totalTexts: Object.values(sections).reduce((sum, arr) => {
                return sum + (Array.isArray(arr) ? arr.length : 0);
            }, 0),
            bySection: Object.keys(sections).reduce((acc, key) => {
                acc[key] = Array.isArray(sections[key]) ? sections[key].length : 0;
                return acc;
            }, {}),
            byType: {}
        }
    };
}

/**
 * Gets texts for specific sections
 * Groups texts by section container for smarter processing
 * @param {Object} extractedTexts - Result from extractTextsBySections
 * @param {Array<string>} sectionNames - Array of section names to include
 * @returns {Array} Filtered texts grouped by section
 */
export function getTextsForSections(extractedTexts, sectionNames) {
    const result = [];
    
    // Safety check
    if (!extractedTexts || !extractedTexts.sections) {
        console.warn('extractedTexts.sections is undefined or null');
        return result;
    }
    
    sectionNames.forEach(sectionName => {
        const sectionData = extractedTexts.sections[sectionName];
        
        if (!sectionData || !Array.isArray(sectionData)) {
            return; // Skip if section doesn't exist or is not an array
        }
        
        // If section data contains grouped texts (from extractSectionTexts)
        if (sectionData.length > 0 && sectionData[0] && sectionData[0].texts && Array.isArray(sectionData[0].texts)) {
            // Grouped format - each item is a container with multiple texts
            sectionData.forEach(container => {
                if (!container || !container.texts || !Array.isArray(container.texts)) {
                    return; // Skip invalid containers
                }
                
                // Combine all texts from this container into one item
                const combinedText = container.texts
                    .filter(t => t && t.text) // Filter out invalid text objects
                    .map(t => {
                        if (t.type === 'heading') return `**${t.text}**`;
                        if (t.type === 'button') return `[${t.text}]`;
                        if (t.type === 'list-item') return `• ${t.text}`;
                        return t.text;
                    })
                    .join('\n\n');
                
                if (combinedText.trim().length > 0) {
                    result.push({
                        text: combinedText,
                        section: sectionName,
                        elementType: 'section-group',
                        role: 'content',
                        texts: container.texts, // Keep original structure for replacement
                        containerId: container.containerId || null,
                        containerClasses: container.containerClasses || null,
                        context: container.context || {}
                    });
                }
            });
        } else {
            // Old format - individual elements
            result.push(...sectionData.filter(item => item && item.text));
        }
    });
    
    return result;
}


