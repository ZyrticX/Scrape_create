import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';
import { scrapePage } from './src/scraper.js';
import { analyzeContext } from './src/contextAnalyzer.js';
import { extractStructure } from './src/structureExtractor.js';
import { extractTextsBySections } from './src/textExtractor.js';
import { saveTemplate, getAllTemplates, getTemplate } from './src/templateManager.js';
import { generateVariant } from './src/variantGenerator.js';
import { generateSimpleVariant } from './src/simpleVariantGenerator.js';
import { saveVariant, listVariants, getVariant } from './src/variantManager.js';
import { createVariantZip } from './src/zipGenerator.js';
import { processHTML } from './src/htmlProcessor.js';
import { getTextModels, getImageModels } from './src/openRouterModels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve template files (for browsing/downloading)
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// API Routes

// Get available text generation models
app.get('/api/models/text', async (req, res) => {
    try {
        const models = await getTextModels();
        res.json(models);
    } catch (error) {
        console.error('Error fetching text models:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get available image generation models
app.get('/api/models/image', async (req, res) => {
    try {
        const models = await getImageModels();
        res.json(models);
    } catch (error) {
        console.error('Error fetching image models:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await getAllTemplates();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific template
app.get('/api/templates/:id', async (req, res) => {
    try {
        const template = await getTemplate(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get template original HTML for viewing
app.get('/api/templates/:id/view', async (req, res) => {
    try {
        const template = await getTemplate(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(template.originalHtml);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific template file (template.json, context.json, or original.html)
app.get('/api/templates/:id/file/:filename', async (req, res) => {
    try {
        const { id, filename } = req.params;
        const allowedFiles = ['template.json', 'context.json', 'original.html'];
        
        if (!allowedFiles.includes(filename)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(__dirname, 'templates', id, filename);
        
        // Check if file exists
        await fs.access(filePath);
        
        // Set appropriate content type
        const contentType = filename.endsWith('.html') ? 'text/html' : 'application/json';
        res.setHeader('Content-Type', contentType);
        
        const content = await fs.readFile(filePath, 'utf-8');
        res.send(content);
    } catch (error) {
        res.status(404).json({ error: 'File not found' });
    }
});

// Download template as ZIP
app.get('/api/templates/:id/download', async (req, res) => {
    try {
        const template = await getTemplate(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const zipPath = path.join(__dirname, 'templates', `${req.params.id}.zip`);
        const metadata = {
            templateId: req.params.id,
            title: template.title,
            url: template.url,
            createdAt: template.createdAt || new Date().toISOString()
        };
        
        // Use the original URL as baseUrl for resource downloads
        const baseUrl = template.url || null;
        await createVariantZip(template.originalHtml, zipPath, metadata, baseUrl);

        res.download(zipPath, `template-${req.params.id}.zip`, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('Template ZIP creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scrape a new URL and save as template
app.post('/api/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Scrape the page
        const scrapedData = await scrapePage(url);
        
        // Analyze context
        const context = analyzeContext(scrapedData.html, scrapedData.url, scrapedData.title);
        
        // Extract structure
        const template = extractStructure(scrapedData.html, scrapedData.url, scrapedData.title);
        
        // Extract texts by sections
        const extractedTexts = extractTextsBySections(scrapedData.html, context);
        
        // Process HTML
        const processedHTML = processHTML(scrapedData.html, scrapedData.url);
        
        // Save template
        const templateId = await saveTemplate({
            url: scrapedData.url,
            title: scrapedData.title,
            template,
            context: {
                ...context,
                sections: extractedTexts.summary,
                availableSections: Object.keys(extractedTexts.sections).filter(
                    key => extractedTexts.sections[key].length > 0
                )
            },
            originalHtml: processedHTML
        });

        res.json({
            success: true,
            templateId,
            context,
            sections: Object.keys(extractedTexts.sections).filter(
                key => extractedTexts.sections[key].length > 0
            )
        });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate a variant (simple approach)
app.post('/api/generate-variant', async (req, res) => {
    try {
        const { templateId, language, country, textModel, imageModel, generateImages } = req.body;
        
        if (!templateId) {
            return res.status(400).json({ error: 'templateId is required' });
        }

        // Get template
        const templateData = await getTemplate(templateId);
        if (!templateData) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Generate variant using simple approach (2 API calls only)
        const variant = await generateSimpleVariant(
            templateData,
            language || 'English',
            country || 'USA',
            {
                textModel: textModel || null,
                imageModel: imageModel || null,
                generateImages: generateImages || false
            }
        );

        // Save variant
        const variantId = await saveVariant(variant);

        res.json({
            success: true,
            variantId,
            metadata: variant.metadata
        });
    } catch (error) {
        console.error('Variant generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get variant HTML
app.get('/api/variants/:id', async (req, res) => {
    try {
        const variant = await getVariant(req.params.id);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }
        res.json(variant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download variant as ZIP
app.get('/api/variants/:id/download', async (req, res) => {
    try {
        const variant = await getVariant(req.params.id);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }

        const zipPath = path.join(__dirname, 'variants', `${req.params.id}.zip`);
        // Use baseUrl from metadata if available
        const baseUrl = variant.metadata.originalUrl || null;
        await createVariantZip(variant.html, zipPath, variant.metadata, baseUrl);

        res.download(zipPath, `variant-${req.params.id}.zip`, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('ZIP creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all variants
app.get('/api/variants', async (req, res) => {
    try {
        const variants = await listVariants();
        res.json(variants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Access via: http://YOUR_SERVER_IP:${PORT}`);
});


