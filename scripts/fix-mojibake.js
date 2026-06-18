const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/employee/EmpProfile.jsx');
let content = fs.readFileSync(file, 'utf8');

// Fix mojibake patterns - these are UTF-8 chars mis-encoded as latin1
const fixes = [
  // em dash: â€" -> —
  [/\u00e2\u0080\u0094/g, '\u2014'],
  // en dash: â€" -> –  
  [/\u00e2\u0080\u0093/g, '\u2013'],
  // bullet: â€¢ -> •
  [/\u00e2\u0080\u00a2/g, '\u2022'],
  // left single quote: â€˜ -> '
  [/\u00e2\u0080\u0098/g, '\u2018'],
  // right single quote: â€™ -> '
  [/\u00e2\u0080\u0099/g, '\u2019'],
  // small circle/bullet: â—‹ -> ○ 
  [/\u00e2\u25cb/g, '\u25cb'],
  // filled circle: â— -> ●
  [/\u00e2\u2022/g, '\u2022'],
  // Box drawing chars (comment decorators) - replace â•â•â•  patterns
  [/\u00e2\u2550{2,}/g, '\u2550\u2550\u2550'],
  [/\u00e2\u2500{2,}/g, '\u2500\u2500\u2500'],
];

let original = content;

// More targeted: fix the specific visible mojibake text patterns
// These appear as actual string literals in the JSX
content = content
  // em dash used as separator e.g.  "Position â€" Division"
  .replace(/â€"/g, '\u2014')
  // bullet separator  
  .replace(/â€¢/g, '\u2022')
  // left/right quotes
  .replace(/â€˜/g, '\u2018')
  .replace(/â€™/g, '\u2019')
  // filled circle used for status: â— 
  .replace(/â—/g, '\u25cf')
  // The circle used for password rules: â—‹
  .replace(/â—‹/g, '\u25cb')
  // box drawing for comments â•â•â•
  .replace(/â•â•â•/g, '———')
  .replace(/â"€â"€â"€/g, '---');

if (content !== original) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed mojibake in EmpProfile.jsx');
  // Show what changed
  const origLines = original.split('\n');
  const newLines = content.split('\n');
  origLines.forEach((l, i) => {
    if (l !== newLines[i]) {
      console.log(`  Line ${i+1}: ${JSON.stringify(l.trim().slice(0, 80))}`);
      console.log(`       -> ${JSON.stringify(newLines[i].trim().slice(0, 80))}`);
    }
  });
} else {
  console.log('No changes needed');
}
