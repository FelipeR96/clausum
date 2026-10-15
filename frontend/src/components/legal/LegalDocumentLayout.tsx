import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import type { SeoPageConfig } from '@/seo/site';
import { LEGAL_LAST_UPDATED } from '@/content/legal/constants';
import type { LegalSection } from '@/content/legal/constants';

type LegalDocumentLayoutProps = {
  page: SeoPageConfig;
  title: string;
  intro: string;
  sections: LegalSection[];
  children?: ReactNode;
};

export function LegalDocumentLayout({
  page,
  title,
  intro,
  sections,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <MarketingLayout>
      <PageSeo page={page} />
      <div className="bg-surface-container py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <nav className="mb-8 text-sm text-on-surface-variant">
            <Link to="/" className="hover:text-primary">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-on-surface">Legal</span>
          </nav>

          <header className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Documento legal
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-on-surface sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-on-surface-variant">{intro}</p>
            <p className="mt-3 text-xs text-on-surface-variant">
              Última actualización: {LEGAL_LAST_UPDATED}
            </p>
          </header>

          <div className="space-y-10 rounded-3xl border border-outline-variant bg-surface p-6 shadow-soft sm:p-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="font-display text-xl font-bold text-on-surface">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-on-surface-variant">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.bullets.map((item) => (
                        <li key={item.slice(0, 40)}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
            {children}
          </div>

          <aside className="mt-10 rounded-2xl border border-outline-variant bg-surface p-6 text-sm text-on-surface-variant">
            <p className="font-semibold text-on-surface">Otros documentos</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/legal/terminos" className="text-primary hover:underline">
                  Términos y condiciones de uso
                </Link>
              </li>
              <li>
                <Link to="/legal/privacidad" className="text-primary hover:underline">
                  Política de privacidad y tratamiento de datos
                </Link>
              </li>
              <li>
                <Link to="/legal/aviso-legal" className="text-primary hover:underline">
                  Aviso legal y descargo de responsabilidad
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="text-primary hover:underline">
                  Política de cookies
                </Link>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </MarketingLayout>
  );
}
