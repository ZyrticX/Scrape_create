import * as cheerio from 'cheerio';

/**
 * Replaces article content in HTML while preserving all styling and structure
 * @param {string} html - Original HTML
 * @param {Object} newArticle - New article structure from rewriteArticle
 * @param {Array} newComments - New comments from generateComments
 * @returns {string} HTML with replaced content
 */
export function replaceContent(html, newArticle, newComments) {
    const $ = cheerio.load(html);
    
    // Replace article content
    if (newArticle && Array.isArray(newArticle)) {
        newArticle.forEach(item => {
            if (!item.selector || !item.text) return;
            
            const $elem = $(item.selector);
            if ($elem.length > 0) {
                // Replace text content while preserving children structure
                $elem.contents().filter(function() {
                    return this.nodeType === 3; // Text nodes only
                }).first().replaceWith(item.text);
                
                // If no text nodes, set text directly
                if ($elem.contents().filter(function() { return this.nodeType === 3; }).length === 0) {
                    $elem.text(item.text);
                }
            }
        });
    }

    // Replace comments
    if (newComments && Array.isArray(newComments)) {
        newComments.forEach((comment, index) => {
            if (!comment.selector) return;
            
            // Find the comment element
            const $comments = $(comment.selector);
            const $comment = $comments.eq(index);
            
            if ($comment.length > 0) {
                // Replace name
                const $name = $comment.find('.text-block-3, .name, [class*="name"], strong, b').first();
                if ($name.length > 0 && comment.name) {
                    $name.text(comment.name);
                }

                // Replace date
                const $date = $comment.find('.gray-small-text, .date, [class*="date"]').first();
                if ($date.length > 0 && comment.date) {
                    $date.text(comment.date);
                }

                // Replace content
                const $content = $comment.find('.feedback-text, p').first();
                if ($content.length > 0 && comment.content) {
                    // Replace text while preserving HTML structure
                    $content.contents().filter(function() {
                        return this.nodeType === 3;
                    }).each(function() {
                        $(this).replaceWith(comment.content);
                    });
                    
                    // Fallback: if no text nodes, set text directly
                    if ($content.contents().filter(function() { return this.nodeType === 3; }).length === 0) {
                        $content.text(comment.content);
                    }
                }
            }
        });
    }

    // Form/table is NOT modified - it stays as is
    // This is a critical requirement

    return $.html();
}

/**
 * Simple replace that preserves all HTML structure
 * @param {string} html - Original HTML
 * @param {Object} extractedContent - From extractArticle
 * @param {Object} newArticle - From rewriteArticle
 * @param {Array} newComments - From generateComments
 * @returns {string} Updated HTML
 */
export function replaceArticleContent(html, extractedContent, newArticle, newComments) {
    return replaceContent(html, newArticle, newComments);
}




