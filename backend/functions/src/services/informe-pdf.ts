import type { Analysis, Contract } from '@clausum/shared';

/**
 * Dibujo del informe PDF.
 *
 * Vive aparte de export.service a proposito: ahi estaba mezclado con los
 * permisos, Storage y la cuota, y cada retoque visual obligaba a leer
 * trescientas lineas de otra cosa.
 *
 * Los colores salen de la paleta de la aplicacion (tailwind.config.js) para
 * que el informe se parezca al producto y no a un documento generico.
 */

const MARCA = {
  primary: '#006A60',
  primarySoft: '#9FF2E8',
  onSurface: '#191C1C',
  muted: '#3F4948',
  faint: '#73807E',
  line: '#D5E4E2',
  container: '#F4FBFA',
  blanco: '#FFFFFF',
};

/** Mismos colores que usa la aplicacion para cada severidad. */
const SEVERIDAD = {
  high: { etiqueta: 'RIESGO ALTO', fuerte: '#DC2626', suave: '#FEF2F2', texto: '#B91C1C' },
  medium: { etiqueta: 'RIESGO MEDIO', fuerte: '#D97706', suave: '#FFFBEB', texto: '#B45309' },
  low: { etiqueta: 'RIESGO BAJO', fuerte: '#059669', suave: '#ECFDF5', texto: '#047857' },
} as const;

const IMPORTANCIA = {
  high: { etiqueta: 'CLAVE', suave: '#FEF2F2', texto: '#B91C1C' },
  medium: { etiqueta: 'RELEVANTE', suave: '#FFFBEB', texto: '#B45309' },
  low: { etiqueta: 'ESTÁNDAR', suave: MARCA.container, texto: MARCA.muted },
} as const;

const MARGEN = 50;
const ALTO_PIE = 56;

type Riesgo = {
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  excerpt?: string;
  recommendation?: string;
};

export type RiesgosDelInforme = {
  summary?: string;
  score?: number;
  risks?: Riesgo[];
} | null;

type Doc = PDFKit.PDFDocument;

const ancho = (doc: Doc): number => doc.page.width - MARGEN * 2;

/** Salta de pagina si lo que viene no cabe entero. */
function reservar(doc: Doc, alto: number): void {
  if (doc.y + alto > doc.page.height - ALTO_PIE - 20) {
    doc.addPage();
    doc.y = MARGEN;
  }
}

function tituloSeccion(doc: Doc, texto: string): void {
  reservar(doc, 70);
  doc.fillColor(MARCA.primary).font('Helvetica-Bold').fontSize(13);
  doc.text(texto.toUpperCase(), MARGEN, doc.y, { characterSpacing: 1.2 });
  const y = doc.y + 6;
  doc.moveTo(MARGEN, y).lineTo(MARGEN + ancho(doc), y).lineWidth(2).strokeColor(MARCA.primary).stroke();
  doc.y = y + 16;
  doc.x = MARGEN;
}

/** Pinta una etiqueta redondeada y devuelve su ancho. */
function chip(doc: Doc, texto: string, fondo: string, color: string, x: number, y: number): number {
  doc.font('Helvetica-Bold').fontSize(7.5);
  const anchoTexto = doc.widthOfString(texto, { characterSpacing: 0.6 });
  const w = anchoTexto + 16;
  doc.roundedRect(x, y, w, 15, 7.5).fill(fondo);
  doc.fillColor(color).text(texto, x + 8, y + 4.4, { lineBreak: false, characterSpacing: 0.6 });
  return w;
}

function etiquetaCampo(doc: Doc, texto: string, x: number, y: number): void {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(MARCA.faint);
  doc.text(texto.toUpperCase(), x, y, { characterSpacing: 0.8, lineBreak: false });
}

function valorCampo(doc: Doc, texto: string, x: number, y: number, w: number): void {
  doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.onSurface);
  doc.text(texto, x, y, { width: w });
}

function fechaLarga(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function portada(
  doc: Doc,
  contract: Contract & { id: string },
  analysis: Analysis,
  riesgos: RiesgosDelInforme
): void {
  const W = doc.page.width;

  doc.rect(0, 0, W, 150).fill(MARCA.primary);
  doc.fillColor(MARCA.blanco).font('Helvetica-Bold').fontSize(24);
  doc.text('Clausum', MARGEN, 46, { lineBreak: false });
  doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.primarySoft);
  doc.text('Análisis de contratos con inteligencia artificial', MARGEN, 78, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MARCA.primarySoft);
  doc.text('INFORME DE ANÁLISIS', MARGEN, 110, { characterSpacing: 2, lineBreak: false });

  doc.fillColor(MARCA.onSurface).font('Helvetica-Bold').fontSize(21);
  doc.text(contract.title || 'Contrato sin título', MARGEN, 184, { width: ancho(doc) });

  doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.faint);
  doc.text(`Informe generado el ${fechaLarga(new Date())}`, MARGEN, doc.y + 4);

  // ── Ficha: dos columnas de campos ────────────────────────────────────
  const campos: Array<[string, string]> = [];
  if (contract.fileName) campos.push(['Archivo', contract.fileName]);
  if (analysis.parties?.length) campos.push(['Partes', analysis.parties.join(' · ')]);
  const meta = analysis.metadata ?? {};
  if (meta.jurisdiction) campos.push(['Jurisdicción', meta.jurisdiction]);
  if (meta.contractValue) campos.push(['Valor', meta.contractValue]);
  if (meta.effectiveDate) campos.push(['Vigencia desde', meta.effectiveDate]);
  if (meta.renewal) campos.push(['Renovación', meta.renewal]);

  let y = doc.y + 18;
  const anchoCol = (ancho(doc) - 24) / 2;
  campos.forEach(([etiqueta, valor], i) => {
    const x = i % 2 === 0 ? MARGEN : MARGEN + anchoCol + 24;
    if (i % 2 === 0 && i > 0) y += 38;
    etiquetaCampo(doc, etiqueta, x, y);
    valorCampo(doc, valor, x, y + 11, anchoCol);
  });
  if (campos.length) y += 44;

  // ── Dos tarjetas de cabecera ─────────────────────────────────────────
  const anchoCard = (ancho(doc) - 16) / 2;
  const altoCard = 96;
  const yCard = Math.max(y, 400);

  doc.roundedRect(MARGEN, yCard, anchoCard, altoCard, 10).fill(MARCA.container);
  etiquetaCampo(doc, 'Claridad del contrato', MARGEN + 18, yCard + 18);
  doc.font('Helvetica-Bold').fontSize(34).fillColor(MARCA.primary);
  doc.text(`${Math.round(analysis.score ?? 0)}`, MARGEN + 18, yCard + 36, { lineBreak: false });
  const anchoNumero = doc.widthOfString(`${Math.round(analysis.score ?? 0)}`);
  doc.font('Helvetica').fontSize(11).fillColor(MARCA.faint);
  doc.text('/100', MARGEN + 20 + anchoNumero, yCard + 56, { lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(MARCA.faint);
  doc.text('Qué tan claro está redactado', MARGEN + 18, yCard + 76, { lineBreak: false });

  const xCard2 = MARGEN + anchoCard + 16;
  const lista = riesgos?.risks ?? [];
  const cuenta = { high: 0, medium: 0, low: 0 };
  for (const r of lista) cuenta[r.level] = (cuenta[r.level] ?? 0) + 1;

  doc.roundedRect(xCard2, yCard, anchoCard, altoCard, 10).fill(MARCA.container);
  etiquetaCampo(doc, 'Riesgos detectados', xCard2 + 18, yCard + 18);
  doc.font('Helvetica-Bold').fontSize(34).fillColor(cuenta.high > 0 ? SEVERIDAD.high.fuerte : MARCA.primary);
  doc.text(`${lista.length}`, xCard2 + 18, yCard + 36, { lineBreak: false });

  let xPunto = xCard2 + 18;
  const yPunto = yCard + 76;
  (['high', 'medium', 'low'] as const).forEach((nivel) => {
    if (!cuenta[nivel]) return;
    doc.circle(xPunto + 3, yPunto + 3.5, 3).fill(SEVERIDAD[nivel].fuerte);
    doc.font('Helvetica').fontSize(7.5).fillColor(MARCA.muted);
    const texto = `${cuenta[nivel]} ${nivel === 'high' ? 'altos' : nivel === 'medium' ? 'medios' : 'bajos'}`;
    doc.text(texto, xPunto + 10, yPunto, { lineBreak: false });
    xPunto += 10 + doc.widthOfString(texto) + 12;
  });
  if (!lista.length) {
    doc.font('Helvetica').fontSize(7.5).fillColor(MARCA.faint);
    doc.text('Sin perfil de riesgo en este análisis', xCard2 + 18, yPunto, { lineBreak: false });
  }

  // ── Aviso ────────────────────────────────────────────────────────────
  const yAviso = yCard + altoCard + 22;
  doc.roundedRect(MARGEN, yAviso, ancho(doc), 50, 8).fill('#FFFBEB');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#B45309');
  doc.text('ESTO NO ES ASESORÍA LEGAL', MARGEN + 16, yAviso + 13, { characterSpacing: 0.8, lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor('#92400E');
  doc.text(
    'Informe generado con inteligencia artificial a partir del texto del documento. Revísalo con un abogado antes de firmar o reclamar.',
    MARGEN + 16,
    yAviso + 26,
    { width: ancho(doc) - 32 }
  );

  // El resumen va aqui y no en pagina aparte: dejaba un tercio de portada en
  // blanco, y asi quien abre el informe empieza leyendo en vez de mirando.
  if (analysis.summary) {
    doc.x = MARGEN;
    doc.y = yAviso + 74;
    tituloSeccion(doc, 'Resumen ejecutivo');
    doc.font('Helvetica').fontSize(10.5).fillColor(MARCA.muted);
    doc.text(analysis.summary, MARGEN, doc.y, {
      width: ancho(doc),
      align: 'justify',
      lineGap: 2,
    });
  }
}

function tarjetaRiesgo(doc: Doc, riesgo: Riesgo): void {
  const sev = SEVERIDAD[riesgo.level] ?? SEVERIDAD.low;
  const wCard = ancho(doc);
  const wTexto = wCard - 36;

  doc.font('Helvetica-Bold').fontSize(12.5);
  const hTitulo = doc.heightOfString(riesgo.title, { width: wTexto });
  doc.font('Helvetica').fontSize(9.5);
  const hDesc = doc.heightOfString(riesgo.description, { width: wTexto });

  let hCita = 0;
  if (riesgo.excerpt) {
    doc.font('Helvetica-Oblique').fontSize(9);
    hCita = doc.heightOfString(`«${riesgo.excerpt}»`, { width: wTexto - 14 }) + 16;
  }
  let hReco = 0;
  if (riesgo.recommendation) {
    doc.font('Helvetica').fontSize(9.5);
    hReco = doc.heightOfString(riesgo.recommendation, { width: wTexto }) + 24;
  }

  const alto = 20 + 15 + 10 + hTitulo + 7 + hDesc + hCita + hReco + 18;
  reservar(doc, alto + 16);

  const y0 = doc.y;
  doc.roundedRect(MARGEN, y0, wCard, alto, 10).fill(sev.suave);
  doc.rect(MARGEN + 1, y0 + 12, 3.5, alto - 24).fill(sev.fuerte);

  let y = y0 + 18;
  chip(doc, sev.etiqueta, sev.fuerte, MARCA.blanco, MARGEN + 18, y);
  y += 25;

  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(MARCA.onSurface);
  doc.text(riesgo.title, MARGEN + 18, y, { width: wTexto });
  y = doc.y + 7;

  doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.muted);
  doc.text(riesgo.description, MARGEN + 18, y, { width: wTexto, align: 'justify' });
  y = doc.y;

  if (riesgo.excerpt) {
    y += 10;
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(sev.texto);
    doc.text(`«${riesgo.excerpt}»`, MARGEN + 32, y, { width: wTexto - 14 });
    y = doc.y;
  }

  if (riesgo.recommendation) {
    y += 12;
    etiquetaCampo(doc, 'Qué hacer', MARGEN + 18, y);
    doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.onSurface);
    doc.text(riesgo.recommendation, MARGEN + 18, y + 12, { width: wTexto, align: 'justify' });
    y = doc.y;
  }

  doc.y = y0 + alto + 14;
  doc.x = MARGEN;
}

type Clausula = NonNullable<Analysis['clauses']>[number];

function bloqueClausula(doc: Doc, clause: Clausula): void {
  const imp = IMPORTANCIA[(clause.importance as keyof typeof IMPORTANCIA) ?? 'low'] ?? IMPORTANCIA.low;
  const wTexto = ancho(doc);

  doc.font('Helvetica-Bold').fontSize(11.5);
  const hTitulo = doc.heightOfString(clause.title, { width: wTexto - 90 });
  doc.font('Helvetica').fontSize(9.5);
  const hCont = doc.heightOfString(clause.content ?? '', { width: wTexto });
  reservar(doc, hTitulo + hCont + 60);

  const y0 = doc.y;
  chip(doc, imp.etiqueta, imp.suave, imp.texto, MARGEN, y0);

  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(MARCA.onSurface);
  doc.text(clause.title, MARGEN, y0 + 22, { width: wTexto });

  doc.font('Helvetica').fontSize(9.5).fillColor(MARCA.muted);
  doc.text(clause.content ?? '', MARGEN, doc.y + 4, { width: wTexto, align: 'justify' });

  if (clause.excerpt) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MARCA.faint);
    doc.text(`«${clause.excerpt}»`, MARGEN + 14, doc.y + 6, { width: wTexto - 14 });
  }

  const yLinea = doc.y + 12;
  doc.moveTo(MARGEN, yLinea).lineTo(MARGEN + wTexto, yLinea).lineWidth(0.5).strokeColor(MARCA.line).stroke();
  doc.y = yLinea + 16;
  doc.x = MARGEN;
}

function pies(doc: Doc): void {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i += 1) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - ALTO_PIE;
    doc.moveTo(MARGEN, y).lineTo(MARGEN + ancho(doc), y).lineWidth(0.5).strokeColor(MARCA.line).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MARCA.faint);
    doc.text('Clausum · clausumlegal.com', MARGEN, y + 10, { lineBreak: false });
    // La posicion se calcula a mano, y hay dos razones encadenadas.
    // El pie cae por debajo del margen inferior de la pagina: si el texto
    // puede saltar de linea, pdfkit decide que no cabe y lo manda a una
    // pagina nueva en vez de dibujarlo. Con lineBreak:false eso no pasa,
    // pero entonces ignora el ancho y align:'right' se queda sin nada
    // contra que alinear. Midiendo la cadena se evitan las dos cosas.
    const numero = `Página ${i + 1} de ${rango.count}`;
    doc.text(numero, MARGEN + ancho(doc) - doc.widthOfString(numero), y + 10, {
      lineBreak: false,
    });
  }
}

export async function renderAnalysisPdf(
  contract: Contract & { id: string },
  analysis: Analysis,
  riesgos: RiesgosDelInforme
): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGEN, bufferPages: true });
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    portada(doc, contract, analysis, riesgos);

    const lista = riesgos?.risks ?? [];
    if (lista.length) {
      doc.addPage();
      const orden = { high: 0, medium: 1, low: 2 } as const;
      const ordenados = [...lista].sort((a, b) => (orden[a.level] ?? 3) - (orden[b.level] ?? 3));
      tituloSeccion(doc, 'Riesgos encontrados');
      if (riesgos?.summary) {
        doc.font('Helvetica').fontSize(10).fillColor(MARCA.muted);
        doc.text(riesgos.summary, MARGEN, doc.y, { width: ancho(doc), align: 'justify', lineGap: 2 });
        doc.y += 14;
      }
      for (const riesgo of ordenados) tarjetaRiesgo(doc, riesgo);
    }

    if (analysis.clauses?.length) {
      tituloSeccion(doc, 'Cláusulas analizadas');
      for (const clause of analysis.clauses) bloqueClausula(doc, clause);
    }

    if (analysis.lawReferences?.length) {
      tituloSeccion(doc, 'Fundamento legal');
      for (const ref of analysis.lawReferences) {
        reservar(doc, 42);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(MARCA.primary);
        doc.text(`${ref.codeName}${ref.article ? ` — Artículo ${ref.article}` : ''}`, MARGEN, doc.y, {
          width: ancho(doc),
        });
        if (ref.relevance) {
          doc.font('Helvetica').fontSize(9).fillColor(MARCA.muted);
          doc.text(ref.relevance, MARGEN, doc.y + 2, { width: ancho(doc) });
        }
        doc.y += 10;
      }
    }

    pies(doc);
    doc.end();
  });
}
