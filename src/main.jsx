import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './lib/autoTranslate.js'

// Apply saved theme before first paint (read both old + new key for migration)
const savedTheme = localStorage.getItem('hrisync_theme') || localStorage.getItem('HRIS Loka_theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  // Migrate old key to new key
  localStorage.setItem('hrisync_theme', savedTheme);
  localStorage.removeItem('HRIS Loka_theme');
}

// Migrate locale key: hrisync_lang / HRIS Loka_locale → hrisync_locale
const savedLocale = localStorage.getItem('hrisync_locale')
  || localStorage.getItem('HRIS Loka_locale')
  || localStorage.getItem('hrisync_lang');
if (savedLocale) {
  localStorage.setItem('hrisync_locale', savedLocale);
  localStorage.setItem('hrisync_lang', savedLocale);
  localStorage.removeItem('HRIS Loka_locale');
}

// Apply initial data-lang to <html> before React renders
const initLang = localStorage.getItem('hrisync_locale') || 'id';
document.documentElement.setAttribute('lang', initLang);
document.documentElement.setAttribute('data-lang', initLang);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
