import sys

path = 'src/pages/Payroll.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "import { Table, TableHeader" not in content:
    content = content.replace(
        "import { useState, useEffect, useMemo } from 'react';",
        "import { useState, useEffect, useMemo } from 'react';\nimport { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';\nimport { Button } from '@/components/ui/button';\nimport { Input } from '@/components/ui/input';"
    )

# Replace month input with Input component
content = content.replace(
    '<input\n        type="month"\n        className="input-month"\n        value={selectedMonth}\n        onChange={(e) => setSelectedMonth(e.target.value)}\n      />',
    '<Input\n        type="month"\n        value={selectedMonth}\n        onChange={(e) => setSelectedMonth(e.target.value)}\n        className="input-month"\n      />'
)

# Replace export button with Button component
content = content.replace(
    '<button className="btn-primary" onClick={handleExportExcel}><FiDownload /> Export Payroll</button>',
    '<Button onClick={handleExportExcel}><FiDownload /> Export Payroll</Button>'
)

# Replace table structure
content = content.replace('<table className="data-table">', '<Table>\n        <TableHeader>\n          <TableRow>')
content = content.replace('          <th>Karyawan</th>', '            <TableHead>Karyawan</TableHead>')
content = content.replace('          <th className="th-right">Gaji Pokok</th>', '            <TableHead className="th-right">Gaji Pokok</TableHead>')
content = content.replace('          <th className="th-right">Tunjangan</th>', '            <TableHead className="th-right">Tunjangan</TableHead>')
content = content.replace('          <th className="th-right">Lembur</th>', '            <TableHead className="th-right">Lembur</TableHead>')
content = content.replace('          <th className="th-right">BPJS</th>', '            <TableHead className="th-right">BPJS</TableHead>')
content = content.replace('          <th className="th-right">PPh 21</th>', '            <TableHead className="th-right">PPh 21</TableHead>')
content = content.replace('          <th className="th-right">Take Home Pay</th>', '            <TableHead className="th-right">Take Home Pay</TableHead>')
content = content.replace('          <th>Aksi</th>', '            <TableHead>Aksi</TableHead>')
content = content.replace('        </tr>\n        </thead>\n        <tbody>', '          </TableRow>\n        </TableHeader>\n        <TableBody>')

# Replace table rows
content = content.replace('        {payrollData.map((emp) => (\n          <tr key={emp.id}>', '        {payrollData.map((emp) => (\n          <TableRow key={emp.id}>')
content = content.replace('            <td>\n              <div className="employee-cell">', '            <TableCell>\n              <div className="employee-cell">')
content = content.replace('              </div>\n            </td>\n            <td className="td-numeric">', '              </div>\n            </TableCell>\n            <TableCell className="td-numeric">')

# Replace td elements with TableCell
content = content.replace('            <td className="td-numeric">{formatCurrency(emp.salary.baseSalary)}</td>', '            <TableCell className="td-numeric">{formatCurrency(emp.salary.baseSalary)}</TableCell>')
content = content.replace('            <td className="td-numeric">{formatCurrency(emp.salary.allowance)}</td>', '            <TableCell className="td-numeric">{formatCurrency(emp.salary.allowance)}</TableCell>')
content = content.replace('            <td className={emp.salary.overtimePay > 0 ? \'td-numeric primary\' : \'td-numeric\'}>', '            <TableCell className={emp.salary.overtimePay > 0 ? \'td-numeric primary\' : \'td-numeric\'}>')
content = content.replace('              {formatCurrency(emp.salary.overtimePay)}\n            </td>', '              {formatCurrency(emp.salary.overtimePay)}\n            </TableCell>')
content = content.replace('            <td className="td-numeric danger">-{formatCurrency(emp.salary.bpjs.total)}</td>', '            <TableCell className="td-numeric danger">-{formatCurrency(emp.salary.bpjs.total)}</TableCell>')
content = content.replace('            <td className="td-numeric danger">-{formatCurrency(emp.salary.pph21)}</td>', '            <TableCell className="td-numeric danger">-{formatCurrency(emp.salary.pph21)}</TableCell>')
content = content.replace('            <td className="td-numeric total">{formatCurrency(emp.salary.takeHomePay)}</td>', '            <TableCell className="td-numeric total">{formatCurrency(emp.salary.takeHomePay)}</TableCell>')
content = content.replace('            <td>\n              <button className="action-btn"', '            <TableCell>\n              <button className="action-btn"')
content = content.replace('            </td>\n          </tr>', '            </TableCell>\n          </TableRow>')

# Replace empty state
content = content.replace('          <tr><td colSpan={8} className="empty-state">Belum ada data karyawan.</td></tr>', '          <TableRow><TableCell colSpan={8} className="empty-state">Belum ada data karyawan.</TableCell></TableRow>')
content = content.replace('        </tbody>\n      </table>', '        </TableBody>\n      </Table>')

# Replace action button with Button
content = content.replace(
    '<button className="action-btn" title="Download PDF" onClick={() => handleDownloadIndividual(emp)}><FiDownload /></button>',
    '<Button variant="ghost" size="sm" onClick={() => handleDownloadIndividual(emp)}><FiDownload /></Button>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Payroll.jsx updated successfully')
