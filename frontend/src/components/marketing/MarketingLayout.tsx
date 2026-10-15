import type { ReactNode } from 'react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
