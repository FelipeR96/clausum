import {
  DEFAULT_OG_IMAGE,
  ORGANIZATION,
  SITE_NAME,
  SITE_URL,
  type BreadcrumbItem,
  type FaqItem,
  type SeoPageConfig,
} from '@/seo/site';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    logo: ORGANIZATION.logo,
    description: ORGANIZATION.description,
    areaServed: ORGANIZATION.areaServed,
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: ORGANIZATION.description,
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'COP',
        description: 'Plan gratuito con 3 análisis al mes',
      },
      {
        '@type': 'Offer',
        price: '40000',
        priceCurrency: 'COP',
        description: 'Plan Pro Colombia — referencia mensual',
      },
      {
        '@type': 'Offer',
        price: '11',
        priceCurrency: 'USD',
        description: 'Plan Pro LATAM — referencia mensual',
      },
    ],
    featureList: [
      'Análisis de contratos con IA',
      'Comparación de versiones',
      'Detección de riesgos legales',
      'Contexto normativo colombiano',
    ],
  };
}

export function webPageSchema(page: SeoPageConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `${SITE_URL}${page.path}`,
    inLanguage: 'es-CO',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildPageSchemas(page: SeoPageConfig, faq?: FaqItem[]) {
  const schemas: Record<string, unknown>[] = [organizationSchema()];

  if (page.schemaType === 'SoftwareApplication') {
    schemas.push(softwareApplicationSchema());
  } else {
    schemas.push(webPageSchema(page));
  }

  if (page.breadcrumbs.length > 0) {
    schemas.push(breadcrumbSchema(page.breadcrumbs));
  }

  const faqItems = faq ?? page.faq;
  if (faqItems && faqItems.length > 0) {
    schemas.push(faqSchema(faqItems));
  }

  return schemas;
}

export function defaultOgImageForPath(path: string) {
  if (path.includes('analizar')) return `${SITE_URL}/og/clausum-og.svg`;
  if (path.includes('comparar')) return `${SITE_URL}/og/clausum-og.svg`;
  if (path.includes('riesgos')) return `${SITE_URL}/og/clausum-og.svg`;
  return DEFAULT_OG_IMAGE;
}
