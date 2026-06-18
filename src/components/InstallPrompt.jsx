import { useState, useEffect } from 'react';

export default function InstallPrompt() {
 const [deferredPrompt, setDeferredPrompt] = useState(null);
 const [showBanner, setShowBanner] = useState(false);
 const [isIOS, setIsIOS] = useState(false);

 useEffect(() => {
 // Only show on mobile devices
 const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
 || window.innerWidth <= 768;
 if (!isMobile) return;

 // Detect iOS (Safari doesn't support beforeinstallprompt)
 const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
 const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
 setIsIOS(isIOSDevice);

 // Don't show if already installed or dismissed recently
 if (isStandalone) return;
 const dismissed = localStorage.getItem('pwa_install_dismissed');
 if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return; // 7 days

 // Android/Chrome: listen for beforeinstallprompt
 const handler = (e) => {
 e.preventDefault();
 setDeferredPrompt(e);
 setShowBanner(true);
 };
 window.addEventListener('beforeinstallprompt', handler);

 // iOS: show manual instruction after 3 seconds
 if (isIOSDevice && !isStandalone) {
 const timer = setTimeout(() => setShowBanner(true), 3000);
 return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
 }

 return () => window.removeEventListener('beforeinstallprompt', handler);
 }, []);

 const handleInstall = async () => {
 if (deferredPrompt) {
 deferredPrompt.prompt();
 const result = await deferredPrompt.userChoice;
 if (result.outcome === 'accepted') {
 setShowBanner(false);
 }
 setDeferredPrompt(null);
 }
 };

 const handleDismiss = () => {
 setShowBanner(false);
 localStorage.setItem('pwa_install_dismissed', Date.now().toString());
 };

 if (!showBanner) return null;

 return (
 <div style={styles.overlay}>
 <div style={styles.banner}>
 {/* App icon */}
 <div style={styles.iconRow}>
 <div style={styles.appIcon}>
 <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
 <rect width="24" height="24" rx="6" fill="#0047AB" />
 <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">HR</text>
 </svg>
 </div>
 <div>
 <div style={styles.title}>Install HRIS Loka</div>
 <div style={styles.subtitle}>Akses cepat tanpa buka browser</div>
 </div>
 <button onClick={handleDismiss} style={styles.closeBtn} aria-label="Tutup">×</button>
 </div>

 {/* Features */}
 <div style={styles.features}>
 <div style={styles.feature}>Buka instan</div>
 <div style={styles.feature}>Layar penuh</div>
 <div style={styles.feature}>Notifikasi</div>
 </div>

 {isIOS ? (
 /* iOS manual instructions */
 <div style={styles.iosInstructions}>
 <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
 Ketuk <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
 <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
 <polyline points="16,6 12,2 8,6" />
 <line x1="12" y1="2" x2="12" y2="15" />
 </svg>
 Share
 </strong>{' '}
 lalu pilih <strong>"Add to Home Screen"</strong>
 </p>
 </div>
 ) : (
 /* Android/Chrome install button */
 <button onClick={handleInstall} style={styles.installBtn}>
 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
 <polyline points="7,10 12,15 17,10" />
 <line x1="12" y1="15" x2="12" y2="3" />
 </svg>
 Install Sekarang
 </button>
 )}
 </div>
 </div>
 );
}

const styles = {
 overlay: {
 position: 'fixed',
 bottom: 0,
 left: 0,
 right: 0,
 zIndex: 99999,
 padding: '16px',
 pointerEvents: 'none',
 animation: 'slideUpInstall 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
 },
 banner: {
 pointerEvents: 'auto',
 background: 'rgba(255, 255, 255, 0.95)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
 borderRadius: 20,
 padding: '20px',
 boxShadow: '0 -4px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
 maxWidth: 420,
 margin: '0 auto',
 },
 iconRow: {
 display: 'flex',
 alignItems: 'center',
 gap: 12,
 marginBottom: 14,
 },
 appIcon: {
 width: 44,
 height: 44,
 borderRadius: 12,
 background: 'linear-gradient(135deg, #0047AB, #3B82F6)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 flexShrink: 0,
 },
 title: {
 fontSize: 16,
 fontWeight: 800,
 color: '#0F172A',
 letterSpacing: '-0.3px',
 },
 subtitle: {
 fontSize: 12,
 color: '#64748B',
 marginTop: 1,
 },
 closeBtn: {
 marginLeft: 'auto',
 background: 'none',
 border: 'none',
 fontSize: 18,
 color: '#94A3B8',
 cursor: 'pointer',
 padding: '4px 8px',
 borderRadius: 8,
 lineHeight: 1,
 },
 features: {
 display: 'flex',
 gap: 8,
 marginBottom: 16,
 },
 feature: {
 flex: 1,
 fontSize: 11,
 fontWeight: 600,
 color: '#475569',
 textAlign: 'center',
 padding: '8px 4px',
 background: '#F1F5F9',
 borderRadius: 10,
 },
 installBtn: {
 width: '100%',
 padding: '14px',
 fontSize: 15,
 fontWeight: 700,
 color: '#fff',
 background: 'linear-gradient(135deg, #0047AB, #2563EB)',
 border: 'none',
 borderRadius: 14,
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 8,
 letterSpacing: '-0.2px',
 transition: 'transform 0.15s, box-shadow 0.15s',
 boxShadow: '0 4px 14px rgba(0, 71, 171, 0.35)',
 },
 iosInstructions: {
 background: '#F0F7FF',
 borderRadius: 12,
 padding: '14px 16px',
 textAlign: 'center',
 },
};
