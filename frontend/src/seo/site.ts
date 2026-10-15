/** URL canónica del sitio (un solo dominio). */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? 'https://clausum.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Clausum';

export const SITE_TAGLINE =
  'Análisis de contratos con IA y contexto jurídico colombiano';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/clausum-og.svg`;

export const TWITTER_HANDLE = '@clausum';

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/og/clausum-og.svg`,
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
