import type { RefObject } from 'react';
import type { DocBlock } from '@/types/comparison-view.types';

function renderPart(part: { text: string; diff?: 'removed' | 'added' }, key: number) {
  if (part.diff === 'removed') {
    return (
      <span key={key} className="diff-inline-removed">
        {part.text}
      </span>
    );
  }
  if (part.diff === 'added') {
    return (
      <span key={key} className="diff-inline-added">
        {part.text}
      </span>
    );
  }
  return <span key={key}>{part.text}</span>;
}

function DocumentBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h3 key={index} className="font-display text-xl font-bold text-on-surface">
              {block.text}
            </h3>
          );
        }

        if (block.type === 'newProvision') {
          return (
            <div
              key={index}
              className="mt-10 rounded-xl border border-outline-variant/60 bg-surface p-6 shadow-soft"
            >
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary text-base">
                  add_circle
                </span>
                Nueva disposición añadida
              </p>
              <p className="text-base italic text-on-surface-variant">
                &ldquo;{block.text}&rdquo;
              </p>
            </div>
          );
        }

        return (
          <p key={index} className="text-sm leading-relaxed text-on-surface sm:text-base">
            {block.label && <span className="font-bold">{block.label} </span>}
            {block.parts.map((part, i) => renderPart(part, i))}
          </p>
        );
      })}
    </div>
  );
}

type ComparisonDocumentPanelProps = {
  label: string;
  variant: 'original' | 'revision';
  blocks: DocBlock[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
};

export function ComparisonDocumentPanel({
  label,
  variant,
  blocks,
  scrollRef,
  onScroll,
}: ComparisonDocumentPanelProps) {
  const isOriginal = variant === 'original';

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r border-outline-variant/60 last:border-r-0">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant/60 bg-surface px-4 sm:px-6">
        <span
          className={`text-xs font-bold uppercase tracking-tight ${
            isOriginal ? 'text-on-surface-variant' : 'text-primary'
          }`}
        >
          {label}
        </span>
        <span className="material-symbols-outlined text-sm text-on-surface-variant">
          {isOriginal ? 'lock' : 'edit'}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="contract-scroll compare-gradient flex-1 overflow-y-auto bg-[#f8faf9] p-6 sm:p-10"
      >
        <DocumentBlocks blocks={blocks} />
      </div>
    </div>
  );
}
