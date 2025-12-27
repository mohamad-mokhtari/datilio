const fs = require('fs');
const path = require('path');

/**
 * Tailwind CSS Safelist Generator Plugin
 * Generates dynamic class patterns and writes them to a safelist file
 */
module.exports = function twSafelistGenerator(options = {}) {
    const { path: safelistPath = 'safelist.txt', patterns = [] } = options;

    // Generate safelist classes based on patterns
    const generateSafelist = (patterns) => {
        const safelist = new Set();
        
        patterns.forEach(pattern => {
            // Handle color patterns like text-{colors}, bg-{colors}
            if (pattern.includes('{colors}')) {
                // Common Tailwind color names
                const colors = [
                    'slate', 'gray', 'zinc', 'neutral', 'stone',
                    'red', 'orange', 'amber', 'yellow', 'lime',
                    'green', 'emerald', 'teal', 'cyan', 'sky',
                    'blue', 'indigo', 'violet', 'purple', 'fuchsia',
                    'pink', 'rose'
                ];
                
                // Common color shades
                const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
                
                colors.forEach(color => {
                    shades.forEach(shade => {
                        const className = pattern
                            .replace('{colors}', `${color}-${shade}`)
                            .replace(/\{/g, '')
                            .replace(/\}/g, '');
                        safelist.add(className);
                    });
                });
            }
            
            // Handle height/width patterns like h-{height}, w-{width}
            if (pattern.includes('{height}') || pattern.includes('{width}')) {
                // Common Tailwind spacing values
                const sizes = [
                    '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4',
                    '5', '6', '7', '8', '9', '10', '11', '12', '14', '16',
                    '20', '24', '28', '32', '36', '40', '44', '48', '52', '56',
                    '60', '64', '72', '80', '96', 'auto', 'full', 'screen', 'min', 'max', 'fit'
                ];
                
                sizes.forEach(size => {
                    const className = pattern
                        .replace('{height}', size)
                        .replace('{width}', size)
                        .replace(/\{/g, '')
                        .replace(/\}/g, '');
                    safelist.add(className);
                });
            }
        });
        
        return Array.from(safelist).sort();
    };

    // Generate the safelist
    const safelistClasses = generateSafelist(patterns);
    
    // Write to file
    const fullPath = path.resolve(process.cwd(), safelistPath);
    const content = safelistClasses.join('\n') + '\n';
    
    try {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✓ Safelist generated: ${safelistClasses.length} classes written to ${safelistPath}`);
    } catch (error) {
        console.warn(`⚠ Could not write safelist to ${safelistPath}:`, error.message);
    }

    // Return Tailwind plugin
    return function({ addUtilities, theme }) {
        // The safelist is handled via the content array in tailwind.config.cjs
        // This plugin mainly generates the safelist file
        // You can also add utilities here if needed
    };
};

