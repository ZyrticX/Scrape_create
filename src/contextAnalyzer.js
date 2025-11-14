import * as cheerio from 'cheerio';

/**
 * Analyzes the context of a webpage to understand its purpose, style, tone, and target audience
 * @param {string} html - The HTML content
 * @param {string} url - The page URL
 * @param {string} title - The page title
 * @returns {Object} Context analysis
 */
export function analyzeContext(html, url, title) {
    const $ = cheerio.load(html);
    
    const context = {
        // Basic information
        url,
        title,
        analyzedAt: new Date().toISOString(),
        
        // Topic and purpose
        topic: null,
        purpose: null,
        
        // Style and tone
        writingStyle: null,
        tone: null,
        
        // Target audience
        targetAudience: null,
        targetCountry: null,
        targetLanguage: null,
        
        // Key messages
        keyMessages: [],
        
        // Content type
        contentType: null,
        
        // Call to action
        callToAction: null
    };

    // Extract main text content
    const bodyText = $('body').text().toLowerCase();
    const headings = [];
    $('h1, h2, h3').each((i, elem) => {
        headings.push($(elem).text().trim());
    });

    // Analyze topic based on title and headings
    context.topic = analyzeTopic(title, headings, bodyText);
    
    // Analyze purpose
    context.purpose = analyzePurpose(bodyText, headings);
    
    // Analyze writing style
    context.writingStyle = analyzeWritingStyle(bodyText, $);
    
    // Analyze tone
    context.tone = analyzeTone(bodyText, headings);
    
    // Analyze target audience
    context.targetAudience = analyzeTargetAudience(bodyText, headings, url);
    
    // Extract target country/language from URL or content
    context.targetCountry = extractTargetCountry(url, bodyText);
    context.targetLanguage = extractTargetLanguage(url, bodyText);
    
    // Extract key messages
    context.keyMessages = extractKeyMessages(headings, bodyText);
    
    // Determine content type
    context.contentType = determineContentType(bodyText, $);
    
    // Extract call to action
    context.callToAction = extractCallToAction($, bodyText);

    return context;
}

/**
 * Analyzes the main topic of the page
 */
function analyzeTopic(title, headings, bodyText) {
    // Check for common topics
    const topicKeywords = {
        trading: ['trading', 'trader', 'forex', 'crypto', 'stock', 'investment', 'deposit', 'profit'],
        finance: ['finance', 'financial', 'money', 'earn', 'income', 'revenue'],
        product: ['product', 'service', 'platform', 'app', 'software', 'tool'],
        news: ['news', 'article', 'report', 'update', 'announcement'],
        landing: ['landing', 'sign up', 'register', 'join', 'get started']
    };

    const combinedText = `${title} ${headings.join(' ')} ${bodyText}`.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(keyword => combinedText.includes(keyword))) {
            return topic;
        }
    }

    return 'general';
}

/**
 * Analyzes the purpose of the page
 */
function analyzePurpose(bodyText, headings) {
    const combinedText = `${headings.join(' ')} ${bodyText}`.toLowerCase();
    
    if (combinedText.includes('sign up') || combinedText.includes('register') || combinedText.includes('join')) {
        return 'conversion';
    }
    if (combinedText.includes('buy') || combinedText.includes('purchase') || combinedText.includes('order')) {
        return 'sales';
    }
    if (combinedText.includes('learn') || combinedText.includes('guide') || combinedText.includes('how to')) {
        return 'education';
    }
    if (combinedText.includes('news') || combinedText.includes('article')) {
        return 'information';
    }
    
    return 'marketing';
}

/**
 * Analyzes the writing style
 */
function analyzeWritingStyle(bodyText, $) {
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
    
    // Check for formal language
    const formalWords = ['therefore', 'furthermore', 'consequently', 'nevertheless', 'moreover'];
    const hasFormalWords = formalWords.some(word => bodyText.includes(word));
    
    // Check for marketing language
    const marketingWords = ['amazing', 'incredible', 'revolutionary', 'exclusive', 'limited', 'free'];
    const hasMarketingWords = marketingWords.some(word => bodyText.includes(word));
    
    if (hasFormalWords && avgSentenceLength > 15) {
        return 'formal';
    }
    if (hasMarketingWords || avgSentenceLength < 12) {
        return 'marketing';
    }
    
    return 'conversational';
}

/**
 * Analyzes the tone
 */
function analyzeTone(bodyText, headings) {
    const combinedText = `${headings.join(' ')} ${bodyText}`.toLowerCase();
    
    const positiveWords = ['great', 'amazing', 'wonderful', 'excellent', 'best', 'success', 'profit'];
    const negativeWords = ['risk', 'warning', 'danger', 'loss', 'problem', 'issue'];
    const urgentWords = ['now', 'today', 'limited', 'hurry', 'act now', 'don\'t miss'];
    
    const positiveCount = positiveWords.filter(w => combinedText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => combinedText.includes(w)).length;
    const urgentCount = urgentWords.filter(w => combinedText.includes(w)).length;
    
    if (urgentCount > 2) {
        return 'urgent';
    }
    if (positiveCount > negativeCount) {
        return 'positive';
    }
    if (negativeCount > positiveCount) {
        return 'cautious';
    }
    
    return 'neutral';
}

/**
 * Analyzes target audience
 */
function analyzeTargetAudience(bodyText, headings, url) {
    const combinedText = `${headings.join(' ')} ${bodyText}`.toLowerCase();
    
    // Check for beginner/expert indicators
    if (combinedText.includes('beginner') || combinedText.includes('easy') || combinedText.includes('simple')) {
        return 'beginners';
    }
    if (combinedText.includes('expert') || combinedText.includes('advanced') || combinedText.includes('professional')) {
        return 'professionals';
    }
    
    // Check for demographic indicators
    if (combinedText.includes('student') || combinedText.includes('young')) {
        return 'young adults';
    }
    if (combinedText.includes('retirement') || combinedText.includes('senior')) {
        return 'seniors';
    }
    
    return 'general public';
}

/**
 * Extracts target country from URL or content
 */
function extractTargetCountry(url, bodyText) {
    // Try to extract from URL
    const urlMatch = url.match(/\/([a-z]{2})\//);
    if (urlMatch) {
        const countryCodes = {
            'za': 'South Africa',
            'us': 'United States',
            'uk': 'United Kingdom',
            'il': 'Israel',
            'de': 'Germany',
            'fr': 'France'
        };
        return countryCodes[urlMatch[1]] || null;
    }
    
    // Try to extract from content
    const countryNames = ['South Africa', 'United States', 'United Kingdom', 'Israel', 'Germany', 'France'];
    for (const country of countryNames) {
        if (bodyText.toLowerCase().includes(country.toLowerCase())) {
            return country;
        }
    }
    
    return null;
}

/**
 * Extracts target language from URL or content
 */
function extractTargetLanguage(url, bodyText) {
    const urlMatch = url.match(/\/([a-z]{2})\//);
    if (urlMatch) {
        const langCodes = {
            'en': 'English',
            'he': 'Hebrew',
            'de': 'German',
            'fr': 'French',
            'es': 'Spanish'
        };
        return langCodes[urlMatch[1]] || 'English';
    }
    
    return 'English';
}

/**
 * Extracts key messages from the page
 */
function extractKeyMessages(headings, bodyText) {
    const messages = [];
    
    // Use main headings as key messages
    headings.slice(0, 5).forEach(heading => {
        if (heading.length > 10 && heading.length < 100) {
            messages.push(heading);
        }
    });
    
    return messages;
}

/**
 * Determines content type
 */
function determineContentType(bodyText, $) {
    const hasForm = $('form').length > 0;
    const hasVideo = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0;
    const hasImages = $('img').length > 5;
    
    if (hasForm) {
        return 'landing page';
    }
    if (hasVideo) {
        return 'video content';
    }
    if (hasImages) {
        return 'visual content';
    }
    
    return 'text content';
}

/**
 * Extracts call to action
 */
function extractCallToAction($, bodyText) {
    const ctaSelectors = [
        'button',
        'a[class*="cta"]',
        'a[class*="button"]',
        '[class*="call-to-action"]'
    ];
    
    const ctas = [];
    ctaSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.length > 0 && text.length < 50) {
                ctas.push(text);
            }
        });
    });
    
    return ctas.length > 0 ? ctas[0] : null;
}


