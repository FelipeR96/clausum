/**
 * Genera un informe PDF de muestra, sin tocar Firestore ni desplegar nada.
 *
 * Existe para poder MIRAR el diseño antes de que lo vea un cliente: un PDF
 * escrito a ciegas se descubre feo cuando ya esta en manos de alguien.
 *
 * Compila el modulo del informe con esbuild (ya es dependencia) y lo llama
 * con datos inventados que cubren los casos dificiles: riesgos de los tres
 * niveles, textos largos, citas, recomendaciones y acentos.
 *
 * Uso (desde backend/functions):
 *   node scripts/previsualizar-informe.cjs
 */
const path = require('node:path');
const fs = require('node:fs');
// esbuild se carga DENTRO de la funcion, no al importar el archivo.
// Motivo: esbuild es devDependency y en el contenedor de Cloud Run no
// existe. Si algo llega a cargar este archivo alli, un require en la
// cabecera tumbaria el arranque entero; dentro de la funcion no se
// ejecuta nunca salvo que alguien corra la previsualizacion a mano.

const raiz = path.join(__dirname, '..');
// Fuera de lib/ a proposito: Firebase empaqueta lib/ al desplegar, y este
// compilado pide @clausum/shared, que no esta declarado como dependencia.
// Dentro del contenedor eso tumba el arranque de TODAS las funciones.
// node_modules no se empaqueta nunca, asi que aqui no estorba.
const salidaJs = path.join(raiz, 'node_modules', '.cache', 'clausum', 'informe-pdf.preview.cjs');

const esbuild = require('esbuild');

fs.mkdirSync(path.dirname(salidaJs), { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(raiz, 'src', 'services', 'informe-pdf.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: salidaJs,
  external: ['pdfkit', '@clausum/shared'],
  logLevel: 'error',
});

const { renderAnalysisPdf } = require(salidaJs);

const contrato = {
  id: 'muestra',
  title: 'Promesa de compraventa de bien inmueble urbano',
  fileName: 'promesa-compraventa-apto-501.pdf',
};

const analisis = {
  summary:
    'La promesa fija la venta de un apartamento en Bogotá por $420.000.000, con una cuota inicial del 30 % pagadera en ocho días y el saldo contra escritura. El documento está redactado con claridad en lo esencial, pero concentra las consecuencias del incumplimiento en el comprador: la cláusula penal del 20 % opera a favor del vendedor sin contrapartida equivalente, y el plazo para escriturar no fija fecha cierta sino que queda sujeto a que el vendedor obtenga el paz y salvo de administración.',
  parties: ['CONSTRUCTORA ANDINA S.A.S.', 'María Fernanda Ríos Duarte'],
  metadata: {
    effectiveDate: '15 de octubre de 2026',
    contractValue: '$420.000.000 COP',
    jurisdiction: 'Bogotá D.C., Colombia',
    renewal: 'No aplica',
  },
  score: 72,
  favorability: {
    verdict: 'desfavorable',
    forWhom: 'la constructora (promitente vendedora)',
    rationale:
      'La cláusula penal del 20 % y la falta de fecha cierta para escriturar concentran en la compradora el costo de cualquier demora, incluso de las que no depende de ella.',
  },
  clauses: [
    {
      title: 'Precio y forma de pago',
      content:
        'El precio se pacta en $420.000.000, pagaderos así: 30 % como cuota inicial dentro de los ocho días siguientes a la firma, y el 70 % restante contra la firma de la escritura pública.',
      importance: 'high',
      excerpt: 'El saldo se pagará contra la firma de la escritura pública de compraventa.',
      meaning:
        'Entregas $126.000.000 en los primeros ocho días y los otros $294.000.000 el día de la escritura. Hasta ese día el apartamento sigue siendo del vendedor, así que ese primer pago queda expuesto a lo que pase con el inmueble mientras tanto.',
      assessment: 'estandar',
    },
    {
      title: 'Cláusula penal',
      content:
        'El incumplimiento de cualquiera de las obligaciones genera una pena equivalente al 20 % del valor total del contrato, a favor de la parte cumplida.',
      importance: 'high',
      excerpt: 'una pena equivalente al veinte por ciento (20%) del valor total',
      meaning:
        'Si te retiras o te atrasas, pierdes $84.000.000. Como antes de la escritura el único que ha pagado algo eres tú, en la práctica la pena la puedes perder de inmediato, mientras que a la constructora tendrías que demandarla para cobrársela.',
      assessment: 'desfavorable',
    },
    {
      title: 'Entrega material del inmueble',
      content:
        'La entrega se hará dentro de los cinco días hábiles siguientes a la escrituración, con paz y salvo de servicios públicos y administración.',
      importance: 'medium',
      meaning:
        'Recibes las llaves hasta cinco días hábiles después de haber pagado todo. Si la entrega se retrasa, el contrato no dice qué pasa, así que no tendrías cómo cobrar esos días.',
      assessment: 'estandar',
    },
    {
      title: 'Gastos notariales',
      content: 'Los gastos de escrituración se dividen por partes iguales entre promitente vendedor y promitente comprador.',
      importance: 'low',
    },
  ],
  lawReferences: [
    {
      lawId: 'co_cc_1611',
      codeName: 'Código Civil (Colombia)',
      article: '1611',
      relevance: 'Requisitos de validez de la promesa de contrato: debe constar por escrito y fijar plazo o condición que determine la época de celebración.',
    },
    {
      lawId: 'co_cc_1592',
      codeName: 'Código Civil (Colombia)',
      article: '1592',
      relevance: 'La cláusula penal es una avaluación anticipada de perjuicios y puede reducirse cuando resulta manifiestamente excesiva.',
    },
  ],
};

const riesgos = {
  summary:
    'Se identificaron seis puntos de atención. Dos de ellos pueden costarle dinero a la compradora incluso cumpliendo, y uno hace que la fecha de escrituración quede fuera de su control.',
  score: 61,
  risks: [
    {
      level: 'high',
      title: 'La fecha de escrituración no es cierta y depende del vendedor',
      description:
        'La promesa sujeta la escrituración a que el vendedor obtenga el paz y salvo de administración, sin fecha límite. El artículo 1611 del Código Civil exige que la promesa fije plazo o condición que determine la época de celebración; una condición que depende solo de una de las partes puede hacer la promesa ineficaz y, mientras tanto, deja el dinero de la cuota inicial inmovilizado sin término.',
      excerpt: 'una vez el promitente vendedor obtenga el paz y salvo de la administración',
      impact:
        'Tus $126.000.000 de cuota inicial quedan entregados sin fecha de devolución ni de escrituración. Si la constructora se demora seis meses en el paz y salvo, no incumple nada: el contrato no le fija plazo. Y si al final la promesa se declara ineficaz por no cumplir el artículo 1611, recuperar ese dinero pasa por un proceso judicial.',
      recommendation:
        'No firmes sin fecha y notaría concretas. Pide que el paz y salvo quede como obligación del vendedor con fecha tope anterior a la escritura, y que si no lo consigue, te devuelvan la cuota inicial con intereses dentro de los cinco días siguientes.',
      suggestedWording:
        'La escritura pública se otorgará el día __ de __ de 2026 en la Notaría __ del Círculo de Bogotá. El promitente vendedor deberá obtener el paz y salvo de administración a más tardar cinco (5) días hábiles antes de esa fecha. Si no lo obtiene, el promitente comprador podrá terminar la promesa y el promitente vendedor le restituirá la cuota inicial, más intereses a la tasa máxima legal, dentro de los cinco (5) días hábiles siguientes.',
    },
    {
      level: 'high',
      title: 'La cláusula penal del 20 % no tiene contrapartida real',
      description:
        'La pena se pacta a favor de «la parte cumplida», pero el único pago relevante antes de la escritura lo hace la compradora. En la práctica, si ella incumple pierde el 20 %; si incumple el vendedor, ella tiene que demandar para cobrarlo.',
      excerpt: 'una pena equivalente al veinte por ciento (20%) del valor total',
      impact:
        'La pena son $84.000.000 sobre un precio de $420.000.000. Tú ya tienes $126.000.000 en manos del vendedor, así que él puede retener la pena de ese dinero sin pedirle permiso a nadie. Para cobrarle la misma pena a él tendrías que demandarlo y esperar sentencia.',
      recommendation:
        'Pide simetría en el cobro, no en la redacción: que la cuota inicial se deposite en una fiducia o encargo hasta la escrituración, o que la pena a cargo del vendedor se pueda descontar de lo que ya le entregaste.',
      suggestedWording:
        'La cuota inicial se consignará en un encargo fiduciario a nombre de ambas partes y solo se girará al promitente vendedor en el momento del otorgamiento de la escritura. La cláusula penal a cargo de cualquiera de las partes se hará efectiva sobre los recursos del encargo fiduciario.',
    },
    {
      level: 'medium',
      title: 'No se menciona el estudio de títulos',
      description:
        'El documento no condiciona la compra a que el inmueble esté libre de gravámenes, embargos o limitaciones de dominio. Sin esa condición, la compradora asume el riesgo de descubrirlos después de pagar.',
      impact:
        'Si el apartamento tiene una hipoteca, un embargo o una afectación a vivienda familiar que aparezca después de la escritura, el problema es tuyo: pagaste $420.000.000 por un inmueble que no puedes vender ni hipotecar sin resolver eso primero.',
      recommendation:
        'Pide el certificado de tradición y libertad de los últimos diez años antes de pagar la cuota inicial, y que quede como condición suspensiva del contrato.',
      suggestedWording:
        'El presente contrato queda sujeto a la condición suspensiva de que el certificado de tradición y libertad del inmueble, con fecha no anterior a diez (10) días a la escrituración, no registre hipotecas, embargos, patrimonio de familia, afectación a vivienda familiar ni limitación alguna al dominio.',
    },
    {
      level: 'medium',
      title: 'La entrega material queda después de la escrituración',
      description:
        'Se pagará el 100 % del precio antes de tener el inmueble. Es habitual, pero conviene amarrar la entrega con una fecha y una consecuencia si se retrasa.',
      excerpt: 'dentro de los cinco (5) días hábiles siguientes a la escrituración',
      impact:
        'Son cinco días hábiles, hasta una semana en calendario, en los que ya pagaste todo y todavía no puedes entrar. Si se alarga, el contrato no prevé ninguna consecuencia para el vendedor.',
      recommendation:
        'Pide una sanción por día de retraso en la entrega, aunque sea modesta: sin consecuencia, el plazo de cinco días es solo una intención.',
    },
    {
      level: 'low',
      title: 'Gastos notariales divididos por partes iguales',
      description: 'Es lo acostumbrado y no representa desventaja para ninguna de las partes.',
    },
    {
      level: 'low',
      title: 'No hay cláusula de solución de controversias',
      description:
        'A falta de pacto se acude a la justicia ordinaria. No es un defecto, pero un pacto arbitral o una conciliación previa suele ser más rápido.',
    },
  ],
};

(async () => {
  const pdf = await renderAnalysisPdf(contrato, analisis, riesgos);
  const destino = path.join(raiz, 'informe-muestra.pdf');
  fs.writeFileSync(destino, pdf);
  console.log(`\nListo: ${destino}`);
  console.log(`${(pdf.length / 1024).toFixed(0)} kB\n`);
})().catch((e) => {
  console.error('\nFallo:', e?.message ?? e);
  process.exit(1);
});
