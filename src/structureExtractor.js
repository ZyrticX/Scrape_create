import * as cheerio from 'cheerio';

/**
 * Extracts the DOM structure from HTML and converts it to a JSON template
 * with placeholders for dynamic content
 * @param {string} html - The HTML content to extract structure from
 * @param {string} url - The original URL
 * @param {string} title - The page title
 * @returns {Object} JSON template structure
 */
export function extractStructure(html, url, title) {
    const $ = cheerio.load(html);
    
    // Attributes to preserve
    const importantAttributes = ['class', 'id', 'data-*', 'role', 'aria-*', 'href', 'src', 'alt', 'type', 'name'];
    
    /**
     * Recursively extract element structure
     * @param {cheerio.Cheerio} element - Cheerio element
     * @param {number} depth - Current depth in the tree
     * @returns {Object|null} Element structure object
     */
    function extractElement(element, depth = 0) {
        // Skip script, style, and other non-content tags
        const tagName = element[0]?.name;
        if (!tagName || ['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) {
            return null;
        }

        const result = {
            tag: tagName,
        };

        // Extract important attributes
        const attrs = {};
        element[0]?.attribs && Object.keys(element[0].attribs).forEach(attr => {
            // Include class, id, and data-* attributes
            if (attr === 'class' || attr === 'id' || attr.startsWith('data-') || 
                attr.startsWith('aria-') || attr === 'role' || attr === 'href' || 
                attr === 'src' || attr === 'alt' || attr === 'type' || attr === 'name') {
                attrs[attr] = element.attr(attr);
            }
        });

        if (Object.keys(attrs).length > 0) {
            result.attributes = attrs;
        }

        // Extract text content
        const children = element.children();
        const textNodes = [];
        const elementChildren = [];

        children.each((i, child) => {
            if (child.type === 'text') {
                const text = child.data ? child.data.trim() : '';
                if (text) {
                    textNodes.push(text);
                }
            } else if (child.type === 'tag') {
                const childElement = extractElement($(child), depth + 1);
                if (childElement) {
                    elementChildren.push(childElement);
                }
            }
        });

        // Combine text nodes
        const combinedText = textNodes.join(' ').trim();
        
        // If there's text and no element children, this is a text node
        if (combinedText && elementChildren.length === 0) {
            // Check if this looks like dynamic content (not just whitespace/punctuation)
            if (isDynamicContent(combinedText)) {
                result.text = `{{${generatePlaceholderName(element, combinedText)}}}`;
                result.type = 'text';
            } else {
                result.text = combinedText;
                result.type = 'static';
            }
        } else if (combinedText && elementChildren.length > 0) {
            // Has both text and children - text might be dynamic
            if (isDynamicContent(combinedText)) {
                result.text = `{{${generatePlaceholderName(element, combinedText)}}}`;
            } else {
                result.text = combinedText;
            }
            result.children = elementChildren;
        } else if (elementChildren.length > 0) {
            // Only has element children
            result.children = elementChildren;
        } else if (tagName === 'img' && attrs.src) {
            // Image element
            result.type = 'image';
            if (attrs.src && !attrs.src.startsWith('data:')) {
                result.attributes.src = `{{${generatePlaceholderName(element, 'imageSrc')}}}`;
            }
        } else if (tagName === 'a' && attrs.href) {
            // Link element - might want to make href dynamic
            result.type = 'link';
        }

        return result;
    }

    /**
     * Determines if content looks dynamic (should have a placeholder)
     * @param {string} text - Text content
     * @returns {boolean}
     */
    function isDynamicContent(text) {
        // Skip very short text, numbers only, or common static elements
        if (text.length < 3) return false;
        if (/^\d+$/.test(text)) return false;
        if (/^[^\w\s]+$/.test(text)) return false; // Only punctuation
        
        // Consider it dynamic if it's substantial text content
        return text.length > 10 || /[a-zA-Z]{3,}/.test(text);
    }

    /**
     * Generates a meaningful placeholder name based on element and content
     * @param {cheerio.Cheerio} element - The element
     * @param {string} text - The text content or type
     * @returns {string} Placeholder name
     */
    function generatePlaceholderName(element, text) {
        const tag = element[0]?.name || '';
        const id = element.attr('id') || '';
        const className = element.attr('class') || '';
        
        // Try to use ID or class name
        if (id) {
            return id.replace(/[^a-zA-Z0-9]/g, '_');
        }
        
        if (className) {
            const firstClass = className.split(' ')[0];
            return firstClass.replace(/[^a-zA-Z0-9]/g, '_');
        }
        
        // Use tag name + a hash of text
        const textHash = text.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
        return `${tag}_${textHash}`.toLowerCase();
    }

    // Extract the body structure (we'll keep head separately if needed)
    const body = $('body');
    const head = $('head');
    
    const structure = {
        url,
        metadata: {
            scrapedAt: new Date().toISOString(),
            title: title || '{{pageTitle}}'
        },
        structure: {
            tag: 'html',
            children: []
        }
    };

    // Extract head elements (simplified - mainly title and meta)
    const headChildren = [];
    $('head title').each((i, el) => {
        const titleText = $(el).text().trim();
        if (titleText) {
            headChildren.push({
                tag: 'title',
                text: isDynamicContent(titleText) ? `{{pageTitle}}` : titleText,
                type: 'text'
            });
        }
    });

    if (headChildren.length > 0) {
        structure.structure.children.push({
            tag: 'head',
            children: headChildren
        });
    }

    // Extract body structure
    const bodyStructure = extractElement(body);
    if (bodyStructure) {
        structure.structure.children.push(bodyStructure);
    }

    return structure;
}

