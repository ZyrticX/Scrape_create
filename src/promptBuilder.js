/**
 * Core Guidelines that must be included in all content generation
 */
export const CORE_GUIDELINES = `
CRITICAL GUIDELINES - MUST BE FOLLOWED IN ALL CONTENT:

1. **Company Assistance:** Always mention that the reader (customer) will receive assistance from a company member/trader throughout the entire process. This should be naturally integrated into the content.

2. **Deposit Requirement:** The reader must understand that they need to deposit money, and their profit will depend on how much they deposit. The company will explain and ensure they will be profitable. This should be clearly communicated but in a natural, non-aggressive way.
`;

/**
 * Builds a prompt for text generation with context and core guidelines
 * @param {Object} params - Prompt parameters
 * @param {string} params.originalText - Original text to modify/translate
 * @param {Object} params.context - Page context
 * @param {string} params.targetLanguage - Target language
 * @param {string} params.targetCountry - Target country
 * @param {string} params.section - Section name (header, main, footer, etc.)
 * @param {string} params.elementType - Element type (heading, paragraph, button, etc.)
 * @param {string} params.role - Role (heading, call-to-action, content, etc.)
 * @returns {string} Complete prompt
 */
export function buildTextPrompt({
    originalText,
    context,
    targetLanguage = 'English',
    targetCountry = null,
    section = 'main',
    elementType = 'text',
    role = 'content',
    texts = null // Array of text objects if this is a grouped section
}) {
    // If this is a grouped section with multiple texts, format them nicely
    let formattedText = originalText;
    if (texts && Array.isArray(texts) && texts.length > 1) {
        formattedText = texts.map(t => {
            if (t.type === 'heading') return `**${t.text}**`;
            if (t.type === 'button') return `[${t.text}]`;
            if (t.type === 'list-item') return `• ${t.text}`;
            return t.text;
        }).join('\n\n');
    }
    
    let prompt = `You are a professional content writer. Your task is to rewrite the following ${elementType === 'section-group' ? 'section content' : 'text'} while maintaining its core message, style, and context.

${CORE_GUIDELINES}

**Original ${elementType === 'section-group' ? 'Section Content' : 'Text'}:**
${formattedText}

**Context:**
- Page Topic: ${context.topic || 'General'}
- Page Purpose: ${context.purpose || 'Marketing'}
- Writing Style: ${context.writingStyle || 'Conversational'}
- Tone: ${context.tone || 'Neutral'}
- Target Audience: ${context.targetAudience || 'General Public'}

**Content Details:**
- Section: ${section}
- Element Type: ${elementType}
- Role: ${role}

**Requirements:**
- Target Language: ${targetLanguage}${targetCountry ? `\n- Target Country: ${targetCountry}` : ''}
- Maintain the same style and tone as the original
- Keep the same structure and length approximately (±20%)
- Ensure the core guidelines are naturally integrated
- Make it culturally appropriate for the target country (if specified)
- Preserve any important technical terms or brand names
${elementType === 'section-group' ? '- Maintain the same structure (headings, paragraphs, buttons, etc.)\n- Keep the same formatting and hierarchy' : ''}

**Output:**
Provide only the rewritten ${elementType === 'section-group' ? 'content' : 'text'}, maintaining the same structure and format, without any explanations or additional commentary.`;

    return prompt;
}

/**
 * Builds a prompt for image generation with context
 * @param {Object} params - Image generation parameters
 * @param {string} params.originalImageDescription - Description of original image
 * @param {Object} params.context - Page context
 * @param {string} params.targetCountry - Target country
 * @param {string} params.section - Section where image appears
 * @returns {string} Complete prompt
 */
export function buildImagePrompt({
    originalImageDescription,
    context,
    targetCountry = null,
    section = 'main'
}) {
    let prompt = `Generate an image that is similar in style and context to the following description:

**Original Image Description:**
${originalImageDescription}

**Page Context:**
- Topic: ${context.topic || 'General'}
- Purpose: ${context.purpose || 'Marketing'}
- Tone: ${context.tone || 'Neutral'}
- Section: ${section}
${targetCountry ? `- Target Country: ${targetCountry}` : ''}

**Requirements:**
- Create an image that matches the style and mood of the original
- Maintain similar composition and visual elements
- Ensure it fits the page context and tone
- Make it culturally appropriate for the target country (if specified)
- Keep the same general theme and subject matter

**Output:**
Provide a detailed image generation prompt that can be used to create a similar image.`;

    return prompt;
}

/**
 * Builds a system message for AI conversation
 * @param {Object} context - Page context
 * @returns {string} System message
 */
export function buildSystemMessage(context) {
    return `You are a professional content writer specializing in creating marketing and landing page content.

${CORE_GUIDELINES}

Your expertise includes:
- Maintaining brand voice and style
- Cultural adaptation for different markets
- Natural integration of key messages
- Creating compelling call-to-action content

Always ensure that the core guidelines are naturally woven into the content without sounding forced or repetitive.`;

}


