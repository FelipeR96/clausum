import type { CountryCode } from '@clausum/shared';
import { DEFAULT_COUNTRY, SUPPORTED_COUNTRIES } from '@clausum/shared';

export function contractCountryDisclaimer(country: CountryCode): string {
  if (country === 'CO') {
    return 'Análisis con corpus legal colombiano (RAG) cuando aplique al tipo de contrato.';
  }
  return 'Análisis con IA general. El corpus legal local de Colombia no aplica a este país.';
}

type ContractCountrySelectProps = {
  value: CountryCode;
  onChange: (country: CountryCode) => void;
  disabled?: boolean;
  id?: string;
};

export function ContractCountrySelect({
  value,
  onChange,
  disabled,
  id = 'contract-country',
}: ContractCountrySelectProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-on-surface">
        País del contrato
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as CountryCode)}
        className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        {SUPPORTED_COUNTRIES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-on-surface-variant">{contractCountryDisclaimer(value)}</p>
    </div>
  );
}

export { DEFAULT_COUNTRY as DEFAULT_CONTRACT_COUNTRY };
