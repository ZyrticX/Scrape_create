import { generateText, generateTextBatch } from './openRouterClient.js';
import { buildTextPrompt, buildSystemMessage } from './promptBuilder.js';
import { generateImagesForHTML } from './imageGenerator.js';
import { replaceImagesInHTML } from './imageReplacer.js';
import { extractTextsBySections, getTextsForSections } from './textExtractor.js';
import { generateHTML } from './templateGenerator.js';
import { retryWithBackoff } from './retryUtils.js';
import * as cheerio from 'cheerio';

/**
 * Generates a variant of a page with new texts and images
 * @param {Object} templateData - Template data from templateManager
 * @param {Array<string>} selectedSections - Sections to modify (e.g., ['header', 'main'])
 * @param {string} targetLanguage - Target language
 * @param {string} targetCountry - Target country
 * @returns {Promise<Object>} Generated variant with HTML and metadata
 */
export async function generateVariant(templateData, selectedSections, targetLanguage, targetCountry) {
    const { template, context, originalHtml } = templateData;
    
    // Extract texts for selected sections
    const extractedTexts = extractTextsBySections(originalHtml, context);
    const textsToModify = getTextsForSections(extractedTexts, selectedSections);
    
    console.log(`Generating variant for ${textsToModify.length} text elements...`);
    
    // Build system message
    const systemMessage = buildSystemMessage(context);
    
    // Generate new texts using AI
    const textPrompts = textsToModify.map(textItem => 
        buildTextPrompt({
            originalText: textItem.text,
            context: textItem.context || context,
            targetLanguage,
            targetCountry,
            section: textItem.section,
            elementType: textItem.elementType || 'text',
            role: textItem.role || 'content',
            texts: textItem.texts || null // Pass grouped texts if available
        })
    );
    
    // Generate texts in batch with error handling
    let newTexts;
    try {
        newTexts = await retryWithBackoff(async () => {
            return await generateTextBatch(textPrompts, systemMessage);
        }, {
            maxRetries: 2,
            initialDelay: 2000
        });
    } catch (error) {
        console.error('Error generating texts:', error);
        throw new Error(`Failed to generate texts: ${error.message}`);
    }
    
    // Create mapping of original text to new text
    const textMap = new Map();
    textsToModify.forEach((textItem, index) => {
        textMap.set(textItem.text, newTexts[index]);
    });
    
    // Replace texts in HTML
    let variantHtml = replaceTextsInHTML(originalHtml, textMap, textsToModify);
    
    // Generate new images with error handling
    console.log('Generating new images...');
    let imageMap;
    try {
        // Don't wrap in retry - generateImagesForHTML already handles retries internally
        // and processes images one by one
        imageMap = await generateImagesForHTML(variantHtml, context, targetCountry);
        
        if (imageMap.size === 0) {
            console.log('No images were generated, using original images');
        } else {
            console.log(`Successfully generated ${imageMap.size} new images`);
        }
    } catch (error) {
        console.warn('Error generating images, continuing without image replacement:', error.message);
        // Continue without replacing images if generation fails
        imageMap = new Map();
    }
    
    // Replace images in HTML
    variantHtml = replaceImagesInHTML(variantHtml, imageMap);
    
    // Process HTML to convert relative URLs to absolute (if needed)
    variantHtml = processHTMLUrls(variantHtml, templateData.url);
    
    return {
        html: variantHtml,
        metadata: {
            templateId: templateData.id,
            originalUrl: templateData.url,
            targetLanguage,
            targetCountry,
            modifiedSections: selectedSections,
            textsModified: textsToModify.length,
            imagesModified: imageMap.size,
            generatedAt: new Date().toISOString()
        }
    };
}

/**
 * Replaces texts in HTML based on text map with improved accuracy
 */
function replaceTextsInHTML(html, textMap, textItems) {
    const $ = cheerio.load(html);
    
    // Handle section groups first (grouped texts by container)
    textItems.forEach(item => {
        if (item.elementType === 'section-group' && item.texts && item.containerId) {
            const newText = textMap.get(item.text);
            if (newText && item.containerId) {
                // Replace entire container content
                const $container = $(`#${item.containerId}`);
                if ($container.length > 0) {
                    // Parse the new text and replace elements accordingly
                    // For now, replace the container's text content
                    $container.text(newText);
                }
            }
        }
    });
    
    // Create a map using ID as primary key (most accurate)
    const idMap = new Map();
    const classTagMap = new Map();
    const textMap_fallback = new Map();
    
    textItems.forEach(item => {
        // Skip section groups - already handled above
        if (item.elementType === 'section-group') return;
        
        const newText = textMap.get(item.text);
        if (newText) {
            // Priority 1: Use ID if available (most accurate)
            if (item.id) {
                idMap.set(item.id, { original: item.text, new: newText, tag: item.tag });
            }
            // Priority 2: Use classes + tag
            else if (item.classes) {
                const classKey = `${item.tag}.${item.classes.split(' ')[0]}`;
                classTagMap.set(classKey, { original: item.text, new: newText, tag: item.tag, classes: item.classes });
            }
            // Priority 3: Fallback to text matching
            else {
                textMap_fallback.set(item.text, { original: item.text, new: newText, tag: item.tag });
            }
        }
    });
    
    // Replace texts using ID (most accurate)
    idMap.forEach((data, id) => {
        const $elem = $(`#${id}`);
        if ($elem.length > 0) {
            // Get direct text content (without children)
            const directText = $elem.clone().children().remove().end().text().trim();
            if (directText === data.original || directText.includes(data.original)) {
                // Replace only direct text nodes, keep children structure
                $elem.contents().each(function() {
                    if (this.nodeType === 3) { // Text node
                        const textNode = $(this);
                        const nodeText = textNode.text().trim();
                        if (nodeText === data.original || nodeText.includes(data.original)) {
                            textNode.replaceWith(data.new);
                        }
                    }
                });
            }
        }
    });
    
    // Replace texts using classes + tag
    classTagMap.forEach((data, classKey) => {
        const [tag, className] = classKey.split('.');
        const selector = className ? `${tag}.${className.split(' ')[0]}` : tag;
        $(selector).each((i, elem) => {
            const $elem = $(elem);
            const elemClasses = $elem.attr('class') || '';
            // Check if classes match
            if (data.classes && elemClasses.includes(data.classes.split(' ')[0])) {
                const directText = $elem.clone().children().remove().end().text().trim();
                if (directText === data.original) {
                    // Replace text while preserving structure
                    $elem.contents().each(function() {
                        if (this.nodeType === 3) {
                            const textNode = $(this);
                            if (textNode.text().trim() === data.original) {
                                textNode.replaceWith(data.new);
                            }
                        }
                    });
                }
            }
        });
    });
    
    // Fallback: Replace by text content match (less accurate, use last)
    textMap_fallback.forEach((data, originalText) => {
        $(`${data.tag}`).each((i, elem) => {
            const $elem = $(elem);
            const text = $elem.clone().children().remove().end().text().trim();
            
            // Only replace if text matches exactly and element doesn't have ID/classes already processed
            if (text === originalText && !$elem.attr('id') && !$elem.attr('class')) {
                $elem.contents().each(function() {
                    if (this.nodeType === 3) {
                        const textNode = $(this);
                        if (textNode.text().trim() === originalText) {
                            textNode.replaceWith(data.new);
                        }
                    }
                });
            }
        });
    });
    
    return $.html();
}

/**
 * Processes HTML URLs to ensure they're absolute
 */
function processHTMLUrls(html, baseUrl) {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);
    
    // Convert relative URLs to absolute
    ['href', 'src', 'action'].forEach(attr => {
        $(`[${attr}]`).each((i, elem) => {
            const $elem = $(elem);
            const url = $elem.attr(attr);
            if (url && !url.startsWith('http://') && !url.startsWith('https://') && 
                !url.startsWith('data:') && !url.startsWith('mailto:') && !url.startsWith('tel:') && 
                !url.startsWith('#')) {
                try {
                    const absoluteUrl = new URL(url, base).href;
                    $elem.attr(attr, absoluteUrl);
                } catch (e) {
                    // Keep original if URL parsing fails
                }
            }
        });
    });
    
    return $.html();
}

