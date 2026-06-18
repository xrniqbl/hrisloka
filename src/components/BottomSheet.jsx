import {
  HiXMark
} from 'react-icons/hi2';
import { useEffect } from 'react';
import '../layouts/EmployeeLayout.css';

export default function BottomSheet({ open, onClose, title, children, footer }) {
 // Close on Escape key
 useEffect(() => {
   if (!open) return;
   const handler = (e) => { if (e.key === 'Escape') onClose(); };
   document.addEventListener('keydown', handler);
   return () => document.removeEventListener('keydown', handler);
 }, [open, onClose]);

 if (!open) return null;

 return (
 <>
 <div className="bottom-sheet-overlay" onClick={onClose} />
 <div className="bottom-sheet">
 <div className="bottom-sheet-handle" />
 <div className="bottom-sheet-header">
 <h3>{title}</h3>
 <button className="bottom-sheet-close" onClick={onClose} aria-label="Tutup"><HiXMark /></button>
 </div>
 <div className="bottom-sheet-body">
 {children}
 </div>
 {footer && (
 <div className="bottom-sheet-footer">
 {footer}
 </div>
 )}
 </div>
 </>
 );
}
