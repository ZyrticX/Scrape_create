import archiver from 'archiver';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { downloadResources } from './resourceDownloader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a ZIP file with variant HTML and all related files
 * @param {string} html - Variant HTML content
 * @param {string} outputPath - Path to save ZIP file
 * @param {Object} metadata - Variant metadata
 * @param {string} baseUrl - Base URL for downloading resources (optional)
 * @returns {Promise<string>} Path to created ZIP file
 */
export async function createVariantZip(html, outputPath, metadata = {}, baseUrl = null) {
    return new Promise(async (resolve, reject) => {
        const zipPath = outputPath.endsWith('.zip') ? outputPath : `${outputPath}.zip`;
        const tempDir = path.join(path.dirname(zipPath), `temp_${Date.now()}`);
        
        try {
            // Ensure output directory exists
            await fs.mkdir(path.dirname(zipPath), { recursive: true });
            await fs.mkdir(tempDir, { recursive: true });
            
            let finalHtml = html;
            let resources = [];
            
            // Download resources if baseUrl is provided
            if (baseUrl) {
                try {
                    console.log('Downloading external resources...');
                    const result = await downloadResources(html, baseUrl, tempDir);
                    finalHtml = result.html;
                    resources = result.resources;
                    console.log(`Downloaded ${resources.length} resources`);
                } catch (error) {
                    console.warn('Failed to download some resources, continuing with original URLs:', error.message);
                }
            }
            
            const output = createWriteStream(zipPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', async () => {
                // Cleanup temp directory
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                } catch (e) {
                    // Ignore cleanup errors
                }
                resolve(zipPath);
            });

            archive.on('error', async (err) => {
                // Cleanup temp directory
                try {
                    await fs.rm(tempDir, { recursive: true, force: true });
                } catch (e) {
                    // Ignore cleanup errors
                }
                reject(err);
            });

            archive.pipe(output);

            // Add HTML file
            archive.append(finalHtml, { name: 'index.html' });

            // Add metadata file
            archive.append(JSON.stringify({
                ...metadata,
                resources: resources
            }, null, 2), { name: 'metadata.json' });

            // Add downloaded resources
            if (resources.length > 0) {
                for (const resource of resources) {
                    const resourcePath = path.join(tempDir, resource.localPath);
                    try {
                        const stats = await fs.stat(resourcePath);
                        if (stats.isFile()) {
                            archive.file(resourcePath, { name: resource.localPath });
                        }
                    } catch (error) {
                        console.warn(`Failed to add resource ${resource.localPath} to ZIP:`, error.message);
                    }
                }
            }

            await archive.finalize();
        } catch (error) {
            // Cleanup temp directory
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
            reject(error);
        }
    });
}

/**
 * Creates a ZIP with HTML and downloads external resources
 * @param {string} html - Variant HTML
 * @param {string} outputPath - Output path for ZIP
 * @param {Object} metadata - Metadata
 * @param {string} baseUrl - Base URL for downloading resources
 * @returns {Promise<string>} Path to ZIP
 */
export async function createVariantZipWithResources(html, outputPath, metadata = {}, baseUrl) {
    return createVariantZip(html, outputPath, metadata, baseUrl);
}

