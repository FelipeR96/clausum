import { useCallback, useEffect, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { BillingRegion } from '@clausum/shared';
import { useAuth } from '@/auth/AuthProvider';
import { getFirebaseFirestore } from '@/firebase';
import {
  readBillingRegionFromStorage,
  writeBillingRegionToStorage,
} from '@/utils/billing-region-storage';

export function useBillingRegion(initialRegion?: BillingRegion) {
  const { user } = useAuth();
  const [region, setRegionState] = useState<BillingRegion>(
    initialRegion ?? readBillingRegionFromStorage()
  );

  useEffect(() => {
    if (initialRegion) {
      setRegionState(initialRegion);
      writeBillingRegionToStorage(initialRegion);
    }
  }, [initialRegion]);

  const setRegion = useCallback(
    async (next: BillingRegion) => {
      setRegionState(next);
      writeBillingRegionToStorage(next);

      if (user) {
        const db = getFirebaseFirestore();
        await updateDoc(doc(db, 'users', user.uid), {
          billingRegion: next,
          updatedAt: serverTimestamp(),
        });
      }
    },
    [user]
  );

  return {
    region,
    setRegion,
    isColombia: region === 'CO',
    isLatam: region === 'LATAM',
  };
}
