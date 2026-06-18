const fs = require('fs');
const path = require('path');

// Emoji patterns to remove (with optional trailing space)
const emojiList = [
    '🏷️', '✏️', '🏢', '📍', '📊', '📁', '👥', '📋', '📅', '💰',
    '🎯', '📝', '📈', '📄', '🎓', '💳', '🏖', '⏰', '🏥', '📑',
    '🔔', '🛡️', '💡', '🔒', '⭐', '⚠', '✅', '⛔', '🛡', '🎉',
    '🎊', '🔗', '🏠', '⚡', '✓', '🗓️', '📢', '🔧', '🤖', '💼',
    '🔄', '📦', '🆔', '🏗️', '🕐', '🧑', '🗂️', '✨', '🚀', '📮',
    '🏆', '📃', '🔍', '💻', '🎥', '📂', '⏱️', '🗃️', '📌', '🧾',
    '💵', '📖', '🌐', '📜', '🏗', '⚙️', '🗓',
];

function removeEmoji(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let count = 0;
    for (const f of files) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) {
            count += removeEmoji(full);
        } else if (f.name.endsWith('.jsx') || f.name.endsWith('.js')) {
            let content = fs.readFileSync(full, 'utf8');
            const orig = content;
            for (const emoji of emojiList) {
                // Remove emoji + optional trailing space
                content = content.split(emoji + ' ').join('');
                content = content.split(emoji).join('');
            }
            if (content !== orig) {
                fs.writeFileSync(full, content, 'utf8');
                console.log('Fixed:', f.name);
                count++;
            }
        }
    }
    return count;
}

const pagesDir = path.join(__dirname, 'src', 'pages');
const componentsDir = path.join(__dirname, 'src', 'components');
const layoutsDir = path.join(__dirname, 'src', 'layouts');
const libDir = path.join(__dirname, 'src', 'lib');

let total = 0;
total += removeEmoji(pagesDir);
total += removeEmoji(componentsDir);
total += removeEmoji(layoutsDir);
total += removeEmoji(libDir);
console.log(`\nDone! Fixed ${total} files.`);
