/**
 * Retry utility functions with exponential backoff
 */

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.multiplier - Backoff multiplier (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if should retry (default: retry on 429, 500, 502, 503)
 * @returns {Promise<any>} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        multiplier = 2,
        shouldRetry = defaultShouldRetry
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Check if we should retry
            if (attempt === maxRetries || !shouldRetry(error, attempt)) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const waitTime = Math.min(delay * Math.pow(multiplier, attempt), maxDelay);
            
            console.warn(`Attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`, error.message);
            
            await sleep(waitTime);
        }
    }

    throw lastError;
}

/**
 * Default function to determine if should retry based on error
 * @param {Error} error - The error object
 * @param {number} attempt - Current attempt number
 * @returns {boolean} Whether to retry
 */
function defaultShouldRetry(error, attempt) {
    // Retry on network errors
    if (error.message && error.message.includes('fetch')) {
        return true;
    }

    // Retry on specific HTTP status codes
    if (error.status || error.response?.status) {
        const status = error.status || error.response.status;
        // Rate limit
        if (status === 429) {
            return true;
        }
        // Server errors
        if (status >= 500 && status < 600) {
            return true;
        }
        // Timeout
        if (status === 408) {
            return true;
        }
    }

    // Check error message for rate limit indicators
    if (error.message && (
        error.message.includes('rate limit') ||
        error.message.includes('429') ||
        error.message.includes('too many requests')
    )) {
        return true;
    }

    return false;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wraps a fetch call with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
    return retryWithBackoff(async () => {
        const response = await fetch(url, options);
        
        // Throw error for non-ok responses to trigger retry
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            throw error;
        }
        
        return response;
    }, retryOptions);
}

