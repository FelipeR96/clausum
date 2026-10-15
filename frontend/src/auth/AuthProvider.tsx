import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
// `firebase/firestore` NO se importa de forma estática: son ~291 kB y este
// módulo es eager (lo monta main.tsx), así que acabarían en el chunk de
// entrada de toda página, incluidas las landings de SEO que ve un visitante
// anónimo. Firestore solo se usa al crear o parchear el documento de
// usuario, que ocurre al registrarse o iniciar sesión, de modo que se carga
// bajo demanda en ese momento.
async function loadFirestore() {
  // Se cargan a la vez el SDK y el módulo propio que crea la instancia:
  // importar `@/firebase/firestore` de forma estática anclaría el SDK al
  // chunk de entrada y la carga dinámica no serviría de nada --Vite avisa
  // de esto: "dynamic import will not move module into another chunk".
  const [sdk, local] = await Promise.all([
    import('firebase/firestore'),
    import('@/firebase/firestore'),
  ]);
  return { ...sdk, getFirebaseFirestore: local.getFirebaseFirestore };
}
import type { BillingRegion } from '@clausum/shared';
import { readBillingRegionFromStorage } from '@/utils/billing-region-storage';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { getFirebaseAuth, googleProvider } from '@/firebase/auth';

export type SignUpProfile = {
  displayName?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile?: SignUpProfile) => Promise<void>;
  signInDemo: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ensuringUserDocs = new Map<string, Promise<void>>();

async function ensureUserDocument(user: User, profile?: SignUpProfile) {
  const pending = ensuringUserDocs.get(user.uid);
  if (pending) {
    await pending;
    if (profile?.displayName) {
      await patchUserDisplayName(user.uid, profile.displayName);
    }
    return;
  }

  const task = (async () => {
    const { doc, getDoc, serverTimestamp, setDoc, getFirebaseFirestore } =
      await loadFirestore();
    const db = getFirebaseFirestore();
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const billingRegion: BillingRegion = readBillingRegionFromStorage();
      await setDoc(ref, {
        email: user.email ?? `anon-${user.uid.slice(0, 8)}@clausum.local`,
        displayName: profile?.displayName ?? user.displayName ?? 'Usuario Clausum',
        planId: 'free',
        locale: 'es-CO',
        billingRegion,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if (profile?.displayName) {
      await patchUserDisplayName(user.uid, profile.displayName);
    }
  })().finally(() => {
    ensuringUserDocs.delete(user.uid);
  });

  ensuringUserDocs.set(user.uid, task);
  await task;
}

async function patchUserDisplayName(uid: string, displayName: string) {
  const { doc, serverTimestamp, setDoc, getFirebaseFirestore } = await loadFirestore();
  const db = getFirebaseFirestore();
  await setDoc(
    doc(db, 'users', uid),
    {
      displayName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (nextUser) => {
      invalidateSubscriptionCache();
      if (nextUser) {
        try {
          await ensureUserDocument(nextUser);
        } catch {
          // El panel puede funcionar aunque falle la creación del doc de usuario.
        }
      }
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocument(cred.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, profile?: SignUpProfile) => {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserDocument(cred.user, profile);
  }, []);

  const signInDemo = useCallback(async () => {
    const auth = getFirebaseAuth();
    const cred = await signInAnonymously(auth);
    await ensureUserDocument(cred.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(cred.user);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInDemo, signInWithGoogle, signOut }),
    [user, loading, signIn, signUp, signInDemo, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
