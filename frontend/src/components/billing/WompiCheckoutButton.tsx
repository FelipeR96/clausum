import { useState } from 'react';
import type { BillingInterval } from '@clausum/shared';
import {
  createWompiCheckout,
  submitWompiCheckoutForm,
} from '@/services/subscription.service';

type WompiCheckoutButtonProps = {
  interval: BillingInterval;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function WompiCheckoutButton({
  interval,
  children,
  className,
  disabled,
}: WompiCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await createWompiCheckout(interval);
      submitWompiCheckoutForm(payload);
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
        {loading ? 'Redirigiendo a Wompi…' : children}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
