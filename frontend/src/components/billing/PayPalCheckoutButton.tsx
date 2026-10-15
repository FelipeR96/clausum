import { useState } from 'react';
import type { BillingInterval } from '@clausum/shared';
import { createPayPalSubscription } from '@/services/subscription.service';

type PayPalCheckoutButtonProps = {
  interval: BillingInterval;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function PayPalCheckoutButton({
  interval,
  children,
  className,
  disabled,
}: PayPalCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const { approvalUrl } = await createPayPalSubscription(interval);
      window.location.href = approvalUrl;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar el pago. Intenta de nuevo.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        className={className}
      >
        {loading ? 'Redirigiendo a PayPal…' : children}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
