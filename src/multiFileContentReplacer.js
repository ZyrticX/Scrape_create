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
📤 OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY the complete updated HTML document.
Start with <!DOCTYPE html> and end with </html>
Do NOT add any explanations, commentary, or markdown formatting.

Your ENTIRE response must be valid HTML code only.

Example of what to return:
<!DOCTYPE html>
<html lang="${targetConfig.targetLanguage}"${targetConfig.targetLanguage === 'Hebrew' || targetConfig.targetLanguage === 'Arabic' ? ' dir="rtl"' : ''}>
<head>
    <meta charset="UTF-8">
    <title>Your Localized Title</title>
    <!-- ... rest of head ... -->
</head>
<body>
    <h1>Your Localized Heading</h1>
    <p>Your localized content...</p>
    <!-- ... rest of body ... -->
</body>
</html>

IMPORTANT:
- Return ONLY HTML code
- NO markdown code blocks (\`\`\`html)
- NO explanatory text
- Start directly with: <!DOCTYPE html>
- End with: </html>

BEGIN - Return the HTML now:`;

        return prompt;
    }

    /**
     * Parse AI response and extract HTML
     */
    parseResponse(responseText) {
        console.log('📋 Parsing AI response...');
        console.log(`Response length: ${responseText.length} characters`);
        
        // Remove markdown code blocks if present
        let cleanedResponse = responseText.trim();
        
        // Remove ```html and ``` markers
        cleanedResponse = cleanedResponse.replace(/^```html\s*/i, '');
        cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
        cleanedResponse = cleanedResponse.replace(/\s*```\s*$/i, '');
        
        // Try to extract from <output> tags (legacy format)
        let match = cleanedResponse.match(/<output>([\s\S]*?)<\/output>/);
        if (match) {
            console.log('✅ Found content in <output> tags');
            return match[1].trim();
        }
        
        // Try to find HTML with DOCTYPE
        const doctypeMatch = cleanedResponse.match(/<!DOCTYPE[\s\S]*?<\/html>/i);
        if (doctypeMatch) {
            console.log('✅ Found HTML with DOCTYPE');
            return doctypeMatch[0].trim();
        }
        
        // Try to find HTML tag
        const htmlMatch = cleanedResponse.match(/<html[\s\S]*?<\/html>/i);
        if (htmlMatch) {
            console.log('✅ Found HTML tag');
            return htmlMatch[0].trim();
        }
        
        // Check if response starts with HTML after cleaning
        if (cleanedResponse.startsWith('<!DOCTYPE') || cleanedResponse.startsWith('<html')) {
            console.log('✅ Response is clean HTML');
            return cleanedResponse;
        }
        
        // Try to find HTML somewhere in the middle of the response
        const anyDoctypeMatch = cleanedResponse.match(/<!DOCTYPE[\s\S]+<\/html>/i);
        if (anyDoctypeMatch) {
            console.log('✅ Found HTML in middle of response');
            return anyDoctypeMatch[0].trim();
        }
        
        // Log for debugging
        console.error('❌ Could not parse response');
        console.error('First 300 chars:', cleanedResponse.substring(0, 300));
        console.error('Last 300 chars:', cleanedResponse.substring(Math.max(0, cleanedResponse.length - 300)));
        
        // Check if it contains HTML at all
        if (cleanedResponse.includes('<html') && cleanedResponse.includes('</html>')) {
            console.log('⚠️  Response contains HTML but format is unusual, attempting extraction...');
            const startIndex = cleanedResponse.indexOf('<!DOCTYPE');
            const altStartIndex = cleanedResponse.indexOf('<html');
            const endIndex = cleanedResponse.lastIndexOf('</html>') + 7;
            
            if (startIndex !== -1) {
                const extracted = cleanedResponse.substring(startIndex, endIndex);
                console.log('✅ Extracted HTML from unusual format');
                return extracted.trim();
            } else if (altStartIndex !== -1) {
                const extracted = cleanedResponse.substring(altStartIndex, endIndex);
                console.log('✅ Extracted HTML without DOCTYPE');
                return extracted.trim();
            }
        }
        
        throw new Error(`Could not extract valid HTML. Response length: ${responseText.length} chars. Try GPT-4 Omni or Gemini Pro 1.5 instead.`);
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
        
        let updatedHtml;
        try {
            updatedHtml = await generateText(
                prompt,
                'You are a professional content localization expert. Return ONLY valid HTML code with no additional text or formatting.',
                {
                    model: this.model,
                    maxTokens: this.maxTokens,
                    temperature: 0.1  // Very low temperature for consistent formatting
                }
            );
        } catch (apiError) {
            console.error('❌ API Error:', apiError);
            throw new Error(`AI API failed: ${apiError.message}. Try a different model.`);
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Received response in ${duration}s`);
        console.log(`📊 Response size: ${updatedHtml.length} characters`);
        
        // Log the first and last 200 chars for debugging
        console.log('📝 Response preview (first 200 chars):', updatedHtml.substring(0, 200));
        console.log('📝 Response preview (last 200 chars):', updatedHtml.substring(Math.max(0, updatedHtml.length - 200)));
        
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

