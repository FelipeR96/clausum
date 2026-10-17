import { useEffect } from 'react';
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  ES_SITIO_PUBLICO,
  SITE_URL,
  TWITTER_HANDLE,
  type SeoPageConfig,
} from '@/seo/site';
import { defaultOgImageForPath } from '@/seo/schema';

type SeoHeadProps = SeoPageConfig;

function upsertMeta(
  key: string,
  value: string,
  attr: 'name' | 'property' = 'name'
) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function SeoHead(page: SeoHeadProps) {
  const canonical = `${SITE_URL}${page.path}`;
  const ogImage = page.ogImage ?? defaultOgImageForPath(page.path);
  const ogTitle = page.ogTitle ?? page.title;
  const ogDescription = page.ogDescription ?? page.description;
  // Fuera del dominio publico, nada se indexa: da igual lo que pida la
  // pagina. Es la unica forma de que el sitio de desarrollo no acabe en
  // Google compitiendo contra el real.
  const robots = ES_SITIO_PUBLICO ? (page.robots ?? 'index, follow') : 'noindex, nofollow';

  useEffect(() => {
    document.title = page.title;

    upsertMeta('description', page.description);
    upsertMeta('keywords', page.keywords);
    upsertMeta('robots', robots);
    upsertMeta('author', SITE_NAME);

    upsertMeta('og:title', ogTitle, 'property');
    upsertMeta('og:description', ogDescription, 'property');
    upsertMeta('og:type', page.ogType ?? 'website', 'property');
    upsertMeta('og:url', canonical, 'property');
    upsertMeta('og:image', ogImage, 'property');
    upsertMeta('og:image:alt', `${SITE_NAME} — ${page.title}`, 'property');
    upsertMeta('og:site_name', SITE_NAME, 'property');
    upsertMeta('og:locale', 'es_CO', 'property');

    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:site', TWITTER_HANDLE);
    upsertMeta('twitter:title', ogTitle);
    upsertMeta('twitter:description', ogDescription);
    upsertMeta('twitter:image', ogImage);

    upsertLink('canonical', canonical);
  }, [
    page.title,
    page.description,
    page.keywords,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    canonical,
    page.ogType,
  ]);

  return null;
}

export { DEFAULT_OG_IMAGE };
