# AI Article Variant Generator - Simple & Fast

## What This System Does

Generates multiple article variants with different content but same design:
- **Input**: Article URL
- **Output**: 1-10 variants with new content, comments with local names, same styling
- **Speed**: 1-2 minutes per variant (2 API calls only)
- **Form/Table**: Always preserved unchanged

## Quick Start

### 1. Install
```bash
npm install
npx playwright install --with-deps
```

### 2. Configure API Key
```bash
# Windows
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
APP_URL=http://localhost:3000
PORT=3000
```

Get API key from: https://openrouter.ai/keys

### 3. Start Server
```bash
npm start
```

### 4. Open Browser
http://localhost:3000

## How To Use

### Option 1: Use Existing Template
1. Select template from dropdown
2. Click "Preview Template" to see original
3. Configure settings
4. Click "Generate Variants"

### Option 2: Create New Template
1. Enter URL in "create new template" field
2. Click "Scrape & Save"
3. Configure settings
4. Click "Generate Variants"

## Settings

- **Number of Variants**: 1-10 (generates multiple versions at once)
- **Language**: English, Hebrew, Spanish, etc.
- **Target Country**: USA, Israel, South Africa, etc.
- **Text Model**: Choose from Qwen3, Claude, GPT-4, etc.
- **Generate Images**: Checkbox (default: OFF for speed)
- **Image Model**: Choose if generating images

## What Gets Generated

### Article Content
- Rewritten from different angle/story
- Same structure (headings, paragraphs, lists)
- Core guidelines integrated naturally

### Comments
- New names appropriate for target country
  - USA: John Smith, Mary Johnson
  - Israel: David Cohen, Sarah Levy
  - South Africa: Johan van der Merwe, Sarah Naidoo
- Comment content relevant to new article
- Same format and length as original

### Form/Table
- **NEVER CHANGED** - always preserved exactly as original

## Technical Details

### API Calls
- **Only 2 API calls per variant**:
  1. Rewrite article (~30 seconds)
  2. Generate comments (~20 seconds)
  
vs. old system: 305 API calls (10+ minutes)

### Models
The system automatically fetches available models from OpenRouter:
- **Text**: 341+ models available
- **Images**: 4+ models available

You can choose specific models or let the system try multiple models automatically.

### Core Guidelines
All content includes:
1. Customer receives assistance from company member/trader
2. Reader understands deposit requirement and profit dependency

## Files Structure

```
New Simple System Files:
├── src/
│   ├── simpleArticleExtractor.js   ✅ Extract article + comments
│   ├── simpleArticleRewriter.js    ✅ 2 prompts only
│   ├── simpleContentReplacer.js    ✅ Replace content, preserve form
│   ├── simpleVariantGenerator.js   ✅ Main simple flow
│   ├── openRouterModels.js         ✅ Fetch models from API
├── public/
│   ├── index-en.html               ✅ English interface
│   ├── app-en.js                   ✅ UI logic
│   └── style.css                   ✅ Updated styles
└── server.js                       ✅ Updated with model endpoints
```

## Troubleshooting

### "No auth credentials found"
- Check `.env` file exists and contains valid API key
- Restart server after editing `.env`

### "Model not found" (404)
- Choose different model from dropdown
- Or select "Auto" to try multiple models

### "Rate limited" (429)
- System automatically tries next model
- Or wait a few seconds and try again

### Generation takes too long
- Turn off "Generate Images" (speeds up 10x)
- Choose faster model (Qwen3-32B is fast)

## What's Different From Old System

| Old System | New System |
|------------|------------|
| 305 API calls | 2 API calls |
| 10+ minutes | 1-2 minutes |
| Complex sections | Simple article + comments |
| Hebrew UI | English UI |
| Fixed models | Choose from 341+ models |
| Images required | Images optional |
| Often stuck | Fast & reliable |

## Next Steps

1. Start server: `npm start`
2. Open: http://localhost:3000
3. Select/create template
4. Generate variants
5. Download ZIP files

See `SIMPLE_FLOW.md` for detailed documentation.




