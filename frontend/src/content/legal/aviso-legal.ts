import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY_NAME, type LegalSection } from './constants';

export const LEGAL_NOTICE_SECTIONS: LegalSection[] = [
  {
    id: 'titular',
    title: '1. Titular del sitio',
    paragraphs: [
      `El sitio web y la aplicación ${LEGAL_ENTITY_NAME} («Clausum») son operados por el titular del servicio, con dirección de contacto en ${LEGAL_CONTACT_EMAIL}.`,
      'Clausum ofrece herramientas de análisis contractual asistido por inteligencia artificial para usuarios en Colombia y, con funcionalidades limitadas, en otros países donde no se dispone de corpus legal local.',
      'Puede solicitar los datos completos de identificación del titular escribiendo a la dirección indicada.',
    ],
  },
  {
    id: 'descargo',
    title: '2. Descargo de responsabilidad',
    paragraphs: [
      'LA INFORMACIÓN, ANÁLISIS, PUNTUACIONES, ALERTAS, COMPARACIONES Y REFERENCIAS NORMATIVAS PROPORCIONADAS POR CLAUSUM TIENEN CARÁCTER MERAMENTE INFORMATIVO.',
      'NO CONSTITUYEN ASESORÍA LEGAL, OPINIÓN JURÍDICA, DICTAMEN PROFESIONAL NI RECOMENDACIÓN PARA CELEBRAR, MODIFICAR, RECHAZAR O EJECUTAR CONTRATO ALGUNO.',
      'Clausum no es un bufete de abogados. El uso de la plataforma no crea una relación abogado-cliente, no genera secreto profesional y no sustituye el juicio de un profesional del derecho.',
      'Usted debe verificar de forma independiente cualquier resultado antes de tomar decisiones con efectos jurídicos o económicos.',
    ],
  },
  {
    id: 'ia-limitaciones',
    title: '3. Qué puede fallar en un análisis automático',
    paragraphs: [
      'Preferimos ser concretos en lugar de escudarnos en una advertencia genérica. Estas son las formas reales en que un resultado puede estar equivocado:',
    ],
    bullets: [
      'Omisión: el sistema puede no detectar una cláusula abusiva, una renuncia de derechos o una obligación onerosa que sí está en el documento.',
      'Invención: puede citar un artículo que no existe, atribuir a una norma un contenido que no tiene, o afirmar con seguridad algo incorrecto. Esto ocurre con los modelos de lenguaje y no siempre es detectable a simple vista.',
      'Desactualización: el corpus normativo integrado es curado y limitado. No cubre todo el ordenamiento jurídico, y una norma puede haber sido modificada o derogada después de su incorporación.',
      'Falta de contexto: el sistema lee el documento, no su negocio. Desconoce las negociaciones previas, la relación entre las partes, los acuerdos verbales y las circunstancias que a menudo determinan si una cláusula es razonable.',
      'Variabilidad: dos ejecuciones sobre el mismo documento pueden producir resultados distintos en su redacción o en el orden de los hallazgos.',
      'Calidad del documento: en documentos escaneados, el reconocimiento de texto puede introducir errores de lectura que arrastren el análisis.',
    ],
  },
  {
    id: 'uso-responsable',
    title: '4. Cómo usar Clausum de forma responsable',
    paragraphs: [
      'Trate el resultado como un primer par de ojos que no se cansa, no como un dictamen.',
      'Úselo para orientarse, preparar una conversación con su abogado, no pasar por alto lo evidente y llegar mejor informado a una negociación. No lo use como única base para firmar, renunciar a un derecho, iniciar o desistir de un litigio, ni para acreditar cumplimiento normativo ante un tercero.',
      'Si un hallazgo le parece importante, verifique el texto de la cláusula en su propio documento y la norma citada en su fuente oficial antes de actuar.',
    ],
  },
  {
    id: 'documentos',
    title: '5. Documentos y confidencialidad',
    paragraphs: [
      'Usted es responsable de valorar la sensibilidad de los documentos que carga. Aunque aplicamos medidas de seguridad, ningún sistema en línea es completamente invulnerable.',
      'Para producir el análisis, el texto de sus documentos se transmite a un proveedor internacional de inteligencia artificial ubicado fuera de Colombia. Las condiciones de esa transmisión se detallan en la Política de Privacidad y conviene leerlas antes de cargar material sensible.',
      'No cargue información cuya divulgación esté prohibida por ley, por contrato o por una política interna, sin contar con las autorizaciones correspondientes.',
    ],
  },
  {
    id: 'enlaces',
    title: '6. Enlaces externos',
    paragraphs: [
      'El servicio puede enlazar a sitios de terceros, como fuentes normativas oficiales o pasarelas de pago. Clausum no controla ni respalda su contenido, y el acceso a ellos se rige por sus propias condiciones.',
    ],
  },
  {
    id: 'propiedad',
    title: '7. Propiedad intelectual',
    paragraphs: [
      'Queda prohibida la reproducción, distribución o explotación comercial del software, el diseño o los contenidos propietarios de Clausum sin autorización escrita.',
      'Los textos de leyes y normas oficiales se rigen por el régimen de dominio público que les corresponda según su fuente; el corpus curado, su selección y su organización son propiedad de Clausum.',
    ],
  },
  {
    id: 'contacto',
    title: '8. Contacto',
    paragraphs: [`Para consultas sobre este aviso: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
