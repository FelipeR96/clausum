import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Contract, CountryCode } from '@clausum/shared';
import { CONTRACT_FILE_ACCEPT } from '@clausum/shared';
import { useAuth } from '@/auth/AuthProvider';
import { apiClient } from '@/services/api/client';
import {
  listContracts,
  resolveContractSelection,
} from '@/services/contracts.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import type { SubscriptionSummary } from '@clausum/shared';
import { DocumentUploadGuidance } from '@/components/contracts/DocumentUploadGuidance';
import {
  ContractCountrySelect,
  DEFAULT_CONTRACT_COUNTRY,
} from '@/components/contracts/ContractCountrySelect';

type SlotSelection =
  | { kind: 'file'; file: File }
  | { kind: 'existing'; contractId: string }
  | null;

type ComparisonUploadStepProps = {
  onCompare: (contractIdA: string, contractIdB: string, country: CountryCode) => void;
  comparing: boolean;
  error: string | null;
  quotaError: boolean;
  initialContractIdA?: string;
};

const ACCEPT = CONTRACT_FILE_ACCEPT;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ContractSlotProps = {
  label: string;
  hint: string;
  contracts: Array<Contract & { id: string }>;
  selection: SlotSelection;
  onSelect: (selection: SlotSelection) => void;
  disabled?: boolean;
  ocrAllowed?: boolean;
};

function ContractSlot({
  label,
  hint,
  contracts,
  selection,
  onSelect,
  disabled,
  ocrAllowed = false,
}: ContractSlotProps) {
  const [mode, setMode] = useState<'upload' | 'existing'>('upload');

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onSelect({ kind: 'file', file });
    },
    [disabled, onSelect]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect({ kind: 'file', file });
  };

  const selectedLabel =
    selection?.kind === 'file'
      ? selection.file.name
      : selection?.kind === 'existing'
        ? contracts.find((c) => c.id === selection.contractId)?.title ??
          selection.contractId
        : null;

  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant/60 bg-surface p-5 shadow-soft">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold text-on-surface">{label}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{hint}</p>
      </div>

      <div className="mb-4 flex rounded-xl bg-surface-container p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('upload')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            mode === 'upload'
              ? 'bg-surface text-on-surface shadow-soft'
              : 'text-on-surface-variant'
          }`}
        >
          Subir archivo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode('existing')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            mode === 'existing'
              ? 'bg-surface text-on-surface shadow-soft'
              : 'text-on-surface-variant'
          }`}
        >
          Mis contratos
        </button>
      </div>

      {mode === 'upload' ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container/50 p-6 text-center transition hover:border-primary/40 ${
            disabled ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <span className="material-symbols-outlined mb-2 text-3xl text-primary">
            upload_file
          </span>
          <span className="text-sm font-semibold text-on-surface">
            Arrastra PDF digital o Word (.doc, .docx)
          </span>
          <span className="mt-1 text-xs text-on-surface-variant">
            Máx. 5 MB (Free) · 10 MB (Pro)
          </span>
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled}
            onChange={onFileChange}
          />
        </label>
      ) : (
        <select
          disabled={disabled}
          value={selection?.kind === 'existing' ? selection.contractId : ''}
          onChange={(e) =>
            onSelect(e.target.value ? { kind: 'existing', contractId: e.target.value } : null)
          }
          className="min-h-[180px] w-full rounded-xl border border-outline-variant bg-surface px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          size={6}
        >
          <option value="">Selecciona un contrato…</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.fileName})
            </option>
          ))}
        </select>
      )}

      {selectedLabel && (
        <p className="mt-3 flex items-center gap-2 text-sm text-primary">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {selectedLabel}
          {selection?.kind === 'file' && (
            <span className="text-on-surface-variant">
              · {formatBytes(selection.file.size)}
            </span>
          )}
        </p>
      )}

      <DocumentUploadGuidance
        variant="compact"
        ocrAllowed={ocrAllowed}
        className="mt-3"
      />
    </div>
  );
}

export function ComparisonUploadStep({
  onCompare,
  comparing,
  error,
  quotaError,
  initialContractIdA,
}: ComparisonUploadStepProps) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Array<Contract & { id: string }>>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [slotA, setSlotA] = useState<SlotSelection>(
    initialContractIdA ? { kind: 'existing', contractId: initialContractIdA } : null
  );
  const [slotB, setSlotB] = useState<SlotSelection>(null);
  const [contractCountry, setContractCountry] = useState<CountryCode>(DEFAULT_CONTRACT_COUNTRY);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [contractList, me] = await Promise.all([
          listContracts(),
          apiClient<{ subscription: SubscriptionSummary }>('/me'),
        ]);
        if (!cancelled) {
          setContracts(contractList);
          setSubscription(me.subscription);
        }
      } catch {
        if (!cancelled) setLocalError('No se pudo cargar tus contratos. Revisa la conexión.');
      } finally {
        if (!cancelled) setLoadingContracts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canCompare = Boolean(slotA && slotB && !comparing && !preparing);
  const comparisonsLeft = subscription?.usage.comparisonsRemaining;
  const ocrAllowed = subscription?.entitlements.ocrScannedPdf ?? false;

  const handleCompare = async () => {
    if (!user || !slotA || !slotB) return;
    setLocalError(null);
    setPreparing(true);
    try {
      const [contractA, contractB] = await Promise.all([
        resolveContractSelection(user.uid, slotA, contracts, { country: contractCountry }),
        resolveContractSelection(user.uid, slotB, contracts, { country: contractCountry }),
      ]);

      if (contractA.id === contractB.id) {
        setLocalError('Selecciona dos versiones distintas del contrato.');
        return;
      }

      const country = contractA.country ?? contractB.country ?? contractCountry;
      onCompare(contractA.id, contractB.id, country);
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, { action: 'preparar la comparación' })
      );
    } finally {
      setPreparing(false);
    }
  };

  const displayError = error ?? localError;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
          Comparar contratos
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Sube la versión original y la revisión de la contraparte, o elige dos
          documentos de tu historial. Clausum resaltará adiciones, eliminaciones y
          cambios con evaluación de riesgo.
        </p>
        {comparisonsLeft !== null && comparisonsLeft !== undefined && (
          <p className="mt-2 text-sm font-medium text-primary">
            Comparaciones restantes este mes: {comparisonsLeft}
          </p>
        )}
      </div>

      {quotaError && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">Límite de comparaciones alcanzado</p>
          <p className="mt-1 text-sm text-amber-800">
            El plan Free incluye 1 comparación al mes. Pro incluye hasta 30 comparaciones al mes.
          </p>
          <Link
            to="/pricing"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Ver planes Pro
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      )}

      {displayError && !quotaError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {displayError}
        </div>
      )}

      <DocumentUploadGuidance variant="banner" ocrAllowed={ocrAllowed} className="mb-6" />

      <div className="mb-6 max-w-md">
        <ContractCountrySelect
          value={contractCountry}
          onChange={setContractCountry}
          disabled={comparing || preparing}
        />
      </div>

      {loadingContracts ? (
        <p className="text-sm text-on-surface-variant">Cargando contratos…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ContractSlot
            label="Versión A (original)"
            hint="Borrador base o versión que enviaste primero."
            contracts={contracts}
            selection={slotA}
            onSelect={setSlotA}
            disabled={comparing || preparing}
            ocrAllowed={ocrAllowed}
          />
          <ContractSlot
            label="Versión B (revisión)"
            hint="Propuesta de la contraparte o segunda versión."
            contracts={contracts}
            selection={slotB}
            onSelect={setSlotB}
            disabled={comparing || preparing}
            ocrAllowed={ocrAllowed}
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!canCompare}
          onClick={handleCompare}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {comparing || preparing ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">
                progress_activity
              </span>
              {preparing ? 'Subiendo documentos…' : 'Comparando con IA…'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">compare_arrows</span>
              Iniciar comparación
            </>
          )}
        </button>
        <Link
          to="/panel/contratos"
          className="text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          Volver al historial
        </Link>
      </div>
    </div>
  );
}
