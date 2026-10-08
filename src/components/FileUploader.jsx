import { useState } from 'react';
import { FiUpload, FiCheck, FiFile, FiLoader } from 'react-icons/fi';
import { uploadDocument } from '../services/documentService';
import { isDemoMode, showDemoToast } from '../lib/demoGuard';
import '../styles/shared.css';

/**
 * Compact document uploader for Employee PWA.
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export default function FileUploader({ employeeId, type, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    // Validasi client-side (server/storage tetap validasi ulang):
    // accept HTML mudah dilewati via drag-drop/rename ekstensi.
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('Ukuran file maksimal 10 MB.');
      setFile(null);
      return;
    }
    setFile(selected);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file || !employeeId) return;
    if (isDemoMode()) {
      showDemoToast();
      return;
    }

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
    <div className="emp-file-uploader">
      {success ? (
        <div className="emp-file-uploader__success">
          <span className="emp-file-uploader__icon-ok">
            <FiCheck size={16} strokeWidth={2.5} />
          </span>
          <span className="emp-file-uploader__msg">Berhasil diunggah!</span>
          <button type="button" className="emp-file-uploader__link" onClick={() => setSuccess(false)}>
            Unggah lagi
          </button>
        </div>
      ) : (
        <>
          <input
            type="file"
            id={`file-upload-${type}`}
            className="emp-file-uploader__input"
            onChange={handleFileChange}
            accept="image/*,application/pdf"
          />
          <label htmlFor={`file-upload-${type}`} className="emp-file-uploader__drop">
            <span className="emp-file-uploader__icon">
              <FiUpload size={16} strokeWidth={2} />
            </span>
            <span className="emp-file-uploader__text">
              {file ? file.name : `Pilih / foto ${type}`}
            </span>
          </label>

          {file && (
            <div className="emp-file-uploader__actions">
              <button
                type="button"
                className="emp-file-uploader__btn emp-file-uploader__btn--primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? <FiLoader className="spin" size={14} /> : <FiFile size={14} />}
                {uploading ? 'Mengunggah…' : 'Konfirmasi unggah'}
              </button>
              <button
                type="button"
                className="emp-file-uploader__btn emp-file-uploader__btn--ghost"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                Batal
              </button>
            </div>
          )}
        </>
      )}
      {error && <div className="emp-file-uploader__error">{error}</div>}
    </div>
  );
}
