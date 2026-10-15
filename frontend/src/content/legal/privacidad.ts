import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_COUNTRY,
  LEGAL_ENTITY_NAME,
  type LegalSection,
} from './constants';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: '1. Responsable del tratamiento',
    paragraphs: [
      `${LEGAL_ENTITY_NAME} (en adelante, «Clausum», «nosotros» o «el Responsable») es el responsable del tratamiento de los datos personales que usted (el «Titular» o «Usuario») nos proporcione al registrarse, usar la plataforma o contactarnos.`,
      `Clausum opera el servicio de análisis contractual con inteligencia artificial orientado principalmente a usuarios en ${LEGAL_COUNTRY}. Para ejercer sus derechos o formular consultas sobre privacidad puede escribir a ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: 'alcance',
    title: '2. Alcance y marco normativo',
    paragraphs: [
      'Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos, compartimos y protegemos sus datos personales cuando utiliza el sitio web, la aplicación y los servicios asociados de Clausum.',
      'El tratamiento se realiza conforme a la Constitución Política de Colombia (artículo 15), la Ley 1581 de 2012, el Decreto 1377 de 2013, las circulares de la Superintendencia de Industria y Comercio (SIC) aplicables y demás normas que regulen la protección de datos personales en Colombia.',
      'Al crear una cuenta o utilizar Clausum, usted declara haber leído esta política. Cuando la ley exija autorización previa, expresa e informada, la solicitaremos de forma separada antes de tratar datos sensibles o para finalidades no incluidas en las descritas aquí.',
    ],
  },
  {
    id: 'datos',
    title: '3. Datos personales que tratamos',
    paragraphs: ['Recopilamos las siguientes categorías de datos, según su interacción con el servicio:'],
    bullets: [
      'Datos de identificación y contacto: nombre, correo electrónico, foto de perfil (si la sube), identificador de cuenta.',
      'Datos de autenticación: credenciales gestionadas por Firebase Authentication (Google LLC); si usa inicio de sesión con Google, recibimos la información que ese proveedor comparta según su configuración.',
      'Datos de contrato y documentos: archivos PDF o Word (.docx) que usted sube, metadatos asociados (nombre del archivo, fechas, tipo de contrato seleccionado) y resultados del análisis (resúmenes, cláusulas, alertas, referencias normativas).',
      'Datos de uso y facturación: plan contratado, región de facturación (Colombia o LATAM), consumo mensual (análisis, comparaciones), historial de actividad en la cuenta, registros de pago procesados por Wompi (Colombia) o PayPal (resto de LATAM); no almacenamos números completos de tarjeta.',
      'Datos técnicos: dirección IP, tipo de navegador, identificadores de sesión, registros de errores y eventos de seguridad necesarios para operar el servicio.',
      'Comunicaciones: mensajes que nos envíe a soporte y, si lo autoriza, preferencias de novedades por correo.',
    ],
  },
  {
    id: 'finalidades',
    title: '4. Finalidades del tratamiento',
    paragraphs: ['Tratamos sus datos para las siguientes finalidades:'],
    bullets: [
      'Crear y administrar su cuenta de usuario.',
      'Prestar el servicio de análisis, comparación y detección de riesgos sobre contratos.',
      'Procesar documentos mediante extracción de texto, OCR (cuando aplique) y envío controlado a proveedores de modelos de lenguaje (IA) para generar resultados.',
      'Consultar el corpus legal configurado y enriquecer el análisis con referencias normativas de Colombia.',
      'Gestionar planes Free y Pro, límites de uso, pagos y facturación a través de Wompi (Colombia) o PayPal (resto de LATAM).',
      'Enviar notificaciones operativas (confirmación de análisis, alertas de cuenta, cambios en el servicio).',
      'Atender solicitudes de soporte y ejercicio de derechos del titular.',
      'Cumplir obligaciones legales, resolver disputas y proteger la seguridad de la plataforma.',
      'Con su consentimiento opcional: enviar novedades sobre producto e inteligencia artificial aplicada a contratos.',
    ],
  },
  {
    id: 'ia',
    title: '5. Uso de inteligencia artificial y transferencia internacional de datos',
    paragraphs: [
      'Para generar los análisis, Clausum transmite a un proveedor de modelos de lenguaje el texto extraído del documento que usted sube. Este es el punto más relevante de esta política y conviene que lo lea con atención: el contenido de sus contratos sale del país.',
      'Nuestro subencargado actual para esta finalidad es DeepSeek, cuya infraestructura se encuentra fuera de Colombia. La transmisión se limita al texto necesario para la operación que usted solicita (analizar, detectar riesgos o comparar) junto con los artículos normativos que acompañan la consulta. No se envían su nombre, su correo electrónico ni sus datos de facturación.',
      'Esto constituye una transferencia internacional de datos personales en el sentido de la Ley 1581 de 2012. Al aceptar esta política y utilizar las funciones de análisis, usted autoriza de forma expresa e informada dicha transferencia. Si no desea que el contenido de sus documentos sea transmitido fuera de Colombia, no utilice las funciones de análisis: no es posible prestarlas sin esa transmisión.',
      'En relación con el entrenamiento de modelos: Clausum no vende sus contratos, no los utiliza para entrenar modelos propios ni los comparte con terceros distintos de los subencargados descritos en esta política. Las condiciones bajo las cuales el proveedor de inteligencia artificial trata la información que recibe se rigen por los términos de servicio de dicho proveedor, que pueden cambiar sin nuestra intervención; cuando esas condiciones cambien de forma relevante, actualizaremos esta política e informaremos a los usuarios.',
      'Los resultados generados por IA pueden contener imprecisiones. Clausum no garantiza exactitud jurídica ni sustituye el criterio de un abogado (véase Aviso legal).',
      'También utilizamos infraestructura de Google Firebase (autenticación, base de datos Firestore, almacenamiento de archivos y funciones en la nube), con centros de datos que pueden estar fuera de Colombia. Google actúa como encargado del tratamiento según sus propios términos y certificaciones.',
      'Puede solicitar en cualquier momento la lista actualizada de subencargados escribiendo a la dirección de contacto indicada al final de esta política.',
    ],
  },
  {
    id: 'autorizacion',
    title: '6. Autorización y bases de legitimación',
    paragraphs: [
      'Al registrarse y aceptar los Términos y esta Política, usted autoriza el tratamiento de sus datos para las finalidades descritas, salvo aquellas que requieran consentimiento adicional (por ejemplo, boletín informativo).',
      'En documentos que usted sube pueden aparecer datos personales de terceros (empleados, contrapartes). Usted declara contar con legitimación para cargarlos y que nos instruye a tratarlos únicamente para prestarle el servicio.',
      'Puede revocar su autorización o solicitar la supresión cuando la ley lo permita, entendiendo que ello puede impedir continuar usando Clausum.',
    ],
  },
  {
    id: 'derechos',
    title: '7. Derechos del titular (Habeas Data)',
    paragraphs: [
      'Como titular de datos personales en Colombia, usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos; a solicitar prueba de la autorización otorgada; a revocarla; a acceder de forma gratuita a sus datos; y a presentar quejas ante la Superintendencia de Industria y Comercio (SIC).',
      `Para ejercer estos derechos, envíe una solicitud a ${LEGAL_CONTACT_EMAIL} indicando su nombre, correo registrado, derecho que desea ejercer y descripción clara. Responderemos en los plazos legales (habitualmente hasta quince (15) días hábiles, prorrogables según la ley).`,
      'Podemos solicitar información adicional para verificar su identidad antes de atender solicitudes sensibles (por ejemplo, eliminación de cuenta).',
    ],
  },
  {
    id: 'conservacion',
    title: '8. Plazos de conservación y eliminación de la cuenta',
    paragraphs: [
      'Conservamos sus datos mientras mantenga una cuenta activa o sea necesario para prestar el servicio, cumplir obligaciones legales o resolver reclamaciones.',
      'Cuando usted elimina su cuenta desde Ajustes, el proceso se ejecuta en este orden: primero cancelamos su suscripción ante la pasarela de pago, para que no se genere ningún cobro posterior; después eliminamos su perfil, sus contratos y los archivos que subió, sus análisis, comparaciones, alertas e historial de actividad.',
      'Hay una excepción, y queremos que quede explícita: los comprobantes de pago NO se eliminan. La normativa tributaria y contable obliga a conservar los soportes de facturación, y esa obligación prevalece sobre la supresión. Lo que hacemos es desvincularlos de usted: sustituimos su identificador de usuario por un código irreversible, de modo que el registro contable subsiste sin seguir siendo un dato personal atribuible a su persona. No conservamos su nombre, su correo ni el contenido de sus documentos asociados a esos comprobantes.',
      'Antes de eliminar su cuenta puede descargar una copia de todos sus datos desde Ajustes → Seguridad → Descargar mis datos.',
      'Las copias de respaldo técnicas pueden retener información durante un período adicional limitado hasta su rotación normal. Los logs técnicos y de seguridad se conservan por períodos limitados acordes a buenas prácticas.',
    ],
  },
  {
    id: 'seguridad',
    title: '9. Medidas de seguridad',
    paragraphs: [
      'Implementamos medidas técnicas y organizativas razonables: autenticación segura, reglas de acceso en Firestore y Storage (cada usuario solo accede a sus archivos), comunicación cifrada (HTTPS), y restricción de claves API en el servidor.',
      'Ningún sistema es 100 % seguro. Usted es responsable de mantener la confidencialidad de su contraseña y de notificarnos accesos no autorizados.',
    ],
  },
  {
    id: 'menores',
    title: '10. Menores de edad',
    paragraphs: [
      'Clausum no está dirigido a menores de dieciocho (18) años. No recopilamos intencionalmente datos de menores. Si detectamos una cuenta de menor, podremos eliminarla.',
    ],
  },
  {
    id: 'cambios',
    title: '11. Cambios a esta política',
    paragraphs: [
      'Podemos actualizar esta Política para reflejar cambios legales o del servicio. Publicaremos la versión vigente en esta URL e indicaremos la fecha de actualización. Si los cambios son sustanciales, lo notificaremos por correo o mediante aviso en la aplicación.',
      'El uso continuado del servicio después de la publicación implica conocimiento de la nueva versión, salvo que la ley exija un nuevo consentimiento.',
    ],
  },
  {
    id: 'contacto',
    title: '12. Contacto',
    paragraphs: [
      `Responsable del tratamiento: ${LEGAL_ENTITY_NAME}.`,
      `Correo de privacidad y habeas data: ${LEGAL_CONTACT_EMAIL}.`,
      'Superintendencia de Industria y Comercio (SIC): www.sic.gov.co — línea de atención al consumidor y datos personales.',
    ],
  },
];
