import { describe, expect, it } from 'vitest';
import { AppError, esReintentable } from '../utils/errors';

// ─────────────────────────────────────────────────────────────────────────
// De esta decision depende lo que ve el usuario cuando algo falla.
//
// Un 403 por plan reintentado tres veces le muestra "Reintentando..." un
// buen rato y, al final, un error generico muy posterior al momento en que
// ya sabiamos el motivo exacto.
// ─────────────────────────────────────────────────────────────────────────

describe('esReintentable', () => {
  it('no reintenta un error de plan (OCR solo en Pro)', () => {
    const error = new AppError(
      'Este PDF parece escaneado…',
      403,
      'OCR_PRO_REQUIRED'
    );
    expect(esReintentable(error)).toBe(false);
  });

  it('no reintenta cuota agotada ni archivo invalido', () => {
    expect(esReintentable(new AppError('Cuota agotada', 429))).toBe(false);
    expect(esReintentable(new AppError('Archivo invalido', 400))).toBe(false);
    expect(esReintentable(new AppError('No encontrado', 404))).toBe(false);
  });

  it('si reintenta un fallo del servicio', () => {
    expect(esReintentable(new AppError('DeepSeek no responde', 502))).toBe(true);
    expect(esReintentable(new AppError('Error interno', 500))).toBe(true);
  });

  // Un error que no es nuestro no se puede clasificar: un fallo de red
  // llega como Error pelado y es justo el caso que el reintento arregla.
  it('ante lo desconocido, reintenta', () => {
    expect(esReintentable(new Error('socket hang up'))).toBe(true);
    expect(esReintentable(undefined)).toBe(true);
    expect(esReintentable('algo')).toBe(true);
  });
});
