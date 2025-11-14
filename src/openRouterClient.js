import dotenv from 'dotenv';
import { retryWithBackoff } from './retryUtils.js';

dotenv.config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model names for text generation
// Using Qwen3 32B as primary model, with multiple fallbacks
// OpenRouter is an LLM gateway - we send input, get output
// Note: OpenRouter model IDs - check https://openrouter.ai/models for exact names
const TEXT_MODELS = [
    'qwen/qwen3-32b',              // Qwen3 32B (primary)
    'qwen/qwen3-72b',              // Qwen3 72B
    'qwen/qwen-2.5-72b-instruct',  // Qwen 2.5 72B
    'qwen/qwen-2.5-32b-instruct',  // Qwen 2.5 32B
    'qwen/qwen-2.5-14b-instruct',  // Qwen 2.5 14B
    'anthropic/claude-3.5-sonnet', // Claude 3.5 Sonnet
    'anthropic/claude-3-opus',     // Claude 3 Opus
    'anthropic/claude-3-sonnet',   // Claude 3 Sonnet
    'openai/gpt-4-turbo',          // GPT-4 Turbo
    'openai/gpt-3.5-turbo'         // GPT-3.5 Turbo (fallback)
];
const DEFAULT_TEXT_MODEL = TEXT_MODELS[0]; // Default to Qwen3 32B
// Image generation models (Gemini Nana Banana first, fallback to other models)
const IMAGE_MODELS = [
    'google/gemini-2.5-flash-image', // Nana Banana - Gemini 2.5 Flash Image
    'black-forest-labs/flux-pro',
    'stability-ai/stable-diffusion-xl-base-1.0'
];

/**
 * Gets OpenRouter API key from environment
 */
function getApiKey() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set in environment variables. Please add it to your .env file.');
    }
    
    // Check if it's still the placeholder
    if (apiKey === 'your_openrouter_api_key_here' || apiKey.includes('your_openrouter')) {
        throw new Error(
            'OPENROUTER_API_KEY is set to placeholder value. ' +
            'Please replace "your_openrouter_api_key_here" in your .env file with your actual OpenRouter API key. ' +
            'Get your API key from: https://openrouter.ai/keys'
        );
    }
    
    // Check if it looks like a valid OpenRouter key (starts with sk-or-v1-)
    if (!apiKey.startsWith('sk-or-v1-')) {
        console.warn('Warning: API key does not start with "sk-or-v1-". Make sure you copied the full key from OpenRouter.');
    }
    
    return apiKey;
}

/**
 * Generates text using specified model through OpenRouter
 * @param {string} prompt - The prompt for text generation
 * @param {string} systemMessage - System message (optional)
 * @param {Object} options - Additional options
 * @param {string} options.model - Specific model ID to use (overrides default)
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, systemMessage = null, options = {}) {
    const apiKey = getApiKey();
    
    const messages = [];
    if (systemMessage) {
        messages.push({
            role: 'system',
            content: systemMessage
        });
    }
    messages.push({
        role: 'user',
        content: prompt
    });

    // Try different text models until one works
    // If specific model requested, try it first
    const modelsToTry = options.model ? [options.model, ...TEXT_MODELS] : TEXT_MODELS;
    let lastError;
    
    for (const model of modelsToTry) {
        try {
            const requestBody = {
                model: model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2000
            };

            const result = await retryWithBackoff(async () => {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout
                
                try {
                    const response = await fetch(OPENROUTER_API_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                            'X-Title': 'Page Variant Generator'
                        },
                        body: JSON.stringify(requestBody),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const error = new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
                        error.status = response.status;
                        error.errorData = errorData;
                        throw error;
                    }

                    return await response.json();
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        const timeoutError = new Error('Request timeout after 120 seconds');
                        timeoutError.status = 408;
                        throw timeoutError;
                    }
                    throw error;
                }
            }, {
                maxRetries: 3,
                initialDelay: 2000, // Start with 2 seconds delay
                maxDelay: 30000,    // Max 30 seconds delay
                multiplier: 2,      // Exponential backoff
                shouldRetry: (error) => {
                    // Retry on rate limits (429) - these are temporary
                    if (error.status === 429) {
                        console.log(`Rate limit hit for ${model}, retrying with backoff...`);
                        return true;
                    }
                    // Retry on server errors and timeouts
                    if (error.status >= 500 && error.status < 600 || error.status === 408) {
                        return true;
                    }
                    // Don't retry on 404 (model not found) or 400 (bad request)
                    return false;
                }
            });

            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                throw new Error('Invalid response from OpenRouter API');
            }

            console.log(`Successfully used model: ${model}`);
            return result.choices[0].message.content.trim();
        } catch (error) {
            lastError = error;
            
            // If it's a 404 (model not found), try next model
            if (error.status === 404) {
                console.warn(`Model ${model} not found (404), trying next model...`);
                continue;
            }
            
            // If it's a 429 (rate limit) and we have more models to try, try next model
            if (error.status === 429) {
                const errorMsg = error.errorData?.error?.message || '';
                if (errorMsg.includes('rate-limited') || errorMsg.includes('rate limit')) {
                    console.warn(`Model ${model} is rate-limited, trying next model...`);
                    continue;
                }
            }
            
            // If it's a 400 (bad request), try next model (might be model-specific issue)
            if (error.status === 400) {
                console.warn(`Model ${model} returned bad request (400), trying next model...`);
                continue;
            }
            
            // For other errors (auth, etc.), throw immediately
            throw error;
        }
    }

    // If all models failed, throw last error
    console.error('All text generation models failed');
    throw lastError || new Error('Failed to generate text with any available model');
}

/**
 * Generates an image using image generation model through OpenRouter
 * Note: OpenRouter uses chat completions endpoint for image generation
 * @param {string} prompt - Image generation prompt
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Image URL or base64 data
 */
export async function generateImage(prompt, options = {}) {
    const apiKey = getApiKey();
    
    // Try different image models until one works
    let lastError;
    
    for (const model of IMAGE_MODELS) {
        try {
            // For Gemini Nana Banana, use modalities and content array format
            const isGeminiModel = model.includes('gemini') && model.includes('flash-image');
            
            const requestBody = {
                model: model,
                messages: [{
                    role: 'user',
                    content: isGeminiModel 
                        ? [{ type: 'text', text: `Generate an image based on this description: ${prompt}` }]
                        : `Generate an image based on this description: ${prompt}`
                }],
                ...(isGeminiModel && { modalities: ['image', 'text'] }),
                ...options
            };

            const data = await retryWithBackoff(async () => {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout for images
                
                try {
                    const response = await fetch(OPENROUTER_API_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                            'X-Title': 'Page Variant Generator'
                        },
                        body: JSON.stringify(requestBody),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const error = new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
                        error.status = response.status;
                        throw error;
                    }

                    return await response.json();
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        const timeoutError = new Error('Image generation timeout after 60 seconds');
                        timeoutError.status = 408;
                        throw timeoutError;
                    }
                    throw error;
                }
            }, {
                maxRetries: 1, // Reduced retries for images (they're slow)
                initialDelay: 2000
            });

            // Handle response - image models may return URLs or base64
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const message = data.choices[0].message;
                let content = message.content;
                
                // Handle Gemini Nana Banana response format (may have content as array)
                if (Array.isArray(content)) {
                    // Look for image_url in content array
                    const imageContent = content.find(item => item.type === 'image_url');
                    if (imageContent && imageContent.image_url) {
                        return imageContent.image_url.url || imageContent.image_url;
                    }
                    // Fallback: get text content
                    const textContent = content.find(item => item.type === 'text');
                    if (textContent) {
                        content = textContent.text;
                    } else {
                        content = content.map(item => item.text || JSON.stringify(item)).join(' ');
                    }
                }
                
                // Try to extract URL
                if (typeof content === 'string') {
                    const urlMatch = content.match(/https?:\/\/[^\s"']+/);
                    if (urlMatch) {
                        return urlMatch[0];
                    }
                    
                    // Try to extract base64 image
                    const base64Match = content.match(/data:image\/[^;]+;base64,[^\s"']+/);
                    if (base64Match) {
                        return base64Match[0];
                    }
                    
                    // Return content as-is (might be URL or other format)
                    return content.trim();
                }
                
                // If content is not a string, try to stringify
                return JSON.stringify(content);
            }

            throw new Error('Invalid response format from image generation API');
        } catch (error) {
            lastError = error;
            console.warn(`Failed to generate image with model ${model}:`, error.message);
            // Try next model
            continue;
        }
    }

    // If all models failed, throw last error
    console.error('All image generation models failed');
    throw lastError || new Error('Failed to generate image with any available model');
}

/**
 * Generates multiple text variations
 * @param {Array<string>} prompts - Array of prompts
 * @param {string} systemMessage - System message
 * @returns {Promise<Array<string>>} Array of generated texts
 */
export async function generateTextBatch(prompts, systemMessage = null) {
    // Process in batches to avoid overwhelming the API and prevent "terminated" errors
    const batchSize = 5; // Process 5 at a time
    const results = [];
    
    for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(prompts.length / batchSize)} (${batch.length} prompts)`);
        
        try {
            const batchResults = await Promise.all(
                batch.map(async (prompt, index) => {
                    try {
                        return await generateText(prompt, systemMessage);
                    } catch (error) {
                        console.error(`Error generating text for prompt ${i + index + 1}:`, error.message);
                        // Return placeholder or original text on error
                        return `[Error: ${error.message}]`;
                    }
                })
            );
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limits
            if (i + batchSize < prompts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`Error processing batch:`, error);
            // Fill batch with error placeholders
            results.push(...batch.map(() => `[Error: ${error.message}]`));
        }
    }
    
    return results;
}


