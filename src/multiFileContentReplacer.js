import { generateText } from './openRouterClient.js';
import { processHTML } from './htmlProcessor.js';
import * as cheerio from 'cheerio';

/**
 * Multi-File Content Replacer
 * Processes HTML content with AI in a single comprehensive call
 * This is a NEW addition - does not replace the existing Simple method!
 */
export class MultiFileContentReplacer {
    constructor(config = {}) {
        this.model = config.model || 'anthropic/claude-sonnet-4';
        this.maxTokens = config.maxTokens || 16000;
        this.generateImages = config.generateImages || false;
        this.imageModel = config.imageModel || 'black-forest-labs/flux-pro';
    }

    /**
     * Analyze HTML size and estimate tokens
     */
    async analyzeHtmlSize(html) {
        const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
        const estimatedTokens = Math.ceil(html.length / 4);
        
        if (sizeKB > 100) {
            throw new Error(`HTML too large: ${sizeKB.toFixed(1)}KB (max 100KB)`);
        }
        
        if (sizeKB > 50) {
            console.warn(`⚠️  Large HTML: ${sizeKB.toFixed(1)}KB - may be slow`);
        }
        
        return { sizeKB, estimatedTokens };
    }

    /**
     * Analyze images in HTML (if generateImages is enabled)
     */
    async analyzeImages(html) {
        const $ = cheerio.load(html);
        const images = [];
        
        // Find all <img> tags
        $('img').each((i, elem) => {
            images.push({
                src: $(elem).attr('src'),
                alt: $(elem).attr('alt') || '',
                context: $(elem).parent().text().substring(0, 200)
            });
        });
        
        // Find background images in CSS
        $('[style*="background"]').each((i, elem) => {
            const style = $(elem).attr('style');
            const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch) {
                images.push({
                    src: urlMatch[1],
                    type: 'background',
                    context: $(elem).text().substring(0, 200)
                });
            }
        });
        
        return images;
    }

    /**
     * Build the comprehensive prompt for AI
     */
    buildPrompt(html, targetConfig, imageInfo = null) {
        let prompt = `You are a professional content localization system.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 HTML DOCUMENT TO LOCALIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${html}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LOCALIZATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target Language: ${targetConfig.targetLanguage}
Target Country: ${targetConfig.targetCountry}
Writing Style: ${targetConfig.writingStyle || 'professional and friendly'}
Target Audience: ${targetConfig.targetAudience || 'general users'}

${targetConfig.additionalInstructions ? `
Additional Instructions:
${targetConfig.additionalInstructions}
` : ''}`;

        if (imageInfo && imageInfo.length > 0) {
            prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️  IMAGES FOUND (${imageInfo.length} images)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${imageInfo.map((img, i) => `${i+1}. ${img.src}
   Alt: ${img.alt || 'none'}
   Context: ${img.context}
`).join('\n')}

Note: Images will be replaced with culturally appropriate alternatives.
Update all alt texts and image descriptions to target language.`;
        }

        prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Change ONLY textual content - preserve exact HTML structure
2. ✅ Keep all IDs, classes, attributes unchanged
3. ✅ Preserve all formatting and indentation
4. ✅ Keep all functionality - only text changes
5. ✅ For RTL languages (Hebrew, Arabic): add dir="rtl" to <html>
6. ✅ Keep code comments in original language
7. ✅ Adapt dates, currencies, phone numbers to target country
8. ✅ Adapt names, addresses, businesses to local market
9. ✅ Keep <title>, <meta description> tags in target language
10. ✅ Do NOT modify <script> tags or JavaScript code

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTPUT FORMAT - MANDATORY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  YOU MUST wrap your ENTIRE response in <output> tags!

Format (REQUIRED):
<output>
<!DOCTYPE html>
<html lang="${targetConfig.targetLanguage}">
<head>
    <title>Your Updated Title</title>
    ... rest of head ...
</head>
<body>
    ... your updated content ...
</body>
</html>
</output>

CRITICAL:
✅ Start immediately with: <output>
✅ Include COMPLETE HTML (DOCTYPE to </html>)
✅ End with: </output>
✅ NO text before <output>
✅ NO text after </output>
❌ DO NOT explain your changes
❌ DO NOT add commentary

Example Response:
<output>
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>כותרת מעודכנת</title>
</head>
<body>
    <h1>כותרת ראשית</h1>
    <p>תוכן מעודכן בעברית...</p>
</body>
</html>
</output>

BEGIN NOW - Start with <output> tag!

        return prompt;
    }

    /**
     * Parse AI response and extract HTML
     */
    parseResponse(responseText) {
        console.log('📋 Parsing AI response...');
        console.log(`Response length: ${responseText.length} characters`);
        
        // Try to extract from <output> tags (preferred format)
        let match = responseText.match(/<output>([\s\S]*?)<\/output>/);
        
        if (match) {
            console.log('✅ Found content in <output> tags');
            return match[1].trim();
        }
        
        // Fallback: Try to find HTML content directly
        console.log('⚠️  No <output> tags found, trying to extract HTML directly...');
        
        // Look for DOCTYPE or <html> tag
        const htmlMatch = responseText.match(/<!DOCTYPE[\s\S]*?<\/html>/i) || 
                          responseText.match(/<html[\s\S]*?<\/html>/i);
        
        if (htmlMatch) {
            console.log('✅ Found HTML content directly');
            return htmlMatch[0].trim();
        }
        
        // Last resort: check if the entire response looks like HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.log('✅ Response appears to be complete HTML');
            return responseText.trim();
        }
        
        // Log first 500 chars for debugging
        console.error('❌ Could not parse response. First 500 chars:');
        console.error(responseText.substring(0, 500));
        
        throw new Error('AI response missing <output> tags and no valid HTML found. Please check the model output format.');
    }

    /**
     * Validate HTML structure
     */
    validateHtml(html) {
        const hasHtml = html.includes('<html');
        const hasBody = html.includes('<body');
        const hasClosingTags = html.includes('</html>') && html.includes('</body>');
        
        if (!hasHtml || !hasBody || !hasClosingTags) {
            throw new Error('Invalid HTML: missing basic structure');
        }
        
        return true;
    }

    /**
     * Main processing function
     * Processes HTML with AI in a single comprehensive call
     */
    async processHtml(originalHtml, targetConfig, baseUrl) {
        console.log('\n🔍 Step 1: Analyzing HTML...');
        const sizeInfo = await this.analyzeHtmlSize(originalHtml);
        console.log(`  Size: ${sizeInfo.sizeKB.toFixed(1)}KB (~${sizeInfo.estimatedTokens.toLocaleString()} tokens)`);
        
        let imageInfo = null;
        if (this.generateImages) {
            console.log('\n🖼️  Step 2: Analyzing images...');
            imageInfo = await this.analyzeImages(originalHtml);
            console.log(`  Found ${imageInfo.length} images`);
        }
        
        console.log('\n📝 Step 3: Building prompt...');
        const prompt = this.buildPrompt(originalHtml, targetConfig, imageInfo);
        
        console.log(`\n🤖 Step 4: Sending to ${this.model}...`);
        console.log('⏳ This may take 30-90 seconds...');
        
        const startTime = Date.now();
        
        const updatedHtml = await generateText(
            prompt,
            'You are a professional content localization expert. You MUST wrap your output in <output> tags. Follow all instructions exactly.',
            {
                model: this.model,
                maxTokens: this.maxTokens,
                temperature: 0.2  // Lower temperature for more consistent formatting
            }
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Received response in ${duration}s`);
        console.log(`📊 Response size: ${updatedHtml.length} characters`);
        
        console.log('\n✍️  Step 5: Parsing response...');
        const parsedHtml = this.parseResponse(updatedHtml);
        
        console.log('\n✔️  Step 6: Validating...');
        this.validateHtml(parsedHtml);
        
        // Process URLs
        const finalHtml = processHTML(parsedHtml, baseUrl);
        
        console.log('✅ Processing complete!');
        
        return {
            html: finalHtml,
            metadata: {
                sizeKB: sizeInfo.sizeKB,
                estimatedTokens: sizeInfo.estimatedTokens,
                imagesFound: imageInfo ? imageInfo.length : 0,
                duration: `${duration}s`,
                model: this.model
            }
        };
    }
}

