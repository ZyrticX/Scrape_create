import { generateImage } from './openRouterClient.js';
import { buildImagePrompt } from './promptBuilder.js';
import * as cheerio from 'cheerio';

/**
 * Analyzes an image from HTML to extract description/context
 * @param {cheerio.Cheerio} $img - Cheerio image element
 * @param {Object} context - Page context
 * @returns {string} Image description
 */
function getImageDescription($img, context) {
    // Try to get description from alt text
    const alt = $img.attr('alt') || '';
    
    // Try to get from surrounding text
    const parent = $img.parent();
    const parentText = parent.text().trim().substring(0, 200);
    
    // Try to get from class names or IDs
    const classes = $img.attr('class') || '';
    const id = $img.attr('id') || '';
    
    // Build description
    let description = alt || '';
    if (parentText && !description) {
        description = `Image related to: ${parentText}`;
    }
    if (classes && !description) {
        description = `Image with class: ${classes}`;
    }
    if (!description) {
        description = `Image related to ${context.topic || 'the page content'}`;
    }
    
    return description;
}

/**
 * Generates a new image similar to the original
 * @param {string} originalImageUrl - URL of original image
 * @param {cheerio.Cheerio} $img - Cheerio image element
 * @param {Object} context - Page context
 * @param {string} targetCountry - Target country
 * @param {string} section - Section where image appears
 * @returns {Promise<string>} URL of generated image
 */
export async function generateSimilarImage(originalImageUrl, $img, context, targetCountry = null, section = 'main') {
    const imageDescription = getImageDescription($img, context);
    
    const prompt = buildImagePrompt({
        originalImageDescription: imageDescription,
        context,
        targetCountry,
        section
    });
    
    try {
        console.log(`  → Generating image with prompt: ${prompt.substring(0, 100)}...`);
        const imageUrl = await generateImage(prompt, {
            size: '1024x1024'
        });
        
        if (!imageUrl || imageUrl === originalImageUrl) {
            console.warn(`  → Image generation returned empty or same URL, using original`);
            return originalImageUrl;
        }
        
        return imageUrl;
    } catch (error) {
        console.error(`  → Error generating image: ${error.message}`);
        // Return original URL if generation fails
        return originalImageUrl;
    }
}

/**
 * Generates images for all images in HTML
 * @param {string} html - HTML content
 * @param {Object} context - Page context
 * @param {string} targetCountry - Target country
 * @returns {Promise<Map<string, string>>} Map of original URL to new URL
 */
export async function generateImagesForHTML(html, context, targetCountry = null) {
    const $ = cheerio.load(html);
    const imageMap = new Map();
    
    const images = [];
    $('img').each((i, elem) => {
        const $img = $(elem);
        const src = $img.attr('src');
        
        // Skip data URLs, placeholders, and very small images (likely icons)
        if (src && !src.startsWith('data:') && !src.includes('placeholder') && !src.includes('icon')) {
            images.push({ $img, src, index: i });
        }
    });
    
    if (images.length === 0) {
        console.log('No images found to generate');
        return imageMap;
    }
    
    console.log(`Found ${images.length} images to generate. This may take a while...`);
    
    // Generate images one by one (to avoid rate limits)
    for (let i = 0; i < images.length; i++) {
        const { $img, src, index } = images[i];
        try {
            console.log(`Generating image ${i + 1}/${images.length}: ${src.substring(0, 50)}...`);
            
            const section = getImageSection($img);
            
            // Add timeout to image generation (max 60 seconds per image)
            const imagePromise = generateSimilarImage(src, $img, context, targetCountry, section);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Image generation timeout after 60 seconds')), 60000)
            );
            
            const newUrl = await Promise.race([imagePromise, timeoutPromise]);
            imageMap.set(src, newUrl);
            
            console.log(`✓ Image ${i + 1}/${images.length} generated successfully`);
            
            // Small delay to avoid rate limits
            if (i < images.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
            }
        } catch (error) {
            console.error(`✗ Error processing image ${i + 1}/${images.length} (${src.substring(0, 50)}...):`, error.message);
            // Keep original if generation fails
            imageMap.set(src, src);
            
            // Continue with next image even if this one failed
            continue;
        }
    }
    
    console.log(`Image generation complete. Generated ${imageMap.size} images.`);
    return imageMap;
}

/**
 * Determines which section an image belongs to
 */
function getImageSection($img) {
    const parent = $img.parent();
    const parentTag = parent[0]?.name || '';
    const parentId = parent.attr('id') || '';
    const parentClasses = parent.attr('class') || '';
    
    if (parentTag === 'header' || parentId.includes('header') || parentClasses.includes('header')) {
        return 'header';
    }
    if (parentTag === 'footer' || parentId.includes('footer') || parentClasses.includes('footer')) {
        return 'footer';
    }
    
    return 'main';
}


