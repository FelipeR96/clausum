import type { SeoContentBlock } from '@/seo/landing-content';

type SeoRichContentProps = {
  blocks: SeoContentBlock[];
};

export function SeoRichContent({ blocks }: SeoRichContentProps) {
  return (
    <section
      className="border-t border-outline-variant/40 bg-surface py-16 sm:py-20"
      aria-label="Información detallada"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {blocks.map((block) => (
          <article key={block.heading} className="mb-10 last:mb-0">
            <h2 className="font-display text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {block.heading}
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-on-surface-variant">
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
