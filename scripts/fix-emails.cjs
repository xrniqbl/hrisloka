const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/pages/employee');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let totalFixes = 0;
files.forEach(f => {
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('ahmad.rizky@company.com')) {
    const updated = c.replace(/ \|\| 'ahmad\.rizky@company\.com'/g, '');
    fs.writeFileSync(fp, updated, 'utf8');
    console.log('Fixed: ' + f);
    totalFixes++;
  }
});
console.log('Total files fixed: ' + totalFixes);
