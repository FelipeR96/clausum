import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { asyncHandler } from '../middleware/asyncHandler';
import { getLegalKnowledgeService } from '../services/legal';
import { SUPPORTED_COUNTRIES } from '@clausum/shared';

export const legalRouter = Router();

legalRouter.get(
  '/legal/countries',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({ countries: SUPPORTED_COUNTRIES });
  })
);

legalRouter.get(
  '/legal/contract-types',
  authenticate,
  asyncHandler(async (req, res) => {
    const country = typeof req.query.country === 'string' ? req.query.country : undefined;
    const types = await getLegalKnowledgeService().listContractTypes(country);
    res.json({ contractTypes: types });
  })
);

legalRouter.get(
  '/legal/topics',
  authenticate,
  asyncHandler(async (_req, res) => {
    const topics = await getLegalKnowledgeService().listTopics();
    res.json({ topics });
  })
);
