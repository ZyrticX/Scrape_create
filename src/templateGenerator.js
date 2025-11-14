import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Generates HTML from a template structure and data object
 * @param {Object} template - The template structure (from extractStructure)
 * @param {Object} data - Data object with values for placeholders
 * @returns {string} Generated HTML
 */
export function generateHTML(template, data = {}) {
    /**
     * Recursively render an element structure to HTML
     * @param {Object} element - Element structure object
     * @returns {string} HTML string
     */
    function renderElement(element) {
        if (!element || !element.tag) {
            return '';
        }

        const tag = element.tag;
        let html = `<${tag}`;

        // Add attributes
        if (element.attributes) {
            Object.keys(element.attributes).forEach(attr => {
                let value = element.attributes[attr];
                
                // Replace placeholders in attribute values
                if (typeof value === 'string' && value.includes('{{')) {
                    value = replacePlaceholders(value, data);
                }
                
                // Escape attribute value
                value = escapeHtml(value);
                html += ` ${attr}="${value}"`;
            });
        }

        html += '>';

        // Add text content
        if (element.text !== undefined) {
            let text = element.text;
            
            // Replace placeholders in text
            if (typeof text === 'string' && text.includes('{{')) {
                text = replacePlaceholders(text, data);
            }
            
            html += escapeHtml(text);
        }

        // Add children
        if (element.children && element.children.length > 0) {
            element.children.forEach(child => {
                html += renderElement(child);
            });
        }

        // Self-closing tags
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        if (!selfClosingTags.includes(tag)) {
            html += `</${tag}>`;
        }

        return html;
    }

    // Start with HTML structure
    let html = '<!DOCTYPE html>\n';
    
    // Render the structure
    if (template.structure && template.structure.children) {
        template.structure.children.forEach(child => {
            html += renderElement(child);
        });
    }

    return html;
}

/**
 * Replaces placeholders in a string with values from data object
 * @param {string} text - Text with placeholders like {{variableName}}
 * @param {Object} data - Data object
 * @returns {string} Text with replaced values
 */
function replacePlaceholders(text, data) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        // Try to find the value in data (case-insensitive, with various key formats)
        const value = findValueInData(key, data);
        return value !== undefined ? value : match; // Keep placeholder if not found
    });
}

/**
 * Finds a value in data object, trying various key formats
 * @param {string} key - The placeholder key
 * @param {Object} data - Data object
 * @returns {any} The value or undefined
 */
function findValueInData(key, data) {
    // Try exact match
    if (data[key] !== undefined) {
        return data[key];
    }

    // Try lowercase
    const lowerKey = key.toLowerCase();
    for (const dataKey in data) {
        if (dataKey.toLowerCase() === lowerKey) {
            return data[dataKey];
        }
    }

    // Try partial match (if key contains underscores, try parts)
    const keyParts = key.split('_');
    if (keyParts.length > 1) {
        for (const dataKey in data) {
            const dataKeyLower = dataKey.toLowerCase();
            if (keyParts.some(part => dataKeyLower.includes(part.toLowerCase()))) {
                return data[dataKey];
            }
        }
    }

    return undefined;
}

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Loads a template from a JSON file
 * @param {string} templatePath - Path to template JSON file
 * @returns {Promise<Object>} Template object
 */
export async function loadTemplate(templatePath) {
    const fullPath = path.resolve(templatePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Saves generated HTML to a file
 * @param {string} html - HTML content
 * @param {string} outputPath - Path to save the HTML file
 * @returns {Promise<void>}
 */
export async function saveHTML(html, outputPath) {
    const fullPath = path.resolve(outputPath);
    await fs.writeFile(fullPath, html, 'utf-8');
}

