import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VARIANTS_DIR = path.join(__dirname, '..', 'variants');

/**
 * Ensures variants directory exists
 */
async function ensureVariantsDir() {
    await fs.mkdir(VARIANTS_DIR, { recursive: true });
}

/**
 * Saves a variant
 * @param {Object} variant - Variant data
 * @param {string} variant.html - Variant HTML
 * @param {Object} variant.metadata - Variant metadata
 * @returns {Promise<string>} Variant ID
 */
export async function saveVariant(variant) {
    await ensureVariantsDir();
    
    const variantId = randomUUID();
    const variantDir = path.join(VARIANTS_DIR, variantId);
    await fs.mkdir(variantDir, { recursive: true });

    // Save HTML
    await fs.writeFile(
        path.join(variantDir, 'index.html'),
        variant.html,
        'utf-8'
    );

    // Save metadata
    await fs.writeFile(
        path.join(variantDir, 'metadata.json'),
        JSON.stringify(variant.metadata, null, 2),
        'utf-8'
    );

    return variantId;
}

/**
 * Gets a variant by ID
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object|null>} Variant data or null
 */
export async function getVariant(variantId) {
    await ensureVariantsDir();
    
    const variantDir = path.join(VARIANTS_DIR, variantId);
    
    try {
        const html = await fs.readFile(
            path.join(variantDir, 'index.html'),
            'utf-8'
        );
        const metadataContent = await fs.readFile(
            path.join(variantDir, 'metadata.json'),
            'utf-8'
        );
        const metadata = JSON.parse(metadataContent);

        return {
            id: variantId,
            html,
            metadata
        };
    } catch (error) {
        return null;
    }
}

/**
 * Lists all variants
 * @returns {Promise<Array>} Array of variant metadata
 */
export async function listVariants() {
    await ensureVariantsDir();
    
    try {
        const entries = await fs.readdir(VARIANTS_DIR, { withFileTypes: true });
        const variants = [];

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const variant = await getVariant(entry.name);
                if (variant) {
                    variants.push({
                        id: variant.id,
                        ...variant.metadata
                    });
                }
            }
        }

        return variants.sort((a, b) => 
            new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0)
        );
    } catch (error) {
        return [];
    }
}

/**
 * Deletes a variant
 * @param {string} variantId - Variant ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteVariant(variantId) {
    await ensureVariantsDir();
    
    const variantDir = path.join(VARIANTS_DIR, variantId);
    
    try {
        await fs.rm(variantDir, { recursive: true, force: true });
        return true;
    } catch (error) {
        return false;
    }
}


