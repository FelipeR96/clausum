import {
  DOMINIO_PUBLICO,
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_TAGLINE,
  TWITTER_HANDLE,
} from '@/seo/constants';

/**
 * Lo que no depende del entorno vive en constants.ts y se reexporta aqui,
 * para que el resto de la aplicacion siga importando de un solo sitio.
 *
 * El motivo de la separacion: este modulo lee `import.meta.env` al
 * importarse, lo que solo funciona dentro de Vite. El plugin que genera el
 * HTML por ruta corre en Node y necesita esas constantes sin arrastrar
 * este archivo.
 */
export {
  DOMINIO_PUBLICO,
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_TAGLINE,
  TWITTER_HANDLE,
};
export type {
  BreadcrumbItem,
  FaqItem,
  SeoPageConfig,
} from '@/seo/constants';

/** URL canónica de ESTE despliegue. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? DOMINIO_PUBLICO
).replace(/\/$/, '');

/**
 * ¿Este despliegue es el sitio público?
 *
 * Cualquier otro —el de desarrollo, una vista previa, un dominio
 * provisional— debe salir con noindex. Si no, el sitio de pruebas compite
 * en Google contra el real por las mismas palabras, y a veces gana el
 * equivocado.
 */
export const ES_SITIO_PUBLICO = SITE_URL === DOMINIO_PUBLICO;

/** El dominio publico sin protocolo, para comparar contra location.host. */
const HOST_PUBLICO = DOMINIO_PUBLICO.replace(/^https?:\/\//, '').toLowerCase();

/**
 * ¿La pagina que el VISITANTE tiene delante es el sitio publico?
 *
 * ES_SITIO_PUBLICO sola no basta, y conviene entender por que. Compara la
 * URL con la que se COMPILO, que es una, cuando el mismo build puede
 * servirse bajo varios nombres: clausumlegal.com y clausum-dev.web.app
 * apuntan al mismo Hosting y entregan los mismos archivos. Mirando solo el
 * build, la URL de desarrollo se declaraba publica y volvia a ser
 * indexable, que era justo lo que esto venia a impedir.
 *
 * La pregunta correcta se responde en el navegador: por que nombre entro
 * esta visita. Sin navegador no hay host que mirar, asi que se confia en
 * el build.
 */
export function esVisitaAlSitioPublico(): boolean {
  if (!ES_SITIO_PUBLICO) return false;
  if (typeof window === 'undefined') return true;

  const host = window.location.host.toLowerCase();
  return host === HOST_PUBLICO || host === `www.${HOST_PUBLICO}`;
}

export const DEFAULT_OG_IMAGE = `${SITE_URL}${OG_IMAGE_PATH}`;

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}${OG_IMAGE_PATH}`,
  description: SITE_TAGLINE,
  areaServed: 'CO',
  availableLanguage: 'es',
} as const;

