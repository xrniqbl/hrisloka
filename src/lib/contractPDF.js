import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Inject print-safe styles into the render container
 */
const CONTRACT_PRINT_CSS = `
  * { box-sizing: border-box; }
  body, html { margin: 0; padding: 0; }
  .contract-doc, .contract-body {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 12pt;
    line-height: 1.7;
    color: #000;
  }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #333; padding: 6px 10px; font-size: 11pt; }
  h1, h2, h3 { font-family: 'Times New Roman', Times, serif; }
  .signature-block { margin-top: 40px; }
  p { margin: 0 0 8px; }
`;

/**
 * Export a contract HTML string to a professional multi-page PDF.
 * Uses a robust single-image approach: renders full HTML to canvas,
 * then slices per page accurately.
 *
 * @param {string} htmlContent - HTML content of the contract
 * @param {string} contractNumber - Used for the filename
 */
export async function generateContractPDF(htmlContent, contractNumber = 'contract') {
  // ── 1. Off-screen render container (A4 width in px at 96dpi = 794px)
  const container = document.createElement('div');
  container.id = '__pdf_render__';
  Object.assign(container.style, {
    position:   'fixed',
    top:        '-99999px',
    left:       '-99999px',
    width:      '794px',
    background: '#ffffff',
    padding:    '40px 60px',
    margin:     '0',
    zIndex:     '-9999',
    fontFamily: "'Times New Roman', serif",
    fontSize:   '12pt',
    lineHeight: '1.7',
    color:      '#000',
  });

  // Inject CSS + content
  container.innerHTML = `<style>${CONTRACT_PRINT_CSS}</style>${htmlContent}`;
  document.body.appendChild(container);

  try {
    // ── 2. Render to canvas at 2x scale for sharpness
    const canvas = await html2canvas(container, {
      scale:           2,
      useCORS:         true,
      logging:         false,
      backgroundColor: '#ffffff',
      width:           794,
    });

    // ── 3. PDF setup — A4: 210 × 297 mm
    const PDF_W    = 210;   // mm
    const PDF_H    = 297;   // mm
    const MARGIN   = 15;    // mm
    const FOOTER_H = 10;    // mm reserved for footer

    const contentW_mm = PDF_W - MARGIN * 2;
    const contentH_mm = PDF_H - MARGIN - FOOTER_H - MARGIN; // top/bottom margins + footer

    // Canvas pixel sizes
    const canvasPxW = canvas.width;
    const canvasPxH = canvas.height;

    // How many canvas pixels fit in one mm of PDF
    const PX_PER_MM = canvasPxW / contentW_mm;

    // Height in mm of the full rendered document
    const totalDocH_mm = canvasPxH / PX_PER_MM;

    // Pages needed
    const totalPages = Math.ceil(totalDocH_mm / contentH_mm);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Which vertical slice of the canvas belongs to this page
      const sliceStartPx = Math.round(page * contentH_mm * PX_PER_MM);
      const sliceHeightPx = Math.round(Math.min(contentH_mm * PX_PER_MM, canvasPxH - sliceStartPx));

      if (sliceHeightPx <= 0) break;

      // Draw just that slice to a temporary canvas
      const slice = document.createElement('canvas');
      slice.width  = canvasPxW;
      slice.height = sliceHeightPx;
      slice.getContext('2d').drawImage(
        canvas,
        0, sliceStartPx, canvasPxW, sliceHeightPx,   // source rect
        0, 0,            canvasPxW, sliceHeightPx,   // dest rect
      );

      const imgData = slice.toDataURL('image/png');
      const sliceH_mm = sliceHeightPx / PX_PER_MM;

      pdf.addImage(imgData, 'PNG', MARGIN, MARGIN, contentW_mm, sliceH_mm);

      // ── Footer
      const footerY = PDF_H - MARGIN / 2 - 2;
      pdf.setDrawColor(210, 210, 210);
      pdf.line(MARGIN, footerY - 5, PDF_W - MARGIN, footerY - 5);

      pdf.setFontSize(8);
      pdf.setTextColor(160, 160, 160);
      pdf.text(
        `Halaman ${page + 1} dari ${totalPages}`,
        MARGIN, footerY, { align: 'left' },
      );
      pdf.text(
        contractNumber,
        PDF_W / 2, footerY, { align: 'center' },
      );
      pdf.text(
        `Dibuat oleh HRIS Loka`,
        PDF_W - MARGIN, footerY, { align: 'right' },
      );
    }

    // ── 4. Save
    const date     = new Date().toISOString().split('T')[0];
    const safeName = contractNumber.replace(/[/\\:*?"<>|]/g, '-');
    pdf.save(`Kontrak_${safeName}_${date}.pdf`);
  } finally {
    // Always clean up
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}
