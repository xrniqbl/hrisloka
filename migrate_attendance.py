import sys

path = 'src/pages/Attendance.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports after existing imports
import_marker = "import '../styles/admin.css';"
if import_marker in content and "import { Table, TableHeader" not in content:
    new_imports = """import '../styles/admin.css';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';"""
    content = content.replace(import_marker, new_imports)

# Replace export button
content = content.replace(
    '''<button
            className="btn-secondary btn-icon-row"
            onClick={() => exportToExcel(formatAttendanceForExport(todayLogs), `Absensi_${new Date().toISOString().split('T')[0]}.xlsx`)}
          >
            <FiDownload /> Export Excel
          </button>''',
    '''<Button
            variant="outline"
            onClick={() => exportToExcel(formatAttendanceForExport(todayLogs), `Absensi_${new Date().toISOString().split('T')[0]}.xlsx`)}
          >
            <FiDownload /> Export Excel
          </Button>'''
)

# Replace clock in/out button
content = content.replace(
    '''<button className={clockedIn ? 'btn-danger btn-lg' : 'btn-primary btn-lg'} onClick={handleClockToggle}>
              <FiClock /> {clockedIn ? 'Clock Out' : 'Clock In'}
            </button>''',
    '''<Button variant={clockedIn ? 'destructive' : 'default'} size="lg" onClick={handleClockToggle}>
              <FiClock /> {clockedIn ? 'Clock Out' : 'Clock In'}
            </Button>'''
)

# Replace table structure
content = content.replace('<table className="data-table">', '<Table>\n            <TableHeader>\n              <TableRow>')
content = content.replace('<thead>', '')
content = content.replace('</thead>', '')
content = content.replace('<tbody>', '              </TableRow>\n            </TableHeader>\n            <TableBody>')
content = content.replace('</tbody>', '            </TableBody>\n          </Table>')
content = content.replace('</table>', '')

# Replace table headers
content = content.replace('<th>Karyawan</th>', '                <TableHead>Karyawan</TableHead>')
content = content.replace('<th>Clock In</th>', '                <TableHead>Clock In</TableHead>')
content = content.replace('<th>Clock Out</th>', '                <TableHead>Clock Out</TableHead>')
content = content.replace('<th>Status</th>', '                <TableHead>Status</TableHead>')
content = content.replace('<th>Lokasi</th>', '                <TableHead>Lokasi</TableHead>')

# Replace table rows
content = content.replace('                  <tr key={att.id}>', '              <TableRow key={att.id}>')
content = content.replace('                    <td>\n                      <div className="employee-cell">', '                <TableCell>\n                  <div className="employee-cell">')
content = content.replace('                      </div>\n                    </td>', '                  </div>\n                </TableCell>')
content = content.replace('                    <td className="td-mono-bold">{att.clock_in || \'-\'}</td>', '                <TableCell className="td-mono-bold">{att.clock_in || \'-\'}</TableCell>')
content = content.replace('                    <td className="td-mono-bold">{att.clock_out || \'-\'}</td>', '                <TableCell className="td-mono-bold">{att.clock_out || \'-\'}</TableCell>')
content = content.replace('                    <td>\n                      <span className={`status-badge ${att.status}`}>', '                <TableCell>\n                  <span className={`status-badge ${att.status}`}>')
content = content.replace('                      </span>\n                    </td>', '                  </span>\n                </TableCell>')
content = content.replace('                    <td className="td-muted-sm">{att.location || \'-\'}</td>', '                <TableCell className="td-muted-sm">{att.location || \'-\'}</TableCell>')
content = content.replace('                  </tr>', '              </TableRow>')

# Replace empty state row
content = content.replace(
    '<tr><td colSpan={5} className="empty-state">Belum ada data kehadiran hari ini.</td></tr>',
    '<TableRow><TableCell colSpan={5} className="empty-state">Belum ada data kehadiran hari ini.</TableCell></TableRow>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Attendance.jsx migrated successfully')
