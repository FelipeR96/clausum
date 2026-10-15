import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { contractDoc, createTestEnv, INTRUDER, OWNER, userDoc } from './helpers';

// ─────────────────────────────────────────────────────────────────────────
// Las reglas son lo único que separa los contratos de un usuario de los de
// otro, y lo único que impide que alguien se ascienda a Pro desde la
// consola del navegador. Cada caso de aquí corresponde a un ataque o a un
// error de programación concreto, no a cobertura por cobertura.
// ─────────────────────────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

const asOwner = () => testEnv.authenticatedContext(OWNER).firestore();
const asIntruder = () => testEnv.authenticatedContext(INTRUDER).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

/** Siembra datos saltándose las reglas, como hace el Admin SDK. */
async function seed(fn: (db: ReturnType<typeof asOwner>) => Promise<unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as never);
  });
}

beforeAll(async () => {
  testEnv = await createTestEnv();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ═══════════════════════════════════════════════════════════════════════
describe('users', () => {
  it('el dueño lee su propio documento', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertSucceeds(getDoc(doc(asOwner(), 'users', OWNER)));
  });

  it('un tercero NO lee el documento de otro', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertFails(getDoc(doc(asIntruder(), 'users', OWNER)));
  });

  it('un anónimo no lee nada', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertFails(getDoc(doc(asAnon(), 'users', OWNER)));
  });

  it('puede crearse a sí mismo en plan free', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'users', OWNER), userDoc()));
  });

  it('NO puede crearse directamente en plan pro', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'users', OWNER), userDoc({ planId: 'pro' }))
    );
  });

  it('NO puede crear el documento de otro usuario', async () => {
    await assertFails(setDoc(doc(asIntruder(), 'users', OWNER), userDoc()));
  });

  it('NO puede inventar campos al crearse', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'users', OWNER), userDoc({ subscriptionStatus: 'active' }))
    );
  });

  describe('campos protegidos — la defensa contra el auto-upgrade', () => {
    beforeEach(async () => {
      await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    });

    it('NO puede cambiarse el planId', async () => {
      await assertFails(
        updateDoc(doc(asOwner(), 'users', OWNER), { planId: 'pro' })
      );
    });

    it('NO puede cambiarse el subscriptionStatus', async () => {
      await assertFails(
        updateDoc(doc(asOwner(), 'users', OWNER), { subscriptionStatus: 'active' })
      );
    });

    it('NO puede asignarse un subscriptionId', async () => {
      await assertFails(
        updateDoc(doc(asOwner(), 'users', OWNER), { subscriptionId: 'sub_falso' })
      );
    });

    it('NO puede colar un campo protegido junto a uno legítimo', async () => {
      await assertFails(
        updateDoc(doc(asOwner(), 'users', OWNER), {
          displayName: 'Nombre nuevo',
          planId: 'pro',
        })
      );
    });
  });

  it('sí puede editar su perfil (campos de la lista blanca)', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'users', OWNER), {
        displayName: 'Felipe',
        locale: 'es-CO',
        billingRegion: 'CO',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('NO puede escribir un campo fuera de la lista blanca', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertFails(
      updateDoc(doc(asOwner(), 'users', OWNER), { rolInventado: 'admin' })
    );
  });

  it('nadie puede borrar un usuario desde el cliente', async () => {
    await seed((db) => setDoc(doc(db, 'users', OWNER), userDoc()));
    await assertFails(deleteDoc(doc(asOwner(), 'users', OWNER)));
  });

  describe('subcolecciones', () => {
    it('lee su uso pero no lo escribe', async () => {
      await seed((db) =>
        setDoc(doc(db, 'users', OWNER, 'usage', '2026-10'), { analyses: 3 })
      );
      await assertSucceeds(getDoc(doc(asOwner(), 'users', OWNER, 'usage', '2026-10')));
      await assertFails(
        updateDoc(doc(asOwner(), 'users', OWNER, 'usage', '2026-10'), { analyses: 0 })
      );
    });

    it('un tercero no lee el uso de otro', async () => {
      await seed((db) =>
        setDoc(doc(db, 'users', OWNER, 'usage', '2026-10'), { analyses: 3 })
      );
      await assertFails(
        getDoc(doc(asIntruder(), 'users', OWNER, 'usage', '2026-10'))
      );
    });

    it('escribe ajustes válidos', async () => {
      await assertSucceeds(
        setDoc(doc(asOwner(), 'users', OWNER, 'settings', 'preferences'), {
          emailNotifications: true,
          riskThreshold: 'medium',
          theme: 'dark',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('rechaza un riskThreshold inválido', async () => {
      await assertFails(
        setDoc(doc(asOwner(), 'users', OWNER, 'settings', 'preferences'), {
          riskThreshold: 'extremo',
        })
      );
    });

    it('rechaza un campo desconocido en ajustes', async () => {
      await assertFails(
        setDoc(doc(asOwner(), 'users', OWNER, 'settings', 'preferences'), {
          emailNotifications: true,
          campoRaro: 1,
        })
      );
    });

    it('lee su historial pero no lo escribe', async () => {
      await seed((db) =>
        setDoc(doc(db, 'users', OWNER, 'history', 'h1'), { action: 'analysis.complete' })
      );
      await assertSucceeds(getDoc(doc(asOwner(), 'users', OWNER, 'history', 'h1')));
      await assertFails(
        setDoc(doc(asOwner(), 'users', OWNER, 'history', 'h2'), { action: 'falso' })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('contracts', () => {
  it('el dueño lee su contrato', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertSucceeds(getDoc(doc(asOwner(), 'contracts', 'c1')));
  });

  it('un tercero NO lee el contrato de otro', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertFails(getDoc(doc(asIntruder(), 'contracts', 'c1')));
  });

  it('crea un contrato propio con storagePath válido', async () => {
    await assertSucceeds(setDoc(doc(asOwner(), 'contracts', 'c1'), contractDoc()));
  });

  it('acepta .docx y .doc además de .pdf', async () => {
    for (const ext of ['pdf', 'doc', 'docx']) {
      await assertSucceeds(
        setDoc(
          doc(asOwner(), 'contracts', `c-${ext}`),
          contractDoc(OWNER, {
            storagePath: `users/${OWNER}/contracts/abc.${ext}`,
            fileName: `contrato.${ext}`,
          })
        )
      );
    }
  });

  it('NO crea un contrato a nombre de otro usuario', async () => {
    await assertFails(
      setDoc(doc(asIntruder(), 'contracts', 'c1'), contractDoc(OWNER))
    );
  });

  it('NO acepta un storagePath que apunte a la carpeta de otro', async () => {
    await assertFails(
      setDoc(
        doc(asOwner(), 'contracts', 'c1'),
        contractDoc(OWNER, { storagePath: `users/${INTRUDER}/contracts/abc.pdf` })
      )
    );
  });

  it('NO acepta una extensión arbitraria en storagePath', async () => {
    await assertFails(
      setDoc(
        doc(asOwner(), 'contracts', 'c1'),
        contractDoc(OWNER, { storagePath: `users/${OWNER}/contracts/abc.exe` })
      )
    );
  });

  it('NO acepta un storagePath con subcarpetas colgadas', async () => {
    await assertFails(
      setDoc(
        doc(asOwner(), 'contracts', 'c1'),
        contractDoc(OWNER, { storagePath: `users/${OWNER}/contracts/x/y.pdf` })
      )
    );
  });

  it('NO crea un contrato ya marcado como analizado', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'contracts', 'c1'), contractDoc(OWNER, { status: 'analyzed' }))
    );
  });

  it('edita metadatos propios (título, etiquetas, tipo)', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'contracts', 'c1'), {
        title: 'Otro título',
        tags: ['importante'],
        contractTypeId: 'arrendamiento',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('NO puede falsear el riskScore', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertFails(updateDoc(doc(asOwner(), 'contracts', 'c1'), { riskScore: 0 }));
  });

  it('NO puede cambiar el status a mano', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertFails(
      updateDoc(doc(asOwner(), 'contracts', 'c1'), { status: 'analyzed' })
    );
  });

  it('NO puede mover el storagePath después de crear', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertFails(
      updateDoc(doc(asOwner(), 'contracts', 'c1'), {
        storagePath: `users/${INTRUDER}/contracts/abc.pdf`,
      })
    );
  });

  it('el dueño puede borrar su contrato', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertSucceeds(deleteDoc(doc(asOwner(), 'contracts', 'c1')));
  });

  it('un tercero NO puede borrarlo', async () => {
    await seed((db) => setDoc(doc(db, 'contracts', 'c1'), contractDoc()));
    await assertFails(deleteDoc(doc(asIntruder(), 'contracts', 'c1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('resultados de IA y pagos — solo lectura para el cliente', () => {
  const casos = [
    { col: 'analyses', data: { userId: OWNER, mode: 'analyze', status: 'done', score: 80 } },
    { col: 'comparisons', data: { userId: OWNER, status: 'done', summary: 'x' } },
    { col: 'payments', data: { userId: OWNER, amount: 4_000_000, currency: 'COP' } },
    { col: 'subscriptions', data: { userId: OWNER, status: 'active', planId: 'pro' } },
  ];

  for (const { col, data } of casos) {
    describe(col, () => {
      beforeEach(async () => {
        await seed((db) => setDoc(doc(db, col, 'd1'), data));
      });

      it('el dueño lee', async () => {
        await assertSucceeds(getDoc(doc(asOwner(), col, 'd1')));
      });

      it('un tercero no lee', async () => {
        await assertFails(getDoc(doc(asIntruder(), col, 'd1')));
      });

      it('el dueño no puede modificar el resultado', async () => {
        await assertFails(updateDoc(doc(asOwner(), col, 'd1'), { status: 'done' }));
      });

      it('el dueño no puede crear uno a mano', async () => {
        await assertFails(setDoc(doc(asOwner(), col, 'nuevo'), data));
      });
    });
  }

  it('un análisis manipulado no puede inflar el score', async () => {
    await seed((db) =>
      setDoc(doc(db, 'analyses', 'a1'), { userId: OWNER, status: 'done', score: 40 })
    );
    await assertFails(updateDoc(doc(asOwner(), 'analyses', 'a1'), { score: 100 }));
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('alerts', () => {
  beforeEach(async () => {
    await seed((db) =>
      setDoc(doc(db, 'alerts', 'al1'), {
        userId: OWNER,
        severity: 'high',
        read: false,
        message: 'Riesgo crítico detectado',
      })
    );
  });

  it('el dueño la lee', async () => {
    await assertSucceeds(getDoc(doc(asOwner(), 'alerts', 'al1')));
  });

  it('un tercero no la lee', async () => {
    await assertFails(getDoc(doc(asIntruder(), 'alerts', 'al1')));
  });

  it('puede marcarla como leída', async () => {
    await assertSucceeds(
      updateDoc(doc(asOwner(), 'alerts', 'al1'), { read: true, readAt: serverTimestamp() })
    );
  });

  it('NO puede cambiarle la severidad', async () => {
    await assertFails(updateDoc(doc(asOwner(), 'alerts', 'al1'), { severity: 'low' }));
  });

  it('NO puede reescribir el mensaje junto al read', async () => {
    await assertFails(
      updateDoc(doc(asOwner(), 'alerts', 'al1'), { read: true, message: 'otra cosa' })
    );
  });

  it('NO puede crear alertas', async () => {
    await assertFails(
      setDoc(doc(asOwner(), 'alerts', 'nueva'), { userId: OWNER, read: false })
    );
  });

  it('puede borrar la suya', async () => {
    await assertSucceeds(deleteDoc(doc(asOwner(), 'alerts', 'al1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('catálogos — lectura autenticada, escritura nunca', () => {
  const catalogos = [
    { col: 'plans', id: 'pro', data: { slug: 'pro', name: 'Pro' } },
    { col: 'laws', id: 'ley820_1', data: { country: 'CO', article: '1' } },
    { col: 'contract_types', id: 'arrendamiento', data: { name: 'Arrendamiento' } },
    { col: 'legal_topics', id: 'terminacion', data: { name: 'Terminación' } },
  ];

  for (const { col, id, data } of catalogos) {
    it(`${col}: autenticado lee, anónimo no, nadie escribe`, async () => {
      await seed((db) => setDoc(doc(db, col, id), data));
      await assertSucceeds(getDoc(doc(asOwner(), col, id)));
      await assertFails(getDoc(doc(asAnon(), col, id)));
      await assertFails(updateDoc(doc(asOwner(), col, id), { name: 'hackeado' }));
    });
  }

  it('config: solo los documentos previstos son legibles', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'config', 'app'), { maintenanceMode: false });
      await setDoc(doc(db, 'config', 'interno'), { secreto: true });
    });
    await assertSucceeds(getDoc(doc(asOwner(), 'config', 'app')));
    await assertFails(getDoc(doc(asOwner(), 'config', 'interno')));
    await assertFails(updateDoc(doc(asOwner(), 'config', 'app'), { maintenanceMode: true }));
  });
});

// ═══════════════════════════════════════════════════════════════════════
describe('cierre por defecto', () => {
  it('los logs de sistema son invisibles para el cliente', async () => {
    await seed((db) => setDoc(doc(db, 'system_logs', 'l1'), { level: 'error' }));
    await assertFails(getDoc(doc(asOwner(), 'system_logs', 'l1')));
    await assertFails(setDoc(doc(asOwner(), 'system_logs', 'l2'), { level: 'info' }));
  });

  it('una colección no declarada está cerrada', async () => {
    await seed((db) => setDoc(doc(db, 'coleccion_futura', 'x'), { dato: 1 }));
    await assertFails(getDoc(doc(asOwner(), 'coleccion_futura', 'x')));
    await assertFails(setDoc(doc(asOwner(), 'coleccion_futura', 'y'), { dato: 2 }));
  });
});
