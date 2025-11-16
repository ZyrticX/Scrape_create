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
        this.chunkSize = config.chunkSize || 200; // Process in chunks of 200 items
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
     * Process single batch (for small content)
     */
    async processSingleBatch(textMap, targetConfig) {
        console.log('\nStep 2: Building localization prompt...');
        const prompt = this.buildPrompt(textMap, targetConfig);
        
        const promptSize = (Buffer.byteLength(prompt, 'utf8') / 1024).toFixed(1);
        console.log(`✅ Prompt size: ${promptSize}KB`);

        console.log(`\nStep 3: Sending to ${this.model}...`);
        console.log('⏳ This should take 10-30 seconds...');

        const aiStartTime = Date.now();
        const response = await generateText(
            prompt,
            'You are a localization expert. Return ONLY a JSON array with no additional text.',
            {
                model: this.model,
                maxTokens: this.maxTokens * 2, // Double for safety
                temperature: 0.3
            }
        );
        const aiDuration = ((Date.now() - aiStartTime) / 1000).toFixed(1);
        console.log(`✅ AI responded in ${aiDuration}s`);
        console.log(`Response length: ${response.length} characters`);

        console.log('\nStep 4: Parsing AI response...');
        return this.parseResponse(response);
    }

    /**
     * Process in chunks (for large content)
     */
    async processInChunks(textMap, targetConfig) {
        // Convert Map to array
        const allItems = Array.from(textMap.entries());
        
        // Split into chunks
        const chunks = [];
        for (let i = 0; i < allItems.length; i += this.chunkSize) {
            chunks.push(allItems.slice(i, i + this.chunkSize));
        }

        console.log(`\n📦 Processing ${chunks.length} chunks of ~${this.chunkSize} items each\n`);

        const allLocalizedItems = new Map();
        let totalDuration = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📦 Chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

            // Convert chunk back to Map
            const chunkMap = new Map(chunk);
            const prompt = this.buildPrompt(chunkMap, targetConfig);

            console.log(`🤖 Sending to ${this.model}...`);
            const startTime = Date.now();

            const response = await generateText(
                prompt,
                'You are a localization expert. Return ONLY a JSON array with no additional text.',
                {
                    model: this.model,
                    maxTokens: this.maxTokens,
                    temperature: 0.3
                }
            );

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            totalDuration += parseFloat(duration);
            console.log(`✅ Responded in ${duration}s`);

            const localizedChunk = this.parseResponse(response);
            
            // Merge into final map
            localizedChunk.forEach((value, key) => {
                allLocalizedItems.set(key, value);
            });

            console.log(`✅ Chunk ${i + 1} complete: ${localizedChunk.size} items localized`);

            // Wait between chunks to avoid rate limiting
            if (i < chunks.length - 1) {
                console.log('⏳ Waiting 2s before next chunk...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log(`\n✅ All chunks processed in ${totalDuration.toFixed(1)}s total`);
        console.log(`✅ Total items localized: ${allLocalizedItems.size}/${allItems.length}`);

        return allLocalizedItems;
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

        // Strategy 3: Extract from markdown code block (handles newlines)
        if (!jsonText) {
            console.log('→ Trying Strategy 3: Extract from markdown code block...');
            // Remove everything before opening code fence and after closing fence
            let cleaned = responseText;
            
            // Remove opening fence (```json or ```) and everything before it
            cleaned = cleaned.replace(/^[\s\S]*?```(?:json)?[\s\n]*/i, '');
            
            // Remove closing fence (```) and everything after it
            cleaned = cleaned.replace(/[\s\n]*```[\s\S]*$/i, '');
            
            // Now try to find JSON array
            const trimmed = cleaned.trim();
            if (trimmed.startsWith('[') && trimmed.includes(']')) {
                jsonText = trimmed;
                console.log('✓ Strategy 3: Extracted from markdown block');
            }
        }
        
        // Strategy 4: Nuclear option - Extract between first [ and last ] (ALWAYS works)
        if (!jsonText) {
            console.log('→ Trying Strategy 4: Nuclear extraction between [ and ]...');
            const firstBracket = responseText.indexOf('[');
            const lastBracket = responseText.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                const extracted = responseText.substring(firstBracket, lastBracket + 1);
                // Basic sanity check - should have at least some quotes and braces
                if (extracted.includes('"') && extracted.includes('{')) {
                    jsonText = extracted;
                    console.log('✓ Strategy 4: Nuclear extraction successful');
                    console.log(`   Extracted ${extracted.length} chars from position ${firstBracket} to ${lastBracket}`);
                }
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

            // Step 2: Decide if we need chunking
            let localizedMap;
            
            if (textMap.size > this.chunkSize) {
                console.log(`\n⚠️  Large content (${textMap.size} items) - processing in chunks of ${this.chunkSize}`);
                localizedMap = await this.processInChunks(textMap, targetConfig);
            } else {
                console.log(`\n✅ Small content (${textMap.size} items) - processing in single batch`);
                localizedMap = await this.processSingleBatch(textMap, targetConfig);
            }
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

