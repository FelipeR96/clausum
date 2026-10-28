/**
 * Constantes de SEO que NO dependen del entorno.
 *
 * Viven aparte de site.ts por una razon concreta: site.ts lee
 * `import.meta.env` al importarse, y eso solo existe dentro de Vite. El
 * plugin que genera robots.txt, sitemap.xml y el HTML por ruta corre en
 * Node, donde `import.meta.env` es undefined — y como los modulos ES se
 * evaluan enteros, bastaria con importar UNA constante de site.ts para que
 * el build se cayera.
 *
 * Aqui no hay nada que dependa del entorno, asi que este modulo se puede
 * importar desde cualquier sitio. site.ts lo reexporta para que el resto
 * de la aplicacion no note el cambio.
 */

/**
 * El único dominio que debe aparecer en Google.
 *
 * Está escrito aquí y no en una variable de entorno a propósito: es la
 * referencia contra la que se compara cada despliegue para decidir si
 * puede indexarse. Si viviera en el entorno, cada despliegue se declararía
 * canónico a sí mismo y el chequeo no serviría de nada.
 */
export const DOMINIO_PUBLICO = 'https://clausumlegal.com';

export const SITE_NAME = 'Clausum';

export const SITE_TAGLINE =
  'Análisis de contratos con IA y contexto jurídico colombiano';

/**
 * PNG y no SVG a proposito: WhatsApp, Facebook, LinkedIn y X no renderizan
 * SVG en las vistas previas de enlaces. Con el SVG, compartir el sitio
 * mostraba un recuadro vacio. El SVG se conserva como fuente editable.
 */
export const OG_IMAGE_PATH = '/og/clausum-og.png';

export const TWITTER_HANDLE = '@clausum';

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
