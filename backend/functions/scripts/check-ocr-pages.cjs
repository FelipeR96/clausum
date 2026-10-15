/**
 * Comprueba una sospecha sobre el OCR.
 *
 * ocr.ts pide SIEMPRE las paginas 1..OCR_MAX_PAGES (7 por defecto), sin
 * mirar cuantas tiene el PDF:
 *
 *   const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
 *   pdfImgConvert.default.convert(buffer, { scale: 2, page_numbers: pageNumbers })
 *
 * Si pedir una pagina que no existe hace que pdf-img-convert lance, entonces
 * el OCR falla para cualquier PDF escaneado de menos de 7 paginas: el error
 * se captura y se convierte en "OCR no disponible en este entorno", que es
 * un mensaje enganoso porque el entorno esta bien.
 *
 * Uso:  node scripts/check-ocr-pages.cjs
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const PDFDocument = require('pdfkit');
  const out = path.join(os.tmpdir(), 'clausum-dos-paginas.pdf');

  const doc = new PDFDocument();
  const stream = fs.createWriteStream(out);
  doc.pipe(stream);
  doc.fontSize(20).text('Pagina uno', 100, 100);
  doc.addPage().fontSize(20).text('Pagina dos', 100, 100);
  doc.end();
  await new Promise((r) => stream.on('finish', r));

  const buffer = fs.readFileSync(out);
  const conv = await import('pdf-img-convert');

  console.log('\nPDF de prueba: 2 paginas');
  console.log('Pidiendo paginas [1..7], que es lo que hace ocr.ts\n');

  try {
    const pages = await conv.default.convert(buffer, {
      scale: 2,
      page_numbers: [1, 2, 3, 4, 5, 6, 7],
    });
    console.log(`OK — devolvio ${pages.length} imagenes sin lanzar.`);
    console.log('La sospecha era infundada: pedir paginas de mas es inofensivo.\n');
  } catch (error) {
    console.log('FALLA — lanzo: ' + error.message);
    console.log('\nConfirmado: cualquier PDF escaneado de menos de 7 paginas');
    console.log('rompe el OCR. Hay que acotar page_numbers al numero real');
    console.log('de paginas del documento.\n');
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error('No se pudo ejecutar la comprobacion:', e.message);
  process.exit(2);
});
