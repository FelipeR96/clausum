import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validateRequest';
import { createContractBodySchema } from '../types/api.types';
import {
  createContract,
  getOwnedContract,
  hardDeleteContract,
  listUserContracts,
} from '../services/contract.service';
import { getLatestContractAnalysis } from '../services/analysis-query.service';
import type { CountryCode } from '@clausum/shared';

export const contractRouter = Router();

contractRouter.get(
  '/contracts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const contracts = await listUserContracts(uid);
    res.json({ contracts });
  })
);

contractRouter.get(
  '/contracts/:contractId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const contract = await getOwnedContract(uid, String(req.params.contractId));
    res.json({ contract });
  })
);

contractRouter.get(
  '/contracts/:contractId/analysis',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const contractId = String(req.params.contractId);
    const mode = req.query.mode === 'risks' ? 'risks' : 'analyze';
    const contract = await getOwnedContract(uid, contractId);
    const result = await getLatestContractAnalysis(uid, contractId, mode);
    res.json({ contract, analysisId: result.analysisId, analysis: result.analysis });
  })
);

contractRouter.post(
  '/contracts',
  authenticate,
  validateBody(createContractBodySchema),
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const body = (req as AuthenticatedRequest & {
      validatedBody: {
        contractId: string;
        title: string;
        fileName: string;
        storagePath: string;
        fileSizeBytes?: number;
        country?: string;
        contractTypeId?: string;
      };
    }).validatedBody;

    const result = await createContract(uid, {
      ...body,
      country: body.country as CountryCode | undefined,
      contractTypeId: body.contractTypeId,
    });
    res.status(201).json(result);
  })
);

contractRouter.delete(
  '/contracts/:contractId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { uid } = req as AuthenticatedRequest;
    const result = await hardDeleteContract(uid, String(req.params.contractId));
    res.json(result);
  })
);
