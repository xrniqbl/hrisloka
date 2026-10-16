import re

# Read the file
with open('src/pages/JobPosting.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
if "import { Button }" not in content:
    content = content.replace(
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';",
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';"
    )

# 2. Replace buttons
content = content.replace(
    '<button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> Buat Lowongan</button>',
    '<Button onClick={() => setShowForm(true)}><FiPlus /> Buat Lowongan</Button>'
)

# 3. Replace modal structure
content = content.replace(
    '<div className="modal-overlay" onClick={() => setShowForm(false)}>',
    '<Dialog open={showForm} onOpenChange={setShowForm}>'
)
content = content.replace(
    '<div className="modal-box large" onClick={(e) => e.stopPropagation()}',
    '<DialogContent className="max-w-2xl"'
)
content = content.replace(
    '<div className="modal-header">\n              <h2>Buat Lowongan Baru</h2>\n              <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>\n            </div>',
    '<DialogHeader>\n              <DialogTitle>Buat Lowongan Baru</DialogTitle>\n              <DialogDescription>Lengkapi form di bawah untuk mempublikasikan lowongan pekerjaan</DialogDescription>\n            </DialogHeader>'
)
content = content.replace('<div className="modal-body">', '')
content = content.replace(
    '<div className="modal-footer">',
    '<DialogFooter>'
)
content = content.replace(
    '</div>\n          </div>\n        </div>',
    '</DialogFooter>\n      </DialogContent>\n    </Dialog>'
)

# 4. Replace buttons in modal
content = content.replace(
    '<button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>',
    '<Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>'
)
content = content.replace(
    '<button className="btn-primary" onClick={handleSubmit} disabled={!form.title || !form.department}>Publikasi</button>',
    '<Button onClick={handleSubmit} disabled={!form.title || !form.department}>Publikasi</Button>'
)

# 5. Replace form inputs
content = content.replace(
    '<label className="form-label">Judul Posisi *</label>',
    '<Label>Judul Posisi *</Label>'
)
content = content.replace(
    '<input className="form-input" placeholder="Misal: Frontend Developer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />',
    '<Input placeholder="Misal: Frontend Developer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />'
)

content = content.replace(
    '<label className="form-label">Departemen *</label>',
    '<Label>Departemen *</Label>'
)
content = content.replace(
    '<input className="form-input" placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />',
    '<Input placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />'
)

content = content.replace(
    '<label className="form-label">Lokasi</label>',
    '<Label>Lokasi</Label>'
)
content = content.replace(
    '<input className="form-input" placeholder="Jakarta, Indonesia" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />',
    '<Input placeholder="Jakarta, Indonesia" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />'
)

content = content.replace(
    '<label className="form-label">Tipe</label>',
    '<Label>Tipe</Label>'
)
content = content.replace(
    '<select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>\n              <option value="full-time">Full-time</option>\n              <option value="part-time">Part-time</option>\n              <option value="contract">Contract</option>\n              <option value="intern">Internship</option>\n            </select>',
    '<Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>\n              <SelectTrigger>\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                <SelectItem value="full-time">Full-time</SelectItem>\n                <SelectItem value="part-time">Part-time</SelectItem>\n                <SelectItem value="contract">Contract</SelectItem>\n                <SelectItem value="intern">Internship</SelectItem>\n              </SelectContent>\n            </Select>'
)

content = content.replace(
    '<label className="form-label">Deadline</label>',
    '<Label>Deadline</Label>'
)
content = content.replace(
    '<input className="form-input" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />',
    '<Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />'
)

content = content.replace(
    '<label className="form-label">Deskripsi</label>',
    '<Label>Deskripsi</Label>'
)
content = content.replace(
    '<textarea className="form-textarea" placeholder="Deskripsi pekerjaan..." style={{ minHeight: 100 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />',
    '<Textarea placeholder="Deskripsi pekerjaan..." style={{ minHeight: 100 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />'
)

content = content.replace(
    '<label className="form-label">Persyaratan (pisahkan dengan koma)</label>',
    '<Label>Persyaratan (pisahkan dengan koma)</Label>'
)
content = content.replace(
    '<input className="form-input" placeholder="React, TypeScript, 3+ tahun pengalaman" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />',
    '<Input placeholder="React, TypeScript, 3+ tahun pengalaman" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />'
)

# Write the file
with open('src/pages/JobPosting.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('JobPosting.jsx migrated successfully')
