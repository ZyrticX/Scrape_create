import { extractArticle, articleToMarkdown } from './simpleArticleExtractor.js';
import { rewriteArticle, generateComments } from './simpleArticleRewriter.js';
import { replaceArticleContent } from './simpleContentReplacer.js';
import { processHTML } from './htmlProcessor.js';

/**
 * Generates a variant using the simple approach (2 API calls only)
 * @param {Object} templateData - Template data from templateManager
 * @param {string} targetLanguage - Target language
 * @param {string} targetCountry - Target country
 * @param {Object} options - Additional options
 * @param {string} options.textModel - Text generation model ID
 * @param {string} options.imageModel - Image generation model ID (optional)
 * @param {boolean} options.generateImages - Whether to generate images (default: false)
 * @returns {Promise<Object>} Generated variant with HTML and metadata
 */
export async function generateSimpleVariant(templateData, targetLanguage, targetCountry, options = {}) {
    const { context, originalHtml } = templateData;
    const { textModel, imageModel, generateImages = false } = options;
    
    console.log('Starting simple variant generation...');
    console.log(`Language: ${targetLanguage}, Country: ${targetCountry}`);
    console.log(`Text Model: ${textModel || 'auto'}, Generate Images: ${generateImages}`);
    
    // Step 1: Extract article and comments
    console.log('Step 1/4: Extracting article content and comments...');
    const extracted = extractArticle(originalHtml, context);
    console.log(`  → Found article with ${extracted.article.structure.length} elements`);
    console.log(`  → Elements by type:`);
    const typeCount = {};
    extracted.article.structure.forEach(s => {
        typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    console.log(`     ${Object.entries(typeCount).map(([k,v]) => `${k}: ${v}`).join(', ')}`);
    console.log(`  → Found ${extracted.comments.length} comments`);
    console.log(`  → Form exists: ${extracted.form.exists}`);

    // Step 2: Rewrite article (1 API call)
    console.log('Step 2/4: Rewriting article content...');
    const newArticleStructure = await rewriteArticle(
        extracted.article,
        context,
        targetLanguage,
        targetCountry,
        textModel
    );
    console.log(`  ✓ Article rewritten successfully`);

    // Step 3: Generate new comments with local names (1 API call)
    console.log('Step 3/4: Generating comments with local names...');
    const articlePreview = newArticleStructure.map(s => s.text).join(' ').substring(0, 500);
    const newComments = await generateComments(
        extracted.comments,
        articlePreview,
        targetCountry,
        textModel
    );
    console.log(`  ✓ Generated ${newComments.length} new comments`);

    // Step 4: Replace content in HTML
    console.log('Step 4/4: Replacing content in HTML...');
    let variantHtml = replaceArticleContent(
        originalHtml,
        extracted,
        newArticleStructure,
        newComments
    );
    console.log(`  ✓ Content replaced successfully`);

    // Optional: Generate hero image only (not all images)
    if (generateImages && imageModel) {
        console.log('Optional: Generating hero image...');
        // TODO: Implement hero image generation only
        console.log('  → Hero image generation skipped for now');
    }

    // Process HTML to ensure absolute URLs
    variantHtml = processHTML(variantHtml, templateData.url);

    console.log('✓ Variant generation completed!');

    return {
        html: variantHtml,
        metadata: {
            templateId: templateData.id,
            originalUrl: templateData.url,
            targetLanguage,
            targetCountry,
            textModel: textModel || 'auto',
            imageModel: imageModel || 'none',
            imagesGenerated: generateImages,
            elementsModified: newArticleStructure.length,
            commentsModified: newComments.length,
            generatedAt: new Date().toISOString(),
            apiCalls: 2 // Only 2 API calls!
        }
    };
}





