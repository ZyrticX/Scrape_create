import * as cheerio from 'cheerio';

/**
 * Processes HTML to convert relative URLs to absolute URLs
 * @param {string} html - The HTML content
 * @param {string} baseUrl - The base URL of the page
 * @returns {string} Processed HTML with absolute URLs
 */
export function processHTML(html, baseUrl) {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);
    
    // Convert relative URLs to absolute in various attributes
    const urlAttributes = ['href', 'src', 'action', 'data-src', 'data-href'];
    
    urlAttributes.forEach(attr => {
        $(`[${attr}]`).each((i, elem) => {
            const url = $(elem).attr(attr);
            if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:') && !url.startsWith('mailto:') && !url.startsWith('tel:') && !url.startsWith('#')) {
                try {
                    const absoluteUrl = new URL(url, base).href;
                    $(elem).attr(attr, absoluteUrl);
                } catch (e) {
                    // If URL parsing fails, keep original
                    console.warn(`Failed to convert URL: ${url}`);
                }
            }
        });
    });
    
    // Also process CSS url() references in style attributes and style tags
    $('[style]').each((i, elem) => {
        let style = $(elem).attr('style');
        style = style.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, url) => {
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
                try {
                    const absoluteUrl = new URL(url, base).href;
                    return `url(${quote}${absoluteUrl}${quote})`;
                } catch (e) {
                    return match;
                }
            }
            return match;
        });
        $(elem).attr('style', style);
    });
    
    return $.html();
}

