import re

# Read the file
with open('src/pages/Departments.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
if 'import { Table,' not in content:
    content = content.replace(
        "import '../styles/admin.css';",
        "import '../styles/admin.css';\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';"
    )

# 2. Replace buttons
content = content.replace('<button className="btn-primary"', '<Button')
content = content.replace('<button className="btn-secondary"', '<Button variant="outline"')
content = content.replace('<button className="action-btn"', '<Button variant="ghost" size="icon" className="action-btn"')
content = content.replace('<button className="action-btn danger"', '<Button variant="ghost" size="icon" className="action-btn danger"')
content = content.replace('<button className="modal-close"', '<Button variant="ghost" size="icon" className="modal-close"')
content = content.replace('</button>', '</Button>')

# 3. Replace table
content = content.replace('<table className="data-table">', '<Table>')
content = content.replace('<thead>', '<TableHeader>')
content = content.replace('</thead>', '</TableHeader>')
content = content.replace('<tbody>', '<TableBody>')
content = content.replace('</tbody>', '</TableBody>')
content = content.replace('</table>', '</Table>')

# Replace table rows
content = re.sub(r'<tr(.*?)>', r'<TableRow\1>', content)
content = content.replace('</tr>', '</TableRow>')

# Replace th and td
content = re.sub(r'<th(.*?)>', r'<TableHead\1>', content)
content = content.replace('</th>', '</TableHead>')
content = re.sub(r'<td(.*?)>', r'<TableCell\1>', content)
content = content.replace('</td>', '</TableCell>')

# 4. Replace modal
content = content.replace('<div className="modal-overlay" onClick={() => setShowModal(false)}>', '<Dialog open={showModal} onOpenChange={setShowModal}>')
content = content.replace('<div className="modal-box" onClick={e => e.stopPropagation()}>', '<DialogContent className="max-w-2xl">')
content = content.replace('<div className="modal-header">', '<DialogHeader>')
content = content.replace('<h2>{editDept ? \'Edit Departemen\' : \'Tambah Departemen Baru\'}</h2>', '<DialogTitle>{editDept ? \'Edit Departemen\' : \'Tambah Departemen Baru\'}</DialogTitle>')
content = content.replace('</div>\n            <div className="modal-body">', '</DialogHeader>\n            <div className="modal-body">')
content = content.replace('<div className="modal-footer">', '<DialogFooter>')
content = content.replace('</div>\n          </div>\n        </div>\n      )}', '</DialogFooter>\n        </DialogContent>\n      </Dialog>\n      )}')

# 5. Replace form inputs
content = content.replace('<input className="form-input"', '<Input')
content = content.replace('<textarea className="form-textarea"', '<Textarea')
content = content.replace('<label className="form-label">', '<Label>')
content = content.replace('</label>', '</Label>')

# Write the file
with open('src/pages/Departments.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Departments.jsx migrated successfully')
