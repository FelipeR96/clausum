import { useState } from 'react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import type { FaqItem } from '@/seo/site';

type SeoFaqSectionProps = {
  items: FaqItem[];
  title?: string;
  id?: string;
};

export function SeoFaqSection({
  items,
  title = 'Preguntas frecuentes',
  id = 'faq',
}: SeoFaqSectionProps) {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id={id} className="bg-surface-container py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div ref={ref} className="reveal text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {title}
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-2xl border border-outline-variant bg-surface"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-display font-semibold text-on-surface">
                    {item.question}
                  </span>
                  <span className="material-symbols-outlined shrink-0 text-primary">
                    {isOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-outline-variant px-5 pb-4 pt-3 text-sm leading-relaxed text-on-surface-variant">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
