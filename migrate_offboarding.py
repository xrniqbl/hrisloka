import re

# Read the file
with open('src/pages/Offboarding.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
if "import { Button }" not in content:
    content = content.replace(
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';",
        "import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';\nimport { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';"
    )

# 2. Replace buttons
content = content.replace(
    '<button className="btn-primary" onClick={openInitiate}><FiPlus /> Initiate Offboarding</button>',
    '<Button onClick={openInitiate}><FiPlus /> Initiate Offboarding</Button>'
)

content = content.replace(
    '<button className="modal-close" onClick={closeModal}><FiX /></button>',
    '<Button variant="ghost" size="icon" className="modal-close" onClick={closeModal}><FiX /></Button>'
)

content = content.replace(
    '<button className="btn-secondary" onClick={closeModal}>Batal</button>',
    '<Button variant="outline" onClick={closeModal}>Batal</Button>'
)

content = content.replace(
    '<button className="btn-danger" onClick={handleInitiate} disabled={!form.employeeId || !form.lastWorkingDay}>',
    '<Button variant="destructive" onClick={handleInitiate} disabled={!form.employeeId || !form.lastWorkingDay}>'
)

content = content.replace(
    '<button className="btn-primary" onClick={() => handleStatusChange(selected.id, \'completed\')} style={{ marginTop: 16 }}>',
    '<Button onClick={() => handleStatusChange(selected.id, \'completed\')} style={{ marginTop: 16 }}>'
)

# 3. Replace table structure
content = content.replace('<table className="data-table">', '<Table>')
content = content.replace('<thead>', '<TableHeader>')
content = content.replace('</thead>', '</TableHeader>')
content = content.replace('<tbody>', '<TableBody>')
content = content.replace('</tbody>', '</TableBody>')
content = content.replace('</table>', '</Table>')

content = re.sub(r'<tr(.*?)>', r'<TableRow\1>', content)
content = content.replace('</tr>', '</TableRow>')

content = re.sub(r'<th(.*?)>', r'<TableHead\1>', content)
content = content.replace('</th>', '</TableHead>')

content = re.sub(r'<td(.*?)>', r'<TableCell\1>', content)
content = content.replace('</td>', '</TableCell>')

# 4. Replace initiate modal
content = content.replace(
    '{modal === \'initiate\' && (\n        <div className="modal-overlay" onClick={closeModal}>\n          <div className="modal-box" onClick={e => e.stopPropagation()}>',
    '{modal === \'initiate\' && (\n        <Dialog open={modal === \'initiate\'} onOpenChange={(open) => !open && closeModal()}>\n          <DialogContent className="max-w-2xl">'
)

content = content.replace(
    '<div className="modal-header">\n              <h2><FiAlertTriangle style={{ marginRight: 8 }} /> Initiate Offboarding</h2>\n              <Button variant="ghost" size="icon" className="modal-close" onClick={closeModal}><FiX /></Button>\n            </div>',
    '<DialogHeader>\n              <DialogTitle><FiAlertTriangle style={{ marginRight: 8 }} /> Initiate Offboarding</DialogTitle>\n              <DialogDescription>Lengkapi form untuk memulai proses offboarding karyawan</DialogDescription>\n            </DialogHeader>'
)

content = content.replace('<div className="modal-body">', '')
content = content.replace(
    '<div className="modal-footer">',
    '<DialogFooter>'
)

content = content.replace(
    '</div>\n          </div>\n        </div>\n      )}\n\n      {/* Clearance Checklist Modal */}',
    '</DialogFooter>\n        </DialogContent>\n      </Dialog>\n      )}\n\n      {/* Clearance Checklist Modal */}'
)

# 5. Replace clearance modal
content = content.replace(
    '{modal === \'clearance\' && selected && (\n        <div className="modal-overlay" onClick={closeModal}>\n          <div className="modal-box large" onClick={e => e.stopPropagation()}>',
    '{modal === \'clearance\' && selected && (\n        <Dialog open={modal === \'clearance\'} onOpenChange={(open) => !open && closeModal()}>\n          <DialogContent className="max-w-3xl">'
)

content = content.replace(
    '<div className="modal-header">\n              <h2><FiCheckSquare style={{ marginRight: 8 }} /> Exit Clearance - {selected.employees?.name || getEmpName(selected.employee_id)}</h2>\n              <Button variant="ghost" size="icon" className="modal-close" onClick={closeModal}><FiX /></Button>\n            </div>',
    '<DialogHeader>\n              <DialogTitle><FiCheckSquare style={{ marginRight: 8 }} /> Exit Clearance - {selected.employees?.name || getEmpName(selected.employee_id)}</DialogTitle>\n              <DialogDescription>Daftar checklist exit clearance untuk karyawan ini</DialogDescription>\n            </DialogHeader>'
)

content = content.replace(
    '</div>\n          </div>\n        </div>\n      )}\n    </div>',
    '</DialogContent>\n      </Dialog>\n      )}\n    </div>'
)

# 6. Replace form inputs in initiate modal
content = content.replace(
    '<label className="form-label">Karyawan</label>',
    '<Label>Karyawan</Label>'
)
content = content.replace(
    '<select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>\n              <option value="">- Pilih Karyawan -</option>\n              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.division}</option>)}\n            </select>',
    '<Select value={form.employeeId} onValueChange={(value) => setForm({ ...form, employeeId: value })}>\n              <SelectTrigger>\n                <SelectValue placeholder="- Pilih Karyawan -" />\n              </SelectTrigger>\n              <SelectContent>\n                {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.division}</SelectItem>)}\n              </SelectContent>\n            </Select>'
)

content = content.replace(
    '<label className="form-label">Tipe</label>',
    '<Label>Tipe</Label>'
)
content = content.replace(
    '<select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>\n              <option value="resign">Resign</option>\n              <option value="contract-end">Habis Kontrak</option>\n              <option value="terminated">Terminated</option>\n            </select>',
    '<Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>\n              <SelectTrigger>\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                <SelectItem value="resign">Resign</SelectItem>\n                <SelectItem value="contract-end">Habis Kontrak</SelectItem>\n                <SelectItem value="terminated">Terminated</SelectItem>\n              </SelectContent>\n            </Select>'
)

content = content.replace(
    '<label className="form-label">Alasan</label>',
    '<Label>Alasan</Label>'
)
content = content.replace(
    '<textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Alasan resign / pemutusan kontrak" />',
    '<Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Alasan resign / pemutusan kontrak" />'
)

content = content.replace(
    '<label className="form-label">Hari Kerja Terakhir</label>',
    '<Label>Hari Kerja Terakhir</Label>'
)
content = content.replace(
    '<input type="date" className="form-input" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} />',
    '<Input type="date" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} />'
)

# Write the file
with open('src/pages/Offboarding.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Offboarding.jsx migrated successfully')
