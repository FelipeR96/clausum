/**
 * Modelo de costo de DeepSeek por usuario Pro.
 *
 * Responde a una sola pregunta: si un usuario Pro agota su cuota (75
 * analisis y 30 comparaciones al mes), cuanto cuesta eso en DeepSeek y
 * cuanto queda de los 40.000 COP que paga.
 *
 * Las estimaciones de tokens son eso, estimaciones. El codigo ya guarda
 * `tokensUsed` en cada documento de analisis, asi que en cuanto corras
 * analisis reales puedes sustituirlas:
 *
 *   node scripts/cost-model.cjs --in=11500 --out=3000
 *
 * Uso:
 *   node scripts/cost-model.cjs
 *   node scripts/cost-model.cjs --trm=3300 --peak
 *   node scripts/cost-model.cjs --in=<tokens> --out=<tokens>
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((raw) => {
    const [k, v] = raw.replace(/^--/, '').split('=');
    return [k, v === undefined ? 'true' : v];
  })
);

// ── Precios DeepSeek (deepseek-flash / V4.1-Flash), USD por 1M tokens ──
// Fuente: api-docs.deepseek.com/quick_start/pricing, consultado 2026-10-15.
// Horario pico: 01:00-04:00 y 06:00-10:00 UTC, lunes a viernes.
const PRICES = {
  offPeak: { inputMiss: 0.15, inputHit: 0.003, output: 0.6 },
  peak: { inputMiss: 0.3, inputHit: 0.006, output: 1.2 },
};

const peak = args.peak === 'true';
const price = peak ? PRICES.peak : PRICES.offPeak;

// ── Parametros del producto ────────────────────────────────────────────
const TRM = Number(args.trm ?? 3219); // COP por USD
const PRO_COP = 40000; // precio mensual Pro
const QUOTA = { analyses: 75, comparisons: 30 };

// ── Estimacion de tokens ───────────────────────────────────────────────
// Espanol juridico: ~3,6 caracteres por token.
const CHARS_PER_TOKEN = 3.6;

// Contexto fijo que va en todas las llamadas:
//   plantilla de prompt + hasta 25 articulos del corpus.
//   Medido: 151 articulos, 204 caracteres de media.
const PROMPT_TOKENS = 1000;
const ARTICLES_TOKENS = Math.round((25 * 204 * 2) / CHARS_PER_TOKEN);
const FIXED_INPUT = PROMPT_TOKENS + ARTICLES_TOKENS;

const OUTPUT_ANALYSIS = 3000;
const OUTPUT_COMPARISON = 3500;

const SCENARIOS = [
  { name: 'Contrato corto (~5 pag.)', chars: 12000 },
  { name: 'Contrato tipico (~12 pag.)', chars: 30000 },
  { name: 'Contrato en el tope (100k car.)', chars: 100000 },
];

const usd = (n) => '$' + n.toFixed(4);
const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO') + ' COP';

function cost(inTokens, outTokens) {
  return (inTokens / 1e6) * price.inputMiss + (outTokens / 1e6) * price.output;
}

console.log('\nModelo de costo DeepSeek — Clausum Pro');
console.log('='.repeat(72));
console.log(`Modelo        : deepseek-flash (V4.1-Flash)`);
console.log(`Tarifa        : ${peak ? 'PICO' : 'valle'} — entrada $${price.inputMiss}/1M, salida $${price.output}/1M`);
console.log(`TRM           : ${TRM} COP/USD`);
console.log(`Cuota Pro     : ${QUOTA.analyses} analisis + ${QUOTA.comparisons} comparaciones al mes`);
console.log(`Ingreso Pro   : ${cop(PRO_COP)} = $${(PRO_COP / TRM).toFixed(2)} USD\n`);

if (args.in || args.out) {
  const inT = Number(args.in ?? FIXED_INPUT + 8333);
  const outT = Number(args.out ?? OUTPUT_ANALYSIS);
  const c = cost(inT, outT);
  console.log('Medicion real');
  console.log('-'.repeat(72));
  console.log(`  entrada ${inT} tok · salida ${outT} tok -> ${usd(c)} por analisis`);
  console.log(`  ${QUOTA.analyses} analisis -> ${usd(c * QUOTA.analyses)} (${cop(c * QUOTA.analyses * TRM)})`);
  console.log(`  = ${((c * QUOTA.analyses * TRM * 100) / PRO_COP).toFixed(1)}% del precio de la suscripcion\n`);
  process.exit(0);
}

const rows = [];
for (const s of SCENARIOS) {
  const docTokens = Math.round(s.chars / CHARS_PER_TOKEN);

  const analysisIn = FIXED_INPUT + docTokens;
  const analysisCost = cost(analysisIn, OUTPUT_ANALYSIS);

  // Una comparacion manda los dos contratos.
  const compareIn = FIXED_INPUT + docTokens * 2;
  const compareCost = cost(compareIn, OUTPUT_COMPARISON);

  const monthly =
    analysisCost * QUOTA.analyses + compareCost * QUOTA.comparisons;

  rows.push({
    escenario: s.name,
    'tok/analisis': analysisIn,
    'USD/analisis': usd(analysisCost),
    'USD/mes (cuota llena)': usd(monthly),
    'COP/mes': cop(monthly * TRM),
    '% del precio': ((monthly * TRM * 100) / PRO_COP).toFixed(1) + '%',
  });
}

console.table(rows);

const worst = SCENARIOS[SCENARIOS.length - 1];
const worstDoc = Math.round(worst.chars / CHARS_PER_TOKEN);
const worstMonthly =
  cost(FIXED_INPUT + worstDoc, OUTPUT_ANALYSIS) * QUOTA.analyses +
  cost(FIXED_INPUT + worstDoc * 2, OUTPUT_COMPARISON) * QUOTA.comparisons;

console.log('Lo que este modelo NO incluye:');
console.log('  - Reintentos. DEEPSEEK_MAX_RETRIES=3: una llamada que falla');
console.log('    dos veces y acierta a la tercera cuesta el triple.');
console.log('  - Firebase: Functions, Firestore, Storage, Cloud Tasks.');
console.log('  - La pasarela. Wompi cobra 2,65% + $700 COP + IVA sobre la');
console.log(`    comision: ~${cop(((PRO_COP * 0.0265 + 700) * 1.19))} de los ${cop(PRO_COP)}.`);
console.log('  - OCR de PDF escaneados: corre en tu servidor (tesseract),');
console.log('    no en DeepSeek, pero consume CPU y tiempo de Functions.\n');
console.log(
  `Peor caso modelado: ${cop(worstMonthly * TRM)} de DeepSeek sobre ${cop(PRO_COP)} ` +
    `de ingreso (${((worstMonthly * TRM * 100) / PRO_COP).toFixed(1)}%).\n`
);
