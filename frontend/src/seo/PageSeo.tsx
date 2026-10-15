import { useMemo } from 'react';
import type { SeoPageConfig } from '@/seo/site';
import type { FaqItem } from '@/seo/site';
import { SeoHead } from '@/seo/SeoHead';
import { JsonLd } from '@/seo/JsonLd';
import { buildPageSchemas } from '@/seo/schema';

type PageSeoProps = {
  page: SeoPageConfig;
  faq?: FaqItem[];
};

export function PageSeo({ page, faq }: PageSeoProps) {
  const schemas = useMemo(() => buildPageSchemas(page, faq), [page, faq]);

  return (
    <>
      <SeoHead {...page} />
      <JsonLd data={schemas} id={page.path.replace(/\//g, '-') || 'home'} />
    </>
  );
}
