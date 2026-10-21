import type { Analysis, Contract } from '@clausum/shared';
import { COLLECTIONS, ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { assertEntitlement } from './subscription.service';
import { getOwnedContract } from './contract.service';
import { adminDb, adminStorage } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
}

function importanceLabel(importance: string): string {
  switch (importance) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Media';
    default:
      return 'Estándar';
  }
}

async function renderAnalysisPdf(
  contract: Contract & { id: string },
  analysis: Analysis
): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Informe de análisis — Clausum', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#444444');
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`);
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111111');
    doc.text(contract.title || 'Contrato sin título');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica').fillColor('#333333');
    if (analysis.parties?.length) {
      doc.text(`Partes: ${analysis.parties.join(' · ')}`);
    }
    if (contract.fileName) {
      doc.text(`Archivo: ${contract.fileName}`);
    }
    if (typeof analysis.score === 'number') {
      doc.text(`Índice de claridad: ${analysis.score}/100`);
    }
    doc.moveDown(1);

    if (analysis.summary) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111111').text('Resumen ejecutivo');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#333333').text(analysis.summary, {
        align: 'justify',
      });
      doc.moveDown(1);
    }

    if (analysis.metadata && Object.keys(analysis.metadata).length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111111').text('Metadatos');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#333333');
      for (const [key, value] of Object.entries(analysis.metadata)) {
        if (value) {
          doc.text(`${key}: ${value}`);
        }
      }
      doc.moveDown(1);
    }

    if (analysis.clauses?.length) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111111').text('Cláusulas destacadas');
      doc.moveDown(0.5);

      for (const clause of analysis.clauses) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111111');
        doc.text(`${clause.title} (${importanceLabel(clause.importance)})`);
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').fillColor('#333333');
        doc.text(clause.content, { align: 'justify' });
        if (clause.excerpt) {
          doc.moveDown(0.2);
          doc.fontSize(9).fillColor('#666666').text(`Extracto: «${clause.excerpt}»`);
        }
        doc.moveDown(0.8);
      }
    }

    if (analysis.lawReferences?.length) {
      doc.addPage();
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111111').text('Referencias legales');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#333333');
      for (const ref of analysis.lawReferences) {
        doc.text(`• ${ref.codeName}${ref.article ? ` — Art. ${ref.article}` : ''}`);
      }
    }

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(
        'Este informe fue generado con inteligencia artificial y no constituye asesoría legal. Clausum — clausum.com',
        { align: 'center' }
      );

    doc.end();
  });
}

/**
 * Genera el informe y devuelve sus bytes.
 *
 * Antes devolvia una URL firmada de Storage, y eso tenia dos problemas.
 * Firmar exige que la cuenta de servicio de las funciones pueda llamar a
 * signBlob, permiso que por defecto no tiene: el informe fallaba entero por
 * eso. Y la URL resultante la abre cualquiera que la tenga, sin iniciar
 * sesion, durante una hora — en un PDF con nombres, documentos y direcciones.
 *
 * Ahora el archivo vuelve por la misma conexion autenticada que lo pidio. Se
 * sigue guardando en Storage como registro, pero ya nada depende de que
 * exista una URL publica.
 */
export async function exportContractPdf(
  userId: string,
  contractId: string
): Promise<{
  exportId: string;
  storagePath: string;
  fileName: string;
  pdf: Buffer;
}> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.EXPORT_PDF);

  const contract = await getOwnedContract(userId, contractId);

  if (!contract.lastAnalysisId) {
    throw new AppError(
      'El contrato debe tener un análisis antes de exportar.',
      422,
      'NO_ANALYSIS'
    );
  }

  const analysisSnap = await adminDb()
    .collection(COLLECTIONS.analyses)
    .doc(contract.lastAnalysisId)
    .get();

  if (!analysisSnap.exists) {
    throw new AppError('Análisis no encontrado', 404, 'ANALYSIS_NOT_FOUND');
  }

  const analysis = analysisSnap.data() as Analysis;
  if (analysis.status !== 'done') {
    throw new AppError(
      'El análisis aún no está listo para exportar.',
      422,
      'ANALYSIS_NOT_READY'
    );
  }

  const exportId = `export_${contractId}_${Date.now()}`;
  const fileBase = sanitizeFileName(contract.title || contractId);
  const fileName = `${fileBase}_${exportId}.pdf`;
  const storagePath = `users/${userId}/exports/${fileName}`;

  const pdfBuffer = await renderAnalysisPdf(contract, analysis);
  const bucket = adminStorage().bucket();
  const file = bucket.file(storagePath);

  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: {
      metadata: {
        contractId,
        analysisId: contract.lastAnalysisId,
        userId,
      },
    },
  });

  logger.info('api', 'Export PDF generado', {
    userId,
    metadata: { contractId, exportId, storagePath },
  });

  return { exportId, storagePath, fileName, pdf: pdfBuffer };
}
