import dotenv from 'dotenv';
dotenv.config();

const MODELS_CACHE_DURATION = 3600000; // 1 hour in milliseconds
let modelsCache = null;
let cacheTimestamp = null;

/**
 * Fetches available models from OpenRouter API
 * @returns {Promise<Array>} Array of model objects
 */
export async function fetchAvailableModels() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set');
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Error fetching models from OpenRouter:', error);
        throw error;
    }
}

/**
 * Gets cached models or fetches if cache is expired
 * @returns {Promise<Array>} Array of model objects
 */
export async function getModels() {
    const now = Date.now();
    
    // Return cached models if still valid
    if (modelsCache && cacheTimestamp && (now - cacheTimestamp) < MODELS_CACHE_DURATION) {
        return modelsCache;
    }

    // Fetch new models
    modelsCache = await fetchAvailableModels();
    cacheTimestamp = now;
    return modelsCache;
}

/**
 * Gets text generation models
 * @returns {Promise<Array>} Array of text generation models
 */
export async function getTextModels() {
    const allModels = await getModels();
    
    // Filter for text generation models (exclude image/vision models)
    return allModels
        .filter(model => {
            const id = model.id.toLowerCase();
            return !id.includes(':image') && 
                   !id.includes('image-') && 
                   !id.includes('-image') &&
                   !id.includes('vision') &&
                   !id.includes('dalle') &&
                   !id.includes('stable-diffusion') &&
                   !id.includes('flux');
        })
        .map(model => ({
            id: model.id,
            name: model.name,
            contextLength: model.context_length,
            pricing: model.pricing
        }))
        .sort((a, b) => {
            // Sort popular models first
            if (a.id.includes('claude') && !b.id.includes('claude')) return -1;
            if (b.id.includes('claude') && !a.id.includes('claude')) return 1;
            if (a.id.includes('gpt') && !b.id.includes('gpt')) return -1;
            if (b.id.includes('gpt') && !a.id.includes('gpt')) return 1;
            if (a.id.includes('qwen') && !b.id.includes('qwen')) return -1;
            if (b.id.includes('qwen') && !a.id.includes('qwen')) return 1;
            return 0;
        });
}

/**
 * Gets image generation models
 * @returns {Promise<Array>} Array of image generation models
 */
export async function getImageModels() {
    const allModels = await getModels();
    
    // Filter for image generation models
    return allModels
        .filter(model => {
            const id = model.id.toLowerCase();
            const name = model.name.toLowerCase();
            return id.includes('image') || 
                   id.includes('flux') || 
                   id.includes('stable-diffusion') ||
                   id.includes('dall') ||
                   name.includes('image') ||
                   name.includes('nano banana');
        })
        .map(model => ({
            id: model.id,
            name: model.name,
            pricing: model.pricing
        }));
}

/**
 * Gets recommended text models (curated list)
 * @returns {Array} Recommended model IDs
 */
export function getRecommendedTextModels() {
    return [
        'qwen/qwen3-32b',
        'qwen/qwen-2.5-72b-instruct',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'openai/gpt-4-turbo',
        'openai/gpt-4',
        'openai/gpt-3.5-turbo'
    ];
}

/**
 * Gets recommended image models (curated list)
 * @returns {Array} Recommended model IDs
 */
export function getRecommendedImageModels() {
    return [
        'google/gemini-2.5-flash-image', // Nano Banana
        'openai/gpt-5-image',
        'black-forest-labs/flux-pro',
        'stability-ai/stable-diffusion-xl-base-1.0'
    ];
}

// ========================================
// Multi-File Cursor Models (NEW - added for Multi-File feature)
// ========================================

export const MULTI_FILE_MODELS = [
    {
        id: 'anthropic/claude-sonnet-4',
        name: '⭐ Claude Sonnet 4 (Recommended - Most Reliable)',
        contextWindow: 200000,
        recommended: true,
        reliable: true
    },
    {
        id: 'openai/gpt-4o',
        name: '✓ GPT-4 Omni (Reliable)',
        contextWindow: 128000,
        vision: true,
        reliable: true
    },
    {
        id: 'anthropic/claude-opus-4',
        name: '✓ Claude Opus 4 (Reliable, Premium)',
        contextWindow: 200000,
        reliable: true
    },
    {
        id: 'qwen/qwen-2.5-vl-32b',
        name: '⚠️ Qwen2.5-VL-32B (May need auto-retry)',
        contextWindow: 32768,
        vision: true,
        reliable: false
    },
    {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5 (Large context)',
        contextWindow: 2000000,
        reliable: true
    }
];

export const IMAGE_GENERATION_MODELS = [
    {
        id: 'black-forest-labs/flux-pro',
        name: 'FLUX Pro (Recommended)',
        recommended: true
    },
    {
        id: 'stability-ai/stable-diffusion-xl',
        name: 'Stable Diffusion XL'
    },
    {
        id: 'openai/dall-e-3',
        name: 'DALL-E 3'
    }
];

export function getMultiFileModels() {
    return MULTI_FILE_MODELS;
}

export function getImageGenerationModels() {
    return IMAGE_GENERATION_MODELS;
}

