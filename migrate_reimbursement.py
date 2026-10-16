import re

# Read the file
with open('src/pages/Reimbursement.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Coss/shadcn imports
import_section = "import '../styles/admin.css';"
new_import_section = """import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';"""
content = content.replace(import_section, new_import_section)

# 2. Replace main action button
content = content.replace(
    '<button className="btn-primary" onClick={() => setShowForm(true)}><FiPlus /> {t(\'reimbursement.add\')}</button>',
    '<Button onClick={() => setShowForm(true)}><FiPlus /> {t(\'reimbursement.add\')}</Button>'
)

# 3. Replace filter select
old_filter = """<select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>"""
new_filter = """<Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>"""
content = content.replace(old_filter, new_filter)

# 4. Replace table structure
content = content.replace('<table className="data-table">', '<Table>\n            <TableHeader>\n              <TableRow>')
content = content.replace('<thead>', '')
content = content.replace('<tr><th>Karyawan</th><th>Jenis</th><th>Deskripsi</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr>', 
                         '<TableHead>Karyawan</TableHead>\n                <TableHead>Jenis</TableHead>\n                <TableHead>Deskripsi</TableHead>\n                <TableHead>Jumlah</TableHead>\n                <TableHead>Tanggal</TableHead>\n                <TableHead>Status</TableHead>\n                <TableHead>Aksi</TableHead>\n              </TableRow>\n            </TableHeader>\n            <TableBody>')
content = content.replace('</thead>', '')
content = content.replace('<tbody>', '')
content = content.replace('</tbody>', '')
content = content.replace('</table>', '</TableBody>\n          </Table>')

# 5. Replace table rows
content = content.replace('<tr key={r.id}>', '<TableRow key={r.id}>')
content = content.replace('</tr>', '</TableRow>')
content = content.replace('<td>', '<TableCell>')
content = content.replace('</td>', '</TableCell>')
content = content.replace('<td class="td-semibold">', '<TableCell className="td-semibold">')
content = content.replace('<td class="td-sm">', '<TableCell className="td-sm">')
content = content.replace('<td class="td-muted-sm">', '<TableCell className="td-muted-sm">')

# 6. Replace action buttons in table
content = content.replace(
    '<button className="action-btn success" title="Approve" onClick={() => handleApprove(r.id)}><FiCheck /></button>',
    '<Button variant="ghost" size="icon" className="action-btn success" onClick={() => handleApprove(r.id)}><FiCheck /></Button>'
)
content = content.replace(
    '<button className="action-btn danger" title="Reject" onClick={() => handleReject(r.id)}><FiX /></button>',
    '<Button variant="ghost" size="icon" className="action-btn danger" onClick={() => handleReject(r.id)}><FiX /></Button>'
)

# 7. Replace modal with Dialog
old_modal_start = """{showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ajukan Reimbursement</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <div className="modal-body">"""
new_modal_start = """{showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajukan Reimbursement</DialogTitle>
              <DialogDescription>Lengkapi form berikut untuk mengajukan klaim reimbursement</DialogDescription>
            </DialogHeader>"""
content = content.replace(old_modal_start, new_modal_start)

old_modal_end = """</div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className="btn-primary" onClick={handleSubmit}>Ajukan</button>
            </div>
          </div>
        </div>
      )}"""
new_modal_end = """<DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button onClick={handleSubmit}>Ajukan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}"""
content = content.replace(old_modal_end, new_modal_end)

# 8. Replace form inputs
content = content.replace(
    '<select className="form-select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>',
    '<Select value={form.employeeId} onValueChange={(value) => setForm({ ...form, employeeId: value })}>\n                  <SelectTrigger>\n                    <SelectValue placeholder="Pilih Karyawan" />\n                  </SelectTrigger>\n                  <SelectContent>'
)
content = content.replace(
    '                    {allEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}\n                  </select>',
    '                    {allEmployees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}\n                  </SelectContent>\n                </Select>'
)

content = content.replace(
    '<select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>',
    '<Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>\n                  <SelectTrigger>\n                    <SelectValue placeholder="Pilih Jenis" />\n                  </SelectTrigger>\n                  <SelectContent>'
)
old_options = """<option value="transport">Transport</option>
                    <option value="medical">Medical</option>
                    <option value="meals">Meals</option>
                    <option value="training">Training</option>
                    <option value="other">Lainnya</option>
                  </select>"""
new_options = """<SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="meals">Meals</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>"""
content = content.replace(old_options, new_options)

content = content.replace(
    '<input className="form-input" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />',
    '<Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />'
)
content = content.replace(
    '<input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />',
    '<Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />'
)
content = content.replace(
    '<textarea className="form-textarea" placeholder="Deskripsi klaim..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />',
    '<Textarea placeholder="Deskripsi klaim..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />'
)

# Write the modified content
with open('src/pages/Reimbursement.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Reimbursement.jsx migrated successfully')
