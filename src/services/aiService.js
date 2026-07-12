/**
 * AI Review Service — calls /api/ai-review serverless function.
 * API key stays on the server only (no client-side Gemini calls).
 */

import { supabase } from '../lib/supabase';

/** Get the current user's access token (for authenticating serverless calls). */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

/**
 * Call AI via serverless function (GEMINI_API_KEY on server).
 */
async function callGemini(prompt, maxTokens = 800) {
  const res = await fetch('/api/ai-review', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'AI server error');
  return data.text;
}


/**
 * Generate an AI-powered employee performance review.
 * Falls back to a rich template if AI is unavailable.
 */
export async function generateAIReview(employee, aiCapabilities, kpiData = null) {
  const empName = employee?.name || 'Karyawan';
  const division = employee?.division || '-';
  const position = employee?.position || '-';
  const period = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const avgScore = aiCapabilities?.avgScore ?? 0;
  const skills = aiCapabilities?.skills || [];
  const certs = aiCapabilities?.certifications || [];

  const skillsText = skills.length
    ? skills.map(s => `${s.name} (${s.level}, ${s.score}%)`).join(', ')
    : 'Belum ada data AI skills';
  const certsText = certs.length ? certs.map(c => c.name).join(', ') : 'Belum ada sertifikasi';

  const prompt = `Kamu adalah asisten HR profesional untuk perusahaan Indonesia.
Buat evaluasi kinerja bulanan yang personal, spesifik, dan konstruktif untuk karyawan berikut dalam Bahasa Indonesia:

**Data Karyawan:**
- Nama: ${empName}
- Divisi: ${division}
- Posisi: ${position}
- Periode: ${period}

**AI Capability Score:** ${avgScore}/100
**Skills dikuasai:** ${skillsText}
**Sertifikasi AI:** ${certsText}
${kpiData ? `**KPI:** ${JSON.stringify(kpiData)}` : ''}

Buat evaluasi yang mencakup:
1. Ringkasan performa (2-3 kalimat personal, bukan generik)
2. Kekuatan utama berdasarkan data di atas
3. Area pengembangan yang spesifik dan actionable
4. Rekomendasi program training yang relevan
5. Target kuartal berikutnya

Format sebagai teks terstruktur dengan judul section. Gunakan nada profesional tapi hangat. Maksimal 350 kata.`;

  try {
    const text = await callGemini(prompt, 800);
    return { text, source: 'gemini' };
  } catch (err) {
    console.warn('[AI Service] Gemini failed, using template:', err.message);
  }

  // ── Fallback: Enhanced contextual template ───────────────────────────────
  const readiness = avgScore >= 80 ? 'sangat tinggi' : avgScore >= 60 ? 'baik' : avgScore >= 40 ? 'sedang' : 'perlu ditingkatkan';
  const topSkill = skills.sort((a, b) => b.score - a.score)[0];
  const weakSkill = skills.sort((a, b) => a.score - b.score)[0];
  const improvement = weakSkill && weakSkill.score < 60 ? weakSkill.name : null;

  return {
    text: `EVALUASI KINERJA BULANAN
═══════════════════════════════════
Karyawan : ${empName}
Jabatan  : ${position} — ${division}
Periode  : ${period}

─── Ringkasan Performa ───────────
${empName} telah menunjukkan dedikasi dalam menjalankan tanggung jawabnya sebagai ${position}.
Tingkat adopsi teknologi AI berada pada level ${readiness} dengan skor rata-rata ${avgScore}/100.
${topSkill ? `Keunggulan terlihat pada kemampuan ${topSkill.name} (${topSkill.score}%).` : ''}

─── Kekuatan Utama ───────────────
${skills.slice(0, 3).map(s => `• ${s.name}: Level ${s.level} (${s.score}%)`).join('\n') || '• Belum ada data skills'}
${certs.length ? `• Sertifikasi: ${certsText}` : ''}

─── Area Pengembangan ────────────
${improvement ? `• Tingkatkan kemampuan ${improvement} melalui program micro-learning` : '• Pertahankan momentum pertumbuhan yang ada'}
• Eksplorasi implementasi AI dalam workflow harian
• Dokumentasikan best practices untuk sharing knowledge tim

─── Rekomendasi Training ─────────
${skills.some(s => s.score < 50) ? `• Daftarkan ke kursus ${improvement || 'AI Fundamentals'} (Coursera/Google)` : '• Lanjutkan ke program AI Advanced'}
• Workshop internal quarterly AI sharing session
• Mentoring cross-division untuk transfer knowledge

─── Target Kuartal Berikutnya ────
• AI Capability Score: ${Math.min(avgScore + 15, 100)}/100
• Selesaikan 1 sertifikasi AI baru
• Implementasikan 1 use case AI di pekerjaan harian

─── Status ───────────────────────
DRAFT — Perlu review & tanda tangan HR Manager`,
    source: 'template',
  };
}

/**
 * Generate a department AI readiness summary.
 */
export async function generateDeptInsight(division, avgScore, headcount) {
  const prompt = `Berikan insight singkat (2 kalimat dalam Bahasa Indonesia) untuk divisi ${division} dengan AI readiness score ${avgScore}/100 dan ${headcount} karyawan. Fokus pada rekomendasi spesifik.`;
  try {
    return await callGemini(prompt, 100);
  } catch {
    return `Divisi ${division} memiliki AI readiness score ${avgScore}/100 dengan ${headcount} karyawan. ${avgScore < 60 ? 'Perlu program pelatihan AI intensif.' : 'Pertahankan dan tingkatkan leverage teknologi AI.'}`;
  }
}
