import sys

path = 'src/pages/Employees.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports after existing imports
import_marker = "import '../styles/admin.css';"
if import_marker in content and "import { Table, TableHeader" not in content:
    new_imports = """import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';"""
    content = content.replace(import_marker, new_imports)

# Replace search input
content = content.replace(
    '''<input
                className="filter-search"
                style={{ paddingLeft: 38 }}
                placeholder="Cari nama, NIP, atau jabatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />''',
    '''<Input
                className="filter-search"
                style={{ paddingLeft: 38 }}
                placeholder="Cari nama, NIP, atau jabatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />'''
)

# Replace filter selects
content = content.replace(
    '''<select className="filter-select" value={divFilter} onChange={(e) => setDivFilter(e.target.value)}>
              <option value="">Semua Divisi</option>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>''',
    '''<NativeSelect className="filter-select" value={divFilter} onChange={(e) => setDivFilter(e.target.value)}>
              <option value="">Semua Divisi</option>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </NativeSelect>'''
)

content = content.replace(
    '''<select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="permanent">Karyawan Tetap</option>
              <option value="contract">Karyawan Kontrak</option>
            </select>''',
    '''<NativeSelect className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="permanent">Karyawan Tetap</option>
              <option value="contract">Karyawan Kontrak</option>
            </NativeSelect>'''
)

# Replace empty state button
content = content.replace(
    '''<button className="btn-primary" onClick={() => { setEditEmp(null); setModalOpen(true); }}>
                  <FiPlus /> Tambah Karyawan
                </button>''',
    '''<Button onClick={() => { setEditEmp(null); setModalOpen(true); }}>
                  <FiPlus /> Tambah Karyawan
                </Button>'''
)

# Replace table structure
content = content.replace('<table className="data-table">', '<Table>\n                  <TableHeader>\n                    <TableRow>')
content = content.replace('<thead>', '')
content = content.replace('</thead>', '')
content = content.replace('<tbody>', '                  </TableRow>\n                  </TableHeader>\n                  <TableBody>')
content = content.replace('</tbody>', '                  </TableBody>\n                </Table>')

# Replace table headers
content = content.replace('<th>NIP</th>', '            <TableHead>NIP</TableHead>')
content = content.replace('<th>Karyawan</th>', '            <TableHead>Karyawan</TableHead>')
content = content.replace('<th>Divisi</th>', '            <TableHead>Divisi</TableHead>')
content = content.replace('<th>Jabatan</th>', '            <TableHead>Jabatan</TableHead>')
content = content.replace('<th>Cabang</th>', '            <TableHead>Cabang</TableHead>')
content = content.replace('<th>Status</th>', '            <TableHead>Status</TableHead>')
content = content.replace('{isSuperAdmin && <th>Role</th>}', '{isSuperAdmin && <TableHead>Role</TableHead>}')
content = content.replace('<th>Gaji Pokok</th>', '            <TableHead>Gaji Pokok</TableHead>')
content = content.replace('<th>Aksi</th>', '            <TableHead>Aksi</TableHead>')

# Replace table rows
content = content.replace('                    {filtered.map((emp) => (\n                      <tr key={emp.id}>', '                    {filtered.map((emp) => (\n                      <TableRow key={emp.id}>')
content = content.replace('                        <td><span style={{ fontFamily:', '                        <TableCell><span style={{ fontFamily:')
content = content.replace('</span></td>', '</span></TableCell>')
content = content.replace('                        <td>\n                          <div className="employee-cell">', '                        <TableCell>\n                          <div className="employee-cell">')
content = content.replace('                          </div>\n                        </td>', '                          </div>\n                        </TableCell>')
content = content.replace('                        <td>{emp.division}</td>', '                        <TableCell>{emp.division}</TableCell>')
content = content.replace('                        <td>{emp.position}</td>', '                        <TableCell>{emp.position}</TableCell>')
content = content.replace('                        <td className="td-muted-sm">{emp.branches?.name || \'-\'}</td>', '                        <TableCell className="td-muted-sm">{emp.branches?.name || \'-\'}</TableCell>')
content = content.replace('                        <td><ContractBadge status={emp.status} contractEnd={emp.contract_end || emp.contractEnd} /></td>', '                        <TableCell><ContractBadge status={emp.status} contractEnd={emp.contract_end || emp.contractEnd} /></TableCell>')
content = content.replace('                        <td>\n                            {emp.role && emp.role !== \'employee\'', '                        <TableCell>\n                            {emp.role && emp.role !== \'employee\'')
content = content.replace('                          </td>\n                        )}', '                          </TableCell>\n                        )}')
content = content.replace('                        <td className="td-semibold">{formatCurrency(emp.base_salary || emp.baseSalary)}</td>', '                        <TableCell className="td-semibold">{formatCurrency(emp.base_salary || emp.baseSalary)}</TableCell>')
content = content.replace('                        <td>\n                          <div className="actions-cell">', '                        <TableCell>\n                          <div className="actions-cell">')
content = content.replace('                          </div>\n                        </td>\n                      </tr>', '                          </div>\n                        </TableCell>\n                      </TableRow>')

# Replace action buttons
content = content.replace(
    '<button className="action-btn" title="Lihat Detail" onClick={() => navigate(`/employees/${emp.id}`)}><FiEye /></button>',
    '<Button variant="ghost" size="icon" onClick={() => navigate(`/employees/${emp.id}`)}><FiEye /></Button>'
)
content = content.replace(
    '<button className="action-btn" title="Edit" onClick={() => { setEditEmp(emp); setModalOpen(true); }}><FiEdit2 /></button>',
    '<Button variant="ghost" size="icon" onClick={() => { setEditEmp(emp); setModalOpen(true); }}><FiEdit2 /></Button>'
)
content = content.replace(
    '<button className="action-btn danger" title="Hapus" onClick={() => handleDelete(emp.id)}><FiTrash2 /></button>',
    '<Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}><FiTrash2 /></Button>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Employees.jsx migrated successfully')
