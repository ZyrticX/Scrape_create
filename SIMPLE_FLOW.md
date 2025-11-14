# New Simple Flow - Article Variant Generator

## What Changed

### Before (Old System)
- 305 prompts (61 batches × 5)
- Extracted every single element separately
- Process took 10+ minutes
- Often got stuck on image generation
- Complex, hard to debug

### Now (New System)
- **2 prompts only**: Article + Comments
- Extract article as one piece
- Process takes 1-2 minutes
- Images optional (off by default)
- Simple, fast, reliable

## How It Works

### 1. Template Selection
- Choose existing template or scrape new URL
- Preview template before generation

### 2. Settings
- **Number of Variants**: 1-10 (generates multiple versions)
- **Language**: English, Hebrew, Spanish, etc.
- **Target Country**: USA, Israel, South Africa, etc.
- **Text Model**: Choose from OpenRouter models (Qwen3, Claude, GPT-4)
- **Image Model**: Optional, choose if generating images
- **Generate Images**: Checkbox (default: OFF for speed)

### 3. Generation Process

**API Call 1 - Rewrite Article:**
```
Input: Full article with markdown structure
Output: New article, different angle/story, same structure
Time: ~20-30 seconds
```

**API Call 2 - Generate Comments:**
```
Input: Number of comments, target country
Output: JSON with comments (local names, relevant content)
Time: ~10-20 seconds
```

### 4. Content Replacement
- Replace article content → preserves all CSS/styling
- Replace comments → local names for target country
- **Keep form/table unchanged** → critical requirement

### 5. Results
- Preview each variant
- Download as ZIP with all resources

## Key Features

✅ **Fast**: 2 API calls vs. 305
✅ **Simple**: Clear process, easy to debug
✅ **Flexible**: Choose models, languages, countries
✅ **Multiple Variants**: Generate 1-10 at once
✅ **Form Preserved**: Registration table stays unchanged
✅ **Local Names**: Comments use names appropriate for target country
✅ **English UI**: Professional interface
✅ **Model Selection**: Choose text and image models
✅ **Optional Images**: Generate only if needed

## Models Available

### Text Generation Models (from OpenRouter)
- Qwen3 32B / 72B
- Claude 3.5 Sonnet / Opus
- GPT-4 Turbo / GPT-4
- Many more...

### Image Generation Models
- Google Gemini 2.5 Flash Image (Nano Banana)
- OpenAI GPT-5 Image
- Black Forest Labs Flux Pro  
- Stable Diffusion XL

## Usage

1. **Start server**: `npm start`
2. **Open browser**: http://localhost:3000
3. **Select template** or scrape new URL
4. **Configure settings** (language, country, models)
5. **Generate variants** (1-10 at once)
6. **Download results** as ZIP

## Benefits

- **10x faster**: 2 API calls vs. 305
- **More reliable**: Simpler process, fewer failure points
- **Better results**: Model sees full context, maintains coherence
- **Lower cost**: Fewer API calls
- **Easier to debug**: Simple, linear flow




