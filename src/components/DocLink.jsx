import { useState } from 'react';
import { FiExternalLink, FiDownload } from 'react-icons/fi';
import { getDocumentUrl } from '../services/documentService';

/**
 * Resolve a stored document reference (storage path or legacy URL) into a
 * signed, short-lived URL and open it. Avoids exposing employee documents
 * (KTP/NPWP) via world-readable public URLs.
 *
 * Props: { docRef, title, download, children, className, style, ownerEmployeeId }
 * ownerEmployeeId pins the storage path to its owner (IDOR guard in
 * getDocumentUrl). Pass the row's employee_id; omit only for legacy https URLs.
 */
export default function DocLink({
  docRef,
  title = 'Lihat',
  download = false,
  children,
  className = 'action-btn',
  style = {},
  ownerEmployeeId = null,
}) {
  const [busy, setBusy] = useState(false);

  const handleOpen = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const url = await getDocumentUrl(docRef, 3600, ownerEmployeeId);
      if (url) {
        if (download) {
          // Trigger a download via a temporary anchor.
          const a = document.createElement('a');
          a.href = url;
          a.download = '';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!docRef) return null;

  return (
    <a
      href="#"
      onClick={handleOpen}
      className={className}
      style={{ opacity: busy ? 0.6 : 1, ...style }}
      title={title}
      aria-label={title}
    >
      {children || <FiExternalLink />}
    </a>
  );
}
