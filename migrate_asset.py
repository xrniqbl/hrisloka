path = 'src/pages/AssetManagement.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
import_marker = "import '../styles/admin.css';"
if import_marker in content and "import { Table, TableHeader" not in content:
    new_imports = """import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPanel, DialogFooter } from '@/components/ui/dialog';"""
    content = content.replace(import_marker, new_imports)

# Replace main button
content = content.replace(
    '<button className="btn-primary" onClick={openAdd}><FiPlus /> Tambah Aset</button>',
    '<Button onClick={openAdd}><FiPlus /> Tambah Aset</Button>'
)

# Replace search input
content = content.replace(
    '<input className="filter-search" placeholder="Cari aset..." value={search} onChange={e => setSearch(e.target.value)} />',
    '<Input className="filter-search" placeholder="Cari aset..." value={search} onChange={e => setSearch(e.target.value)} />'
)

# Replace filter selects
content = content.replace(
    '''<select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
 {categories.map(c => <option key={c} value={c}>{c}</option>)}
 </select>''',
    '''<NativeSelect className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
 {categories.map(c => <option key={c} value={c}>{c}</option>)}
 </NativeSelect>'''
)

content = content.replace(
    '''<select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">Semua Status</option>
 <option value="in-use">In Use</option>
 <option value="available">Available</option>
 <option value="maintenance">Maintenance</option>
 </select>''',
    '''<NativeSelect className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">Semua Status</option>
 <option value="in-use">In Use</option>
 <option value="available">Available</option>
 <option value="maintenance">Maintenance</option>
 </NativeSelect>'''
)

# Replace table structure
content = content.replace('<table className="data-table">', '<Table>\n <TableHeader>\n <TableRow>')
content = content.replace('<thead>', '')
content = content.replace('</thead>', '')
content = content.replace('<tbody>', ' </TableRow>\n </TableHeader>\n <TableBody>')
content = content.replace('</tbody>', ' </TableBody>\n </Table>')

# Replace table headers
content = content.replace('<th>ID</th>', ' <TableHead>ID</TableHead>')
content = content.replace('<th>Nama</th>', ' <TableHead>Nama</TableHead>')
content = content.replace('<th>Kategori</th>', ' <TableHead>Kategori</TableHead>')
content = content.replace('<th>Brand</th>', ' <TableHead>Brand</TableHead>')
content = content.replace('<th>Status</th>', ' <TableHead>Status</TableHead>')
content = content.replace('<th>Assigned To</th>', ' <TableHead>Assigned To</TableHead>')
content = content.replace('<th>Aksi</th>', ' <TableHead>Aksi</TableHead>')

# Replace table rows
content = content.replace(' {filtered.map(a => (\n <tr key={a.id}>', ' {filtered.map(a => (\n <TableRow key={a.id}>')
content = content.replace(' <td className="td-mono-bold">{a.id}</td>', ' <TableCell className="td-mono-bold">{a.id}</TableCell>')
content = content.replace(' <td>{a.name}</td>', ' <TableCell>{a.name}</TableCell>')
content = content.replace(' <td>{a.category}</td>', ' <TableCell>{a.category}</TableCell>')
content = content.replace(' <td>{a.brand}</td>', ' <TableCell>{a.brand}</TableCell>')

# Replace status td
content = content.replace(
    ''' <td>
 <span className="status-badge" style={{ background: statusColors[a.status] || '#999', color: '#fff' }}>
 {statusLabels[a.status] || a.status}
 </span>
 </td>''',
    ''' <TableCell>
 <span className="status-badge" style={{ background: statusColors[a.status] || '#999', color: '#fff' }}>
 {statusLabels[a.status] || a.status}
 </span>
 </TableCell>'''
)

# Replace assigned to td
content = content.replace(
    ''' <td>{a.employees?.name || getEmpName(a.assigned_to) || <span className="td-muted-sm">-</span>}</td>''',
    ''' <TableCell>{a.employees?.name || getEmpName(a.assigned_to) || <span className="td-muted-sm">-</span>}</TableCell>'''
)

# Replace actions td
content = content.replace(
    ''' <td>
 <div className="actions-cell">
 <button className="action-btn" title="Lihat" onClick={() => openView(a)}><FiEye /></button>
 <button className="action-btn" title="Edit" onClick={() => openEdit(a)}><FiEdit2 /></button>
 </div>
 </td>''',
    ''' <TableCell>
 <div className="actions-cell">
 <Button variant="ghost" size="icon" onClick={() => openView(a)}><FiEye /></Button>
 <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><FiEdit2 /></Button>
 </div>
 </TableCell>'''
)

content = content.replace(' </tr>', ' </TableRow>')
content = content.replace(' <tr><td colSpan={7} className="empty-state">Belum ada aset.</td></tr>', ' <TableRow><TableCell colSpan={7} className="empty-state">Belum ada aset.</TableCell></TableRow>')

# Replace view modal with Dialog
content = content.replace(
    '''{modal === 'view' && selected && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>Detail Aset - {selected.id}</h2>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body">''',
    '''{modal === 'view' && selected && (
 <Dialog open={modal === 'view'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>Detail Aset - {selected.id}</DialogTitle>
 </DialogHeader>
 <DialogPanel>'''
)

content = content.replace(
    ''' </div>
 </div>
 </div>
 )}

 {/* Add/Edit Modal */}''',
    ''' </DialogPanel>
 </DialogContent>
 </Dialog>
 )}

 {/* Add/Edit Modal */}'''
)

# Replace add/edit modal with Dialog
content = content.replace(
    '''{(modal === 'add' || modal === 'edit') && (
 <div className="modal-overlay" onClick={closeModal}>
 <div className="modal-box" onClick={e => e.stopPropagation()}>
 <div className="modal-header">
 <h2>{modal === 'add' ? 'Tambah Aset Baru' : 'Edit Aset'}</h2>
 <button className="modal-close" onClick={closeModal}><FiX /></button>
 </div>
 <div className="modal-body">''',
    '''{(modal === 'add' || modal === 'edit') && (
 <Dialog open={modal === 'add' || modal === 'edit'} onOpenChange={(open) => !open && closeModal()}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle>{modal === 'add' ? 'Tambah Aset Baru' : 'Edit Aset'}</DialogTitle>
 </DialogHeader>
 <DialogPanel>'''
)

# Replace form inputs
content = content.replace(
    '''<label className="form-label">Nama Aset</label>
 <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='MacBook Pro 14"' />''',
    '''<label className="form-label">Nama Aset</label>
 <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='MacBook Pro 14"' />'''
)

content = content.replace(
    '''<label className="form-label">Kategori</label>
 <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
 {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
 </select>''',
    '''<label className="form-label">Kategori</label>
 <NativeSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
 {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
 </NativeSelect>'''
)

content = content.replace(
    '''<label className="form-label">Brand</label>
 <input className="form-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />''',
    '''<label className="form-label">Brand</label>
 <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Apple" />'''
)

content = content.replace(
    '''<label className="form-label">Serial Number</label>
 <input className="form-input" value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} />''',
    '''<label className="form-label">Serial Number</label>
 <Input value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} />'''
)

content = content.replace(
    '''<label className="form-label">Kondisi</label>
 <select className="form-select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
 <option value="New">New</option>
 <option value="Good">Good</option>
 <option value="Fair">Fair</option>
 <option value="Poor">Poor</option>
 </select>''',
    '''<label className="form-label">Kondisi</label>
 <NativeSelect value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
 <option value="New">New</option>
 <option value="Good">Good</option>
 <option value="Fair">Fair</option>
 <option value="Poor">Poor</option>
 </NativeSelect>'''
)

content = content.replace(
    '''<label className="form-label">Assign ke Karyawan</label>
 <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
 <option value="">- Tidak di-assign -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
 </select>''',
    '''<label className="form-label">Assign ke Karyawan</label>
 <NativeSelect value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
 <option value="">- Tidak di-assign -</option>
 {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
 </NativeSelect>'''
)

content = content.replace(
    '''<label className="form-label">Status</label>
 <select className="form-select" value={form.assigned_to ? 'in-use' : form.status} disabled={!!form.assigned_to} onChange={e => setForm({ ...form, status: e.target.value })}>
 <option value="available">Available</option>
 <option value="in-use">In Use</option>
 <option value="maintenance">Maintenance</option>
 </select>''',
    '''<label className="form-label">Status</label>
 <NativeSelect value={form.assigned_to ? 'in-use' : form.status} disabled={!!form.assigned_to} onChange={e => setForm({ ...form, status: e.target.value })}>
 <option value="available">Available</option>
 <option value="in-use">In Use</option>
 <option value="maintenance">Maintenance</option>
 </NativeSelect>'''
)

content = content.replace(
    '''<label className="form-label">Notes</label>
 <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />''',
    '''<label className="form-label">Notes</label>
 <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />'''
)

# Replace modal footer
content = content.replace(
    ''' </div>
 <div className="modal-footer">
 <button className="btn-secondary" onClick={closeModal}>Batal</button>
 <button className="btn-primary" onClick={handleSave}>{modal === 'add' ? 'Simpan' : 'Update'}</button>
 </div>
 </div>
 </div>
 )}''',
    ''' </DialogPanel>
 <DialogFooter>
 <Button variant="outline" onClick={closeModal}>Batal</Button>
 <Button onClick={handleSave}>{modal === 'add' ? 'Simpan' : 'Update'}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 )}'''
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('AssetManagement.jsx migrated successfully')
