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
import { executeAnalyzeContract, initiateAnalyzeContract } from '../services/analysis.service';
import { compareContracts, getOwnedComparison, setComparisonReview } from '../services/comparison.service';
import { detectRisks } from '../services/risks.service';
import { getOwnedAnalysis } from '../services/analysis-query.service';
import type { CountryCode } from '@clausum/shared';

export const analysisRouter = Router();

analysisRouter.post(
  '/analyze',
  authenticate,
  validateBody(analyzeBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & {
      validatedBody: {
        contractId: string;
        country?: string;
        contractTypeId?: string;
      };
    }).validatedBody;
    const { analysisId } = await initiateAnalyzeContract(uid, body.contractId);
    res.status(202).json({ analysisId, status: 'processing' });
    await executeAnalyzeContract(uid, body.contractId, analysisId, {
      country: body.country as CountryCode | undefined,
      contractTypeId: body.contractTypeId,
    });
  })
);

analysisRouter.post(
  '/risks',
  authenticate,
  validateBody(risksBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & {
      validatedBody: {
        contractId: string;
        country?: string;
        contractTypeId?: string;
      };
    }).validatedBody;
    const result = await detectRisks(uid, body.contractId, {
      country: body.country as CountryCode | undefined,
      contractTypeId: body.contractTypeId,
    });
    res.status(201).json(result);
  })
);

analysisRouter.post(
  '/compare',
  authenticate,
  validateBody(compareBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & {
      validatedBody: {
        contractIdA: string;
        contractIdB: string;
        country?: string;
        contractTypeId?: string;
      };
    }).validatedBody;
    const result = await compareContracts(uid, body.contractIdA, body.contractIdB, {
      country: body.country as CountryCode | undefined,
      contractTypeId: body.contractTypeId,
    });
    res.status(201).json(result);
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
    const body = (req as AuthenticatedRequest & {
      validatedBody: { decision: 'approved' | 'discarded' };
    }).validatedBody;
    const comparison = await setComparisonReview(
      uid,
      String(req.params.comparisonId),
      body.decision
    );
    res.json({ comparison });
  })
);
