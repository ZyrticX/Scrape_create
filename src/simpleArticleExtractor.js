import * as cheerio from 'cheerio';

/**
 * Extracts article content and comments from HTML
 * Simple approach - extract main content as one piece
 * @param {string} html - HTML content
 * @param {Object} context - Page context
 * @returns {Object} Extracted content {article, comments, form}
 */
export function extractArticle(html, context) {
    const $ = cheerio.load(html);
    
    const result = {
        article: {
            title: '',
            content: [],
            structure: []
        },
        comments: [],
        form: {
            exists: false,
            html: null
        }
    };

    // Extract main article content
    // Look for main content containers
    const mainSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.article',
        '.content',
        '.main-content',
        '.page-wrapper .left-side-div' // Specific to the ProTrader template
    ];

    let $mainContainer = null;
    for (const selector of mainSelectors) {
        const $found = $(selector);
        if ($found.length > 0) {
            $mainContainer = $found.first();
            break;
        }
    }

    if (!$mainContainer || $mainContainer.length === 0) {
        $mainContainer = $('body');
    }

    // Extract article structure
    // Get main heading (h1)
    const $h1 = $mainContainer.find('h1').first();
    if ($h1.length > 0) {
        result.article.title = $h1.text().trim();
        result.article.structure.push({
            type: 'h1',
            text: $h1.text().trim(),
            selector: getElementSelector($h1)
        });
    }

    // Get all headings and paragraphs in order
    $mainContainer.find('h1, h2, h3, h4, h5, h6, p').each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.clone().children().remove().end().text().trim();
        
        if (text && text.length > 10) {
            const tag = elem.name;
            result.article.content.push(`${getMarkdownPrefix(tag)}${text}`);
            result.article.structure.push({
                type: tag,
                text: text,
                selector: getElementSelector($elem),
                classes: $elem.attr('class') || null,
                id: $elem.attr('id') || null
            });
        }
    });

    // Extract comments
    const commentSelectors = [
        '.comment',
        '.feedback',
        '[class*="comment"]',
        '.div-block-4' // Specific to ProTrader template
    ];

    commentSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
            const $comment = $(elem);
            
            // Try to extract comment parts
            const name = $comment.find('.text-block-3, .name, [class*="name"]').first().text().trim() ||
                        $comment.find('strong, b').first().text().trim();
            const date = $comment.find('.gray-small-text, .date, [class*="date"]').first().text().trim();
            const content = $comment.find('.feedback-text, p').first().text().trim();
            
            if (name || content) {
                result.comments.push({
                    name: name || 'Anonymous',
                    date: date || '',
                    content: content || '',
                    selector: getElementSelector($comment),
                    classes: $comment.attr('class') || null,
                    id: $comment.attr('id') || null
                });
            }
        });
    });

    // Check for registration form
    const $form = $('form');
    if ($form.length > 0) {
        result.form.exists = true;
        result.form.html = $.html($form.first());
        result.form.selector = getElementSelector($form.first());
    }

    return result;
}

/**
 * Gets a unique selector for an element
 */
function getElementSelector($elem) {
    const id = $elem.attr('id');
    if (id) {
        return `#${id}`;
    }
    
    const classes = $elem.attr('class');
    if (classes) {
        const firstClass = classes.split(' ')[0];
        return `.${firstClass}`;
    }
    
    return $elem.prop('tagName').toLowerCase();
}

/**
 * Gets markdown prefix for heading levels
 */
function getMarkdownPrefix(tag) {
    const prefixes = {
        'h1': '# ',
        'h2': '## ',
        'h3': '### ',
        'h4': '#### ',
        'h5': '##### ',
        'h6': '###### ',
        'p': ''
    };
    return prefixes[tag] || '';
}

/**
 * Converts article structure to markdown
 * @param {Object} article - Article object from extractArticle
 * @returns {string} Markdown formatted article
 */
export function articleToMarkdown(article) {
    return article.content.join('\n\n');
}




