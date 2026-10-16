import { jsPDF } from 'jspdf';

const BRAND = {
  primary: [86, 84, 212],
  dark: [23, 23, 38],
  gray: [120, 120, 135],
  light: [245, 245, 250],
  green: [22, 163, 74],
};

const STATUS_LABEL = {
  paid: 'LUNAS',
  pending: 'MENUNGGU PEMBAYARAN',
  failed: 'GAGAL',
  expired: 'KADALUARSA',
};

function formatIDR(amount) {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
}

function formatDateId(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Generate and download a subscription invoice PDF from a payment_orders row.
 * @param {object} order - payment_orders row
 * @param {{ companyName?: string, userEmail?: string }} [meta]
 */
export function downloadInvoicePdf(order, meta = {}) {
  if (!order) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18; // margin

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('KiniKerja', M, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Smart HR Platform — kinikerja.id', M, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INVOICE', W - M, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(order.order_id || '—', W - M, 23, { align: 'right' });

  // ── Meta row ─────────────────────────────────────────────────────────────
  let y = 46;
  doc.setTextColor(...BRAND.gray);
  doc.setFontSize(8);
  doc.text('DITAGIHKAN KEPADA', M, y);
  doc.text('TANGGAL', W - M, y, { align: 'right' });

  y += 6;
  doc.setTextColor(...BRAND.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(meta.companyName || meta.userEmail || '—', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(formatDateId(order.created_at), W - M, y, { align: 'right' });

  if (meta.companyName && meta.userEmail) {
    y += 5;
    doc.setTextColor(...BRAND.gray);
    doc.setFontSize(9);
    doc.text(meta.userEmail, M, y);
  }

  // ── Status badge ─────────────────────────────────────────────────────────
  const statusLabel = STATUS_LABEL[order.status] || String(order.status || '').toUpperCase();
  y += 12;
  const badgeW = doc.getTextWidth(statusLabel) + 12;
  if (order.status === 'paid') doc.setFillColor(...BRAND.green);
  else if (order.status === 'pending') doc.setFillColor(217, 119, 6);
  else doc.setFillColor(220, 38, 38);
  doc.roundedRect(M, y - 4.5, badgeW, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusLabel, M + 6, y);

  // ── Items table ──────────────────────────────────────────────────────────
  y += 14;
  doc.setFillColor(...BRAND.light);
  doc.rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setTextColor(...BRAND.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESKRIPSI', M + 3, y);
  doc.text('JUMLAH', W - M - 52, y, { align: 'right' });
  doc.text('TOTAL', W - M - 3, y, { align: 'right' });

  const cycle = order.billing_cycle === 'yearly' ? 'Tahunan' : 'Bulanan';
  const planName = order.plan_name || order.plan_slug || 'Langganan';
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Paket ${planName} — Siklus ${cycle}`, M + 3, y);
  doc.text('1', W - M - 52, y, { align: 'right' });

  const amount = Number(order.amount || 0);
  const discount = Number(order.discount_amount || 0);
  const subtotal = amount + (order.status === 'paid' || discount > 0 ? discount : 0);

  doc.text(formatIDR(subtotal), W - M - 3, y, { align: 'right' });

  // ── Totals ───────────────────────────────────────────────────────────────
  y += 8;
  doc.setDrawColor(230, 230, 238);
  doc.line(M, y, W - M, y);

  const totalsX = W - M - 70;
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text('Subtotal', totalsX, y);
  doc.setTextColor(...BRAND.dark);
  doc.text(formatIDR(subtotal), W - M - 3, y, { align: 'right' });

  if (discount > 0) {
    y += 6;
    doc.setTextColor(...BRAND.gray);
    doc.text(
      order.voucher_code ? `Diskon voucher (${order.voucher_code})` : 'Diskon',
      totalsX, y,
    );
    doc.setTextColor(...BRAND.dark);
    doc.text(`- ${formatIDR(discount)}`, W - M - 3, y, { align: 'right' });
  }

  y += 8;
  doc.setFillColor(...BRAND.light);
  doc.rect(totalsX - 3, y - 5, W - M - totalsX + 3, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.primary);
  doc.text('TOTAL', totalsX, y);
  doc.text(formatIDR(amount), W - M - 3, y, { align: 'right' });

  // ── Footer ───────────────────────────────────────────────────────────────
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  const notes = order.status === 'paid'
    ? 'Dokumen ini merupakan bukti pembayaran yang sah. Terima kasih telah berlangganan KiniKerja.'
    : 'Dokumen ini merupakan ringkasan pesanan. Invoice final terbit setelah pembayaran diterima.';
  doc.text(doc.splitTextToSize(notes, W - 2 * M), M, y);

  y += 12;
  doc.text('Pertanyaan billing? Hubungi support melalui dashboard → Settings → Support.', M, y);

  doc.save(`invoice-${order.order_id || 'kinikerja'}.pdf`);
}
