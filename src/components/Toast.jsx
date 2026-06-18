import { useState, createContext, useContext, useCallback } from 'react';
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

 const addToast = useCallback((message, type = 'info', duration = 4000) => {
 const id = ++toastId;
 setToasts(prev => [...prev, { id, message, type }]);
 if (duration > 0) {
 setTimeout(() => {
 setToasts(prev => prev.filter(t => t.id !== id));
 }, duration);
 }
 return id;
 }, []);

 const removeToast = useCallback((id) => {
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
 <div key={t.id} className={`toast toast-${t.type}`}>
 <div className="toast-icon">
 {t.type === 'success' && <HiCheck />}
 {t.type === 'error' && <HiXMark />}
 {t.type === 'warning' && <HiBellAlert />}
 {t.type === 'info' && <HiInformationCircle />}
 </div>
 <span className="toast-message">{t.message}</span>
 <button className="toast-close" onClick={() => removeToast(t.id)}><HiXMark /></button>
 </div>
 ))}
 </div>
 </ToastContext.Provider>
 );
}

export function useToast() {
 return useContext(ToastContext);
}
