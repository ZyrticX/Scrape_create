import * as cheerio from 'cheerio';

/**
 * Replaces images in HTML with new image URLs
 * @param {string} html - Original HTML
 * @param {Map<string, string>} imageMap - Map of original URL to new URL
 * @returns {string} HTML with replaced images
 */
export function replaceImagesInHTML(html, imageMap) {
    const $ = cheerio.load(html);
    
    $('img').each((i, elem) => {
        const $img = $(elem);
        const src = $img.attr('src');
        
        if (src && imageMap.has(src)) {
            const newSrc = imageMap.get(src);
            $img.attr('src', newSrc);
            
            // Also update srcset if exists
            const srcset = $img.attr('srcset');
            if (srcset) {
                // Replace URLs in srcset
                const newSrcset = srcset.split(',').map(entry => {
                    const parts = entry.trim().split(/\s+/);
                    const url = parts[0];
                    if (imageMap.has(url)) {
                        return `${imageMap.get(url)} ${parts.slice(1).join(' ')}`;
                    }
                    return entry;
                }).join(', ');
                $img.attr('srcset', newSrcset);
            }
        }
    });
    
    // Also replace images in CSS background-image
    $('[style*="background-image"]').each((i, elem) => {
        const $elem = $(elem);
        let style = $elem.attr('style') || '';
        
        // Find url() patterns
        style = style.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, url) => {
            if (imageMap.has(url)) {
                return `url(${quote}${imageMap.get(url)}${quote})`;
            }
            return match;
        });
        
        $elem.attr('style', style);
    });
    
    return $.html();
}


