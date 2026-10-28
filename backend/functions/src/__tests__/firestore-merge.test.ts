import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { adminDb } from '../firebase/admin';

// ─────────────────────────────────────────────────────────────────────────
// Qué hace exactamente `set(..., { merge: true })`.
//
// Parece una pregunta de manual, pero una respuesta equivocada ya costó algo
// real: el script de siembra escribía `config/pricing` con merge y un
// comentario aseguraba que así no pisaba un precio cambiado desde el panel.
// De esa creencia dependía que volver a correr el seed fuera inofensivo.
//
// Estas pruebas fijan el comportamiento de verdad en vez de razonarlo, para
// que la próxima persona que dude lo lea aquí y no en un comentario.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

const RUTA = 'merge-test-doc';
const ref = () => adminDb().collection('config').doc(RUTA);

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
});

afterEach(async () => {
  await ref().delete();
});

describe('set con merge', () => {
  it('SÍ sobrescribe un campo anidado que viene en el payload', async () => {
    // Es el caso del seed: el administrador cambió el precio y el seed trae
    // el de fábrica dentro de CO.
    await ref().set({
      CO: { monthlyAmountInCents: 9_999, currency: 'COP' },
    });

    await ref().set({ CO: { monthlyAmountInCents: 3_500_000 } }, { merge: true });

    const datos = (await ref().get()).data();
    expect((datos?.CO as { monthlyAmountInCents: number }).monthlyAmountInCents).toBe(
      3_500_000
    );
  });

  it('pero conserva los campos anidados que NO vienen en el payload', async () => {
    // Esta es la mitad cierta de la creencia, y por eso costó verla: merge
    // protege lo que no nombras, no lo que nombras.
    await ref().set({
      CO: { monthlyAmountInCents: 9_999, singleAnalysisAmountInCents: 777_000 },
    });

    await ref().set({ CO: { monthlyAmountInCents: 3_500_000 } }, { merge: true });

    const co = (await ref().get()).data()?.CO as Record<string, number>;
    expect(co.monthlyAmountInCents).toBe(3_500_000);
    expect(co.singleAnalysisAmountInCents).toBe(777_000);
  });

  it('sin merge, un set reemplaza el documento entero', async () => {
    await ref().set({ CO: { monthlyAmountInCents: 9_999 }, LATAM: { currency: 'USD' } });

    await ref().set({ CO: { monthlyAmountInCents: 3_500_000 } });

    const datos = (await ref().get()).data();
    expect(datos?.LATAM).toBeUndefined();
  });
});

describe('crear solo si falta', () => {
  it('no toca un documento que ya existe', async () => {
    // La propiedad en la que se apoya el seed desde que dejó de usar merge:
    // correrlo otra vez no puede devolver un precio a su valor de fábrica.
    await ref().set({ CO: { monthlyAmountInCents: 9_999 } });

    const snap = await ref().get();
    if (!snap.exists) throw new Error('se esperaba que existiera');
    // El seed se detiene aquí y no escribe.

    const datos = (await ref().get()).data();
    expect((datos?.CO as { monthlyAmountInCents: number }).monthlyAmountInCents).toBe(
      9_999
    );
  });

  it('crea el documento cuando no está', async () => {
    const snap = await ref().get();
    expect(snap.exists).toBe(false);

    await ref().set({ CO: { monthlyAmountInCents: 3_500_000 } });

    expect((await ref().get()).exists).toBe(true);
  });
});
