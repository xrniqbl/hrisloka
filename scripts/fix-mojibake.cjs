const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/employee/EmpProfile.jsx');
let content = fs.readFileSync(file, 'utf8');

const original = content;

content = content
  .replace(/â€"/g, '\u2014')
  .replace(/â€¢/g, '\u2022')
  .replace(/â€˜/g, '\u2018')
  .replace(/â€™/g, '\u2019')
  .replace(/â—/g, '\u25cf')
  .replace(/â—‹/g, '\u25cb')
  .replace(/â•â•â•/g, '===')
  .replace(/â"€â"€â"€/g, '---');

if (content !== original) {
  fs.writeFileSync(file, content, 'utf8');
  const origLines = original.split('\n');
  const newLines = content.split('\n');
  origLines.forEach((l, i) => {
    if (l !== newLines[i]) {
      console.log('Line ' + (i+1) + ': ' + l.trim().slice(0, 80));
      console.log('  -> ' + newLines[i].trim().slice(0, 80));
    }
  });
  console.log('Done.');
} else {
  console.log('No mojibake found.');
}
