import { useState, useEffect, useRef } from 'react';
import '../styles/admin.css';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import SignaturePad from 'signature_pad';
import {
  FiBold, FiItalic, FiUnderline, FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiAlignJustify, FiList, FiSave, FiDownload, FiArrowLeft, FiRotateCcw,
  FiEdit3, FiSend, FiCheckCircle, FiRefreshCw, FiX, FiEye, FiDroplet,
} from 'react-icons/fi';
import * as contractService from '../services/contractService';
import { getAllCompanies } from '../services/companyService';
import { generateContractPDF } from '../lib/contractPDF';
import './ContractManagement.css';

const VARIABLES = [
  { code: '{{company_name}}', label: 'Nama Perusahaan' },
  { code: '{{company_address}}', label: 'Alamat Perusahaan' },
  { code: '{{company_director}}', label: 'Direktur/HR Manager' },
  { code: '{{company_city}}', label: 'Kota Perusahaan' },
  { code: '{{employee_name}}', label: 'Nama Karyawan' },
  { code: '{{employee_nik}}', label: 'NIK Karyawan' },
  { code: '{{employee_nip}}', label: 'NIP Karyawan' },
  { code: '{{employee_position}}', label: 'Jabatan' },
  { code: '{{employee_division}}', label: 'Divisi' },
  { code: '{{employee_address}}', label: 'Alamat Karyawan' },
  { code: '{{base_salary}}', label: 'Gaji Pokok' },
  { code: '{{allowance}}', label: 'Tunjangan' },
  { code: '{{total_salary}}', label: 'Total Gaji' },
  { code: '{{contract_start}}', label: 'Tgl Mulai Kontrak' },
  { code: '{{contract_end}}', label: 'Tgl Akhir Kontrak' },
  { code: '{{join_date}}', label: 'Tgl Bergabung' },
  { code: '{{contract_date}}', label: 'Tgl Kontrak Dibuat' },
  { code: '{{contract_number}}', label: 'Nomor Kontrak' },
  { code: '{{city}}', label: 'Kota' },
  { code: '{{today}}', label: 'Hari Ini' },
];

export default function ContractEditor({ isTemplate = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [_company, _setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fontColor, setFontColor] = useState('#000000');
  const [pdfExporting, setPdfExporting] = useState(false);

  // Signature state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signFor, setSignFor] = useState('employee'); // 'employee' | 'company'
  const [hasEmployeeSig, setHasEmployeeSig] = useState(false);
  const [hasCompanySig, setHasCompanySig] = useState(false);
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'ce-editor-content-inner' },
    },
  });

  useEffect(() => {
    fetchContract();
  }, [id]);

  useEffect(() => {
    // Init signature pad when modal opens
    if (showSignModal && canvasRef.current) {
      sigPadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgba(255,255,255,0)',
        penColor: '#0047AB',
        minWidth: 1.5,
        maxWidth: 2.5,
      });
      resizeCanvas();
    }
  }, [showSignModal]);

  const fetchContract = async () => {
    setLoading(true);
    const fetcher = isTemplate ? contractService.getTemplateById : contractService.getContractById;
    const [{ data }, companiesRes] = await Promise.all([
      fetcher(id),
      getAllCompanies(),
    ]);
    if (data) {
      setContract(data);
      editor?.commands.setContent(data.html_content || '');
      setHasEmployeeSig(!!data.employee_signature);
      setHasCompanySig(!!data.company_signature);
    }
    if (companiesRes.data?.length > 0) {
      setCompany(companiesRes.data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (contract && editor && !editor.isDestroyed) {
      editor.commands.setContent(contract.html_content || '');
    }
  }, [contract, editor]);

  const resizeCanvas = () => {
    if (!canvasRef.current) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    sigPadRef.current?.clear();
  };

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    const html = editor.getHTML();
    const updateFn = isTemplate
      ? contractService.updateTemplate
      : contractService.updateContract;
    await updateFn(id, { html_content: html });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleExportPDF = async () => {
    const html = editor?.getHTML() || contract?.html_content || '';
    setPdfExporting(true);
    try {
      await generateContractPDF(html, contract?.contract_number || `contract_${id}`);
    } finally {
      setPdfExporting(false);
    }
  };

  const insertVariable = (code) => {
    editor?.commands.insertContent(code);
    editor?.commands.focus();
  };

  const openSignModal = (who) => {
    setSignFor(who);
    setShowSignModal(true);
  };

  const handleSaveSignature = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert('Silakan tulis tanda tangan terlebih dahulu.');
      return;
    }
    const sigData = sigPadRef.current.toDataURL('image/png');
    await contractService.signContract(id, sigData, signFor);
    if (signFor === 'employee') setHasEmployeeSig(true);
    else setHasCompanySig(true);
    setShowSignModal(false);
    // If both signed, update status to 'signed'
    if ((signFor === 'employee' && hasCompanySig) || (signFor === 'company' && hasEmployeeSig)) {
      await contractService.updateContract(id, { status: 'signed' });
      setContract(c => ({ ...c, status: 'signed' }));
    }
  };

  const handleMarkSent = async () => {
    if (!confirm('Tandai kontrak ini sebagai sudah dikirim ke karyawan?')) return;
    await contractService.updateContract(id, { status: 'sent', sent_at: new Date().toISOString() });
    setContract(c => ({ ...c, status: 'sent' }));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
        <FiRefreshCw size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: 8 }}>Memuat kontrak...</p>
      </div>
    </div>
  );

  const statusColor = {
    draft: '#6B7280', sent: '#0047AB', signed: '#16A34A', expired: '#DC2626'
  }[contract?.status] || '#6B7280';

  const handleColorChange = (color) => {
    setFontColor(color);
    editor?.chain().focus().setColor(color).run();
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" style={{ padding: '8px 14px' }} onClick={() => navigate(isTemplate ? '/contracts' : '/contracts')}>
            <FiArrowLeft size={14} />
          </button>
          <div>
            <h1 style={{ fontSize: 18 }}>
              {isTemplate ? 'Edit Template' : 'Edit Kontrak'}
            </h1>
            {contract && !isTemplate && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {contract.contract_number} &middot; {contract.employees?.name} &middot;{' '}
                <span style={{ color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>
                  {contract.status}
                </span>
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isTemplate && (
            <>
              <button className="btn-secondary" onClick={() => openSignModal('employee')} style={{ fontSize: 12 }}>
                {hasEmployeeSig ? <FiCheckCircle size={12} style={{ color: '#16A34A' }} /> : <FiEdit3 size={12} />} TTD Karyawan
              </button>
              <button className="btn-secondary" onClick={() => openSignModal('company')} style={{ fontSize: 12 }}>
                {hasCompanySig ? <FiCheckCircle size={12} style={{ color: '#16A34A' }} /> : <FiEdit3 size={12} />} TTD Perusahaan
              </button>
              <button className="btn-secondary" onClick={handleMarkSent} style={{ fontSize: 12 }}>
                <FiSend size={12} /> Tandai Terkirim
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={handleExportPDF} disabled={pdfExporting}>
            {pdfExporting ? <FiRefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiDownload size={14} />}
            {pdfExporting ? 'Mengekspor...' : 'Export PDF'}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saved ? <FiCheckCircle size={14} /> : <FiSave size={14} />}
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>
      </div>

      <div className="ce-wrapper">
        {/* ─── Editor Panel ─── */}
        <div className="ce-editor-panel">
          {/* Toolbar */}
          <div className="ce-toolbar">
            {/* Bold / Italic / Underline */}
            <button className={`ce-toolbar-btn ${editor?.isActive('bold') ? 'is-active' : ''}`} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }} title="Tebal (Bold)">
              <FiBold />
            </button>
            <button className={`ce-toolbar-btn ${editor?.isActive('italic') ? 'is-active' : ''}`} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }} title="Miring (Italic)">
              <FiItalic />
            </button>
            <button className={`ce-toolbar-btn ${editor?.isActive('underline') ? 'is-active' : ''}`} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }} title="Garis Bawah">
              <FiUnderline />
            </button>
            <div className="ce-toolbar-divider" />

            {/* Headings */}
            {[1, 2, 3].map(level => (
              <button
                key={level}
                className={`ce-toolbar-btn ${editor?.isActive('heading', { level }) ? 'is-active' : ''}`}
                onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level }).run(); }}
                style={{ fontSize: 11, fontWeight: 700 }}
                title={`Heading ${level}`}
              >
                H{level}
              </button>
            ))}
            <div className="ce-toolbar-divider" />

            {/* Alignment */}
            {[
              { align: 'left', Icon: FiAlignLeft },
              { align: 'center', Icon: FiAlignCenter },
              { align: 'right', Icon: FiAlignRight },
              { align: 'justify', Icon: FiAlignJustify },
            ].map(({ align, Icon }) => (
              <button
                key={align}
                className={`ce-toolbar-btn ${editor?.isActive({ textAlign: align }) ? 'is-active' : ''}`}
                onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign(align).run(); }}
                title={`Rata ${align}`}
              >
                <Icon />
              </button>
            ))}
            <div className="ce-toolbar-divider" />

            {/* Lists */}
            <button className={`ce-toolbar-btn ${editor?.isActive('bulletList') ? 'is-active' : ''}`} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }} title="Daftar Poin">
              <FiList />
            </button>
            <button className={`ce-toolbar-btn ${editor?.isActive('orderedList') ? 'is-active' : ''}`} onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }} style={{ fontSize: 11, fontWeight: 700 }} title="Daftar Nomor">
              1.
            </button>
            <div className="ce-toolbar-divider" />

            {/* Font Size */}
            <select
              style={{ height: 30, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
              onChange={e => {
                const val = e.target.value;
                if (val) editor?.chain().focus().setMark('textStyle', { fontSize: val }).run();
              }}
              defaultValue=""
            >
              <option value="">Ukuran</option>
              {['10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Font Color */}
            <div className="ce-toolbar-divider" />
            <div
              className="ce-color-btn"
              title="Warna Teks"
              style={{ position: 'relative', width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', background: 'transparent' }}
            >
              <FiDroplet size={13} style={{ color: fontColor === '#000000' ? 'var(--text-secondary)' : fontColor, pointerEvents: 'none' }} />
              <span style={{ width: 16, height: 3, borderRadius: 2, background: fontColor, display: 'block', pointerEvents: 'none' }} />
              <input
                type="color"
                value={fontColor}
                onChange={e => handleColorChange(e.target.value)}
                title="Pilih warna teks"
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }}
              />
            </div>
            <button
              className="ce-toolbar-btn"
              onMouseDown={e => { e.preventDefault(); handleColorChange('#000000'); }}
              title="Reset ke warna hitam"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              A
            </button>

            {/* Horizontal Rule */}
            <div className="ce-toolbar-divider" />
            <button className="ce-toolbar-btn" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHorizontalRule().run(); }} style={{ fontSize: 12 }} title="Garis Horizontal">
              —
            </button>

            {/* Undo/Redo */}
            <div className="ce-toolbar-divider" />
            <button className="ce-toolbar-btn" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().undo().run(); }} title="Batalkan">
              <FiRotateCcw />
            </button>
          </div>

          {/* Editor body */}
          <div className="ce-editor-content">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* ─── Side Panel ─── */}
        <div className="ce-side-panel">
          {/* Variables */}
          <div className="ce-panel-card">
            <div className="ce-panel-title">Variabel Otomatis</div>
            <div className="ce-panel-body">
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Klik untuk menyisipkan ke dokumen. Variabel ini diisi otomatis dari data karyawan.
              </p>
              <div className="ce-vars-list">
                {VARIABLES.map(v => (
                  <div
                    key={v.code}
                    className="ce-var-item"
                    onClick={() => insertVariable(v.code)}
                    title={`Klik untuk sisipkan ${v.code}`}
                  >
                    <span className="ce-var-code">{v.code}</span>
                    <span className="ce-var-label">{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Signature status (only for contracts, not templates) */}
          {!isTemplate && (
            <div className="ce-panel-card">
              <div className="ce-panel-title">Status Tanda Tangan</div>
              <div className="ce-panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { who: 'employee', label: 'Tanda Tangan Karyawan', has: hasEmployeeSig },
                    { who: 'company', label: 'Tanda Tangan Perusahaan', has: hasCompanySig },
                  ].map(s => (
                    <div key={s.who} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: s.has ? '#F0FDF4' : 'var(--bg)' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: s.has ? '#16A34A' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.has
                            ? <FiCheckCircle size={14} style={{ color: '#16A34A' }} />
                            : <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', display: 'inline-block' }} />}
                          {s.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {s.has ? 'Sudah ditandatangani' : 'Belum ditandatangani'}
                        </div>
                      </div>
                      {!s.has && (
                        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => openSignModal(s.who)}>
                          <FiEdit3 size={11} /> Tanda Tangani
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="ce-panel-card">
            <div className="ce-panel-title">Aksi Cepat</div>
            <div className="ce-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                <FiSave size={13} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button className="btn-secondary" onClick={handleExportPDF} disabled={pdfExporting} style={{ width: '100%', justifyContent: 'center' }}>
                {pdfExporting ? <FiRefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FiDownload size={13} />}
                {pdfExporting ? 'Mengekspor...' : 'Export ke PDF'}
              </button>
              {!isTemplate && (
                <button className="btn-secondary" onClick={handleMarkSent} style={{ width: '100%', justifyContent: 'center', color: '#0047AB' }}>
                  <FiSend size={13} /> Tandai Sudah Dikirim
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SIGNATURE MODAL */}
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tanda Tangan {signFor === 'employee' ? 'Karyawan' : 'Perusahaan'}</h2>
              <button className="modal-close" onClick={() => setShowSignModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Tanda tangan di bawah ini menggunakan mouse atau layar sentuh:
              </p>
              <canvas
                ref={canvasRef}
                className="ce-signature-canvas"
                style={{ width: '100%', height: 200 }}
              />
              <button
                onClick={() => sigPadRef.current?.clear()}
                style={{ marginTop: 8, padding: '6px 14px', fontSize: 12, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
              >
                <FiRotateCcw size={12} /> Hapus & Ulangi
              </button>
              <div style={{ marginTop: 14, padding: 12, background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 12, color: '#92400E' }}>
                Dengan menyimpan tanda tangan ini, Anda menyetujui bahwa tanda tangan digital ini memiliki kekuatan hukum yang setara dengan tanda tangan fisik sesuai UU No. 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik (ITE).
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSignModal(false)}>Batal</button>
              <button className="btn-primary" onClick={handleSaveSignature}>
                <FiCheckCircle size={13} /> Simpan Tanda Tangan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
