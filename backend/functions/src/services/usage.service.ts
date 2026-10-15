import { ENTITLEMENT_ACTIONS } from '@clausum/shared';
import {
  assertEntitlement,
  releaseAnalysisUsage,
  releaseComparisonUsage,
  reserveAnalysisUsage,
  reserveComparisonUsage,
} from './subscription.service';

export async function assertAnalysisQuota(userId: string): Promise<void> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.ANALYSIS);
}

export async function assertComparisonQuota(userId: string): Promise<void> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.COMPARISON);
}

export {
  releaseAnalysisUsage,
  releaseComparisonUsage,
  reserveAnalysisUsage,
  reserveComparisonUsage,
};
