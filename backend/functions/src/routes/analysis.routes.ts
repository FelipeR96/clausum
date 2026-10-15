import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import {
  analyzeBodySchema,
  compareBodySchema,
  comparisonReviewBodySchema,
  risksBodySchema,
} from '../types/api.types';
import {
  executeAnalyzeContract,
  initiateAnalyzeContract,
} from '../services/analysis.service';
import {
  executeCompareContracts,
  getOwnedComparison,
  initiateCompareContracts,
  setComparisonReview,
} from '../services/comparison.service';
import { executeDetectRisks, initiateDetectRisks } from '../services/risks.service';
import { getOwnedAnalysis } from '../services/analysis-query.service';
import { enqueueJob } from '../tasks/jobs.task';
import type { CountryCode } from '@clausum/shared';

export const analysisRouter = Router();

type JobBody = {
  contractId: string;
  country?: string;
  contractTypeId?: string;
};

type CompareBody = {
  contractIdA: string;
  contractIdB: string;
  country?: string;
  contractTypeId?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Las tres operaciones de IA siguen el mismo patrón: la request valida,
// reserva cuota, crea el documento en `processing` y responde 202. El
// trabajo pesado va a una cola de Cloud Tasks (ver tasks/jobs.task.ts) y el
// cliente sigue el progreso por el documento de Firestore.
//
// Nunca se hace trabajo después de `res.json()`: en Cloud Run esa CPU no
// está garantizada.
// ─────────────────────────────────────────────────────────────────────────

analysisRouter.post(
  '/analyze',
  authenticate,
  validateBody(analyzeBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & { validatedBody: JobBody }).validatedBody;
    const country = body.country as CountryCode | undefined;

    const { analysisId } = await initiateAnalyzeContract(uid, body.contractId);

    await enqueueJob(
      'processAnalysisTask',
      {
        userId: uid,
        contractId: body.contractId,
        analysisId,
        country,
        contractTypeId: body.contractTypeId,
      },
      () =>
        executeAnalyzeContract(uid, body.contractId, analysisId, {
          country,
          contractTypeId: body.contractTypeId,
        })
    );

    res.status(202).json({ analysisId, status: 'processing' });
  })
);

analysisRouter.post(
  '/risks',
  authenticate,
  validateBody(risksBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & { validatedBody: JobBody }).validatedBody;
    const country = body.country as CountryCode | undefined;

    const { analysisId } = await initiateDetectRisks(uid, body.contractId, {
      country,
      contractTypeId: body.contractTypeId,
    });

    await enqueueJob(
      'processRisksTask',
      {
        userId: uid,
        contractId: body.contractId,
        analysisId,
        country,
        contractTypeId: body.contractTypeId,
      },
      () =>
        executeDetectRisks(uid, body.contractId, analysisId, {
          country,
          contractTypeId: body.contractTypeId,
        })
    );

    res.status(202).json({ analysisId, status: 'processing' });
  })
);

analysisRouter.post(
  '/compare',
  authenticate,
  validateBody(compareBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & { validatedBody: CompareBody })
      .validatedBody;
    const country = body.country as CountryCode | undefined;

    const { comparisonId } = await initiateCompareContracts(
      uid,
      body.contractIdA,
      body.contractIdB
    );

    await enqueueJob(
      'processComparisonTask',
      {
        userId: uid,
        contractIdA: body.contractIdA,
        contractIdB: body.contractIdB,
        comparisonId,
        country,
        contractTypeId: body.contractTypeId,
      },
      () =>
        executeCompareContracts(
          uid,
          body.contractIdA,
          body.contractIdB,
          comparisonId,
          { country, contractTypeId: body.contractTypeId }
        )
    );

    res.status(202).json({ comparisonId, status: 'processing' });
  })
);

analysisRouter.get(
  '/analyses/:analysisId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const analysis = await getOwnedAnalysis(uid, String(req.params.analysisId));
    res.json({ analysisId: analysis.id, analysis });
  })
);

analysisRouter.get(
  '/comparisons/:comparisonId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const comparison = await getOwnedComparison(uid, String(req.params.comparisonId));
    res.json({ comparison });
  })
);

analysisRouter.post(
  '/comparisons/:comparisonId/review',
  authenticate,
  validateBody(comparisonReviewBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (
      req as AuthenticatedRequest & {
        validatedBody: { decision: 'approved' | 'discarded' };
      }
    ).validatedBody;
    const comparison = await setComparisonReview(
      uid,
      String(req.params.comparisonId),
      body.decision
    );
    res.json({ comparison });
  })
);
