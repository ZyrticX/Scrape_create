import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fetchWithRetry } from './retryUtils.js';

/**
 * Downloads external resources (CSS, images, JS) and replaces URLs with local paths
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL for resolving relative URLs
 * @param {string} outputDir - Directory to save downloaded resources
 * @returns {Promise<{html: string, resources: Array}>} Updated HTML and list of downloaded resources
 */
export async function downloadResources(html, baseUrl, outputDir) {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);
    const resources = [];
    
    // Ensure output directories exist
    const cssDir = path.join(outputDir, 'css');
    const imagesDir = path.join(outputDir, 'images');
    const jsDir = path.join(outputDir, 'js');
    
    await fs.mkdir(cssDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(jsDir, { recursive: true });
    
    // Download CSS files
    const cssLinks = [];
    $('link[rel="stylesheet"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('data:') && !href.startsWith('#') && !href.startsWith('mailto:')) {
            cssLinks.push({ elem, href });
        }
    });
    
    for (const { elem, href } of cssLinks) {
        try {
            const absoluteUrl = new URL(href, base).href;
            const cssContent = await downloadFile(absoluteUrl);
            
            const fileName = `style_${resources.length}.css`;
            const filePath = path.join(cssDir, fileName);
            await fs.writeFile(filePath, cssContent, 'utf-8');
            
            // Update HTML
            $(elem).attr('href', `css/${fileName}`);
            resources.push({ type: 'css', url: absoluteUrl, localPath: `css/${fileName}` });
        } catch (error) {
            console.warn(`Failed to download CSS ${href}:`, error.message);
            // Keep original URL
        }
    }
    
    // Download images
    const images = [];
    $('img[src]').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.startsWith('data:') && !src.startsWith('#') && !src.includes('placeholder')) {
            images.push({ elem, src });
        }
    });
    
    for (const { elem, src } of images) {
        try {
            const absoluteUrl = new URL(src, base).href;
            const imageData = await downloadFile(absoluteUrl, 'binary');
            
            const ext = getFileExtension(src) || 'jpg';
            const fileName = `image_${resources.length}.${ext}`;
            const filePath = path.join(imagesDir, fileName);
            await fs.writeFile(filePath, imageData);
            
            // Update HTML
            $(elem).attr('src', `images/${fileName}`);
            resources.push({ type: 'image', url: absoluteUrl, localPath: `images/${fileName}` });
        } catch (error) {
            console.warn(`Failed to download image ${src}:`, error.message);
            // Keep original URL
        }
    }
    
    // Download JavaScript files
    const jsScripts = [];
    $('script[src]').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.startsWith('data:') && !src.startsWith('#')) {
            jsScripts.push({ elem, src });
        }
    });
    
    for (const { elem, src } of jsScripts) {
        try {
            const absoluteUrl = new URL(src, base).href;
            const jsContent = await downloadFile(absoluteUrl);
            
            const fileName = `script_${resources.length}.js`;
            const filePath = path.join(jsDir, fileName);
            await fs.writeFile(filePath, jsContent, 'utf-8');
            
            // Update HTML
            $(elem).attr('src', `js/${fileName}`);
            resources.push({ type: 'js', url: absoluteUrl, localPath: `js/${fileName}` });
        } catch (error) {
            console.warn(`Failed to download JS ${src}:`, error.message);
            // Keep original URL
        }
    }
    
    // Also handle CSS in style attributes (background-image)
    $('[style*="background-image"]').each((i, elem) => {
        const $elem = $(elem);
        let style = $elem.attr('style') || '';
        
        // Find url() patterns
        const urlMatches = style.match(/url\((['"]?)([^'")]+)\1\)/gi);
        if (urlMatches) {
            urlMatches.forEach(async (match) => {
                const urlMatch = match.match(/url\((['"]?)([^'")]+)\1\)/i);
                if (urlMatch) {
                    const url = urlMatch[2];
                    if (url.startsWith('http')) {
                        try {
                            const imageData = await downloadFile(url, 'binary');
                            const ext = getFileExtension(url) || 'jpg';
                            const fileName = `bg_image_${resources.length}.${ext}`;
                            const filePath = path.join(imagesDir, fileName);
                            await fs.writeFile(filePath, imageData);
                            
                            style = style.replace(url, `images/${fileName}`);
                            $elem.attr('style', style);
                            resources.push({ type: 'image', url, localPath: `images/${fileName}` });
                        } catch (error) {
                            console.warn(`Failed to download background image ${url}:`, error.message);
                        }
                    }
                }
            });
        }
    });
    
    return {
        html: $.html(),
        resources
    };
}

/**
 * Downloads a file from URL
 * @param {string} url - URL to download
 * @param {string} mode - 'text' or 'binary'
 * @returns {Promise<string|Buffer>} File content
 */
async function downloadFile(url, mode = 'text') {
    return fetchWithRetry(url, {}, {
        maxRetries: 3,
        initialDelay: 1000
    }).then(async (response) => {
        if (mode === 'binary') {
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } else {
            return await response.text();
        }
    });
}

/**
 * Gets file extension from URL
 * @param {string} url - URL
 * @returns {string|null} File extension
 */
function getFileExtension(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]+)(\?|$)/);
        return match ? match[1] : null;
    } catch {
        const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
        return match ? match[1] : null;
    }
}

