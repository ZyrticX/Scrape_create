import { generateText } from './openRouterClient.js';
import { CORE_GUIDELINES } from './promptBuilder.js';

/**
 * Rewrites article content with a single prompt
 * @param {Object} article - Article object from simpleArticleExtractor
 * @param {Object} context - Page context
 * @param {string} targetLanguage - Target language
 * @param {string} targetCountry - Target country
 * @param {string} textModel - Model ID to use (optional)
 * @returns {Promise<Object>} Rewritten article structure
 */
export async function rewriteArticle(article, context, targetLanguage = 'English', targetCountry = null, textModel = null) {
    const articleMarkdown = article.content.join('\n\n');
    
    const prompt = `You are a professional content writer specializing in creating engaging articles.

${CORE_GUIDELINES}

**Original Article:**

${articleMarkdown}

**Task:**
Rewrite this article from a different angle or with a different story, but keep the EXACT SAME STRUCTURE.

**Requirements:**
- Target Language: ${targetLanguage}
- Target Country: ${targetCountry || 'General'}
- Keep the same number of headings (# ## ###)
- Keep the same number of paragraphs
- Keep approximately the same length (±20%)
- Maintain the same tone and writing style
- Ensure the core guidelines are naturally integrated into the content
- Make it culturally appropriate for ${targetCountry || 'the target audience'}

**IMPORTANT:**
- Output ONLY the rewritten article
- Use the same markdown structure (# for h1, ## for h2, etc.)
- NO explanations or commentary
- NO additional sections

**Output Format:**
# Main Heading
## Subheading
Paragraph text...

## Another Subheading  
Paragraph text...`;

    const systemMessage = `You are a professional content writer. Follow the instructions exactly. Output only the requested content without any explanations.`;

    // Generate rewritten article
    const rewrittenMarkdown = await generateText(prompt, systemMessage, { 
        maxTokens: 8000, // Increased to handle longer articles
        temperature: 0.8,
        model: textModel // Use specified model
    });

    // Parse the rewritten content back into structure
    return parseMarkdownToStructure(rewrittenMarkdown, article.structure);
}

/**
 * Generates new comments with local names
 * @param {Array} originalComments - Original comments
 * @param {string} articleContent - New article content (for relevance)
 * @param {string} targetCountry - Target country
 * @param {string} textModel - Model ID to use (optional)
 * @returns {Promise<Array>} New comments with local names
 */
export async function generateComments(originalComments, articleContent, targetCountry = 'USA', textModel = null) {
    if (!originalComments || originalComments.length === 0) {
        return [];
    }

    const countryNameExamples = {
        'USA': 'John Smith, Mary Johnson, Robert Davis, Jennifer Wilson',
        'Israel': 'David Cohen, Sarah Levy, Michael Goldstein, Rachel Katz',
        'South Africa': 'Johan van der Merwe, Sarah Naidoo, Michael Botha, Thandi Dlamini',
        'Germany': 'Hans Müller, Anna Schmidt, Michael Wagner, Julia Fischer',
        'France': 'Pierre Dupont, Marie Martin, Jean Bernard, Sophie Laurent'
    };

    const exampleNames = countryNameExamples[targetCountry] || 'John Smith, Mary Johnson, Robert Davis, Jennifer Wilson';

    const prompt = `Generate ${originalComments.length} realistic user comments for an article.

**Article Topic:** ${articleContent.substring(0, 200)}...

**Requirements:**
- Generate comments that sound authentic and varied
- Use names appropriate for ${targetCountry} (examples: ${exampleNames})
- Each comment should be ${originalComments[0]?.content?.length || 100} characters approximately
- Include realistic dates (recent, like "2 days ago", "Yesterday", "3 hours ago")
- Comments should relate to the article topic
- Mix of positive, neutral, and questioning comments
- Some comments can mention experiences or ask questions

**Output Format (JSON only):**
[
  {
    "name": "First Last",
    "date": "2 days ago",
    "content": "Comment text here..."
  },
  ...
]

**IMPORTANT:** 
- Output ONLY the JSON array
- NO markdown code blocks
- NO explanations
- Exactly ${originalComments.length} comments`;

    const systemMessage = `You are a comment generator. Output only valid JSON. No explanations, no markdown, just the JSON array.`;

    const response = await generateText(prompt, systemMessage, {
        maxTokens: 3000,
        temperature: 0.9,
        model: textModel // Use specified model
    });

    // Parse JSON response
    try {
        // Clean up response - remove markdown code blocks if present
        let jsonStr = response.trim();
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const comments = JSON.parse(jsonStr);
        
        // Add selectors from original comments
        return comments.map((comment, index) => ({
            ...comment,
            selector: originalComments[index]?.selector || null,
            classes: originalComments[index]?.classes || null,
            id: originalComments[index]?.id || null
        }));
    } catch (error) {
        console.error('Error parsing comments JSON:', error);
        // Return original comments as fallback
        return originalComments;
    }
}

/**
 * Parses markdown back into structured format matching original
 */
function parseMarkdownToStructure(markdown, originalStructure) {
    const lines = markdown.split('\n').filter(l => l.trim());
    const newStructure = [];
    let structureIndex = 0;

    lines.forEach(line => {
        const trimmed = line.trim();
        
        // Detect heading level
        let type = 'p';
        let text = trimmed;
        
        if (trimmed.startsWith('# ')) {
            type = 'h1';
            text = trimmed.substring(2).trim();
        } else if (trimmed.startsWith('## ')) {
            type = 'h2';
            text = trimmed.substring(3).trim();
        } else if (trimmed.startsWith('### ')) {
            type = 'h3';
            text = trimmed.substring(4).trim();
        } else if (trimmed.startsWith('#### ')) {
            type = 'h4';
            text = trimmed.substring(5).trim();
        }

        // Match with original structure to preserve selectors
        const matchingOriginal = originalStructure.find((item, idx) => 
            idx >= structureIndex && item.type === type
        );

        if (matchingOriginal) {
            newStructure.push({
                type,
                text,
                selector: matchingOriginal.selector,
                classes: matchingOriginal.classes,
                id: matchingOriginal.id
            });
            structureIndex = originalStructure.indexOf(matchingOriginal) + 1;
        } else {
            newStructure.push({
                type,
                text,
                selector: null,
                classes: null,
                id: null
            });
        }
    });

    return newStructure;
}

