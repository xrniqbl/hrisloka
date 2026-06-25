import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';

const tabs = ['Personal', 'Employment', 'Attendance', 'Payroll', 'Performance', 'Documents'];

const statusColors = { permanent: '#16A34A', contract: '#F59E0B', resign: '#EF4444' };
const formatCurrency = (v) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

export default function EmployeeSlideOver({ employee, isOpen, onClose, todayAttendance }) {
  const [activeTab, setActiveTab] = useState('Personal');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  useEffect(() => {
    if (isOpen && employee?.id) {
      setActiveTab('Personal');
      // Fetch attendance history
      supabase.from('attendance').select('*').eq('employee_id', employee.id)
        .order('date', { ascending: false }).limit(10)
        .then(({ data }) => setAttendanceHistory(data || []));
    }
  }, [isOpen, employee?.id]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!employee) return null;

  const todayAtt = todayAttendance?.find(a => a.employee_id === employee.id);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Personal':
        return (
          <>
            <div className="dash-slideover-section">
              <div className="dash-slideover-section-title">Personal Information</div>
              {[
                ['Full Name', employee.name],
                ['Email', employee.email],
                ['Phone', employee.phone],
                ['NIK', employee.nik],
                ['Gender', employee.gender],
                ['Birth Date', employee.birth_date || employee.birthDate],
                ['Address', employee.address],
              ].map(([label, value]) => (
                <div key={label} className="dash-slideover-field">
                  <span className="dash-slideover-field-label">{label}</span>
                  <span className="dash-slideover-field-value">{value || '—'}</span>
                </div>
              ))}
            </div>
          </>
        );
      case 'Employment':
        return (
          <div className="dash-slideover-section">
            <div className="dash-slideover-section-title">Employment Details</div>
            {[
              ['Position', employee.position],
              ['Department', employee.division],
              ['Status', employee.status],
              ['Join Date', employee.join_date || employee.joinDate],
              ['Contract Start', employee.contract_start || employee.contractStart],
              ['Contract End', employee.contract_end || employee.contractEnd],
              ['Base Salary', formatCurrency(employee.base_salary || employee.baseSalary)],
              ['Allowance', formatCurrency(employee.allowance)],
            ].map(([label, value]) => (
              <div key={label} className="dash-slideover-field">
                <span className="dash-slideover-field-label">{label}</span>
                <span className="dash-slideover-field-value" style={label === 'Status' ? { color: statusColors[value] || 'var(--dash-text)' } : {}}>
                  {label === 'Status' ? (value || '—').charAt(0).toUpperCase() + (value || '—').slice(1) : (value || '—')}
                </span>
              </div>
            ))}
          </div>
        );
      case 'Attendance':
        return (
          <div className="dash-slideover-section">
            <div className="dash-slideover-section-title">Today</div>
            <div className="dash-slideover-field">
              <span className="dash-slideover-field-label">Status</span>
              <span className={`dash-status ${todayAtt?.status || 'absent'}`}>
                {todayAtt?.status ? todayAtt.status.charAt(0).toUpperCase() + todayAtt.status.slice(1) : 'Not Clocked In'}
              </span>
            </div>
            <div className="dash-slideover-field">
              <span className="dash-slideover-field-label">Clock In</span>
              <span className="dash-slideover-field-value">{todayAtt?.clock_in || '—'}</span>
            </div>
            <div className="dash-slideover-field">
              <span className="dash-slideover-field-label">Clock Out</span>
              <span className="dash-slideover-field-value">{todayAtt?.clock_out || '—'}</span>
            </div>
            <div className="dash-slideover-section-title" style={{ marginTop: 16 }}>Recent History</div>
            {attendanceHistory.length === 0 ? (
              <div className="dash-empty"><div className="dash-empty-text">No attendance records</div></div>
            ) : attendanceHistory.map(a => (
              <div key={a.id} className="dash-slideover-field">
                <span className="dash-slideover-field-label">{a.date}</span>
                <span className={`dash-status ${a.status}`}>{a.status}</span>
              </div>
            ))}
          </div>
        );
      case 'Payroll':
        return (
          <div className="dash-slideover-section">
            <div className="dash-slideover-section-title">Salary Information</div>
            {[
              ['Base Salary', formatCurrency(employee.base_salary || employee.baseSalary)],
              ['Allowance', formatCurrency(employee.allowance)],
              ['Bank', employee.bank_name || employee.bankAccount?.bank],
              ['Account Number', employee.bank_number || employee.bankAccount?.number],
              ['Account Holder', employee.bank_holder || employee.bankAccount?.holder],
            ].map(([label, value]) => (
              <div key={label} className="dash-slideover-field">
                <span className="dash-slideover-field-label">{label}</span>
                <span className="dash-slideover-field-value">{value || '—'}</span>
              </div>
            ))}
          </div>
        );
      case 'Performance':
        return (
          <div className="dash-slideover-section">
            <div className="dash-slideover-section-title">Performance Overview</div>
            <div className="dash-empty">
              <div className="dash-empty-text">Performance data will appear here</div>
            </div>
          </div>
        );
      case 'Documents':
        return (
          <div className="dash-slideover-section">
            <div className="dash-slideover-section-title">Documents</div>
            <div className="dash-empty">
              <div className="dash-empty-text">No documents uploaded</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`dash-slideover-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`dash-slideover ${isOpen ? 'open' : ''}`}>
        <div className="dash-slideover-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--dash-primary-light)', color: 'var(--dash-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700,
            }}>
              {(employee.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dash-text)' }}>{employee.name}</div>
              <div style={{ fontSize: 12, color: 'var(--dash-text-muted)' }}>{employee.position} — {employee.division}</div>
            </div>
          </div>
          <button className="dash-slideover-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="dash-slideover-tabs">
          {tabs.map(tab => (
            <button key={tab} className={`dash-slideover-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <div className="dash-slideover-body">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}
