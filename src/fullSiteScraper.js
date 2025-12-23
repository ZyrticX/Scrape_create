import { PlaywrightCrawler, Dataset } from 'crawlee';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scrapes an entire website - all pages and resources
 * @param {string} startUrl - The starting URL to scrape
 * @param {string} outputDir - Directory to save scraped files
 * @param {Object} options - Scraping options
 * @returns {Promise<{pages: Array, resources: Array, zipPath: string}>}
 */
export async function scrapeFullSite(startUrl, outputDir, options = {}) {
    const {
        maxPages = 100,
        maxDepth = 10,
        timeout = 60000,
        downloadResources = true
    } = options;

    const startTime = Date.now();
    const baseUrl = new URL(startUrl);
    const baseDomain = baseUrl.hostname;
    
    // Create output directories
    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');
    const imagesDir = path.join(assetsDir, 'images');
    const cssDir = path.join(assetsDir, 'css');
    const jsDir = path.join(assetsDir, 'js');
    const fontsDir = path.join(assetsDir, 'fonts');
    
    await fs.mkdir(pagesDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(cssDir, { recursive: true });
    await fs.mkdir(jsDir, { recursive: true });
    await fs.mkdir(fontsDir, { recursive: true });

    const scrapedPages = [];
    const downloadedResources = new Map();
    const visitedUrls = new Set();
    const failedUrls = [];
    let pageCount = 0;

    console.log(`\n🌐 Starting full site scrape of: ${startUrl}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`⚙️  Max pages: ${maxPages}, Max depth: ${maxDepth}\n`);

    const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: maxPages,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: timeout / 1000,
        
        async requestHandler({ request, page, enqueueLinks, log }) {
            const url = request.url;
            
            // Skip if already visited
            if (visitedUrls.has(url)) {
                return;
            }
            visitedUrls.add(url);
            pageCount++;
            
            console.log(`📄 [${pageCount}/${maxPages}] Scraping: ${url}`);
            
            try {
                // Wait for page to load
                await page.waitForLoadState('networkidle', { timeout: 30000 });
                await page.waitForTimeout(1500);
                
                // Get page content
                const html = await page.content();
                const title = await page.title();
                
                // Generate filename from URL
                const urlPath = new URL(url).pathname;
                let filename = urlPath === '/' ? 'index' : urlPath.replace(/^\/|\/$/g, '').replace(/\//g, '_');
                if (!filename) filename = 'index';
                filename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.html';
                
                // Download resources from page
                if (downloadResources) {
                    const resources = await page.evaluate(() => {
                        const res = {
                            images: [],
                            css: [],
                            js: [],
                            fonts: []
                        };
                        
                        // Images
                        document.querySelectorAll('img[src]').forEach(img => {
                            if (img.src && !img.src.startsWith('data:')) {
                                res.images.push(img.src);
                            }
                        });
                        
                        // Background images
                        document.querySelectorAll('[style*="background"]').forEach(el => {
                            const style = el.getAttribute('style');
                            const matches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const urlMatch = match.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                                    if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
                                        res.images.push(urlMatch[1]);
                                    }
                                });
                            }
                        });
                        
                        // CSS
                        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                            if (link.href) res.css.push(link.href);
                        });
                        
                        // JS
                        document.querySelectorAll('script[src]').forEach(script => {
                            if (script.src) res.js.push(script.src);
                        });
                        
                        return res;
                    });
                    
                    // Download each resource type
                    for (const imgUrl of resources.images) {
                        await downloadResource(page, imgUrl, imagesDir, downloadedResources, 'image');
                    }
                    for (const cssUrl of resources.css) {
                        await downloadResource(page, cssUrl, cssDir, downloadedResources, 'css');
                    }
                    for (const jsUrl of resources.js) {
                        await downloadResource(page, jsUrl, jsDir, downloadedResources, 'js');
                    }
                }
                
                // Process HTML to use local paths
                let processedHtml = html;
                for (const [originalUrl, localPath] of downloadedResources) {
                    const relativePath = path.relative(pagesDir, localPath).replace(/\\/g, '/');
                    processedHtml = processedHtml.split(originalUrl).join(relativePath);
                }
                
                // Save the page
                const pagePath = path.join(pagesDir, filename);
                await fs.writeFile(pagePath, processedHtml, 'utf-8');
                
                scrapedPages.push({
                    url,
                    title,
                    filename,
                    path: pagePath
                });
                
                // Enqueue internal links
                await enqueueLinks({
                    strategy: 'same-domain',
                    transformRequestFunction(req) {
                        // Only follow links on same domain
                        try {
                            const reqUrl = new URL(req.url);
                            if (reqUrl.hostname !== baseDomain) {
                                return false;
                            }
                            // Skip common non-page resources
                            if (/\.(pdf|zip|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|avi|mov|wmv)$/i.test(reqUrl.pathname)) {
                                return false;
                            }
                            return req;
                        } catch {
                            return false;
                        }
                    }
                });
                
            } catch (error) {
                console.error(`❌ Error scraping ${url}: ${error.message}`);
                failedUrls.push({ url, error: error.message });
            }
        },
        
        failedRequestHandler({ request }) {
            failedUrls.push({ url: request.url, error: 'Request failed' });
        }
    });

    // Run the crawler
    await crawler.run([startUrl]);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Scraping completed in ${duration}s`);
    console.log(`📄 Pages scraped: ${scrapedPages.length}`);
    console.log(`📦 Resources downloaded: ${downloadedResources.size}`);
    if (failedUrls.length > 0) {
        console.log(`❌ Failed URLs: ${failedUrls.length}`);
    }
    
    // Create site map / index
    const siteIndex = {
        startUrl,
        domain: baseDomain,
        scrapedAt: new Date().toISOString(),
        duration: `${duration}s`,
        totalPages: scrapedPages.length,
        totalResources: downloadedResources.size,
        pages: scrapedPages.map(p => ({
            url: p.url,
            title: p.title,
            filename: p.filename
        })),
        failedUrls
    };
    
    await fs.writeFile(
        path.join(outputDir, 'site-index.json'),
        JSON.stringify(siteIndex, null, 2),
        'utf-8'
    );
    
    // Create main index.html that links to all pages
    const indexHtml = generateSiteIndex(siteIndex);
    await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml, 'utf-8');
    
    // Create ZIP
    const zipPath = path.join(path.dirname(outputDir), `${path.basename(outputDir)}.zip`);
    await createZipFromDirectory(outputDir, zipPath);
    
    console.log(`\n📦 ZIP created: ${zipPath}`);
    
    return {
        pages: scrapedPages,
        resources: Array.from(downloadedResources.entries()).map(([url, path]) => ({ url, path })),
        siteIndex,
        zipPath,
        outputDir
    };
}

/**
 * Download a resource file
 */
async function downloadResource(page, url, targetDir, resourceMap, type) {
    if (resourceMap.has(url)) {
        return resourceMap.get(url);
    }
    
    try {
        // Generate filename
        const urlObj = new URL(url);
        let filename = path.basename(urlObj.pathname) || `${type}_${Date.now()}`;
        
        // Ensure extension
        if (!path.extname(filename)) {
            const ext = type === 'css' ? '.css' : type === 'js' ? '.js' : '.bin';
            filename += ext;
        }
        
        // Clean filename
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        // Avoid duplicates
        let finalPath = path.join(targetDir, filename);
        let counter = 1;
        while (resourceMap.has(finalPath)) {
            const ext = path.extname(filename);
            const base = path.basename(filename, ext);
            finalPath = path.join(targetDir, `${base}_${counter}${ext}`);
            counter++;
        }
        
        // Download using fetch in browser context
        const response = await page.evaluate(async (resourceUrl) => {
            try {
                const res = await fetch(resourceUrl);
                if (!res.ok) return null;
                const buffer = await res.arrayBuffer();
                return Array.from(new Uint8Array(buffer));
            } catch {
                return null;
            }
        }, url);
        
        if (response) {
            await fs.writeFile(finalPath, Buffer.from(response));
            resourceMap.set(url, finalPath);
            return finalPath;
        }
    } catch (error) {
        // Silent fail for resources
    }
    
    return null;
}

/**
 * Generate an index HTML page listing all scraped pages
 */
function generateSiteIndex(siteIndex) {
    const pageLinks = siteIndex.pages.map(p => 
        `<li><a href="pages/${p.filename}">${p.title || p.url}</a><br><small>${p.url}</small></li>`
    ).join('\n');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Archive - ${siteIndex.domain}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        .info { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .info p { margin: 5px 0; color: #666; }
        ul { background: #fff; padding: 20px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        li { margin: 15px 0; }
        a { color: #0066cc; text-decoration: none; font-weight: 500; }
        a:hover { text-decoration: underline; }
        small { color: #999; }
    </style>
</head>
<body>
    <h1>📦 Site Archive: ${siteIndex.domain}</h1>
    <div class="info">
        <p><strong>Original URL:</strong> ${siteIndex.startUrl}</p>
        <p><strong>Scraped at:</strong> ${siteIndex.scrapedAt}</p>
        <p><strong>Duration:</strong> ${siteIndex.duration}</p>
        <p><strong>Total Pages:</strong> ${siteIndex.totalPages}</p>
        <p><strong>Total Resources:</strong> ${siteIndex.totalResources}</p>
    </div>
    <h2>📄 Pages</h2>
    <ul>
        ${pageLinks}
    </ul>
</body>
</html>`;
}

/**
 * Create ZIP from directory
 */
async function createZipFromDirectory(sourceDir, zipPath) {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => resolve(zipPath));
        archive.on('error', reject);
        
        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

// CLI support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const url = process.argv[2];
    if (!url) {
        console.log('Usage: node fullSiteScraper.js <url>');
        process.exit(1);
    }
    
    const outputDir = path.join(__dirname, '..', 'output', `site_${Date.now()}`);
    
    scrapeFullSite(url, outputDir)
        .then(result => {
            console.log('\n🎉 Done!');
            console.log(`ZIP file: ${result.zipPath}`);
        })
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
}





