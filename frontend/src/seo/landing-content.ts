import type { FaqItem } from '@/seo/site';

export const HOME_FAQ: FaqItem[] = [
  {
    question: '¿Clausum sustituye a un abogado?',
    answer:
      'No. Clausum es una herramienta de apoyo que acelera la revisión inicial y señala riesgos potenciales. Para decisiones vinculantes o litigios, consulta siempre a un profesional del derecho.',
  },
  {
    question: '¿Qué incluye el plan gratuito?',
    answer:
      '3 análisis al mes, 1 comparación al mes, archivos de hasta 5 MB y hasta 10 contratos guardados. PDF digital o Word sin límite de páginas. No admitimos PDF escaneados en Free.',
  },
  {
    question: '¿Qué países cubre el contexto legal?',
    answer:
      'Actualmente el foco inicial es Colombia. La arquitectura permite ampliar el corpus normativo a otros países de Latinoamérica conforme se incorporen las leyes.',
  },
  {
    question: '¿Mis documentos están seguros?',
    answer:
      'Tus archivos se guardan cifrados, con reglas de acceso verificadas en el servidor: ningún otro usuario puede leerlos. Para analizarlos, el texto del documento se envía a un proveedor internacional de inteligencia artificial, sin tu nombre ni tus datos de pago; lo explicamos en detalle en la Política de Privacidad. No vendemos tus contratos ni los usamos para entrenar modelos.',
  },
  {
    question: '¿Qué formatos acepta?',
    answer:
      'PDF y DOCX digitales: sin límite de páginas. En Pro, PDF escaneados con OCR en las primeras 15 páginas; para contratos largos escaneados, mejor sube un PDF digital o Word.',
  },
];

export const ANALYZE_FAQ: FaqItem[] = [
  {
    question: '¿Cómo analizar un contrato con inteligencia artificial?',
    answer:
      'Sube tu PDF a Clausum, el sistema extrae el texto, clasifica el tipo de contrato y genera un resumen con cláusulas críticas, obligaciones, plazos y alertas de riesgo con referencias al marco normativo colombiano.',
  },
  {
    question: '¿Qué tipos de contrato puedo analizar?',
    answer:
      'Puedes analizar contratos de prestación de servicios, arrendamiento, confidencialidad, laborales, compraventa y otros documentos contractuales en PDF. El motor identifica el tipo y adapta el análisis.',
  },
  {
    question: '¿El análisis incluye referencias legales de Colombia?',
    answer:
      'Sí. Clausum cruza el contenido con un catálogo jurídico orientado a Colombia, citando normas y artículos relevantes cuando aplica, como Código Civil, Código de Comercio y Ley 527 de 1999.',
  },
  {
    question: '¿Cuánto tarda un análisis de contrato?',
    answer:
      'La mayoría de análisis se completan en menos de dos minutos, según el tamaño del PDF y la carga del sistema. Recibes un informe estructurado listo para revisar con tu equipo o asesor.',
  },
  {
    question: '¿Puedo analizar contratos gratis?',
    answer:
      'Sí. El plan Free incluye 3 análisis al mes sin tarjeta de crédito. Ideal para probar la plataforma con contratos reales de tu operación.',
  },
];

export const COMPARE_FAQ: FaqItem[] = [
  {
    question: '¿Cómo comparar dos versiones de un contrato?',
    answer:
      'Sube la versión original y la versión revisada en Clausum. La IA alinea el texto, resalta adiciones, eliminaciones y modificaciones, y evalúa si los cambios incrementan el riesgo legal.',
  },
  {
    question: '¿Qué cambios detecta la comparación contractual?',
    answer:
      'Detecta cambios en indemnizaciones, plazos, penalidades, jurisdicción, confidencialidad, terminación anticipada, garantías y cualquier cláusula que altere el equilibrio entre las partes.',
  },
  {
    question: '¿Sirve para negociaciones con contraparte?',
    answer:
      'Sí. Es ideal para revisar la versión que te devuelve la contraparte, identificar cláusulas nuevas o más restrictivas y preparar tu respuesta antes de firmar.',
  },
  {
    question: '¿Cuántas comparaciones incluye el plan gratuito?',
    answer:
      'El plan Free permite 1 comparación al mes. El plan Pro incluye hasta 30 comparaciones al mes para equipos que negocian contratos de forma recurrente.',
  },
  {
    question: '¿La comparación sustituye una revisión legal?',
    answer:
      'No. Clausum acelera la detección de diferencias y riesgos, pero la decisión final debe validarse con un abogado cuando el contrato tenga impacto económico o legal significativo.',
  },
];

export const RISKS_FAQ: FaqItem[] = [
  {
    question: '¿Qué riesgos legales detecta Clausum en un contrato?',
    answer:
      'Identifica indemnizaciones unilaterales, limitaciones de responsabilidad desproporcionadas, cláusulas de terminación abusivas, renuncias implícitas de derechos, vacíos en confidencialidad y plazos críticos omitidos.',
  },
  {
    question: '¿Cómo se priorizan las alertas de riesgo?',
    answer:
      'Cada alerta recibe un nivel de severidad (alto, medio, bajo) según el impacto potencial y la claridad de la cláusula. Las alertas críticas aparecen primero para facilitar la revisión.',
  },
  {
    question: '¿Las alertas incluyen fundamento normativo?',
    answer:
      'Cuando es posible, Clausum vincula la alerta con artículos del marco jurídico colombiano para que entiendas por qué una cláusula puede ser problemática.',
  },
  {
    question: '¿Puedo usar la detección de riesgos sin ser abogado?',
    answer:
      'Sí. Está pensada para founders, equipos de operaciones, compras y asesores que necesitan una primera lectura de riesgo antes de escalar a un profesional del derecho.',
  },
  {
    question: '¿La detección de riesgos consume mi cuota de análisis?',
    answer:
      'El perfil de riesgo se genera como parte del flujo de análisis contractual y cuenta dentro de tu cuota mensual de análisis según tu plan.',
  },
];

export type SeoContentBlock = {
  heading: string;
  paragraphs: string[];
};

export const ANALYZE_SEO_CONTENT: SeoContentBlock[] = [
  {
    heading: 'Análisis de contratos con IA para equipos en Colombia',
    paragraphs: [
      'Revisar contratos manualmente consume horas y aumenta el riesgo de pasar por alto una cláusula crítica. Clausum automatiza la lectura inicial: extrae el texto de tu PDF, identifica el tipo de acuerdo y entrega un informe accionable con obligaciones, plazos y puntos de atención.',
      'La plataforma combina procesamiento de lenguaje natural con contexto del marco normativo colombiano, lo que la convierte en una herramienta práctica para abogados independientes, áreas jurídicas internas y equipos de operaciones que firman contratos cada semana.',
    ],
  },
  {
    heading: 'Qué obtienes al analizar un contrato en Clausum',
    paragraphs: [
      'Resumen ejecutivo del acuerdo, desglose por cláusulas relevantes, alertas de riesgo priorizadas y referencias legales cuando aplican. Todo en un panel diseñado para decidir rápido si un contrato requiere negociación, ajustes o revisión por un especialista.',
    ],
  },
];

export const COMPARE_SEO_CONTENT: SeoContentBlock[] = [
  {
    heading: 'Comparación de contratos: controla cada versión antes de firmar',
    paragraphs: [
      'En negociaciones contractuales, un solo párrafo modificado puede cambiar por completo tu exposición legal. Clausum compara dos versiones del mismo documento y resalta visualmente cada diferencia, con contexto de riesgo para que no apruebes cambios a ciegas.',
      'Ideal para due diligence, renovaciones anuales, contratos marco con anexos y revisiones que devuelve la contraparte en PDF.',
    ],
  },
  {
    heading: 'Beneficios de comparar contratos con inteligencia artificial',
    paragraphs: [
      'Ahorra tiempo frente a la revisión línea por línea, reduce errores humanos en cambios sutiles y documenta qué se modificó entre versiones. Tu equipo gana trazabilidad y velocidad sin sacrificar rigor en la revisión inicial.',
    ],
  },
];

export const RISKS_SEO_CONTENT: SeoContentBlock[] = [
  {
    heading: 'Detección de riesgos contractuales antes de firmar',
    paragraphs: [
      'Un contrato aparentemente estándar puede incluir cláusulas que limitan tu capacidad de reclamar, extienden tu responsabilidad o facilitan la terminación unilateral en tu contra. Clausum escanea el documento y señala esos puntos con alertas claras y priorizadas.',
      'La detección de riesgos es especialmente útil en contratos de servicios, NDAs, arrendamientos comerciales y acuerdos con proveedores tecnológicos.',
    ],
  },
  {
    heading: 'Por qué automatizar la revisión de riesgos legales',
    paragraphs: [
      'Porque el costo de detectar tarde un riesgo contractual es mayor que el de revisarlo antes de firmar. Clausum te da una primera línea de defensa: identifica lo urgente, fundamenta la alerta y te permite escalar solo los casos que lo requieren con tu asesor legal.',
    ],
  },
];
