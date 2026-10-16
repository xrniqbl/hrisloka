import re

with open('src/pages/Documents.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'import { Table,' not in content:
    content = content.replace(
        "import { PageSkeleton } from '../components/SkeletonLoader';",
        "import { PageSkeleton } from '../components/SkeletonLoader';\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';"
    )

content = content.replace(
    '<button className="btn-primary" onClick={() => setShowUpload(true)}><FiUpload /> Upload Dokumen</button>',
    '<Button onClick={() => setShowUpload(true)}><FiUpload /> Upload Dokumen</Button>'
)

content = content.replace(
    '<input className="filter-search" style={{ paddingLeft: 38 }} placeholder="Cari dokumen..." value={search} onChange={(e) => setSearch(e.target.value)} />',
    '<Input className="filter-search" style={{ paddingLeft: 38 }} placeholder="Cari dokumen..." value={search} onChange={(e) => setSearch(e.target.value)} />'
)

content = content.replace('<table className="data-table">', '<Table>')
content = content.replace('<thead>', '<TableHeader>')
content = content.replace('</thead>', '</TableHeader>')
content = content.replace('<tbody>', '<TableBody>')
content = content.replace('</tbody>', '</TableBody>')
content = content.replace('</table>', '</Table>')

content = re.sub(r'<tr>(.*?)</tr>', r'<TableRow>\1</TableRow>', content, flags=re.DOTALL)
content = re.sub(r'<th(.*?)>(.*?)</th>', r'<TableHead\1>\2</TableHead>', content)
content = re.sub(r'<td(.*?)>(.*?)</td>', r'<TableCell\1>\2</TableCell>', content, flags=re.DOTALL)

with open('src/pages/Documents.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Documents.jsx migrated')
