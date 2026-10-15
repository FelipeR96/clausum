import { describe, it, expect, afterEach } from 'vitest';
import { isOriginAllowed } from '../config/cors';

const EMULATOR_VAR = 'FIRESTORE_EMULATOR_HOST';
const original = process.env[EMULATOR_VAR];

function inEmulator(value: boolean): void {
  if (value) {
    process.env[EMULATOR_VAR] = '127.0.0.1:8080';
  } else {
    delete process.env[EMULATOR_VAR];
  }
}

afterEach(() => {
  if (original === undefined) delete process.env[EMULATOR_VAR];
  else process.env[EMULATOR_VAR] = original;
});

const allowed = new Set(['https://clausum.co']);

describe('CORS — origenes permitidos', () => {
  it('acepta siempre un origen de la lista explicita', () => {
    inEmulator(false);
    expect(isOriginAllowed('https://clausum.co', allowed)).toBe(true);
  });

  it('rechaza un origen ajeno en produccion', () => {
    inEmulator(false);
    expect(isOriginAllowed('https://clausum.co.evil.test', allowed)).toBe(false);
  });

  // El fallo que motivo esta funcion: la app servida por el emulador de
  // Hosting vive en 127.0.0.1:5000, no en el APP_URL configurado, y el
  // navegador manda Origin en todo lo que no sea GET ni HEAD. Sin esto,
  // cualquier escritura desde el emulador moria con un error de CORS.
  it('acepta cualquier puerto local cuando corre en emulador', () => {
    inEmulator(true);
    expect(isOriginAllowed('http://127.0.0.1:5000', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost:4173', allowed)).toBe(true);
    expect(isOriginAllowed('http://[::1]:5000', allowed)).toBe(true);
  });

  it('no abre la mano fuera del emulador', () => {
    inEmulator(false);
    expect(isOriginAllowed('http://127.0.0.1:5000', allowed)).toBe(false);
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(false);
  });

  it('no confunde un dominio que solo contiene localhost', () => {
    inEmulator(true);
    expect(isOriginAllowed('http://localhost.evil.test', allowed)).toBe(false);
    expect(isOriginAllowed('http://127.0.0.1.evil.test', allowed)).toBe(false);
  });
});
