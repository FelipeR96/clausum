import type { Analysis } from '@clausum/shared';
import { COLLECTIONS, ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { assertEntitlement } from './subscription.service';
import { getOwnedContract } from './contract.service';
import { adminDb, adminStorage } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { renderAnalysisPdf, type RiesgosDelInforme } from './informe-pdf';

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
}

/**
 * Busca el perfil de riesgo del contrato.
 *
 * Vive en un documento aparte del analisis, asi que hay que ir a buscarlo.
 * Sin esto el informe exportado se quedaba justo sin la parte por la que
 * alguien paga: los riesgos.
 *
 * Solo filtros de igualdad y la ordenacion en memoria, a proposito: son un
 * puñado de documentos por contrato y asi no hace falta un indice compuesto.
 */
async function buscarRiesgos(
  userId: string,
  contractId: string
): Promise<RiesgosDelInforme> {
  const snap = await adminDb()
    .collection(COLLECTIONS.analyses)
    .where('userId', '==', userId)
    .where('contractId', '==', contractId)
    .where('mode', '==', 'risks')
    .where('status', '==', 'done')
    .get();

  if (snap.empty) return null;

  const docs = snap.docs
    .map((d) => d.data())
    .sort(
      (a, b) =>
        (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0)
    );

  const reciente = docs[0];
  return {
    summary: reciente.summary,
    score: reciente.score,
    risks: reciente.risks ?? [],
  } as RiesgosDelInforme;
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

  const riesgos = await buscarRiesgos(userId, contractId);
  const pdfBuffer = await renderAnalysisPdf(contract, analysis, riesgos);
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
