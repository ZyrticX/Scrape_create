# 🕷️ Web Scraper Pro

A powerful, beautiful web scraper that downloads entire websites with one click.

## Features

- 🌐 **Full Site Scraping** - Crawls all pages automatically
- 📦 **Resource Download** - Images, CSS, JS, fonts included
- 🗜️ **ZIP Export** - One-click download of entire site
- 🎨 **Modern UI** - Beautiful dark theme interface
- ⚡ **Real-time Progress** - Watch as pages are scraped
- 📚 **History** - Browse and manage all scraped sites

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
http://localhost:3000
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Enter the website URL you want to scrape
3. Adjust max pages if needed (default: 50)
4. Click "Start Scraping"
5. Wait for completion
6. Download the ZIP file

## CLI Usage

You can also scrape directly from command line:

```bash
node src/fullSiteScraper.js https://example.com
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape` | Start a new scraping job |
| GET | `/api/jobs/:id` | Get job status |
| GET | `/api/jobs` | List all jobs |
| GET | `/api/download/:id` | Download scraped site ZIP |
| GET | `/api/sites` | List all scraped sites |
| DELETE | `/api/sites/:folder` | Delete a scraped site |

## Output Structure

```
output/
├── domain_timestamp/
│   ├── index.html          # Site index with all pages
│   ├── site-index.json     # Metadata
│   ├── pages/              # All HTML pages
│   └── assets/
│       ├── images/
│       ├── css/
│       ├── js/
│       └── fonts/
└── domain_timestamp.zip    # Complete archive
```

## Tech Stack

- **Backend**: Node.js, Express
- **Scraping**: Playwright, Crawlee
- **Frontend**: Vanilla JS, CSS3

## License

MIT
