import { Actor } from 'apify';
import { scrapePage } from './scraper.js';
import { extractStructure } from './structureExtractor.js';
import { generateHTML, loadTemplate, saveHTML } from './templateGenerator.js';
import { processHTML } from './htmlProcessor.js';
import { analyzeStructure, generateStructureReport } from './structureAnalyzer.js';
import { analyzeContext } from './contextAnalyzer.js';
import { extractTextsBySections } from './textExtractor.js';
import { saveTemplate, getTemplate } from './templateManager.js';
import { generateVariant } from './variantGenerator.js';
import { saveVariant } from './variantManager.js';
import { createVariantZip } from './zipGenerator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main CLI interface for the scraper system
 */
async function main() {
    // Initialize Actor (works both on Apify platform and locally)
    await Actor.init();

    const args = process.argv.slice(2);

    // Check if we're generating a variant
    if (args.includes('--generate-variant')) {
        const templateIdIndex = args.indexOf('--generate-variant');
        const templateId = args[templateIdIndex + 1];
        const sectionsIndex = args.indexOf('--sections');
        const sectionsStr = sectionsIndex !== -1 ? args[sectionsIndex + 1] : null;
        const languageIndex = args.indexOf('--language');
        const language = languageIndex !== -1 ? args[languageIndex + 1] : 'English';
        const countryIndex = args.indexOf('--country');
        const country = countryIndex !== -1 ? args[countryIndex + 1] : null;

        if (!templateId) {
            console.error('Error: --generate-variant requires a template ID');
            console.log('Usage: node src/main.js --generate-variant <template-id> --sections "header,main" [--language English] [--country Israel]');
            await Actor.exit();
            process.exit(1);
        }

        if (!sectionsStr) {
            console.error('Error: --sections is required');
            console.log('Usage: node src/main.js --generate-variant <template-id> --sections "header,main" [--language English] [--country Israel]');
            await Actor.exit();
            process.exit(1);
        }

        const sections = sectionsStr.split(',').map(s => s.trim());

        try {
            console.log(`Loading template ${templateId}...`);
            const templateData = await getTemplate(templateId);
            if (!templateData) {
                console.error(`Template ${templateId} not found`);
                await Actor.exit();
                process.exit(1);
            }

            console.log(`Generating variant with sections: ${sections.join(', ')}`);
            console.log(`Target language: ${language}${country ? `, Country: ${country}` : ''}`);
            
            const variant = await generateVariant(templateData, sections, language, country);
            
            // Save variant
            const variantId = await saveVariant(variant);
            console.log(`✓ Variant created with ID: ${variantId}`);

            // Create ZIP
            const zipPath = path.join(__dirname, '..', 'variants', `${variantId}.zip`);
            await createVariantZip(variant.html, zipPath, variant.metadata);
            console.log(`✓ ZIP created: ${zipPath}`);

            console.log('\n✓ Variant generation completed successfully!');
            await Actor.exit();
            return;
        } catch (error) {
            console.error('Error generating variant:', error);
            await Actor.exit();
            process.exit(1);
        }
    }

    // Check if we're generating from a template
    if (args.includes('--generate')) {
        const templateIndex = args.indexOf('--generate');
        const templatePath = args[templateIndex + 1];
        const dataIndex = args.indexOf('--data');
        const dataPath = dataIndex !== -1 ? args[dataIndex + 1] : null;

        if (!templatePath) {
            console.error('Error: --generate requires a template path');
            console.log('Usage: node src/main.js --generate <template.json> [--data <data.json>]');
            await Actor.exit();
            process.exit(1);
        }

        // Load template
        console.log(`Loading template from ${templatePath}...`);
        const template = await loadTemplate(templatePath);

        // Load data if provided
        let data = {};
        if (dataPath) {
            console.log(`Loading data from ${dataPath}...`);
            const dataContent = await fs.readFile(path.resolve(dataPath), 'utf-8');
            data = JSON.parse(dataContent);
        } else {
            console.log('No data file provided, using empty data object');
        }

        // Generate HTML
        console.log('Generating HTML...');
        const html = generateHTML(template, data);

        // Save output
        const outputFileName = path.basename(templatePath, '.json') + '-generated.html';
        const outputPath = path.join(__dirname, '..', 'output', outputFileName);
        await saveHTML(html, outputPath);

        console.log(`✓ HTML generated successfully: ${outputPath}`);
        await Actor.exit();
        return;
    }

    // Otherwise, scrape a URL
    const url = args[0];

    if (!url) {
        console.error('Error: URL is required');
        console.log('\nUsage:');
        console.log('  Scrape URL and save template:');
        console.log('    node src/main.js <URL>');
        console.log('\n  Generate HTML from template:');
        console.log('    node src/main.js --generate <template.json> [--data <data.json>]');
        console.log('\n  Generate variant with AI:');
        console.log('    node src/main.js --generate-variant <template-id> --sections "header,main" [--language English] [--country Israel]');
        await Actor.exit();
        process.exit(1);
    }

    try {
        console.log(`Scraping page: ${url}`);
        
        // Step 1: Scrape the page
        const scrapedData = await scrapePage(url);
        console.log(`✓ Page scraped successfully`);
        console.log(`  Title: ${scrapedData.title}`);
        console.log(`  URL: ${scrapedData.url}`);

        // Step 2: Process HTML to convert relative URLs to absolute
        console.log('Processing HTML (converting relative URLs to absolute)...');
        const processedHTML = processHTML(scrapedData.html, scrapedData.url);
        
        // Step 3: Save the complete HTML with all CSS and JavaScript
        const urlSlug = new URL(scrapedData.url).pathname
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 50) || 'page';
        
        const timestamp = Date.now();
        
        // Save the complete original HTML
        const completeHTMLPath = path.join(__dirname, '..', 'output', `${urlSlug}_complete_${timestamp}.html`);
        await fs.mkdir(path.dirname(completeHTMLPath), { recursive: true });
        await fs.writeFile(completeHTMLPath, processedHTML, 'utf-8');
        console.log(`✓ Complete HTML saved: ${completeHTMLPath}`);

        // Step 4: Analyze structure and organization
        console.log('Analyzing page structure and organization...');
        const structureAnalysis = analyzeStructure(scrapedData.html, scrapedData.url, scrapedData.title);
        
        // Save structure analysis (JSON)
        const structureJsonPath = path.join(__dirname, '..', 'output', `${urlSlug}_structure_${timestamp}.json`);
        await fs.writeFile(structureJsonPath, JSON.stringify(structureAnalysis, null, 2), 'utf-8');
        console.log(`✓ Structure analysis (JSON) saved: ${structureJsonPath}`);
        
        // Generate and save human-readable structure report
        const structureReport = generateStructureReport(structureAnalysis);
        const structureReportPath = path.join(__dirname, '..', 'output', `${urlSlug}_structure_report_${timestamp}.md`);
        await fs.writeFile(structureReportPath, structureReport, 'utf-8');
        console.log(`✓ Structure report (Markdown) saved: ${structureReportPath}`);

        // Step 5: Analyze context
        console.log('Analyzing page context...');
        const context = analyzeContext(scrapedData.html, scrapedData.url, scrapedData.title);
        console.log('✓ Context analyzed');

        // Step 6: Extract structure for template
        console.log('Extracting page structure for template...');
        const template = extractStructure(scrapedData.html, scrapedData.url, scrapedData.title);
        console.log('✓ Structure extracted');

        // Step 7: Extract texts by sections
        console.log('Extracting texts by sections...');
        const extractedTexts = extractTextsBySections(scrapedData.html, context);
        console.log('✓ Texts extracted');

        // Step 8: Save template using templateManager
        console.log('Saving template to system...');
        const templateId = await saveTemplate({
            url: scrapedData.url,
            title: scrapedData.title,
            template,
            context: {
                ...context,
                sections: extractedTexts.summary
            },
            originalHtml: processedHTML
        });
        
        console.log(`✓ Template saved with ID: ${templateId}`);

        console.log('\n✓ Scraping completed successfully!');
        console.log(`\nTemplate saved with ID: ${templateId}`);
        console.log(`\nYou can now use the web interface at http://localhost:3000`);
        console.log(`or use the API to generate variants.`);
        console.log(JSON.stringify({
            pageTitle: "Your Page Title",
            mainHeadline: "Your Main Headline",
            introText: "Your introduction text here"
        }, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        await Actor.exit();
        process.exit(1);
    }

    await Actor.exit();
}

// Run main function
main().catch(async (error) => {
    console.error('Fatal error:', error);
    await Actor.exit();
    process.exit(1);
});

