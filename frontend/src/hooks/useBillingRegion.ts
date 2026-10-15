import { useCallback, useEffect, useState } from 'react';
import type { BillingRegion } from '@clausum/shared';
import { useAuth } from '@/auth/AuthProvider';
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
        // Firestore se carga aquí y no arriba: este hook lo usa el selector
        // de región, que aparece en páginas públicas, y el SDK son ~291 kB
        // que un visitante anónimo no debería descargar.
        const [{ doc, serverTimestamp, updateDoc }, { getFirebaseFirestore }] =
          await Promise.all([
            import('firebase/firestore'),
            import('@/firebase/firestore'),
          ]);
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
