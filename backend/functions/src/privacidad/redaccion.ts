// ─────────────────────────────────────────────────────────────────────────
// Redaccion de datos personales antes de enviar el texto al proveedor de IA.
//
// La idea en una frase: el proveedor recibe el contrato entero, con todas
// sus clausulas, pero no sabe de quien es.
//
// El principio que gobierna cada regla de aqui: NUNCA tocar un numero que
// pueda ser relevante para el analisis. Un contrato vive de sus cifras
// —montos, plazos, porcentajes, fechas, penalidades— y borrarlas por error
// no solo degrada el resultado, lo falsea sin avisar. Por eso los patrones
// que podrian confundirse con dinero o con fechas SOLO disparan cuando hay
// una palabra de identidad cerca ("cedula", "NIT", "identificado"). Es
// preferible dejar pasar un dato que destruir el analisis.
//
// Lo que esto es: seudonimizacion reversible. El mapa vive en memoria, por
// peticion, y nunca se persiste ni se registra. Lo que NO es: anonimizacion.
// Como el mapa existe, sigue siendo dato personal a efectos de la Ley 1581.
// ─────────────────────────────────────────────────────────────────────────

export type TipoDato =
  | 'PERSONA'
  | 'CC'
  | 'NIT'
  | 'EMAIL'
  | 'TEL'
  | 'DIRECCION'
  | 'CUENTA'
  | 'MATRICULA'
  | 'PLACA';

export interface Redaccion {
  /** El texto con los marcadores ya puestos. Es lo unico que sale del pais. */
  texto: string;
  /** marcador -> valor original. Se queda aqui. */
  mapa: Map<string, string>;
  /** Cuantos valores distintos se ocultaron, por tipo. Para registro. */
  conteo: Record<string, number>;
}

/** Palabras que anuncian que el numero siguiente identifica a alguien. */
const ANTES_DE_IDENTIDAD =
  '(?:c[eé]dula(?:\\s+de\\s+(?:ciudadan[ií]a|extranjer[ií]a))?|c\\.?\\s?c\\.?|nuip|t\\.?\\s?i\\.?|tarjeta\\s+de\\s+identidad|pasaporte|documento\\s+de\\s+identidad|identificad[oa]\\s+con(?:\\s+\\w+){0,4}?|nit)';

/**
 * Cada patron se aplica en orden. El orden importa: lo mas especifico
 * primero, para que un patron amplio no se coma parte de otro.
 */
const PATRONES: { tipo: TipoDato; re: RegExp; grupo: number }[] = [
  // Correos: van primero porque contienen puntos y digitos que otros
  // patrones podrian morder.
  {
    tipo: 'EMAIL',
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    grupo: 0,
  },

  // NIT con digito de verificacion: 900.123.456-7
  {
    tipo: 'NIT',
    re: /\b\d{3}\.?\d{3}\.?\d{3}\s*[-–]\s*\d\b/g,
    grupo: 0,
  },

  // Nombre de una parte: va PEGADO a la declaracion de identidad, que es
  // como aparecen las partes en los contratos colombianos. Detectarlo aqui
  // permite despues sustituir ese mismo nombre en todo el documento.
  {
    tipo: 'PERSONA',
    re: new RegExp(
      '([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.\'’-]+(?:\\s+(?:de|del|la|las|los|y)\\s+|\\s+)' +
        '(?:[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.\'’-]+(?:\\s+(?:de|del|la|las|los|y)\\s+|\\s+)?){0,4})' +
        '\\s*,?\\s*(?:mayor\\s+de\\s+edad|identificad[oa]|quien\\s+en\\s+adelante|portador\\s+de|con\\s+' +
        ANTES_DE_IDENTIDAD +
        ')',
      'g'
    ),
    grupo: 1,
  },

  // Cedula: SOLO con palabra de identidad delante. Sin ese ancla, un
  // "1.020.345" podria ser un monto y borrarlo arruinaria el analisis.
  {
    tipo: 'CC',
    re: new RegExp(
      ANTES_DE_IDENTIDAD + '\\s*(?:n[oº°.]*|#)?\\s*(\\d{1,3}(?:[.,]\\d{3}){1,4}|\\d{5,12})\\b',
      'gi'
    ),
    grupo: 1,
  },

  // Celular colombiano (3XXXXXXXXX) y fijo nuevo (60XXXXXXXX), con o sin +57.
  {
    tipo: 'TEL',
    re: /(?:\+?57[\s-]?)?\b(?:3\d{2}[\s-]?\d{3}[\s-]?\d{4}|60\d[\s-]?\d{3}[\s-]?\d{4})\b/g,
    grupo: 0,
  },

  // Direccion colombiana: tiene gramatica propia, por eso se detecta bien.
  {
    tipo: 'DIRECCION',
    re: /\b(?:calle|carrera|cra|kra|cr|avenida|av|autopista|diagonal|diag|dg|transversal|transv|tv|manzana|mz|kil[oó]metro|km)\s*\.?\s*\d+[A-Za-z]?\s*(?:bis)?\s*(?:#|n[oº°.]{0,3}|nro\.?)\s*\d+[A-Za-z]?\s*[-–]\s*\d+[A-Za-z]?(?:\s*(?:apto|apartamento|of|oficina|torre|int|interior)\.?\s*[\w-]+)?/gi,
    grupo: 0,
  },

  // Los tres siguientes exigen su palabra delante por la misma razon que
  // la cedula: sin ancla serian numeros cualquiera.
  {
    tipo: 'CUENTA',
    re: /(?:cuenta\s+(?:de\s+)?(?:bancaria|corriente|de\s+ahorros|ahorros)?|cta\.?)\s*(?:n[oº°.]*|#)?\s*(\d[\d\s-]{5,22}\d)/gi,
    grupo: 1,
  },
  {
    tipo: 'MATRICULA',
    re: /matr[ií]cula\s+inmobiliaria\s*(?:n[oº°.]*|#)?\s*([\w-]+\s*[-–]?\s*[\d]+)/gi,
    grupo: 1,
  },
  {
    tipo: 'PLACA',
    re: /\bplacas?\s*(?:n[oº°.]*|#)?\s*([A-Z]{3}\s*[-–]?\s*\d{2,3}[A-Z]?)\b/gi,
    grupo: 1,
  },
];

/** Palabras que nunca son un nombre propio aunque vayan en mayuscula. */
const NO_SON_NOMBRES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'entre', 'por', 'para', 'con',
  'quien', 'quienes', 'que', 'de', 'del', 'y', 'o', 'se', 'su', 'sus',
  'contrato', 'clausula', 'cláusula', 'parte', 'partes', 'presente',
  'arrendador', 'arrendatario', 'comprador', 'vendedor', 'contratante',
  'contratista', 'empleador', 'trabajador', 'cedente', 'cesionario',
  'acreedor', 'deudor', 'mandante', 'mandatario', 'asegurado', 'asegurador',
  'primera', 'segunda', 'señor', 'señora', 'doctor', 'doctora',
]);

const esPalabraVacia = (p: string) =>
  NO_SON_NOMBRES.has(p.toLowerCase().replace(/[.,]/g, ''));

/**
 * Recorta del nombre capturado las palabras que lo preceden o lo siguen
 * sin ser parte de el, y devuelve '' si lo que queda no es un nombre.
 *
 * Esto no es cosmetica. El patron empieza a capturar en la primera
 * mayuscula, y en "Entre JUAN PEREZ, mayor de edad" esa mayuscula es la de
 * "Entre" por estar al principio de la frase. El nombre se guardaba
 * entonces como "Entre JUAN PEREZ", y al buscar ESE texto en el resto del
 * documento no aparecia: el nombre suelto de la clausula 14 sobrevivia
 * intacto. Una fuga silenciosa, y de las peores, porque el recuento decia
 * que la persona estaba oculta.
 */
function normalizarNombre(valor: string): string {
  const palabras = valor.trim().split(/\s+/);
  while (palabras.length && esPalabraVacia(palabras[0])) palabras.shift();
  while (palabras.length && esPalabraVacia(palabras[palabras.length - 1])) palabras.pop();
  if (palabras.length < 2 || palabras.length > 6) return '';
  return palabras.join(' ');
}

function escaparRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sustituye los datos personales por marcadores numerados.
 *
 * El mismo valor recibe SIEMPRE el mismo marcador, y el marcador se aplica
 * a todas sus apariciones en el documento. Eso es lo que permite que el
 * modelo siga sabiendo quien le debe que a quien: si cada aparicion
 * recibiera un marcador distinto, perderia el hilo de la relacion y el
 * analisis saldria peor que sin redactar.
 */
export function redactar(original: string): Redaccion {
  const mapa = new Map<string, string>();
  const yaVisto = new Map<string, string>(); // valor -> marcador
  const contadores = new Map<TipoDato, number>();
  const conteo: Record<string, number> = {};
  let texto = original;

  const marcadorPara = (tipo: TipoDato, valor: string): string => {
    const clave = `${tipo}:${valor.toLowerCase()}`;
    const existente = yaVisto.get(clave);
    if (existente) return existente;

    const n = (contadores.get(tipo) ?? 0) + 1;
    contadores.set(tipo, n);
    const marcador = `[${tipo}_${n}]`;
    yaVisto.set(clave, marcador);
    mapa.set(marcador, valor);
    conteo[tipo] = n;
    return marcador;
  };

  for (const { tipo, re, grupo } of PATRONES) {
    // Primero se recolecta, despues se sustituye: modificar el texto
    // mientras un regex global lo recorre produce saltos silenciosos.
    const encontrados: string[] = [];
    for (const m of texto.matchAll(re)) {
      let valor = (m[grupo] ?? '').trim().replace(/[.,;:]+$/, '');
      if (tipo === 'PERSONA') valor = normalizarNombre(valor);
      if (!valor) continue;
      encontrados.push(valor);
    }

    // De mas largo a mas corto: si un valor contiene a otro, el grande
    // debe sustituirse antes para que el pequeño no lo parta por dentro.
    for (const valor of [...new Set(encontrados)].sort((a, b) => b.length - a.length)) {
      const marcador = marcadorPara(tipo, valor);
      texto = texto.replace(new RegExp(escaparRegExp(valor), 'g'), marcador);
    }
  }

  return { texto, mapa, conteo };
}

/**
 * Devuelve los valores reales a la respuesta del modelo.
 *
 * `enJson` existe porque la respuesta llega como documento JSON y los
 * marcadores viven dentro de cadenas. Un nombre con comillas —una razon
 * social como 《Almacenes "El Exito"》— reinsertado en crudo rompe el JSON
 * y tumba el analisis entero. JSON.stringify da el escapado exacto.
 */
export function restaurar(
  texto: string,
  mapa: Map<string, string>,
  opciones: { enJson?: boolean } = {}
): string {
  let salida = texto;

  for (const [marcador, valor] of mapa) {
    const reemplazo = opciones.enJson ? JSON.stringify(valor).slice(1, -1) : valor;
    const desnudo = marcador.slice(1, -1); // PERSONA_1

    // Con corchetes primero; despues el token suelto, por si el modelo los
    // quito al reescribir la frase.
    salida = salida
      .replace(new RegExp(escaparRegExp(marcador), 'g'), reemplazo)
      .replace(new RegExp(`\\b${escaparRegExp(desnudo)}\\b`, 'g'), reemplazo);
  }

  return salida;
}
