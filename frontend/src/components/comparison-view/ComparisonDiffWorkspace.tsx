import { useCallback, useRef } from 'react';
import type { ComparisonViewData } from '@/types/comparison-view.types';
import { ComparisonDocumentPanel } from '@/components/comparison-view/ComparisonDocumentPanel';

type ComparisonDiffWorkspaceProps = {
  data: ComparisonViewData;
};

export function ComparisonDiffWorkspace({ data }: ComparisonDiffWorkspaceProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef<'left' | 'right' | null>(null);

  const onLeftScroll = useCallback(() => {
    if (syncing.current === 'right') return;
    syncing.current = 'left';
    if (leftRef.current && rightRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    syncing.current = null;
  }, []);

  const onRightScroll = useCallback(() => {
    if (syncing.current === 'left') return;
    syncing.current = 'right';
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    syncing.current = null;
  }, []);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ComparisonDocumentPanel
        label={data.leftLabel}
        variant="original"
        blocks={data.leftDocument}
        scrollRef={leftRef}
        onScroll={onLeftScroll}
      />
      <ComparisonDocumentPanel
        label={data.rightLabel}
        variant="revision"
        blocks={data.rightDocument}
        scrollRef={rightRef}
        onScroll={onRightScroll}
      />
    </div>
  );
}
