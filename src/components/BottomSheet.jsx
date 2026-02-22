import { FiX } from 'react-icons/fi';
import '../layouts/EmployeeLayout.css';

export default function BottomSheet({ open, onClose, title, children, footer }) {
    if (!open) return null;

    return (
        <>
            <div className="bottom-sheet-overlay" onClick={onClose} />
            <div className="bottom-sheet">
                <div className="bottom-sheet-handle" />
                <div className="bottom-sheet-header">
                    <h3>{title}</h3>
                    <button className="bottom-sheet-close" onClick={onClose}><FiX /></button>
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
