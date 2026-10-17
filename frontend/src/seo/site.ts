/**
 * El único dominio que debe aparecer en Google.
 *
 * Está escrito aquí y no en una variable de entorno a propósito: es la
 * referencia contra la que se compara cada despliegue para decidir si
 * puede indexarse. Si viviera en el entorno, cada despliegue se declararía
 * canónico a sí mismo y el chequeo no serviría de nada.
 */
export const DOMINIO_PUBLICO = 'https://clausumlegal.com';

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

export const SITE_NAME = 'Clausum';

export const SITE_TAGLINE =
  'Análisis de contratos con IA y contexto jurídico colombiano';

/**
 * PNG y no SVG a proposito: WhatsApp, Facebook, LinkedIn y X no renderizan
 * SVG en las vistas previas de enlaces. Con el SVG, compartir el sitio
 * mostraba un recuadro vacio. El SVG se conserva como fuente editable.
 */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/clausum-og.png`;

export const TWITTER_HANDLE = '@clausum';

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/og/clausum-og.png`,
  description: SITE_TAGLINE,
  areaServed: 'CO',
  availableLanguage: 'es',
} as const;

export type FaqItem = {
  question: string;
  answer: string;
};

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type SeoPageConfig = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  robots?: string;
  breadcrumbs: BreadcrumbItem[];
  faq?: FaqItem[];
  schemaType?: 'WebPage' | 'SoftwareApplication';
};
