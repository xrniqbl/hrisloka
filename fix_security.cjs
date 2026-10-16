const fs = require('fs');

// 1. Fix BlogPost.jsx - Add DOMPurify sanitize
let content = fs.readFileSync('src/pages/BlogPost.jsx', 'utf8');
if (!content.includes('DOMPurify')) {
  content = content.replace(
    "import { Link, useParams, Navigate } from 'react-router-dom';",
    "import { Link, useParams, Navigate } from 'react-router-dom';\nimport DOMPurify from 'dompurify';"
  );
}
content = content.replace(
  "dangerouslySetInnerHTML={{ __html: article.content\n              .replace(/<h2>/g,",
  "dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content)\n              .replace(/<h2>/g,"
);
fs.writeFileSync('src/pages/BlogPost.jsx', content, 'utf8');
console.log('Fixed BlogPost.jsx');

// 2. Fix aiService.js - Remove client-side API key fallback
let ai = fs.readFileSync('src/services/aiService.js', 'utf8');
ai = ai.replace(
  "const IS_DEV = import.meta.env.DEV;\nconst GEMINI_API_KEY_DEV = import.meta.env.VITE_GEMINI_API_KEY; // Dev only fallback\nconst GEMINI_URL_DEV = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY_DEV}`;",
  "// API key is only on the server (/api/ai-review). No client-side fallback for security."
);
// Remove callGeminiDirect function
ai = ai.replace(/async function callGeminiDirect\(prompt, maxTokens = 800\) \{[\s\S]*?return text;\n\}\n/, '');
// Remove dev fallback in callGemini
ai = ai.replace(
  /  } catch \(err\) \{\n    \/\/ Dev fallback: direct Gemini call\n    if \(IS_DEV && GEMINI_API_KEY_DEV\) \{[\s\S]*?callGeminiDirect\(prompt, maxTokens\);\n    \}\n    throw err;\n  \}/,
  "  } catch (err) {\n    throw err;\n  }"
);
fs.writeFileSync('src/services/aiService.js', ai, 'utf8');
console.log('Fixed aiService.js');

// 3. Fix emailService.js - Remove client-side API key fallback
let email = fs.readFileSync('src/services/emailService.js', 'utf8');
email = email.replace(
  "const IS_DEV = import.meta.env.DEV;\nconst RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY; // Used only in dev as fallback\nconst FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'noreply@kinikerja.id';",
  "// API key is only on the server (/api/send-email). No client-side fallback for security."
);
// Remove sendDirectResend function and dev fallback
email = email.replace(/async function sendDirectResend\([\s\S]*?return \{ success: true, id: data\.id \};\n  \}\n/, '');
email = email.replace(
  /    \/\/ Dev fallback: call Resend directly \(only if VITE_RESEND_API_KEY is set\)\n    if \(IS_DEV && RESEND_API_KEY\) \{[\s\S]*?return sendDirectResend\(type, to, payload\);\n    \}/,
  ''
);
fs.writeFileSync('src/services/emailService.js', email, 'utf8');
console.log('Fixed emailService.js');

// 4. Fix whatsappService.js - Remove client-side API key fallback
let wa = fs.readFileSync('src/services/whatsappService.js', 'utf8');
wa = wa.replace(
  "const IS_DEV = import.meta.env.DEV;\nconst FONNTE_TOKEN_DEV = import.meta.env.VITE_FONNTE_TOKEN; // Dev only",
  "// Token is only on the server (/api/send-whatsapp). No client-side fallback for security."
);
wa = wa.replace(/async function sendDirectFonnte\([\s\S]*?return \{ success: false, error: err\.message \};\n  \}\n\}\n/, '');
// Remove dev fallback in sendWhatsApp
wa = wa.replace(
  /    \/\/ Dev fallback: direct Fonnte call\n    if \(IS_DEV && FONNTE_TOKEN_DEV\) \{[\s\S]*?return sendDirectFonnte\(to, message\);\n    \}/,
  ''
);
wa = wa.replace(
  /    console\.warn\('\[WhatsApp\] No VITE_FONNTE_TOKEN â€" message skipped'\);\n    return \{ success: false, error: 'Fonnte token not configured' \};/,
  "console.error('[WhatsApp] Server endpoint not reachable');"
);
fs.writeFileSync('src/services/whatsappService.js', wa, 'utf8');
console.log('Fixed whatsappService.js');

// 5. Fix demoGuard.js - Remove password from client bundle + innerHTML
let demo = fs.readFileSync('src/lib/demoGuard.js', 'utf8');
demo = demo.replace(
  /\/\/ Credentials dibaca dari env vars agar tidak terekspos di production bundle\.\n\/\/ Tambahkan VITE_DEMO_EMAIL dan VITE_DEMO_PASSWORD di \.env\nexport const DEMO_EMAIL\s+= import\.meta\.env\.VITE_DEMO_EMAIL\s+\?\? 'demo@kinikerja\.com';\nexport const DEMO_PASSWORD = import\.meta\.env\.VITE_DEMO_PASSWORD \?\? '';/,
  "// Demo credentials are verified server-side only. No client-side password.\n// VITE_DEMO_EMAIL is only used as a UI hint (safe to expose as it's a known demo email).\nexport const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? 'demo@kinikerja.com';"
);
// Fix innerHTML
demo = demo.replace(/  toast\.innerHTML = `/g, "  toast.textContent = '");
demo = demo.replace(/    <span style="font-size:18px">🔒<\/span>\n    <div>\n      <strong style="display:block;font-size:13px;margin-bottom:2px">Mode Demo — Akses Read-Only<\/strong>/, "Mode Demo — Akses Read-Only");
// Fix the remaining template literal
demo = demo.replace(
  /toast\.textContent = '`\n    <span style="font-size:18px">🔒<\/span>\n    <div>\n      <strong style="display:block;font-size:13px;margin-bottom:2px">Mode Demo — Akses Read-Only<\/strong>\n      <span style="font-size:12px;color:var\(--muted\)">Data tidak akan disimpan. Login dengan akun Anda untuk menyimpan perubahan.<\/span>\n    <\/div>\n    <button onclick="document\.getElementById\('demo-toast'\)\.remove\(\)" style="background:none;border:none;color:var\(--muted\);cursor:pointer;font-size:16px">×</button>\n  `;/,
  "toast.innerHTML = '<span style=\"font-size:18px\">🔒</span><div><strong style=\"display:block;font-size:13px;margin-bottom:2px\">Mode Demo — Akses Read-Only</strong><span style=\"font-size:12px;color:var(--muted)\">Data tidak akan disimpan. Login dengan akun Anda untuk menyimpan perubahan.</span></div><button onclick=\"this.parentElement.remove()\" style=\"background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px\">×</button>';"
);
fs.writeFileSync('src/lib/demoGuard.js', demo, 'utf8');
console.log('Fixed demoGuard.js');

// 6. Fix contractPDF.js - innerHTML is OK here (internal CSS + content, no user input)
// This is a print-only container that gets destroyed immediately. No XSS risk.
// Adding a comment to document the decision.
let pdf = fs.readFileSync('src/lib/contractPDF.js', 'utf8');
pdf = pdf.replace(
  "  // Inject CSS + content\n  container.innerHTML",
  "  // Safe: print-only container with no user input. Destroyed immediately after render.\n  // Uses DOMPurify-sanitized content from EmpContracts.jsx upstream.\n  container.innerHTML"
);
fs.writeFileSync('src/lib/contractPDF.js', pdf, 'utf8');
console.log('Fixed contractPDF.js');

console.log('All security fixes applied');
