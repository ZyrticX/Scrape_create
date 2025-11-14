import * as cheerio from 'cheerio';

/**
 * Analyzes the structure and organization of a webpage
 * @param {string} html - The HTML content
 * @param {string} url - The page URL
 * @param {string} title - The page title
 * @returns {Object} Structure analysis
 */
export function analyzeStructure(html, url, title) {
    const $ = cheerio.load(html);
    
    const analysis = {
        metadata: {
            url,
            title,
            analyzedAt: new Date().toISOString()
        },
        structure: {
            sections: [],
            navigation: [],
            forms: [],
            images: [],
            links: [],
            scripts: [],
            stylesheets: []
        },
        statistics: {
            totalElements: 0,
            totalText: 0,
            totalImages: 0,
            totalLinks: 0,
            totalForms: 0
        }
    };

    // Analyze main sections (header, main, footer, etc.)
    const mainSections = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    mainSections.forEach(section => {
        $(section).each((i, elem) => {
            const $elem = $(elem);
            const sectionData = {
                tag: section,
                id: $elem.attr('id') || null,
                classes: $elem.attr('class') || null,
                textPreview: $elem.text().substring(0, 100).trim(),
                childrenCount: $elem.children().length
            };
            analysis.structure.sections.push(sectionData);
        });
    });

    // Analyze navigation
    $('nav, [role="navigation"]').each((i, elem) => {
        const $nav = $(elem);
        const links = [];
        $nav.find('a').each((j, link) => {
            links.push({
                text: $(link).text().trim(),
                href: $(link).attr('href') || null
            });
        });
        analysis.structure.navigation.push({
            id: $nav.attr('id') || null,
            classes: $nav.attr('class') || null,
            links: links
        });
    });

    // Analyze forms
    $('form').each((i, elem) => {
        const $form = $(elem);
        const inputs = [];
        $form.find('input, textarea, select, button').each((j, input) => {
            const $input = $(input);
            inputs.push({
                type: $input.attr('type') || $input.prop('tagName').toLowerCase(),
                name: $input.attr('name') || null,
                id: $input.attr('id') || null,
                placeholder: $input.attr('placeholder') || null
            });
        });
        analysis.structure.forms.push({
            id: $form.attr('id') || null,
            action: $form.attr('action') || null,
            method: $form.attr('method') || 'get',
            inputs: inputs
        });
    });

    // Analyze images
    $('img').each((i, elem) => {
        const $img = $(elem);
        analysis.structure.images.push({
            src: $img.attr('src') || null,
            alt: $img.attr('alt') || null,
            class: $img.attr('class') || null,
            id: $img.attr('id') || null
        });
    });

    // Analyze links
    $('a[href]').each((i, elem) => {
        const $link = $(elem);
        const href = $link.attr('href');
        if (href && !href.startsWith('#')) {
            analysis.structure.links.push({
                text: $link.text().trim(),
                href: href,
                isExternal: href.startsWith('http'),
                class: $link.attr('class') || null
            });
        }
    });

    // Analyze scripts
    $('script').each((i, elem) => {
        const $script = $(elem);
        const src = $script.attr('src');
        analysis.structure.scripts.push({
            src: src || null,
            type: $script.attr('type') || 'text/javascript',
            isInline: !src,
            length: $script.text().length
        });
    });

    // Analyze stylesheets
    $('link[rel="stylesheet"]').each((i, elem) => {
        const $link = $(elem);
        analysis.structure.stylesheets.push({
            href: $link.attr('href') || null,
            media: $link.attr('media') || 'all'
        });
    });

    // Calculate statistics
    analysis.statistics.totalElements = $('*').length;
    analysis.statistics.totalText = $('body').text().length;
    analysis.statistics.totalImages = analysis.structure.images.length;
    analysis.statistics.totalLinks = analysis.structure.links.length;
    analysis.statistics.totalForms = analysis.structure.forms.length;

    // Analyze page hierarchy
    analysis.hierarchy = buildHierarchy($, $('body'), 0, 5); // Max depth 5

    return analysis;
}

/**
 * Builds a hierarchical structure of the page
 * @param {Function} $ - Cheerio function
 * @param {cheerio.Cheerio} element - Root element
 * @param {number} depth - Current depth
 * @param {number} maxDepth - Maximum depth to traverse
 * @returns {Object} Hierarchy object
 */
function buildHierarchy($, element, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
        return null;
    }

    const tag = element[0]?.name;
    if (!tag) return null;

    const $elem = element;
    const result = {
        tag,
        id: $elem.attr('id') || null,
        classes: $elem.attr('class') || null,
        text: $elem.clone().children().remove().end().text().trim().substring(0, 50) || null,
        children: []
    };

    // Only include significant elements
    const significantTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 
                             'div', 'form', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    if (significantTags.includes(tag) || depth === 0) {
        $elem.children().each((i, child) => {
            const childHierarchy = buildHierarchy($, $(child), depth + 1, maxDepth);
            if (childHierarchy) {
                result.children.push(childHierarchy);
            }
        });
    }

    return result;
}

/**
 * Generates a human-readable text representation of the structure
 * @param {Object} analysis - Structure analysis object
 * @returns {string} Text representation
 */
export function generateStructureReport(analysis) {
    let report = `# Structure Analysis Report\n\n`;
    report += `## Page Information\n`;
    report += `- **URL:** ${analysis.metadata.url}\n`;
    report += `- **Title:** ${analysis.metadata.title}\n`;
    report += `- **Analyzed At:** ${analysis.metadata.analyzedAt}\n\n`;

    report += `## Statistics\n`;
    report += `- **Total Elements:** ${analysis.statistics.totalElements}\n`;
    report += `- **Total Text Characters:** ${analysis.statistics.totalText}\n`;
    report += `- **Total Images:** ${analysis.statistics.totalImages}\n`;
    report += `- **Total Links:** ${analysis.statistics.totalLinks}\n`;
    report += `- **Total Forms:** ${analysis.statistics.totalForms}\n\n`;

    if (analysis.structure.sections.length > 0) {
        report += `## Main Sections\n\n`;
        analysis.structure.sections.forEach((section, i) => {
            report += `### ${i + 1}. <${section.tag}>\n`;
            if (section.id) report += `- **ID:** ${section.id}\n`;
            if (section.classes) report += `- **Classes:** ${section.classes}\n`;
            report += `- **Children Count:** ${section.childrenCount}\n`;
            if (section.textPreview) report += `- **Text Preview:** ${section.textPreview}...\n`;
            report += `\n`;
        });
    }

    if (analysis.structure.navigation.length > 0) {
        report += `## Navigation\n\n`;
        analysis.structure.navigation.forEach((nav, i) => {
            report += `### Navigation ${i + 1}\n`;
            if (nav.id) report += `- **ID:** ${nav.id}\n`;
            if (nav.classes) report += `- **Classes:** ${nav.classes}\n`;
            report += `- **Links:** ${nav.links.length}\n`;
            nav.links.slice(0, 10).forEach(link => {
                report += `  - ${link.text || '(no text)'} → ${link.href}\n`;
            });
            report += `\n`;
        });
    }

    if (analysis.structure.forms.length > 0) {
        report += `## Forms\n\n`;
        analysis.structure.forms.forEach((form, i) => {
            report += `### Form ${i + 1}\n`;
            if (form.id) report += `- **ID:** ${form.id}\n`;
            report += `- **Action:** ${form.action || '(none)'}\n`;
            report += `- **Method:** ${form.method}\n`;
            report += `- **Inputs:** ${form.inputs.length}\n`;
            form.inputs.forEach(input => {
                report += `  - ${input.type}${input.name ? ` [name="${input.name}"]` : ''}${input.id ? ` [id="${input.id}"]` : ''}\n`;
            });
            report += `\n`;
        });
    }

    report += `## Page Hierarchy\n\n`;
    report += generateHierarchyText(analysis.hierarchy, 0);

    return report;
}

/**
 * Generates text representation of hierarchy
 * @param {Object} node - Hierarchy node
 * @param {number} indent - Indentation level
 * @returns {string} Text representation
 */
function generateHierarchyText(node, indent = 0) {
    if (!node) return '';
    
    const indentStr = '  '.repeat(indent);
    let text = `${indentStr}- <${node.tag}`;
    if (node.id) text += ` id="${node.id}"`;
    if (node.classes) text += ` class="${node.classes.split(' ')[0]}"`;
    text += `>`;
    if (node.text) text += ` "${node.text}"`;
    text += `\n`;

    node.children.forEach(child => {
        text += generateHierarchyText(child, indent + 1);
    });

    return text;
}

