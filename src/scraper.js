import { PlaywrightCrawler } from 'crawlee';
import { Actor } from 'apify';

/**
 * Scrapes a dynamic page using Playwright and returns the full HTML content
 * @param {string} url - The URL to scrape
 * @returns {Promise<{html: string, url: string, title: string}>}
 */
export async function scrapePage(url) {
    let scrapedData = null;

    const crawler = new PlaywrightCrawler({
        async requestHandler({ request, page, enqueueLinks }) {
            // Wait for the page to fully load (including JavaScript)
            await page.waitForLoadState('networkidle');
            
            // Wait a bit more for dynamic content to render
            await page.waitForTimeout(2000);

            // Get the full HTML content after JavaScript execution
            const html = await page.content();
            
            // Get page title
            const title = await page.title();
            
            // Get the final URL (in case of redirects)
            const finalUrl = page.url();

            // Extract all CSS (both inline styles and stylesheets)
            const styles = await page.evaluate(() => {
                const stylesheets = [];
                // Get all link stylesheets
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                    if (link.href) {
                        stylesheets.push({
                            type: 'link',
                            href: link.href,
                            media: link.media || 'all'
                        });
                    }
                });
                
                // Get all style tags
                const inlineStyles = [];
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        inlineStyles.push(style.textContent);
                    }
                });
                
                return {
                    stylesheets,
                    inlineStyles
                };
            });

            scrapedData = {
                html,
                url: finalUrl,
                title,
                styles,
                timestamp: new Date().toISOString()
            };
        },
        
        // Handle errors
        errorHandler({ request }) {
            console.error(`Failed to scrape ${request.url}`);
        },
    });

    // Run the crawler
    await crawler.run([url]);

    if (!scrapedData) {
        throw new Error(`Failed to scrape page: ${url}`);
    }

    return scrapedData;
}

