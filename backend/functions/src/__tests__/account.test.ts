import { describe, expect, it } from 'vitest';
import { assertRecentAuth } from '../services/account.service';

// ─────────────────────────────────────────────────────────────────────────
// La ventana de reautenticación es lo único que impide que una sesión
// abierta y desatendida sirva para borrar la cuenta. Merece prueba propia
// porque el fallo seria silencioso: el borrado funcionaria igual, solo que
// sin la garantia de que quien lo pide es el titular.
// ─────────────────────────────────────────────────────────────────────────

const ahora = () => Math.floor(Date.now() / 1000);

describe('assertRecentAuth', () => {
  it('acepta un login de hace un instante', () => {
    expect(() => assertRecentAuth(ahora())).not.toThrow();
  });

  it('acepta un login de hace cuatro minutos', () => {
    expect(() => assertRecentAuth(ahora() - 4 * 60)).not.toThrow();
  });

  it('rechaza un login de hace diez minutos', () => {
    expect(() => assertRecentAuth(ahora() - 10 * 60)).toThrowError(
      expect.objectContaining({ code: 'REAUTH_REQUIRED', statusCode: 401 })
    );
  });

  it('rechaza un token sin auth_time', () => {
    // Un token al que le falta el claim no demuestra nada; no se le concede
    // el beneficio de la duda.
    expect(() => assertRecentAuth(undefined)).toThrowError(
      expect.objectContaining({ code: 'REAUTH_REQUIRED' })
    );
  });

  it('rechaza un auth_time de cero', () => {
    expect(() => assertRecentAuth(0)).toThrowError(
      expect.objectContaining({ code: 'REAUTH_REQUIRED' })
    );
  });

  it('acepta un auth_time en el futuro por desfase de reloj', () => {
    // El reloj del cliente y el del servidor pueden diferir unos segundos.
    // Un auth_time ligeramente futuro no es un ataque.
    expect(() => assertRecentAuth(ahora() + 30)).not.toThrow();
  });
});
