import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const METADATA_FILE = path.join(TEMPLATES_DIR, 'metadata.json');

/**
 * Ensures templates directory and metadata file exist
 */
async function ensureTemplatesDir() {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    try {
        await fs.access(METADATA_FILE);
    } catch {
        // Metadata file doesn't exist, create it
        await fs.writeFile(METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
}

/**
 * Gets all templates metadata
 * @returns {Promise<Array>} Array of template metadata
 */
export async function getAllTemplates() {
    await ensureTemplatesDir();
    try {
        const content = await fs.readFile(METADATA_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return [];
    }
}

/**
 * Gets a specific template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Template data or null if not found
 */
export async function getTemplate(templateId) {
    await ensureTemplatesDir();
    const templates = await getAllTemplates();
    const templateMeta = templates.find(t => t.id === templateId);
    
    if (!templateMeta) {
        return null;
    }

    const templateDir = path.join(TEMPLATES_DIR, templateId);
    
    try {
        const templateData = await fs.readFile(
            path.join(templateDir, 'template.json'),
            'utf-8'
        );
        const contextData = await fs.readFile(
            path.join(templateDir, 'context.json'),
            'utf-8'
        );
        const originalHtml = await fs.readFile(
            path.join(templateDir, 'original.html'),
            'utf-8'
        );

        return {
            ...templateMeta,
            template: JSON.parse(templateData),
            context: JSON.parse(contextData),
            originalHtml
        };
    } catch (error) {
        console.error(`Error loading template ${templateId}:`, error);
        return null;
    }
}

/**
 * Saves a new template to the system
 * @param {Object} templateData - Template data
 * @param {string} templateData.url - Original URL
 * @param {string} templateData.title - Page title
 * @param {Object} templateData.template - Template structure
 * @param {Object} templateData.context - Page context
 * @param {string} templateData.originalHtml - Original HTML
 * @returns {Promise<string>} Template ID
 */
export async function saveTemplate(templateData) {
    await ensureTemplatesDir();
    
    const templateId = randomUUID();
    const templateDir = path.join(TEMPLATES_DIR, templateId);
    await fs.mkdir(templateDir, { recursive: true });

    // Save template files
    await fs.writeFile(
        path.join(templateDir, 'template.json'),
        JSON.stringify(templateData.template, null, 2),
        'utf-8'
    );
    
    await fs.writeFile(
        path.join(templateDir, 'context.json'),
        JSON.stringify(templateData.context, null, 2),
        'utf-8'
    );
    
    await fs.writeFile(
        path.join(templateDir, 'original.html'),
        templateData.originalHtml,
        'utf-8'
    );

    // Update metadata
    const templates = await getAllTemplates();
    const metadata = {
        id: templateId,
        url: templateData.url,
        title: templateData.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    templates.push(metadata);
    await fs.writeFile(METADATA_FILE, JSON.stringify(templates, null, 2), 'utf-8');

    return templateId;
}

/**
 * Deletes a template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTemplate(templateId) {
    await ensureTemplatesDir();
    
    const templates = await getAllTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index === -1) {
        return false;
    }

    // Remove from metadata
    templates.splice(index, 1);
    await fs.writeFile(METADATA_FILE, JSON.stringify(templates, null, 2), 'utf-8');

    // Delete template directory
    const templateDir = path.join(TEMPLATES_DIR, templateId);
    try {
        await fs.rm(templateDir, { recursive: true, force: true });
    } catch (error) {
        console.error(`Error deleting template directory ${templateId}:`, error);
    }

    return true;
}

/**
 * Updates template metadata
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<boolean>} Success status
 */
export async function updateTemplateMetadata(templateId, updates) {
    await ensureTemplatesDir();
    
    const templates = await getAllTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index === -1) {
        return false;
    }

    templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    await fs.writeFile(METADATA_FILE, JSON.stringify(templates, null, 2), 'utf-8');
    return true;
}


