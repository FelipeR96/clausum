import { Link } from 'react-router-dom';

type LogoProps = {
  className?: string;
  showText?: boolean;
};

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-soft">
        <span className="material-symbols-outlined text-[22px]">gavel</span>
      </span>
      {showText && (
        <span className="font-display text-xl font-bold tracking-tight text-on-surface">
          Clausum
        </span>
      )}
    </Link>
  );
}
