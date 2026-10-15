import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { createTestEnv, fakePdf, INTRUDER, OWNER } from './helpers';

// ─────────────────────────────────────────────────────────────────────────
// Storage guarda los contratos de los clientes del usuario: son documentos
// confidenciales de terceros. El aislamiento por carpeta es lo único que
// los protege, y el filtro de tipo y tamaño es lo que impide que la ruta
// de subida se use como alojamiento gratuito.
// ─────────────────────────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

const asOwner = () => testEnv.authenticatedContext(OWNER).storage();
const asIntruder = () => testEnv.authenticatedContext(INTRUDER).storage();
const asAnon = () => testEnv.unauthenticatedContext().storage();

const PDF = { contentType: 'application/pdf' };
const DOCX = {
  contentType:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const DOC = { contentType: 'application/msword' };

beforeAll(async () => {
  testEnv = await createTestEnv();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
});

describe('contratos', () => {
  const path = (uid: string, name = 'c1.pdf') => `users/${uid}/contracts/${name}`;

  it('el dueño sube un PDF', async () => {
    await assertSucceeds(
      uploadBytes(ref(asOwner(), path(OWNER)), fakePdf(), PDF)
    );
  });

  it('el dueño sube .docx y .doc', async () => {
    await assertSucceeds(
      uploadBytes(ref(asOwner(), path(OWNER, 'c.docx')), fakePdf(), DOCX)
    );
    await assertSucceeds(
      uploadBytes(ref(asOwner(), path(OWNER, 'c.doc')), fakePdf(), DOC)
    );
  });

  it('NO puede subir a la carpeta de otro usuario', async () => {
    await assertFails(
      uploadBytes(ref(asIntruder(), path(OWNER)), fakePdf(), PDF)
    );
  });

  it('un anónimo no puede subir nada', async () => {
    await assertFails(uploadBytes(ref(asAnon(), path(OWNER)), fakePdf(), PDF));
  });

  it('rechaza un tipo de archivo no permitido', async () => {
    await assertFails(
      uploadBytes(ref(asOwner(), path(OWNER, 'malo.exe')), fakePdf(), {
        contentType: 'application/x-msdownload',
      })
    );
  });

  it('rechaza una imagen disfrazada de contrato', async () => {
    await assertFails(
      uploadBytes(ref(asOwner(), path(OWNER, 'foto.png')), fakePdf(), {
        contentType: 'image/png',
      })
    );
  });

  it('rechaza un archivo de más de 10 MB', async () => {
    await assertFails(
      uploadBytes(ref(asOwner(), path(OWNER)), fakePdf(11 * 1024 * 1024), PDF)
    );
  });

  it('el dueño descarga su contrato; un tercero no', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), path(OWNER)), fakePdf(), PDF);
    });
    await assertSucceeds(getBytes(ref(asOwner(), path(OWNER))));
    await assertFails(getBytes(ref(asIntruder(), path(OWNER))));
  });

  it('el dueño borra su contrato; un tercero no', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), path(OWNER)), fakePdf(), PDF);
    });
    await assertFails(deleteObject(ref(asIntruder(), path(OWNER))));
    await assertSucceeds(deleteObject(ref(asOwner(), path(OWNER))));
  });
});

describe('exports generados por el backend', () => {
  const path = `users/${OWNER}/exports/analisis.pdf`;

  it('el dueño los lee', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), path), fakePdf(), PDF);
    });
    await assertSucceeds(getBytes(ref(asOwner(), path)));
  });

  it('ni el dueño puede escribir ahí: solo el backend genera exports', async () => {
    await assertFails(uploadBytes(ref(asOwner(), path), fakePdf(), PDF));
  });

  it('un tercero no los lee', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), path), fakePdf(), PDF);
    });
    await assertFails(getBytes(ref(asIntruder(), path)));
  });
});

describe('avatares', () => {
  const path = `users/${OWNER}/profile/avatar.png`;
  const PNG = { contentType: 'image/png' };

  it('el dueño sube una imagen pequeña', async () => {
    await assertSucceeds(uploadBytes(ref(asOwner(), path), fakePdf(), PNG));
  });

  it('rechaza más de 2 MB', async () => {
    await assertFails(
      uploadBytes(ref(asOwner(), path), fakePdf(3 * 1024 * 1024), PNG)
    );
  });

  it('rechaza un PDF como avatar', async () => {
    await assertFails(uploadBytes(ref(asOwner(), path), fakePdf(), PDF));
  });

  it('NO puede subir a la carpeta de otro', async () => {
    await assertFails(uploadBytes(ref(asIntruder(), path), fakePdf(), PNG));
  });
});

describe('cierre por defecto', () => {
  it('una ruta no declarada está cerrada', async () => {
    await assertFails(
      uploadBytes(ref(asOwner(), 'publico/cualquiera.pdf'), fakePdf(), PDF)
    );
    await assertFails(
      uploadBytes(ref(asOwner(), `users/${OWNER}/otra-cosa/x.pdf`), fakePdf(), PDF)
    );
  });
});
