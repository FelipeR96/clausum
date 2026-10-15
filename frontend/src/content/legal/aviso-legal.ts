import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, type LegalSection } from './constants';

export const LEGAL_NOTICE_SECTIONS: LegalSection[] = [
  {
    id: 'titular',
    title: '1. Titular del sitio',
    paragraphs: [
      `El sitio web y la aplicación ${LEGAL_ENTITY_NAME} («Clausum») son operados por el titular del servicio Clausum, con contacto en ${LEGAL_CONTACT_EMAIL}.`,
      'Clausum ofrece herramientas de análisis contractual asistido por inteligencia artificial para usuarios en Colombia y, en funcionalidades limitadas, otros países sin corpus legal local.',
    ],
  },
  {
    id: 'descargo',
    title: '2. Descargo de responsabilidad (disclaimer)',
    paragraphs: [
      'LA INFORMACIÓN, ANÁLISIS, PUNTUACIONES, ALERTAS, COMPARACIONES Y REFERENCIAS NORMATIVAS PROPORCIONADAS POR CLAUSUM TIENEN CARÁCTER MERAMENTE INFORMATIVO Y EDUCATIVO.',
      'NO CONSTITUYEN ASESORÍA LEGAL, OPINIÓN JURÍDICA, DICTAMEN PROFESIONAL NI RECOMENDACIÓN PARA CELEBRAR, MODIFICAR O EJECUTAR CONTRATOS.',
      'Clausum no es un bufete de abogados ni sustituye el juicio de un profesional del derecho colegiado. Usted debe verificar independientemente cualquier resultado antes de tomar decisiones con efectos legales o económicos.',
    ],
  },
  {
    id: 'ia-limitaciones',
    title: '3. Limitaciones de la inteligencia artificial',
    paragraphs: [
      'Los modelos de lenguaje pueden omitir cláusulas, malinterpretar contexto, citar normas de forma imprecisa o no detectar riesgos relevantes.',
      'El corpus legal integrado es curado y limitado; no cubre la totalidad del ordenamiento jurídico colombiano ni garantiza vigencia actualizada de cada artículo.',
      'Los resultados pueden variar entre ejecuciones. No debe confiar exclusivamente en Clausum para cumplimiento normativo, debida diligencia o litigios.',
    ],
  },
  {
    id: 'documentos',
    title: '4. Documentos y confidencialidad',
    paragraphs: [
      'Usted es responsable de la clasificación y sensibilidad de los documentos que carga. Aunque aplicamos medidas de seguridad, ningún sistema en línea es completamente invulnerable.',
      'No cargue información cuya divulgación esté prohibida por ley, contrato o política interna sin las autorizaciones correspondientes.',
    ],
  },
  {
    id: 'enlaces',
    title: '5. Enlaces externos',
    paragraphs: [
      'El servicio puede enlazar a sitios de terceros (por ejemplo, fuentes normativas oficiales o pasarelas de pago). Clausum no controla ni respalda el contenido de esos sitios.',
    ],
  },
  {
    id: 'propiedad',
    title: '6. Propiedad intelectual',
    paragraphs: [
      'Queda prohibida la reproducción, distribución o explotación comercial del software, diseño o contenidos propietarios de Clausum sin autorización escrita.',
      'Los textos de leyes y normas oficiales pueden estar sujetos a regímenes de dominio público según la fuente; el corpus curado y su organización son propiedad de Clausum.',
    ],
  },
  {
    id: 'contacto',
    title: '7. Contacto',
    paragraphs: [`Para consultas sobre este aviso: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
