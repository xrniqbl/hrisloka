import sys

path = 'src/pages/ContractManagement.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Tambah imports komponen Coss/shadcn
import_marker = "import '../styles/admin.css';"
new_imports = """import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';"""

content = content.replace(import_marker, new_imports)

# Ganti search input
content = content.replace(
    '<input className=\"filter-search\" placeholder=\"Cari kontrak...\" value={search} onChange={e => setSearch(e.target.value)} />',
    '<Input className=\"filter-search\" placeholder=\"Cari kontrak...\" value={search} onChange={e => setSearch(e.target.value)} />'
)

# Ganti filter selects
content = content.replace(
    '<select className=\"filter-select\" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>',
    '<NativeSelect className=\"filter-select\" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>'
)
content = content.replace(
    '<select className=\"filter-select\" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>',
    '<NativeSelect className=\"filter-select\" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>'
)

# Ganti tombol utama
content = content.replace(
    '<button className=\"btn-primary\" onClick={() => setShowWizard(true)}><FiPlus /> Buat Kontrak Baru</button>',
    '<Button onClick={() => setShowWizard(true)}><FiPlus /> Buat Kontrak Baru</Button>'
)

# Ganti struktur tabel
content = content.replace('<table className=\"data-table\">', '<Table>')
content = content.replace('<thead>', '<TableHeader>')
content = content.replace('</thead>', '</TableHeader>')
content = content.replace('<tbody>', '<TableBody>')
content = content.replace('</tbody>', '</TableBody>')
content = content.replace('</table>', '</Table>')

# Ganti th dengan TableHead
content = content.replace('<th>Kontrak</th>', '<TableHead>Kontrak</TableHead>')
content = content.replace('<th>Karyawan</th>', '<TableHead>Karyawan</TableHead>')
content = content.replace('<th>Tipe</th>', '<TableHead>Tipe</TableHead>')
content = content.replace('<th>Status</th>', '<TableHead>Status</TableHead>')
content = content.replace('<th>Tanggal</th>', '<TableHead>Tanggal</TableHead>')
content = content.replace('<th>Aksi</th>', '<TableHead>Aksi</TableHead>')

# Ganti tr dengan TableRow
content = content.replace('{filtered.map((c) => (\n                <tr key={c.id}>', '{filtered.map((c) => (\n                <TableRow key={c.id}>')
content = content.replace('                </tr>\n              ))}', '                </TableRow>\n              ))}')
content = content.replace('<tr><td colSpan={6}', '<TableRow><TableCell colSpan={6}')
content = content.replace('</td></tr>', '</TableCell></TableRow>')

# Ganti td dengan TableCell
content = content.replace('                  <td>\n                    <div className=\"td-semibold\">{c.title}</div>', '                  <TableCell>\n                    <div className=\"td-semibold\">{c.title}</div>')
content = content.replace('                    </div>\n                  </td>', '                    </div>\n                  </TableCell>')
content = content.replace('<td>{c.employees?.name || \'-\'}</td>', '<TableCell>{c.employees?.name || \'-\'}</TableCell>')
content = content.replace('<td>\n                      <span', '<TableCell>\n                      <span')
content = content.replace('                      </span>\n                    </td>', '                      </span>\n                    </TableCell>')
content = content.replace('<td>\n                      <span className=\"status-badge\"', '<TableCell>\n                      <span className=\"status-badge\"')
content = content.replace('                    </span>\n                  </td>', '                    </span>\n                  </TableCell>')
content = content.replace('<td className=\"td-sm\">{formatDate(c.start_date)}</td>', '<TableCell className=\"td-sm\">{formatDate(c.start_date)}</TableCell>')
content = content.replace('<td>\n                    <div className=\"actions-cell\">', '<TableCell>\n                    <div className=\"actions-cell\">')
content = content.replace('                    </div>\n                  </td>\n                </TableRow>', '                    </div>\n                  </TableCell>\n                </TableRow>')

# Ganti action buttons
content = content.replace(
    '<button className=\"action-btn\" onClick={() => handleViewContract(c)} title=\"Lihat\"><FiEye /></button>',
    '<Button variant=\"ghost\" size=\"sm\" onClick={() => handleViewContract(c)} title=\"Lihat\"><FiEye /></Button>'
)
content = content.replace(
    '<button className=\"action-btn\" onClick={() => handleEditContract(c)} title=\"Edit\"><FiEdit2 /></button>',
    '<Button variant=\"ghost\" size=\"sm\" onClick={() => handleEditContract(c)} title=\"Edit\"><FiEdit2 /></Button>'
)
content = content.replace(
    '<button className=\"action-btn\" onClick={() => handleDeleteContract(c.id)} title=\"Hapus\"><FiTrash2 /></button>',
    '<Button variant=\"ghost\" size=\"sm\" onClick={() => handleDeleteContract(c.id)} title=\"Hapus\"><FiTrash2 /></Button>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('ContractManagement.jsx migrated successfully')
