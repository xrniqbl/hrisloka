import { useState, useEffect, useMemo } from 'react';
import { Filter, Download, Clock, TrendingUp, Banknote } from 'lucide-react';
import { Icon } from '@astryxdesign/core/Icon';
import * as projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import * as employeeService from '../services/employeeService';
import { useRealtimeTable } from '../hooks/useRealtime';
import { useTranslation } from '../lib/i18n';
import '../styles/shared.css';
import '../styles/admin.css';
import PageHeader from '../components/PageHeader';
import { NativeSelect } from '@/components/ui/native-select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import MetricStatCards from '../components/MetricStatCards';

export default function TimesheetAdmin() {
  const { t, locale } = useTranslation();
  const { employee } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const companyId = employee?.company_id;
  const dateLocale = locale === 'en' ? 'en-US' : 'id-ID';

  const fmt = (v) =>
    `Rp ${Number(v || 0).toLocaleString(dateLocale)}`;

  const fmtH = (h) => {
    const hours = Math.floor(h || 0);
    const mins = Math.round(((h || 0) % 1) * 60);
    return `${hours}${t('timesheets.hours_unit')} ${mins}${t('timesheets.minutes_unit')}`;
  };

  const formatTime = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchData = async () => {
    setLoading(true);
    if (!companyId) {
      setTimesheets([]);
      setProjects([]);
      setEmployees([]);
      setLoading(false);
      return;
    }
    const filters = {};
    if (filterProject) filters.projectId = filterProject;
    if (filterEmployee) filters.employeeId = filterEmployee;
    if (filterFrom) filters.dateFrom = filterFrom;
    if (filterTo) filters.dateTo = filterTo;
    const [tRes, pRes, eRes] = await Promise.all([
      projectService.getTimesheets(filters, companyId),
      projectService.getAllProjects(companyId),
      employeeService.getAllEmployees(undefined, companyId),
    ]);
    setTimesheets(tRes.data || []);
    setProjects(pRes.data || []);
    setEmployees(eRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useRealtimeTable('timesheets', fetchData, { companyId, enabled: !!companyId });

  const applyFilter = () => fetchData();

  const summary = useMemo(() => {
    const totalHours = timesheets.reduce((s, row) => s + (row.hours || 0), 0);
    const billableHours = timesheets
      .filter((row) => row.billable)
      .reduce((s, row) => s + (row.hours || 0), 0);
    const revenue = timesheets
      .filter((row) => row.billable)
      .reduce(
        (s, row) => s + (row.hours || 0) * (row.projects?.hourly_rate || 0),
        0,
      );
    return { totalHours, billableHours, revenue };
  }, [timesheets]);

  const invoiceData = useMemo(() => {
    const byClient = {};
    timesheets
      .filter((row) => row.billable && row.projects?.client)
      .forEach((row) => {
        const key = row.projects.client;
        if (!byClient[key]) {
          byClient[key] = { client: key, entries: [], totalHours: 0, totalRevenue: 0 };
        }
        byClient[key].entries.push(row);
        byClient[key].totalHours += row.hours || 0;
        byClient[key].totalRevenue +=
          (row.hours || 0) * (row.projects?.hourly_rate || 0);
      });
    return Object.values(byClient).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [timesheets]);

  const exportCSV = () => {
    const header = `${t('timesheets.csv_header')}\n`;
    const rows = timesheets
      .map(
        (row) =>
          `${row.date},${row.employees?.name || ''},${row.projects?.name || ''},${row.projects?.client || ''},${row.hours || 0},${row.billable},${row.projects?.hourly_rate || 0},${(row.hours || 0) * (row.projects?.hourly_rate || 0)},${(row.description || '').replace(/,/g, ';')}`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tableHeaders = [
    t('timesheets.col_date'),
    t('timesheets.col_employee'),
    t('timesheets.col_project'),
    t('timesheets.col_client'),
    t('timesheets.col_start'),
    t('timesheets.col_end'),
    t('timesheets.col_hours'),
    t('timesheets.col_billable'),
    t('timesheets.col_revenue'),
    t('timesheets.col_description'),
  ];

  if (loading) return <PageSkeleton hasStats={true} tableRows={6} tableCols={6} />;

  return (
    <div className="admin-page">
      <PageHeader titleKey="timesheets.title" subtitleKey="timesheets.subtitle" />
      <div className="page-header-actions">
        <button type="button" className="btn-secondary" onClick={exportCSV}>
          <Icon icon={Download} size="sm" color="inherit" /> {t('timesheets.export_csv')}
        </button>
      </div>

      <MetricStatCards
        items={[
          {
            key: 'hours',
            label: t('timesheets.total_hours'),
            value: fmtH(summary.totalHours),
            icon: Clock,
          },
          {
            key: 'billable',
            label: t('timesheets.billable_hours'),
            value: fmtH(summary.billableHours),
            icon: TrendingUp,
          },
          {
            key: 'revenue',
            label: t('timesheets.revenue'),
            value: fmt(summary.revenue),
            icon: Banknote,
          },
        ]}
      />

      <div className="info-card mb-sm">
        <div className="filter-row">
          <div className="form-group filter-field">
            <label className="section-label">{t('timesheets.filter_project')}</label>
            <NativeSelect
              size="sm"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="">{t('timesheets.filter_all')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="form-group filter-field">
            <label className="section-label">{t('timesheets.filter_employee')}</label>
            <NativeSelect
              size="sm"
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">{t('timesheets.filter_all')}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="form-group filter-field-sm">
            <label className="section-label">{t('timesheets.filter_from')}</label>
            <DatePicker
              value={filterFrom}
              onChange={setFilterFrom}
              placeholder={t('timesheets.filter_from_ph')}
              buttonClassName="td-sm"
            />
          </div>
          <div className="form-group filter-field-sm">
            <label className="section-label">{t('timesheets.filter_to')}</label>
            <DatePicker
              value={filterTo}
              onChange={setFilterTo}
              placeholder={t('timesheets.filter_to_ph')}
              buttonClassName="td-sm"
            />
          </div>
          <button type="button" className="btn-primary btn-filter" onClick={applyFilter}>
            <Icon icon={Filter} size="sm" color="inherit" /> {t('timesheets.apply_filter')}
          </button>
        </div>
      </div>

      <div className="data-table-card mb">
        <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {timesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    title={t('timesheets.empty_title')}
                    description={t('timesheets.empty_desc')}
                    ctaLabel={t('timesheets.reload')}
                    onCta={fetchData}
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : (
              timesheets.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="td-truncate">{row.date}</TableCell>
                  <TableCell className="td-semibold">{row.employees?.name || '-'}</TableCell>
                  <TableCell>
                    <span className="td-project-cell">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: row.projects?.color || '#999',
                        }}
                      />
                      {row.projects?.name || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{row.projects?.client || '-'}</TableCell>
                  <TableCell className="td-sm">{formatTime(row.start_time)}</TableCell>
                  <TableCell className="td-sm">
                    {row.end_time ? (
                      formatTime(row.end_time)
                    ) : (
                      <span className="badge badge--success">{t('timesheets.running')}</span>
                    )}
                  </TableCell>
                  <TableCell className="td-semibold">
                    {row.hours ? fmtH(row.hours) : '-'}
                  </TableCell>
                  <TableCell>{row.billable ? t('common.yes') : '-'}</TableCell>
                  <TableCell className="td-semibold">
                    {row.billable && row.hours
                      ? fmt((row.hours || 0) * (row.projects?.hourly_rate || 0))
                      : '-'}
                  </TableCell>
                  <TableCell className="td-sm td-truncate">
                    {row.description || ''}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {invoiceData.length > 0 && (
        <div>
          <h2 className="chart-card-title mb">{t('timesheets.invoice_title')}</h2>
          <div className="cards-grid">
            {invoiceData.map((inv) => (
              <div className="info-card" key={inv.client}>
                <div className="invoice-card-header">
                  <div>
                    <div className="td-semibold">{inv.client}</div>
                    <div className="td-muted-sm">
                      {inv.entries.length} {t('timesheets.entries')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="info-card-value success">{fmt(inv.totalRevenue)}</div>
                    <div className="td-muted-sm">
                      {fmtH(inv.totalHours)} {t('timesheets.billable_suffix')}
                    </div>
                  </div>
                </div>
                <div className="invoice-card-breakdown">
                  {[...new Set(inv.entries.map((e) => e.projects?.name))].map((pName, i) => {
                    const pEntries = inv.entries.filter((e) => e.projects?.name === pName);
                    const pHours = pEntries.reduce((s, e) => s + (e.hours || 0), 0);
                    const pRev = pEntries.reduce(
                      (s, e) => s + (e.hours || 0) * (e.projects?.hourly_rate || 0),
                      0,
                    );
                    return (
                      <div key={i} className="invoice-project-row">
                        <span>{pName}</span>
                        <span className="td-semibold">
                          {fmtH(pHours)} → {fmt(pRev)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
