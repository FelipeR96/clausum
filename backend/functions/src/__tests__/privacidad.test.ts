import { describe, expect, it } from 'vitest';
import { redactar, restaurar } from '../privacidad/redaccion';

// ─────────────────────────────────────────────────────────────────────────
// Estas pruebas protegen dos promesas opuestas que tiran la una de la otra.
//
// Si la redaccion se queda corta, salen del pais datos personales que
// dijimos que no saldrian. Si se pasa de lista, borra cifras del contrato y
// el analisis sale FALSO sin que nadie se entere: no hay error, no hay
// aviso, solo un resultado que parece bueno y esta mal.
//
// Por eso hay tantas pruebas de lo que NO debe tocarse como de lo que si.
// ─────────────────────────────────────────────────────────────────────────

const CONTRATO = `CONTRATO DE ARRENDAMIENTO

Entre JUAN CARLOS PEREZ GOMEZ, mayor de edad, identificado con cédula de ciudadanía No. 1.020.345.678 de Bogotá, domiciliado en la Calle 72 # 10-34 Apto 501, correo juan.perez@gmail.com, celular 310 456 7890, en adelante EL ARRENDADOR; y COMERCIALIZADORA ANDINA S.A.S., identificada con NIT 900.123.456-7, en adelante EL ARRENDATARIO.

CLÁUSULA PRIMERA. CANON: El canon mensual será de UN MILLÓN QUINIENTOS MIL PESOS ($1.500.000) pagaderos el día 5 de cada mes.
CLÁUSULA SEGUNDA. PLAZO: El término será de 12 meses contados desde el 1 de marzo de 2026 hasta el 28 de febrero de 2027.
CLÁUSULA TERCERA. MULTA: El incumplimiento genera una multa del 20% sobre $18.000.000.
CLÁUSULA CUARTA. Si JUAN CARLOS PEREZ GOMEZ requiere el inmueble, avisará con 90 días.
CLÁUSULA QUINTA. Pagos a la cuenta de ahorros No. 123-456789-01.`;

describe('redacción de datos personales', () => {
  it('oculta los identificadores del documento', () => {
    const { texto } = redactar(CONTRATO);

    expect(texto).not.toContain('1.020.345.678');
    expect(texto).not.toContain('juan.perez@gmail.com');
    expect(texto).not.toContain('310 456 7890');
    expect(texto).not.toContain('Calle 72 # 10-34');
    expect(texto).not.toContain('900.123.456-7');
    expect(texto).not.toContain('123-456789-01');
    expect(texto).not.toContain('JUAN CARLOS PEREZ GOMEZ');
  });

  // La prueba mas importante del archivo. Un contrato vive de sus cifras:
  // borrar un monto o un plazo no degrada el analisis, lo falsea.
  it('NO toca montos, plazos, porcentajes ni fechas', () => {
    const { texto } = redactar(CONTRATO);

    for (const cifra of [
      '$1.500.000',
      '$18.000.000',
      '12 meses',
      '1 de marzo de 2026',
      '28 de febrero de 2027',
      '20%',
      '90 días',
      'día 5',
    ]) {
      expect(texto).toContain(cifra);
    }
  });

  // Regresion. El patron empieza a capturar en la primera mayuscula, y en
  // "Entre JUAN PEREZ" esa mayuscula es la de "Entre": el nombre se
  // guardaba como "Entre JUAN PEREZ" y el nombre suelto de una clausula
  // posterior sobrevivia, mientras el recuento afirmaba que estaba oculto.
  it('oculta el nombre en TODO el documento, no solo junto a la cédula', () => {
    const { texto } = redactar(CONTRATO);

    const apariciones = (texto.match(/JUAN CARLOS PEREZ GOMEZ/g) ?? []).length;
    expect(apariciones).toBe(0);
    // Y la clausula cuarta sigue siendo legible para el modelo.
    expect(texto).toMatch(/CLÁUSULA CUARTA\. Si \[PERSONA_\d+\] requiere el inmueble/);
  });

  it('usa el mismo marcador para la misma persona en todas sus apariciones', () => {
    const { texto, mapa } = redactar(CONTRATO);

    const marcadores = [...(texto.match(/\[PERSONA_\d+\]/g) ?? [])];
    const unicos = new Set(marcadores);
    // Dos partes: el arrendador (que aparece dos veces) y la sociedad.
    expect(unicos.size).toBe(2);
    expect(marcadores.length).toBe(3);
    expect(mapa.size).toBeGreaterThanOrEqual(7);
  });

  it('no confunde los roles del contrato con nombres de personas', () => {
    const { texto } = redactar(CONTRATO);

    expect(texto).toContain('EL ARRENDADOR');
    expect(texto).toContain('EL ARRENDATARIO');
  });

  it('la ida y vuelta devuelve el documento original', () => {
    const { texto, mapa } = redactar(CONTRATO);
    expect(restaurar(texto, mapa)).toBe(CONTRATO);
  });

  it('no inventa marcadores en un texto sin datos personales', () => {
    const limpio = 'CLÁUSULA ÚNICA. El plazo es de 24 meses y la multa del 10%.';
    const { texto, mapa, conteo } = redactar(limpio);

    expect(texto).toBe(limpio);
    expect(mapa.size).toBe(0);
    expect(Object.keys(conteo)).toHaveLength(0);
  });
});

describe('restauración dentro de la respuesta JSON', () => {
  // La respuesta del modelo es un documento JSON y los marcadores viven
  // dentro de sus cadenas. Una razon social con comillas reinsertada en
  // crudo rompe el JSON y tumba el analisis entero.
  it('escapa las comillas al devolver el valor a una respuesta JSON', () => {
    // El mapa se construye a mano a proposito. Una razon social entre
    // comillas no la detecta el patron de nombres —las comillas lo
    // cortan—, asi que partir de redactar() no probaria nada. Lo que hay
    // que proteger es el escapado de restaurar(), y eso se prueba aqui
    // directamente: si algun dia el detector si capture un valor con
    // comillas, el escapado ya estara en su sitio.
    const mapa = new Map([['[PERSONA_1]', 'ALMACENES "EL ÉXITO" S.A.']]);

    const respuesta = JSON.stringify({ resumen: 'La parte [PERSONA_1] asume el riesgo.' });
    const restaurada = restaurar(respuesta, mapa, { enJson: true });

    expect(() => JSON.parse(restaurada)).not.toThrow();
    expect(JSON.parse(restaurada).resumen).toBe(
      'La parte ALMACENES "EL ÉXITO" S.A. asume el riesgo.'
    );
  });

  it('sin enJson devuelve el valor en crudo', () => {
    const mapa = new Map([['[PERSONA_1]', 'Pedro Ruiz']]);
    expect(restaurar('Hola [PERSONA_1].', mapa)).toBe('Hola Pedro Ruiz.');
  });

  it('recupera el marcador aunque el modelo le quite los corchetes', () => {
    const mapa = new Map([['[PERSONA_1]', 'Ana María Ruiz']]);

    expect(restaurar('El riesgo recae sobre PERSONA_1.', mapa)).toBe(
      'El riesgo recae sobre Ana María Ruiz.'
    );
  });
});
