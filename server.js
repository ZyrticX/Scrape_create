import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';
import { scrapeFullSite } from './src/fullSiteScraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Store scraping jobs status
const scrapingJobs = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve output files
app.use('/output', express.static(path.join(__dirname, 'output')));

// ========================================
// API Routes
// ========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'Web Scraper Pro'
    });
});

// Start scraping job
app.post('/api/scrape', async (req, res) => {
    try {
        const { url, maxPages = 50 } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Generate job ID
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const domain = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const outputDir = path.join(__dirname, 'output', `${domain}_${Date.now()}`);

        // Initialize job status
        scrapingJobs.set(jobId, {
            id: jobId,
            url,
            status: 'starting',
            progress: 0,
            pagesScraped: 0,
            resourcesDownloaded: 0,
            startedAt: new Date().toISOString(),
            outputDir,
            zipPath: null,
            error: null
        });

        // Send immediate response with job ID
        res.json({
            success: true,
            jobId,
            message: 'Scraping started'
        });

        // Start scraping in background
        runScrapingJob(jobId, url, outputDir, maxPages);

    } catch (error) {
        console.error('Scrape error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get job status
app.get('/api/jobs/:jobId', (req, res) => {
    const job = scrapingJobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

// List all jobs
app.get('/api/jobs', (req, res) => {
    const jobs = Array.from(scrapingJobs.values())
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    res.json(jobs);
});

// Download scraped site ZIP
app.get('/api/download/:jobId', async (req, res) => {
    const job = scrapingJobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job not completed yet' });
    }
    if (!job.zipPath) {
        return res.status(404).json({ error: 'ZIP file not found' });
    }

    try {
        await fs.access(job.zipPath);
        const filename = path.basename(job.zipPath);
        res.download(job.zipPath, filename);
    } catch {
        res.status(404).json({ error: 'ZIP file not found on disk' });
    }
});

// List scraped sites in output folder
app.get('/api/sites', async (req, res) => {
    try {
        const outputDir = path.join(__dirname, 'output');
        await fs.mkdir(outputDir, { recursive: true });
        
        const items = await fs.readdir(outputDir, { withFileTypes: true });
        const sites = [];

        for (const item of items) {
            if (item.isDirectory()) {
                const indexPath = path.join(outputDir, item.name, 'site-index.json');
                try {
                    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
                    sites.push({
                        folder: item.name,
                        domain: indexData.domain,
                        url: indexData.startUrl,
                        scrapedAt: indexData.scrapedAt,
                        totalPages: indexData.totalPages,
                        totalResources: indexData.totalResources,
                        hasZip: await fileExists(path.join(outputDir, `${item.name}.zip`))
                    });
                } catch {
                    // Skip folders without valid index
                }
            }
        }

        res.json(sites.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a scraped site
app.delete('/api/sites/:folder', async (req, res) => {
    try {
        const outputDir = path.join(__dirname, 'output');
        const folderPath = path.join(outputDir, req.params.folder);
        const zipPath = folderPath + '.zip';

        await fs.rm(folderPath, { recursive: true, force: true });
        await fs.rm(zipPath, { force: true }).catch(() => {});

        res.json({ success: true, message: 'Site deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// Helper Functions
// ========================================

async function runScrapingJob(jobId, url, outputDir, maxPages) {
    const job = scrapingJobs.get(jobId);
    
    try {
        job.status = 'scraping';
        
        const result = await scrapeFullSite(url, outputDir, {
            maxPages,
            downloadResources: true,
            timeout: 60000
        });

        job.status = 'completed';
        job.progress = 100;
        job.pagesScraped = result.pages.length;
        job.resourcesDownloaded = result.resources.length;
        job.zipPath = result.zipPath;
        job.completedAt = new Date().toISOString();
        job.siteIndex = result.siteIndex;

    } catch (error) {
        console.error(`Job ${jobId} failed:`, error);
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
    }
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// ========================================
// Serve Frontend
// ========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🕷️  Web Scraper Pro running on http://localhost:${PORT}`);
    console.log(`📁 Output directory: ${path.join(__dirname, 'output')}\n`);
});
