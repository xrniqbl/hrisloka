import re

with open('src/pages/Helpdesk.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { Button }" not in content:
    content = content.replace(
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';",
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';"
    )

content = content.replace(
    '<button className="btn-primary" onClick={openSubmit}><FiPlus /> Submit Tiket</button>',
    '<Button onClick={openSubmit}><FiPlus /> Submit Tiket</Button>'
)

content = content.replace(
    '<button className="btn-secondary" onClick={closeModal}>Batal</button>',
    '<Button variant="outline" onClick={closeModal}>Batal</Button>'
)

content = content.replace(
    '<button className="btn-primary" onClick={handleSubmit} disabled={!form.subject}>Submit Tiket</button>',
    '<Button onClick={handleSubmit} disabled={!form.subject}>Submit Tiket</Button>'
)

content = content.replace(
    '<button className="modal-close" onClick={closeModal}><FiX /></button>',
    '<Button variant="ghost" size="icon" className="modal-close" onClick={closeModal}><FiX /></Button>'
)

content = content.replace(
    '<div className="modal-overlay" onClick={closeModal}>',
    '<Dialog open={modal !== null} onOpenChange={(open) => !open && closeModal()}>'
)

content = content.replace(
    '<div className="modal-box large" onClick={e => e.stopPropagation()}>',
    '<DialogContent className="max-w-2xl">'
)

content = content.replace(
    '<div className="modal-box" onClick={e => e.stopPropagation()}>',
    '<DialogContent className="max-w-2xl">'
)

content = content.replace(
    '<div className="modal-header">\n              <h2>Detail Tiket - #{selected.id}</h2>',
    '<DialogHeader>\n              <DialogTitle>Detail Tiket - #{selected.id}</DialogTitle>'
)

content = content.replace(
    '<div className="modal-header">\n              <h2>Submit Tiket Baru</h2>',
    '<DialogHeader>\n              <DialogTitle>Submit Tiket Baru</DialogTitle>'
)

content = content.replace('<div className="modal-body">', '')
content = content.replace('<div className="modal-footer">', '<DialogFooter>')

content = content.replace('<label className="form-label">Subject</label>', '<Label>Subject</Label>')
content = content.replace('<label className="form-label">Kategori</label>', '<Label>Kategori</Label>')
content = content.replace('<label className="form-label">Priority</label>', '<Label>Priority</Label>')
content = content.replace('<label className="form-label">Deskripsi</label>', '<Label>Deskripsi</Label>')

content = content.replace(
    '<input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Deskripsikan masalah secara singkat" />',
    '<Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Deskripsikan masalah secara singkat" />'
)

content = content.replace(
    '<textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan detail masalah..." rows={4} />',
    '<Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Jelaskan detail masalah..." rows={4} />'
)

with open('src/pages/Helpdesk.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Helpdesk.jsx migrated')
