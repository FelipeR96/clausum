import { useEffect, useRef, useState, type FormEvent } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/auth/AuthProvider';
import { getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage, profileAvatarStoragePath } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fetchMe } from '@/services/user.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

const PROFILE_EXTRA_KEY = 'clausum-profile-extra';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ProfileExtra = {
  jobTitle?: string;
  organization?: string;
};

function loadProfileExtra(uid: string): ProfileExtra {
  try {
    const raw = localStorage.getItem(`${PROFILE_EXTRA_KEY}:${uid}`);
    return raw ? (JSON.parse(raw) as ProfileExtra) : {};
  } catch {
    return {};
  }
}

function saveProfileExtra(uid: string, extra: ProfileExtra) {
  localStorage.setItem(`${PROFILE_EXTRA_KEY}:${uid}`, JSON.stringify(extra));
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function SettingsProfileTab() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const extra = loadProfileExtra(user.uid);
      setJobTitle(extra.jobTitle ?? '');
      setOrganization(extra.organization ?? '');
      setEmail(user.email ?? '');
      setPhotoURL(user.photoURL ?? null);

      try {
        const me = await fetchMe();
        if (!cancelled) {
          setDisplayName(me.displayName ?? user.displayName ?? 'Usuario Clausum');
          if (me.email) setEmail(me.email);
          if (me.photoURL) setPhotoURL(me.photoURL);
        }
      } catch {
        if (!cancelled) {
          setDisplayName(user.displayName ?? 'Usuario Clausum');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }

      const db = getFirebaseFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      });

      saveProfileExtra(user.uid, {
        jobTitle: jobTitle.trim(),
        organization: organization.trim(),
      });

      setMessage('Cambios guardados correctamente.');
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'guardar tu perfil' }));
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    setError(null);
    setMessage(null);

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError('Formato no válido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('La imagen no puede superar 2 MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const storage = getFirebaseStorage();
      const path = profileAvatarStoragePath(user.uid, file.type);
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);

      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      const db = getFirebaseFirestore();
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setPhotoURL(downloadURL);
      setMessage('Foto de perfil actualizada.');
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'subir tu foto de perfil' }));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const subtitle = [jobTitle, organization].filter(Boolean).join(' @ ');

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Ajustes del perfil
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Administra tu información personal y cómo aparece en Clausum.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="glass-panel space-y-8 rounded-2xl p-6 shadow-soft sm:p-8"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant bg-primary-container text-2xl font-bold text-on-primary-container">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(displayName || 'U')
              )}
            </div>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-soft transition hover:bg-primary/90 disabled:opacity-60"
              title="Cambiar foto de perfil"
            >
              <span className="material-symbols-outlined text-sm">
                {uploadingAvatar ? 'progress_activity' : 'edit'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onAvatarChange(file);
              }}
            />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">
              {displayName || 'Usuario Clausum'}
            </h2>
            <p className="text-on-surface-variant">
              {subtitle || 'Completa tu cargo y organización'}
            </p>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">
          JPG, PNG o WebP. Máximo 2 MB.
        </p>

        {message && (
          <p className="rounded-xl bg-primary-container/40 px-4 py-3 text-sm text-on-primary-container">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Nombre completo
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Correo electrónico
            </label>
            <input
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm text-on-surface-variant"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Cargo
            </label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ej. Abogado corporativo"
              className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Organización
            </label>
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Ej. Estudio jurídico / empresa"
              className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <p className="text-xs text-on-surface-variant">
          Cargo y organización se guardan en este dispositivo hasta que el perfil
          completo esté disponible en la nube.
        </p>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  );
}
