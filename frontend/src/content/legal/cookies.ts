import { LEGAL_CONTACT_EMAIL, type LegalSection } from './constants';

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    id: 'que-son',
    title: '1. ¿Qué son las cookies?',
    paragraphs: [
      'Las cookies son pequeños archivos de texto que un sitio web almacena en su navegador o dispositivo. También usamos tecnologías similares (almacenamiento local, tokens de sesión) con fines equivalentes.',
    ],
  },
  {
    id: 'tipos',
    title: '2. Cookies que utilizamos',
    paragraphs: ['Clausum utiliza principalmente cookies y almacenamiento estrictamente necesarios:'],
    bullets: [
      'Cookies o tokens de autenticación (Firebase Auth): permiten mantener su sesión iniciada de forma segura.',
      'Preferencias locales: configuración de interfaz guardada en su navegador cuando sea necesario.',
      'Cookies técnicas de seguridad: protección contra uso indebido y validación de sesión.',
    ],
  },
  {
    id: 'terceros',
    title: '3. Cookies de terceros',
    paragraphs: [
      'Al usar inicio de sesión con Google u otros proveedores, pueden aplicarse las políticas de cookies de dichos proveedores.',
      'Wompi (Colombia) y PayPal (resto de LATAM) pueden utilizar cookies o tecnologías propias durante el proceso de pago en sus dominios.',
      'Actualmente no utilizamos cookies de publicidad comportamental ni perfiles de marketing de terceros en la aplicación principal.',
    ],
  },
  {
    id: 'gestion',
    title: '4. Cómo gestionar las cookies',
    paragraphs: [
      'Puede configurar su navegador para bloquear o eliminar cookies. Si deshabilita las cookies estrictamente necesarias, es posible que no pueda iniciar sesión ni usar el panel de usuario.',
      'Para más información sobre el tratamiento de datos personales, consulte nuestra Política de Privacidad.',
    ],
  },
  {
    id: 'contacto',
    title: '5. Contacto',
    paragraphs: [`Consultas: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
