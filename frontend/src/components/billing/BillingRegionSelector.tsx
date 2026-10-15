import type { BillingRegion } from '@clausum/shared';
import {
  billingRegionDisclaimer,
  billingRegionPaymentHint,
} from '@/utils/billing-region-storage';

type BillingRegionSelectorProps = {
  region: BillingRegion;
  onChange: (region: BillingRegion) => void;
  className?: string;
};

export function BillingRegionSelector({
  region,
  onChange,
  className = '',
}: BillingRegionSelectorProps) {
  return (
    <div className={className}>
      <p className="text-center text-sm font-medium text-on-surface-variant">
        ¿Desde dónde contratas?
      </p>
      <div
        className="mt-3 inline-flex w-full max-w-md rounded-full border border-outline-variant bg-surface p-1 sm:w-auto"
        role="tablist"
        aria-label="Región de facturación"
      >
        <button
          type="button"
          role="tab"
          aria-selected={region === 'CO'}
          onClick={() => onChange('CO')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            region === 'CO'
              ? 'bg-primary text-on-primary shadow-soft'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Colombia (COP)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={region === 'LATAM'}
          onClick={() => onChange('LATAM')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
            region === 'LATAM'
              ? 'bg-primary text-on-primary shadow-soft'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Resto de LATAM (USD)
        </button>
      </div>
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-on-surface-variant">
        {billingRegionPaymentHint(region)}
      </p>
      <p className="mx-auto mt-1 max-w-xl text-center text-xs text-on-surface-variant/80">
        {billingRegionDisclaimer(region)}
      </p>
    </div>
  );
}
