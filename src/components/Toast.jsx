import { useState, createContext, useContext, useCallback, useRef, useEffect } from 'react';
import {
  HiBellAlert,
  HiCheck,
  HiInformationCircle,
  HiXMark
} from 'react-icons/hi2';
import './Toast.css';

const ToastContext = createContext({});

let toastId = 0;

export function ToastProvider({ children }) {
 const [toasts, setToasts] = useState([]);
 const timersRef = useRef(new Map());
 const MAX_TOASTS = 5;

 // Bersihkan semua timer saat provider unmount (cegah setState pasca-unmount)
 useEffect(() => {
   const timers = timersRef.current;
   return () => {
     timers.forEach(clearTimeout);
     timers.clear();
   };
 }, []);

 const addToast = useCallback((message, type = 'info', duration = 4000) => {
 const id = ++toastId;
 // Batasi stack: toast terlama dibuang + timernya dibersihkan
 setToasts(prev => {
   const next = [...prev, { id, message, type }];
   if (next.length > MAX_TOASTS) {
     const dropped = next.slice(0, next.length - MAX_TOASTS);
     dropped.forEach(t => {
       const timer = timersRef.current.get(t.id);
       if (timer) { clearTimeout(timer); timersRef.current.delete(t.id); }
     });
     return next.slice(next.length - MAX_TOASTS);
   }
   return next;
 });
 if (duration > 0) {
 const timer = setTimeout(() => {
 timersRef.current.delete(id);
 setToasts(prev => prev.filter(t => t.id !== id));
 }, duration);
 timersRef.current.set(id, timer);
 }
 return id;
 }, []);

 const removeToast = useCallback((id) => {
 const timer = timersRef.current.get(id);
 if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
 setToasts(prev => prev.filter(t => t.id !== id));
 }, []);

 // HiXMark: toast needs to be a function-returning object
 const value = {
 toast: {
 success: (msg, dur) => addToast(msg, 'success', dur),
 error: (msg, dur) => addToast(msg, 'error', dur || 6000),
 warning: (msg, dur) => addToast(msg, 'warning', dur),
 info: (msg, dur) => addToast(msg, 'info', dur),
 },
 removeToast,
 };

 return (
 <ToastContext.Provider value={value}>
 {children}
 <div className="toast-container">
 {toasts.map(t => (
 <div key={t.id} className={`toast toast-${t.type}`} role="status" aria-live="polite">
 <div className="toast-icon">
 {t.type === 'success' && <HiCheck />}
 {t.type === 'error' && <HiXMark />}
 {t.type === 'warning' && <HiBellAlert />}
 {t.type === 'info' && <HiInformationCircle />}
 </div>
 <span className="toast-message">{t.message}</span>
 <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Tutup"><HiXMark /></button>
 </div>
 ))}
 </div>
 </ToastContext.Provider>
 );
}

export function useToast() {
 return useContext(ToastContext);
}
