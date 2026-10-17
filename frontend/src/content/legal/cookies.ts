import { LEGAL_CONTACT_EMAIL, type LegalSection } from './constants';

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    id: 'que-son',
    title: '1. Qué son las cookies y las tecnologías similares',
    paragraphs: [
      'Las cookies son pequeños archivos de texto que un sitio web guarda en su navegador. Junto a ellas existen tecnologías equivalentes —almacenamiento local, almacenamiento de sesión y tokens— que cumplen funciones parecidas y que, para efectos de esta política, tratamos igual.',
      'Esta política explica qué guardamos en su dispositivo, para qué, cuánto tiempo y cómo puede borrarlo.',
    ],
  },
  {
    id: 'enfoque',
    title: '2. Nuestro enfoque',
    paragraphs: [
      'Clausum no utiliza cookies de publicidad, no construye perfiles de comportamiento, no instala píxeles de redes sociales y no emplea herramientas de analítica de terceros que lo sigan a través de otros sitios.',
      'Lo que guardamos es lo necesario para que la aplicación funcione y para algunas comodidades que usted mismo activa. Nada de ello se comparte con anunciantes, porque no tenemos anunciantes.',
    ],
  },
  {
    id: 'que-guardamos',
    title: '3. Qué guardamos exactamente en su dispositivo',
    paragraphs: [
      'Esta es la lista completa. Si en el futuro añadimos algo, actualizaremos esta sección:',
    ],
    bullets: [
      'Sesión e identidad (necesario): un token que acredita que usted inició sesión, gestionado por nuestro proveedor de infraestructura de identidad. Sin él tendría que volver a autenticarse en cada pantalla. Caduca periódicamente y se elimina al cerrar sesión.',
      'Aceptación del aviso de cookies (necesario): una marca que recuerda que usted ya vio el aviso, para no mostrárselo en cada visita. Permanece hasta que borre los datos del navegador.',
      'Correo recordado (opcional, lo activa usted): si marca «recordarme» en el inicio de sesión, guardamos su dirección de correo en este navegador para no tener que escribirla de nuevo. Es un dato personal y queda en su dispositivo, no en nuestros servidores. Se borra al desmarcar la opción o al limpiar el navegador.',
      'Región de facturación (funcional): recuerda si sus precios se muestran en pesos colombianos o en dólares, para no recalcularlo en cada carga.',
      'Preferencias de perfil (funcional): ajustes menores de la interfaz asociados a su cuenta, para que la aplicación se vea como usted la dejó.',
      'Seguridad (necesario): identificadores técnicos usados para validar la sesión y detectar usos indebidos.',
    ],
  },
  {
    id: 'aviso',
    title: '4. El aviso de cookies',
    paragraphs: [
      'La primera vez que entra verá un aviso informándole del uso de estas tecnologías. Como todo lo que guardamos es estrictamente necesario o una comodidad que usted activa por su cuenta, ese aviso es informativo: no instalamos nada que requiera su consentimiento previo y que pueda rechazar por separado.',
      'Si algún día incorporamos cookies que sí lo requieran —analítica o publicidad—, el aviso dejará de ser informativo y le pedirá una elección real antes de instalarlas.',
    ],
  },
  {
    id: 'terceros',
    title: '5. Cookies de terceros',
    paragraphs: [
      'Hay dos momentos en los que su navegador interactúa con dominios que no son nuestros:',
    ],
    bullets: [
      'Si inicia sesión mediante un proveedor de identidad externo, ese proveedor aplicará sus propias cookies en su dominio durante la autenticación, conforme a sus políticas, sobre las que no tenemos control.',
      'Al pagar, la pasarela correspondiente —Wompi en Colombia, PayPal en el resto de países— puede usar cookies y tecnologías propias en su entorno, principalmente para prevenir fraude. El pago ocurre en el entorno de la pasarela, no en el nuestro.',
    ],
  },
  {
    id: 'gestion',
    title: '6. Cómo verlas, gestionarlas y borrarlas',
    paragraphs: [
      'Todos los navegadores permiten revisar y eliminar cookies y almacenamiento local desde sus ajustes de privacidad, normalmente en una sección llamada «Cookies y datos de sitios». Puede eliminar únicamente los datos de este sitio sin afectar los demás.',
      'También puede navegar en modo privado o incógnito: en ese caso todo lo descrito se borra al cerrar la ventana.',
      'Tenga en cuenta la consecuencia: si bloquea o elimina lo estrictamente necesario, no podrá mantener la sesión iniciada ni usar el panel. No es una limitación que impongamos, es cómo funciona la autenticación.',
    ],
  },
  {
    id: 'cambios',
    title: '7. Cambios a esta política',
    paragraphs: [
      'Si cambiamos lo que guardamos en su dispositivo, actualizaremos esta página y su fecha de última modificación. Para el tratamiento de datos personales en general, consulte la Política de Privacidad, de la que esta política forma parte.',
    ],
  },
  {
    id: 'contacto',
    title: '8. Contacto',
    paragraphs: [`Consultas sobre esta política: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
