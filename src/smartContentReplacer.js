import * as cheerio from 'cheerio';
import { generateText } from './openRouterClient.js';

/**
 * Smart Content Replacer
 * Extracts only text content, localizes it, then replaces in original HTML
 * Much faster and cheaper than sending entire HTML to AI
 */
export class SmartContentReplacer {
    constructor(config = {}) {
        this.model = config.model || 'anthropic/claude-sonnet-4';
        this.maxTokens = config.maxTokens || 8000;
    }

    /**
     * Extract all text content from HTML
     */
    extractTextContent(html) {
        console.log('📝 Extracting text content...');
        const $ = cheerio.load(html);
        const textMap = new Map();
        let counter = 0;

        // Extract text from common content elements
        const selectors = [
            'title',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'span', 'div', 'li', 'td', 'th',
            'a', 'button', 'label',
            '[alt]', '[title]', '[placeholder]'
        ];

        selectors.forEach(selector => {
            $(selector).each((i, elem) => {
                const $elem = $(elem);
                const text = $elem.text().trim();
                
                // Skip empty, very short, or script-like content
                if (text && text.length > 2 && !text.match(/^[\d\s\.\,\:\;\(\)\{\}\[\]]+$/)) {
                    const id = `TEXT_${counter++}`;
                    textMap.set(id, {
                        original: text,
                        selector: selector,
                        context: $elem.parent().prop('tagName')?.toLowerCase() || 'unknown'
                    });
                }

                // Extract attributes
                if ($elem.attr('alt')) {
                    const id = `ALT_${counter++}`;
                    textMap.set(id, {
                        original: $elem.attr('alt'),
                        selector: `${selector}[alt]`,
                        context: 'image-alt'
                    });
                }

                if ($elem.attr('title')) {
                    const id = `TITLE_${counter++}`;
                    textMap.set(id, {
                        original: $elem.attr('title'),
                        selector: `${selector}[title]`,
                        context: 'title-attr'
                    });
                }

                if ($elem.attr('placeholder')) {
                    const id = `PLACEHOLDER_${counter++}`;
                    textMap.set(id, {
                        original: $elem.attr('placeholder'),
                        selector: `${selector}[placeholder]`,
                        context: 'placeholder'
                    });
                }
            });
        });

        console.log(`✅ Extracted ${textMap.size} text items`);
        return textMap;
    }

    /**
     * Build efficient prompt with just text content
     */
    buildPrompt(textMap, targetConfig) {
        const textArray = Array.from(textMap.entries()).map(([id, data]) => ({
            id,
            text: data.original,
            context: data.context
        }));

        return `You are a professional content localization expert.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LOCALIZATION TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target Language: ${targetConfig.targetLanguage}
Target Country: ${targetConfig.targetCountry}
Writing Style: ${targetConfig.writingStyle || 'professional and friendly'}
Target Audience: ${targetConfig.targetAudience || 'general users'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 TEXT CONTENT TO LOCALIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${JSON.stringify(textArray, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a JSON array with localized text for each ID:

[
  {"id": "TEXT_0", "localized": "Your localized text here"},
  {"id": "TEXT_1", "localized": "Another localized text"},
  ...
]

IMPORTANT:
- Return ONLY the JSON array (no markdown, no explanations)
- Keep the same IDs
- Localize all text to ${targetConfig.targetLanguage}
- Adapt cultural references, names, currencies, dates
- Maintain the tone and style
- Start with [ and end with ]

BEGIN:`;
    }

    /**
     * Parse AI response - Robust parser that handles multiple formats
     */
    parseResponse(responseText) {
        console.log('📋 Parsing AI response...');
        console.log(`Response length: ${responseText.length} characters`);
        console.log(`First 200 chars: ${responseText.substring(0, 200)}`);
        console.log(`Last 200 chars: ${responseText.substring(responseText.length - 200)}`);
        
        let jsonMatch = null;
        let jsonText = null;

        // Strategy 1: Direct JSON array match
        jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            console.log('✓ Strategy 1: Found direct JSON array');
            jsonText = jsonMatch[0];
        }

        // Strategy 2: Remove markdown code blocks (```json ... ```)
        if (!jsonText) {
            console.log('→ Trying Strategy 2: Remove markdown...');
            // Remove opening ```json or ``` and closing ```
            let cleaned = responseText
                .replace(/^```(?:json)?\s*/gi, '')  // Remove opening
                .replace(/```\s*$/g, '')             // Remove closing
                .trim();
            jsonMatch = cleaned.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                console.log('✓ Strategy 2: Found JSON after removing markdown');
                jsonText = jsonMatch[0];
            }
        }

        // Strategy 3: Extract from markdown code block
        if (!jsonText) {
            console.log('→ Trying Strategy 3: Extract from markdown code block...');
            // Match ```json ... ``` or ``` ... ```
            const mdMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (mdMatch && mdMatch[1]) {
                const content = mdMatch[1].trim();
                if (content.startsWith('[')) {
                    jsonText = content;
                    console.log('✓ Strategy 3: Extracted from markdown block');
                }
            }
        }
        
        // Strategy 4: Extract between first [ and last ]
        if (!jsonText) {
            console.log('→ Trying Strategy 4: First [ to last ]...');
            const firstBracket = responseText.indexOf('[');
            const lastBracket = responseText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                jsonText = responseText.substring(firstBracket, lastBracket + 1);
                console.log('✓ Strategy 4: Extracted between brackets');
            }
        }

        // Strategy 5: Look for JSON after common phrases
        if (!jsonText) {
            console.log('→ Trying Strategy 5: Look after common phrases...');
            const patterns = [
                /(?:here'?s? the|here is the|output|result|localized content).*?\n*(\[[\s\S]*\])/i,
                /(?:begin|start).*?\n*(\[[\s\S]*\])/i,
                /\n\s*(\[[\s\S]*\])/
            ];
            
            for (const pattern of patterns) {
                const match = responseText.match(pattern);
                if (match && match[1]) {
                    jsonText = match[1];
                    console.log('✓ Strategy 5: Found JSON after phrase');
                    break;
                }
            }
        }

        if (!jsonText) {
            console.error('❌ All parsing strategies failed!');
            console.error('Full response:', responseText);
            throw new Error('Could not find JSON array in response. Try using Claude Sonnet 4 for better results.');
        }

        // Try to parse the JSON
        try {
            console.log('→ Attempting to parse JSON...');
            const localizedArray = JSON.parse(jsonText);
            
            if (!Array.isArray(localizedArray)) {
                throw new Error('Parsed result is not an array');
            }

            const localizedMap = new Map();
            localizedArray.forEach(item => {
                if (item.id && item.localized) {
                    localizedMap.set(item.id, item.localized);
                }
            });

            console.log(`✅ Successfully parsed ${localizedMap.size} localized texts`);
            return localizedMap;
        } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError.message);
            console.error('Attempted to parse:', jsonText.substring(0, 500));
            throw new Error(`JSON parsing failed: ${parseError.message}. Try using Claude Sonnet 4 for more reliable output.`);
        }
    }

    /**
     * Replace text in HTML
     */
    replaceTextInHtml(html, textMap, localizedMap) {
        console.log('🔄 Replacing text in HTML...');
        let modifiedHtml = html;
        let replaceCount = 0;

        // Sort by length (longest first) to avoid partial replacements
        const entries = Array.from(textMap.entries()).sort((a, b) => 
            b[1].original.length - a[1].original.length
        );

        entries.forEach(([id, data]) => {
            const localized = localizedMap.get(id);
            if (localized) {
                // Escape special regex characters in original text
                const escapedOriginal = data.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedOriginal, 'g');
                const matches = modifiedHtml.match(regex);
                
                if (matches) {
                    modifiedHtml = modifiedHtml.replace(regex, localized);
                    replaceCount += matches.length;
                }
            }
        });

        console.log(`✅ Made ${replaceCount} replacements`);
        return modifiedHtml;
    }

    /**
     * Main processing function
     */
    async processHtml(originalHtml, targetConfig) {
        const startTime = Date.now();

        try {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 Smart Content Replacer - Starting');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Step 1: Extract text
            console.log('Step 1: Extracting text content...');
            const textMap = this.extractTextContent(originalHtml);

            if (textMap.size === 0) {
                throw new Error('No text content found to localize');
            }

            console.log(`✅ Found ${textMap.size} text items to localize`);

            // Step 2: Build prompt
            console.log('\nStep 2: Building localization prompt...');
            const prompt = this.buildPrompt(textMap, targetConfig);
            
            const promptSize = (Buffer.byteLength(prompt, 'utf8') / 1024).toFixed(1);
            console.log(`✅ Prompt size: ${promptSize}KB (much smaller than full HTML!)`);

            // Step 3: Send to AI
            console.log(`\nStep 3: Sending to ${this.model}...`);
            console.log('⏳ This should take 10-30 seconds...');

            const aiStartTime = Date.now();
            const response = await generateText(
                prompt,
                'You are a localization expert. Return ONLY a JSON array with no additional text.',
                {
                    model: this.model,
                    maxTokens: this.maxTokens,
                    temperature: 0.3
                }
            );
            const aiDuration = ((Date.now() - aiStartTime) / 1000).toFixed(1);
            console.log(`✅ AI responded in ${aiDuration}s`);
            console.log(`Response length: ${response.length} characters`);

            // Step 4: Parse response
            console.log('\nStep 4: Parsing AI response...');
            const localizedMap = this.parseResponse(response);
            console.log(`✅ Parsed ${localizedMap.size} localized texts`);

            // Step 5: Replace in HTML
            console.log('\nStep 5: Replacing text in HTML...');
            const finalHtml = this.replaceTextInHtml(originalHtml, textMap, localizedMap);

            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✅ Processing complete in ${totalDuration}s`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            return {
                html: finalHtml,
                metadata: {
                    model: this.model,
                    duration: `${totalDuration}s`,
                    textsProcessed: textMap.size,
                    replacementsMade: localizedMap.size
                }
            };
        } catch (error) {
            console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ ERROR in SmartContentReplacer:');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Stack:', error.stack);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            throw error;
        }
    }
}

