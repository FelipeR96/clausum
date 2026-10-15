import type { ContractTypeCatalog } from '@clausum/shared';

/** Valor interno del select: vacío = auto; __other__ = sin tipo explícito. */
export type ContractTypeChoice = '' | '__other__' | string;

export function resolveContractTypeId(choice: ContractTypeChoice): string | undefined {
  if (!choice || choice === '__other__') return undefined;
  return choice;
}

type ContractTypeSelectProps = {
  value: ContractTypeChoice;
  onChange: (value: ContractTypeChoice) => void;
  contractTypes: ContractTypeCatalog[];
  loading?: boolean;
  disabled?: boolean;
  id?: string;
};

export function ContractTypeSelect({
  value,
  onChange,
  contractTypes,
  loading = false,
  disabled = false,
  id = 'contract-type',
}: ContractTypeSelectProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
      >
        Tipo de contrato <span className="font-normal normal-case">(opcional)</span>
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value as ContractTypeChoice)}
        className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface disabled:cursor-wait disabled:opacity-60"
      >
        <option value="">
          {loading ? 'Cargando tipos…' : 'Detectar automáticamente'}
        </option>
        {contractTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
        <option value="__other__">Otro / No estoy seguro</option>
      </select>
      <p className="mt-1.5 px-1 text-xs text-on-surface-variant">
        Si lo conoces, elige el tipo; si no, lo detectamos al analizar el documento.
      </p>
    </div>
  );
}
