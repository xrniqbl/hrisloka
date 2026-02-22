import { useState } from 'react';
import { FiUpload, FiCheck, FiX, FiFile, FiLoader } from 'react-icons/fi';
import { uploadDocument } from '../services/documentService';
import '../styles/shared.css';

export default function FileUploader({ employeeId, type, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setError(null);
            setSuccess(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !employeeId) return;

        setUploading(true);
        setError(null);

        const { data, error: uploadErr } = await uploadDocument(file, employeeId, type);

        setUploading(false);
        if (uploadErr) {
            setError(uploadErr.message);
        } else {
            setSuccess(true);
            setFile(null);
            if (onUploadSuccess) onUploadSuccess(data);
        }
    };

    return (
        <div style={{ padding: 16, border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            {success ? (
                <div style={{ color: 'var(--success)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <FiCheck size={32} />
                    <span style={{ fontSize: 14 }}>Berhasil diunggah!</span>
                    <button className="btn-secondary btn-sm" onClick={() => setSuccess(false)}>Unggah Lagi</button>
                </div>
            ) : (
                <>
                    <input
                        type="file"
                        id={`file-upload-${type}`}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                    />
                    <label htmlFor={`file-upload-${type}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <FiUpload size={32} color="var(--primary)" />
                        <span style={{ fontSize: 14 }}>{file ? file.name : `Pilih atau Foto Dokumen ${type}`}</span>
                    </label>

                    {file && (
                        <div style={{ marginTop: 16 }}>
                            <button
                                className="btn-primary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                onClick={handleUpload}
                                disabled={uploading}
                            >
                                {uploading ? <FiLoader className="spin" /> : <FiFile />}
                                {uploading ? 'Mengunggah...' : 'Konfirmasi Unggah'}
                            </button>
                            <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => setFile(null)} disabled={uploading}>
                                Batal
                            </button>
                        </div>
                    )}
                </>
            )}
            {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
    );
}
