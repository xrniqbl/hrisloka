import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive emoji removal - covers ALL unicode emoji ranges
function removeAllEmoji(text) {
    return text
        // Main emoji blocks
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (☀ ☁ ⭐ etc)
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{2702}-\u{27B0}]/gu, '')
        // Specific commonly-used symbol chars
        .replace(/[\u2B50\u2B55]/gu, '')         // ⭐ 🔴
        .replace(/[\u23F3\u23F0]/gu, '')         // ⏳ ⏰
        .replace(/[\u2705\u274C\u274E]/gu, '')   // ✅ ❌ ❎
        .replace(/[\u2714\u2716]/gu, '')         // ✔ ✖  
        .replace(/[\u2728\u2733\u2734]/gu, '')   // ✨ ✳ ✴
        .replace(/[\u25B6\u25C0\u25AA\u25AB]/gu, '') // ▶ ◀ ▪ ▫
        .replace(/[\u2139\u2194\u2195\u2196\u2197\u2198\u2199]/gu, '') // ℹ ↔ ↕ ↖ ↗ ↘ ↙
        .replace(/[\u21A9\u21AA]/gu, '')         // ↩ ↪
        .replace(/[\u231A\u231B]/gu, '')         // ⌚ ⌛
        .replace(/[\u2328]/gu, '')               // ⌨
        .replace(/[\u23CF]/gu, '')               // ⏏
        .replace(/[\u24C2]/gu, '')               // Ⓜ
        .replace(/[\u25FB-\u25FE]/gu, '')        // ◻◼◽◾
        .replace(/[\u2600-\u2604]/gu, '')        // ☀☁☂☃☄
        .replace(/[\u260E]/gu, '')               // ☎
        .replace(/[\u2611]/gu, '')               // ☑
        .replace(/[\u2614\u2615]/gu, '')         // ☔ ☕
        .replace(/[\u2618]/gu, '')               // ☘
        .replace(/[\u261D]/gu, '')               // ☝
        .replace(/[\u2620]/gu, '')               // ☠
        .replace(/[\u2622\u2623]/gu, '')         // ☢ ☣
        .replace(/[\u2626]/gu, '')               // ☦
        .replace(/[\u262A]/gu, '')               // ☪
        .replace(/[\u262E\u262F]/gu, '')         // ☮ ☯
        .replace(/[\u2638-\u263A]/gu, '')        // ☸ ☹ ☺
        .replace(/[\u2640\u2642]/gu, '')         // ♀ ♂
        .replace(/[\u2648-\u2653]/gu, '')        // zodiac signs
        .replace(/[\u265F\u2660\u2663\u2665\u2666\u2668]/gu, '') // ♟♠♣♥♦♨
        .replace(/[\u267B\u267E\u267F]/gu, '')   // ♻ ♾ ♿
        .replace(/[\u2693\u2695\u2696\u2697]/gu, '') // ⚓ ⚕ ⚖ ⚗
        .replace(/[\u2699\u269B\u269C]/gu, '')   // ⚙ ⚛ ⚜
        .replace(/[\u26A0\u26A1]/gu, '')         // ⚠ ⚡
        .replace(/[\u26AA\u26AB]/gu, '')         // ⚪ ⚫
        .replace(/[\u26B0\u26B1]/gu, '')         // ⚰ ⚱
        .replace(/[\u26BD\u26BE]/gu, '')         // ⚽ ⚾
        .replace(/[\u26C4\u26C5]/gu, '')         // ⛄ ⛅
        .replace(/[\u26CE\u26CF\u26D1\u26D3\u26D4]/gu, '')
        .replace(/[\u26E9\u26EA]/gu, '')
        .replace(/[\u26F0-\u26F5]/gu, '')
        .replace(/[\u26F7-\u26FA]/gu, '')
        .replace(/[\u26FD]/gu, '')
        // Stars and special chars people often use as emoji
        .replace(/[★☆✦✧✩✪✫✬✭✮✯✰]/g, '')
        // Variation selectors (make emoji colored)
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        // Zero width joiner
        .replace(/[\u{200D}]/gu, '')
        // Regional indicator letters (flags)
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        // Tag chars
        .replace(/[\u{E0000}-\u{E007F}]/gu, '')
        // Clean up double spaces
        .replace(/  +/g, ' ')
        // Clean up empty string literals left behind
        .replace(/'  '/g, "''")
        .replace(/"  "/g, '""');
}

function processDir(dir) {
    let count = 0;
    let files;
    try { files = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return 0; }

    for (const f of files) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) {
            count += processDir(full);
        } else if (
            f.name.endsWith('.jsx') || f.name.endsWith('.js') ||
            f.name.endsWith('.tsx') || f.name.endsWith('.ts') ||
            f.name.endsWith('.css') || f.name.endsWith('.html')
        ) {
            try {
                const content = fs.readFileSync(full, 'utf8');
                const cleaned = removeAllEmoji(content);
                if (cleaned !== content) {
                    fs.writeFileSync(full, cleaned, 'utf8');
                    console.log('  Fixed:', path.relative(path.join(__dirname, 'src'), full));
                    count++;
                }
            } catch (e) {
                console.error('  Error processing:', f.name, e.message);
            }
        }
    }
    return count;
}

console.log('Scanning for emojis...');
let total = 0;
const dirs = ['src/pages', 'src/components', 'src/layouts', 'src/lib', 'src/services', 'src/hooks', 'src/context'];
for (const d of dirs) {
    const fullDir = path.join(__dirname, d);
    if (fs.existsSync(fullDir)) {
        total += processDir(fullDir);
    }
}
console.log(`\nDone! Cleaned ${total} files.`);
