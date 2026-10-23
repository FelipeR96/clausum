/**
 * Mide si el modelo esta entregando los campos de profundidad, y cuanto cuesta.
 *
 * El esquema los deja opcionales a proposito: lo que obliga al modelo a
 * llenarlos es el prompt. Eso significa que "esta en el esquema" no prueba
 * nada; hay que mirar analisis reales y contar. Este script hace eso y, de
 * paso, saca los tokens de salida para poder decidir si la profundidad vale
 * lo que cuesta antes de dejarla fija.
 *
 * No escribe nada. Solo lee.
 *
 * ── Uso (desde backend/functions) ───────────────────────────────────────
 *   node scripts/revisar-profundidad.cjs                 # ultimo analisis
 *   node scripts/revisar-profundidad.cjs --n=5           # los 5 ultimos
 *   node scripts/revisar-profundidad.cjs --texto         # imprime contenido
 *   node scripts/revisar-profundidad.cjs --email=otro@x.com
 *   node scripts/revisar-profundidad.cjs --project=clausum-dev
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const verTexto = args.includes('--texto');
const valor = (nombre, pordefecto) =>
  args.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=') ?? pordefecto;

const projectId = valor('project', process.env.GCLOUD_PROJECT ?? 'clausum-dev');
const email = valor('email', 'felipereinaleso96@gmail.com');
const cuantos = Number(valor('n', '1'));

function buscarClave() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const dir = path.join(os.homedir(), 'claves');
  if (!fs.existsSync(dir)) return null;
  for (const nombre of fs.readdirSync(dir)) {
    if (!nombre.toLowerCase().endsWith('.json')) continue;
    const ruta = path.join(dir, nombre);
    try {
      const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
      if (j.private_key && j.project_id === projectId) return ruta;
    } catch {
      // no es una clave de servicio; seguir buscando
    }
  }
  return null;
}

const clave = buscarClave();
if (!clave) {
  console.error(`\nNo encontre credenciales para ${projectId}.`);
  console.error('   Pon la ruta de la clave de servicio y repite:');
  console.error('   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\clave.json"\n');
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = clave;

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

function fechaDe(valor) {
  if (!valor) return null;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor === 'string') return new Date(valor);
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  return null;
}

/** "7 de 12 (58 %)" — o "0 de 12" sin porcentaje, que se lee peor. */
function cobertura(conCampo, total) {
  if (!total) return 'sin items';
  const pct = Math.round((conCampo / total) * 100);
  return `${conCampo} de ${total} (${pct} %)`;
}

function recortar(texto, n = 220) {
  if (!texto) return '—';
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  return limpio.length > n ? `${limpio.slice(0, n)}…` : limpio;
}

async function main() {
  console.log(`\nProyecto: ${projectId}`);
  console.log(`Usuario:  ${email}\n`);

  const user = await getAuth().getUserByEmail(email);

  // Sin orderBy a proposito: ordenar por createdAt junto al filtro de userId
  // pediria un indice compuesto. Con unas decenas de analisis sale mas
  // barato traerlos y ordenarlos aqui que mantener el indice.
  const snap = await db
    .collection('analyses')
    .where('userId', '==', user.uid)
    .where('status', '==', 'done')
    .get();

  if (snap.empty) {
    console.log('No hay analisis terminados para este usuario.\n');
    return;
  }

  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const cuando = (x) => fechaDe(x.completedAt ?? x.createdAt)?.getTime() ?? 0;

  // Se agrupa por CONTRATO, no por documento. Un analisis Pro escribe dos
  // documentos (uno 'analyze' con clausulas y veredicto, otro 'risks' con el
  // perfil) y mirar solo el mas reciente de los dos daba el cuadro a medias:
  // salia "0 clausulas, veredicto ausente" cuando el veredicto si estaba,
  // en el otro documento del mismo contrato.
  const porContrato = new Map();
  for (const d of todos) {
    const lista = porContrato.get(d.contractId) ?? [];
    lista.push(d);
    porContrato.set(d.contractId, lista);
  }

  const docs = [...porContrato.entries()]
    .map(([contractId, lista]) => {
      const analisis = lista.filter((d) => d.mode === 'analyze').sort((a, b) => cuando(b) - cuando(a))[0];
      const riesgos = lista.filter((d) => d.mode === 'risks').sort((a, b) => cuando(b) - cuando(a))[0];
      return { contractId, analisis, riesgos, ultimo: Math.max(...lista.map(cuando)) };
    })
    .sort((a, b) => b.ultimo - a.ultimo)
    .slice(0, cuantos);

  for (const grupo of docs) {
    const a = grupo.analisis ?? {};
    const riesgoDoc = grupo.riesgos;
    const fecha = fechaDe(a.completedAt ?? a.createdAt);
    console.log('═'.repeat(72));
    console.log(`contrato ${grupo.contractId}`);
    if (!grupo.analisis) {
      console.log('  (sin analisis general — solo se corrio el perfil de riesgo)');
    }
    console.log(`${a.id ?? '—'}   analyze   ${fecha ? fecha.toLocaleString('es-CO') : 's/f'}`);
    console.log('═'.repeat(72));
    console.log(`modelo        ${a.model ?? '?'}`);
    console.log(`tokens        ${a.tokensUsed ?? '?'}`);
    console.log(`duracion      ${a.processingMs ? `${Math.round(a.processingMs / 1000)} s` : '?'}`);
    console.log(`pais / tipo   ${a.country ?? '?'} / ${a.contractTypeId ?? 'sin clasificar'}`);
    console.log(`claridad      ${a.score ?? '?'}/100`);

    // ── veredicto global ────────────────────────────────────────────────
    if (a.favorability) {
      console.log(`\nVEREDICTO     ${a.favorability.verdict}`);
      console.log(`  favorece a  ${a.favorability.forWhom || '—'}`);
      console.log(`  porque      ${recortar(a.favorability.rationale, 300)}`);
    } else {
      console.log('\nVEREDICTO     AUSENTE  ← el modelo no lo devolvio');
    }

    // ── clausulas ───────────────────────────────────────────────────────
    const clauses = a.clauses ?? [];
    const conSignificado = clauses.filter((c) => c.meaning?.trim()).length;
    const conVeredicto = clauses.filter((c) => c.assessment).length;
    console.log(`\nCLAUSULAS     ${clauses.length}`);
    console.log(`  meaning     ${cobertura(conSignificado, clauses.length)}`);
    console.log(`  assessment  ${cobertura(conVeredicto, clauses.length)}`);
    const reparto = {};
    for (const c of clauses) reparto[c.assessment ?? 'sin evaluar'] = (reparto[c.assessment ?? 'sin evaluar'] ?? 0) + 1;
    console.log(`  reparto     ${Object.entries(reparto).map(([k, v]) => `${k}: ${v}`).join(' · ')}`);

    // ── riesgos: viven en su propio documento del mismo contrato ────────
    const risks = riesgoDoc?.risks ?? [];
    if (!riesgoDoc) {
      console.log('\nRIESGOS       sin perfil de riesgo para este contrato');
    } else {
      const conImpacto = risks.filter((r) => r.impact?.trim()).length;
      const conReco = risks.filter((r) => r.recommendation?.trim()).length;
      const conRedaccion = risks.filter((r) => r.suggestedWording?.trim()).length;
      console.log(`\nRIESGOS       ${risks.length}   (tokens ${riesgoDoc.tokensUsed ?? '?'})`);
      console.log(`  impact      ${cobertura(conImpacto, risks.length)}`);
      console.log(`  recommend.  ${cobertura(conReco, risks.length)}`);
      console.log(`  redaccion   ${cobertura(conRedaccion, risks.length)}`);
    }

    // ── contenido, para juzgar calidad y no solo presencia ──────────────
    if (verTexto) {
      console.log('\n' + '─'.repeat(72));
      console.log('MUESTRA DE CONTENIDO');
      console.log('─'.repeat(72));
      for (const c of clauses.slice(0, 3)) {
        console.log(`\n[${c.assessment ?? 'sin evaluar'}] ${c.title}`);
        console.log(`  dice:    ${recortar(c.content)}`);
        console.log(`  implica: ${recortar(c.meaning)}`);
      }
      for (const r of risks.slice(0, 3)) {
        console.log(`\n[${r.level}] ${r.title}`);
        console.log(`  impacto:   ${recortar(r.impact)}`);
        console.log(`  que pedir: ${recortar(r.recommendation)}`);
        console.log(`  redaccion: ${recortar(r.suggestedWording)}`);
      }
    }
    console.log();
  }
}

main().catch((e) => {
  console.error('\nFallo:', e?.message ?? e);
  process.exit(1);
});
