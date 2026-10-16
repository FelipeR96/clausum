import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_COUNTRY,
  LEGAL_ENTITY_NAME,
  type LegalSection,
} from './constants';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'aceptacion',
    title: '1. Aceptación de los términos',
    paragraphs: [
      `Estos Términos y Condiciones de Uso (los «Términos») regulan el acceso y uso del sitio web, la aplicación y los servicios de ${LEGAL_ENTITY_NAME} («Clausum», «nosotros»).`,
      'Al registrarse, iniciar sesión o utilizar cualquier funcionalidad, usted («Usuario») declara ser mayor de edad, tener capacidad legal para contratar y aceptar íntegramente estos Términos y la Política de Privacidad.',
      'Si no está de acuerdo, no debe usar el servicio.',
    ],
  },
  {
    id: 'servicio',
    title: '2. Descripción del servicio',
    paragraphs: [
      'Clausum es una plataforma de software como servicio (SaaS) que permite cargar contratos en formato PDF o Word (.docx), analizarlos con inteligencia artificial, comparar versiones y obtener alertas de riesgo con apoyo en un corpus normativo configurado (principalmente Colombia).',
      'El servicio incluye planes gratuitos y de pago con distintos límites de uso, descritos en la página de Precios. Las características pueden evolucionar; publicaremos cambios relevantes en el sitio o por correo.',
    ],
  },
  {
    id: 'no-asesoria',
    title: '3. No constituye asesoría legal',
    paragraphs: [
      'Clausum NO presta servicios de abogacía, representación judicial, consultoría jurídica vinculante ni dictamen legal. Los análisis, puntuaciones, alertas y referencias normativas son herramientas informativas generadas automáticamente.',
      'Usted es el único responsable de las decisiones que tome sobre sus contratos. Debe consultar a un abogado colegiado en Colombia antes de firmar, modificar o ejecutar obligaciones contractuales.',
      'Las referencias a leyes o artículos pueden estar incompletas, desactualizadas o mal interpretadas por la IA. No garantizamos vigencia normativa ni aplicabilidad al caso concreto.',
    ],
  },
  {
    id: 'cuenta',
    title: '4. Registro y cuenta',
    paragraphs: [
      'Debe proporcionar información veraz y mantenerla actualizada. Es responsable de la confidencialidad de sus credenciales y de toda actividad en su cuenta.',
      'Una cuenta por persona natural o jurídica autorizada. No puede compartir credenciales ni revender el acceso sin autorización escrita.',
      'Podemos suspender o cerrar cuentas que violen estos Términos, la ley o que representen riesgo de seguridad o fraude.',
    ],
  },
  {
    id: 'contenido',
    title: '5. Contenido del usuario y licencia',
    paragraphs: [
      'Usted conserva la propiedad de los documentos y datos que carga. Nos otorga una licencia limitada, no exclusiva y revocable para alojar, procesar, transmitir a proveedores de IA y mostrar dicho contenido únicamente para prestarle el servicio.',
      'Declara tener derecho a cargar los documentos y que su uso en Clausum no infringe derechos de terceros ni obligaciones de confidencialidad.',
      'No debe cargar contenido ilegal, malicioso, que vulnere derechos de autor sin autorización, ni datos excesivos sin necesidad para el análisis.',
    ],
  },
  {
    id: 'planes',
    title: '6. Planes, límites y pagos',
    paragraphs: [
      'El plan Free incluye límites mensuales de análisis y comparaciones, sin costo. El plan Pro amplía límites y funcionalidades según la página de Precios vigente.',
      'En Colombia, los precios del plan Pro se expresan en pesos colombianos (COP): referencia $35.000/mes o $350.000/año (pago único por doce meses de uso). En el resto de LATAM, los precios se expresan en dólares estadounidenses (USD): referencia USD 10/mes o USD 100/año.',
      'Los pagos en Colombia se procesan a través de Wompi (tarjeta, PSE, Nequi u otros medios habilitados). Los pagos en resto de LATAM se procesan a través de PayPal (tarjeta débito o crédito en USD). Clausum no almacena datos completos de medios de pago.',
      'Salvo que la ley exija lo contrario, los pagos por periodos iniciados no son reembolsables. Si cancela o no renueva, su cuenta volverá a los límites del plan Free al vencer el periodo pagado.',
      'Nos reservamos el derecho de modificar precios para futuros periodos, con aviso previo razonable.',
    ],
  },
  {
    id: 'uso-aceptable',
    title: '7. Uso aceptable',
    paragraphs: ['Está prohibido:'],
    bullets: [
      'Intentar acceder a datos o cuentas de otros usuarios.',
      'Realizar ingeniería inversa, scraping masivo o sobrecargar la infraestructura.',
      'Usar el servicio para fines ilícitos o para elaborar documentos fraudulentos.',
      'Eludir límites de plan o controles técnicos.',
      'Revender o sublicenciar el servicio sin autorización.',
    ],
  },
  {
    id: 'propiedad',
    title: '8. Propiedad intelectual de Clausum',
    paragraphs: [
      'El software, diseño, marca Clausum, textos del sitio y corpus legal curado (salvo textos normativos oficiales de dominio público o licenciados) son propiedad de Clausum o sus licenciantes. No se concede ningún derecho sobre ellos salvo el uso permitido por estos Términos.',
    ],
  },
  {
    id: 'disponibilidad',
    title: '9. Disponibilidad y modificaciones',
    paragraphs: [
      'Procuramos alta disponibilidad pero no garantizamos servicio ininterrumpido. Puede haber mantenimiento, fallos de terceros (Firebase, DeepSeek, Wompi, PayPal) o fuerza mayor.',
      'Podemos modificar, suspender o discontinuar funciones con aviso cuando sea razonablemente posible.',
    ],
  },
  {
    id: 'limitacion',
    title: '10. Limitación de responsabilidad',
    paragraphs: [
      'EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY COLOMBIANA, CLAUSUM NO SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, LUCRO CESANTE, PÉRDIDA DE DATOS O DAÑOS DERIVADOS DE DECISIONES TOMADAS CON BASE EN EL ANÁLISIS.',
      'Nuestra responsabilidad total acumulada frente a usted por cualquier reclamación relacionada con el servicio en los últimos doce (12) meses no excederá el monto que haya pagado a Clausum en ese periodo, o cincuenta mil pesos colombianos (COP $50.000) o su equivalente en USD si usa el plan Free.',
      'Nada en estos Términos limita responsabilidad por dolo o culpa grave cuando la ley no lo permita.',
    ],
  },
  {
    id: 'indemnidad',
    title: '11. Indemnidad',
    paragraphs: [
      'Usted indemnizará y mantendrá indemne a Clausum frente a reclamaciones de terceros derivadas de su uso del servicio, del contenido que cargue o del incumplimiento de estos Términos, en la medida permitida por la ley.',
    ],
  },
  {
    id: 'ley',
    title: '12. Ley aplicable y jurisdicción',
    paragraphs: [
      `Estos Términos se rigen por las leyes de la República de ${LEGAL_COUNTRY}.`,
      'Cualquier controversia se someterá a los jueces competentes de Colombia, salvo normas imperativas de protección al consumidor que dispongan otro fuero.',
      'Antes de acciones judiciales, le invitamos a contactarnos para buscar solución amistosa.',
    ],
  },
  {
    id: 'contacto',
    title: '13. Contacto',
    paragraphs: [`Consultas sobre estos Términos: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
