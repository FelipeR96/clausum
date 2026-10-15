import type { SeoPageConfig } from '@/seo/site';

export const SEO_PAGES = {
  home: {
    path: '/',
    title: 'Clausum — Analizar, comparar y detectar riesgos en contratos con IA',
    description:
      'Plataforma de análisis contractual con inteligencia artificial para Colombia. Analiza PDFs, compara versiones y detecta riesgos legales antes de firmar. Plan gratuito disponible.',
    keywords:
      'análisis de contratos, inteligencia artificial legal, revisión de contratos Colombia, software jurídico, Clausum',
    breadcrumbs: [{ name: 'Inicio', path: '/' }],
    schemaType: 'SoftwareApplication',
  },
  analyze: {
    path: '/analizar-contratos',
    title: 'Analizar Contratos con IA en Colombia | Clausum',
    description:
      'Analiza contratos PDF con inteligencia artificial y contexto del marco normativo colombiano. Extrae cláusulas críticas, responsabilidades y fechas clave en minutos.',
    keywords:
      'analizar contratos, análisis de contratos con ia, revisar contrato pdf, análisis contractual Colombia, inteligencia artificial legal',
    ogTitle: 'Analizar contratos con IA — Clausum',
    ogDescription:
      'Sube tu PDF y obtén un análisis estructurado con alertas de riesgo y referencias al marco jurídico colombiano.',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Analizar contratos', path: '/analizar-contratos' },
    ],
    schemaType: 'WebPage',
  },
  compare: {
    path: '/comparar-contratos',
    title: 'Comparar Versiones de Contratos con IA | Clausum',
    description:
      'Compara dos versiones de un contrato lado a lado con IA. Detecta adiciones, eliminaciones y cambios de riesgo entre borradores antes de firmar.',
    keywords:
      'comparar contratos, diff contratos, comparación de versiones contractuales, revisión de cambios legales, Clausum',
    ogTitle: 'Comparar contratos con IA — Clausum',
    ogDescription:
      'Visualiza cada cambio entre versiones de un contrato con evaluación de riesgo y resumen ejecutivo.',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Comparar contratos', path: '/comparar-contratos' },
    ],
    schemaType: 'WebPage',
  },
  risks: {
    path: '/detectar-riesgos',
    title: 'Detectar Riesgos Legales en Contratos con IA | Clausum',
    description:
      'Identifica cláusulas abusivas, indemnizaciones unilaterales y vacíos legales en tus contratos. Alertas de riesgo con fundamento normativo colombiano.',
    keywords:
      'detectar riesgos en contratos, cláusulas abusivas, análisis de riesgo legal, alertas contractuales, revisión jurídica ia',
    ogTitle: 'Detectar riesgos en contratos — Clausum',
    ogDescription:
      'Escanea cláusulas críticas y recibe alertas priorizadas antes de que un riesgo contractual se convierta en problema.',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Detectar riesgos', path: '/detectar-riesgos' },
    ],
    schemaType: 'WebPage',
  },
  pricing: {
    path: '/pricing',
    title: 'Precios y Planes | Clausum',
    description:
      'Plan Free con 3 análisis al mes y 1 comparación. Plan Pro con 75 análisis y 30 comparaciones, PDF/Word sin límite de páginas y OCR en escaneos (primeras 7 páginas).',
    keywords: 'precios Clausum, plan análisis contratos, software legal Colombia',
    robots: 'index, follow',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Precios', path: '/pricing' },
    ],
  },
  privacy: {
    path: '/legal/privacidad',
    title: 'Política de Privacidad | Clausum',
    description:
      'Política de tratamiento de datos personales de Clausum conforme a la Ley 1581 de 2012 en Colombia.',
    keywords: 'privacidad Clausum, habeas data, datos personales',
    robots: 'index, follow',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Privacidad', path: '/legal/privacidad' },
    ],
  },
  terms: {
    path: '/legal/terminos',
    title: 'Términos y Condiciones | Clausum',
    description: 'Términos y condiciones de uso del servicio Clausum.',
    keywords: 'términos Clausum, condiciones de uso',
    robots: 'index, follow',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Términos', path: '/legal/terminos' },
    ],
  },
  legalNotice: {
    path: '/legal/aviso-legal',
    title: 'Aviso Legal | Clausum',
    description:
      'Aviso legal y descargo de responsabilidad del servicio de análisis contractual Clausum.',
    keywords: 'aviso legal Clausum, disclaimer',
    robots: 'index, follow',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Aviso legal', path: '/legal/aviso-legal' },
    ],
  },
  cookies: {
    path: '/legal/cookies',
    title: 'Política de Cookies | Clausum',
    description: 'Uso de cookies y tecnologías similares en Clausum.',
    keywords: 'cookies Clausum',
    robots: 'index, follow',
    breadcrumbs: [
      { name: 'Inicio', path: '/' },
      { name: 'Cookies', path: '/legal/cookies' },
    ],
  },
} as const satisfies Record<string, SeoPageConfig>;

export const SITEMAP_PATHS = [
  SEO_PAGES.home.path,
  SEO_PAGES.analyze.path,
  SEO_PAGES.compare.path,
  SEO_PAGES.risks.path,
  SEO_PAGES.pricing.path,
  SEO_PAGES.privacy.path,
  SEO_PAGES.terms.path,
  SEO_PAGES.legalNotice.path,
  SEO_PAGES.cookies.path,
] as const;
