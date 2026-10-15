import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { listContracts, uploadAndRegisterContract } from '@/services/contracts.service';
import { runAnalysis } from '@/services/analysis.service';
import { isQuotaError } from '@/services/api/errors';
import { getUserFacingErrorMessage, getQuotaErrorMessage } from '@/services/api/user-facing-errors';
import type { Contract, ContractTypeCatalog, CountryCode, ProcessingProgress } from '@clausum/shared';
import {
  CONTRACT_FILE_ACCEPT,
  CONTRACT_FORMATS_LABEL,
  FREE_ENTITLEMENTS,
  isSupportedContractFileName,
} from '@clausum/shared';
import { contractAnalysisPath } from '@/utils/risk-routes';
import { DocumentUploadGuidance } from '@/components/contracts/DocumentUploadGuidance';
import { DocumentProcessingProgress } from '@/components/contracts/DocumentProcessingProgress';
import {
  ContractTypeSelect,
  resolveContractTypeId,
  type ContractTypeChoice,
} from '@/components/contracts/ContractTypeSelect';
import {
  ContractCountrySelect,
  DEFAULT_CONTRACT_COUNTRY,
} from '@/components/contracts/ContractCountrySelect';
import { listContractTypes } from '@/services/legal.service';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';
import {
  DIGITAL_FORMAT_HINT,
  getAnalysisProgressPercent,
  OCR_FORMAT_HINT,
} from '@/utils/processing-progress';

export type ContractActionIntent = 'upload' | 'analyze';

type ContractActionDialogProps = {
  intent: ContractActionIntent | null;
  onClose: () => void;
  onUploadSuccess?: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContractActionDialog({ intent, onClose, onUploadSuccess }: ContractActionDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const open = intent !== null;
  const subscription = useSubscriptionSummary();
  const ocrAllowed = subscription?.entitlements.ocrScannedPdf ?? false;
  const maxFileSizeMb =
    subscription?.entitlements.maxFileSizeMb ?? FREE_ENTITLEMENTS.maxFileSizeMb;
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  const planLabel = subscription?.planId === 'pro' ? 'Pro' : 'Free';

  const [contracts, setContracts] = useState<Array<Contract & { id: string }>>([]);
  const [mode, setMode] = useState<'upload' | 'existing'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [contractTypeChoice, setContractTypeChoice] = useState<ContractTypeChoice>('');
  const [contractCountry, setContractCountry] = useState<CountryCode>(DEFAULT_CONTRACT_COUNTRY);
  const [contractTypes, setContractTypes] = useState<ContractTypeCatalog[]>([]);
  const [loadingContractTypes, setLoadingContractTypes] = useState(false);
  const [processingTitle, setProcessingTitle] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [processingPercent, setProcessingPercent] = useState<number | undefined>();
  const [processingHint, setProcessingHint] = useState<string | undefined>();

  const reset = useCallback(() => {
    setMode('upload');
    setSelectedFile(null);
    setSelectedContractId('');
    setContractTypeChoice('');
    setContractCountry(DEFAULT_CONTRACT_COUNTRY);
    setError(null);
    setQuotaError(false);
    setLoading(false);
    setProcessingTitle(null);
    setProcessingMessage(null);
    setProcessingPercent(undefined);
    setProcessingHint(undefined);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (intent === 'analyze') {
      setLoadingContracts(true);
      listContracts()
        .then((items) => {
          setContracts(items);
          if (items.length > 0) setSelectedContractId(items[0].id);
        })
        .catch(() => setContracts([]))
        .finally(() => setLoadingContracts(false));
    }
  }, [open, intent, reset]);

  const showUploadForm = mode === 'upload' || intent === 'upload';

  useEffect(() => {
    if (!open || !showUploadForm) return;

    let cancelled = false;
    setLoadingContractTypes(true);
    listContractTypes(contractCountry)
      .then((types) => {
        if (!cancelled) setContractTypes(types);
      })
      .catch(() => {
        if (!cancelled) setContractTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingContractTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, showUploadForm, contractCountry]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      setError(null);
      if (file.size > maxBytes) {
        setError(
          `El archivo supera ${maxFileSizeMb} MB (límite del plan ${planLabel}).`
        );
        return;
      }
      const name = file.name.toLowerCase();
      if (!isSupportedContractFileName(name)) {
        setError(`Solo se admiten archivos ${CONTRACT_FORMATS_LABEL}.`);
        return;
      }
      setSelectedFile(file);
    },
    [maxBytes, maxFileSizeMb, planLabel]
  );

  const validateFile = useCallback(
    (file: File) => {
      if (file.size > maxBytes) {
        setError(
          `El archivo supera ${maxFileSizeMb} MB (límite del plan ${planLabel}).`
        );
        return false;
      }
      const name = file.name.toLowerCase();
      if (!isSupportedContractFileName(name)) {
        setError(`Solo se admiten archivos ${CONTRACT_FORMATS_LABEL}.`);
        return false;
      }
      return true;
    },
    [maxBytes, maxFileSizeMb, planLabel]
  );

  const updateAnalysisProgress = (progress?: ProcessingProgress) => {
    setProcessingMessage(progress?.message ?? 'Analizando contrato…');
    setProcessingPercent(getAnalysisProgressPercent(progress));
    setProcessingHint(
      progress?.stage === 'ocr' ? OCR_FORMAT_HINT : DIGITAL_FORMAT_HINT
    );
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (validateFile(file)) setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Debes iniciar sesión.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuotaError(false);

    try {
      let contractId: string;

      if (mode === 'upload') {
        if (!selectedFile) {
          setError(`Selecciona un archivo ${CONTRACT_FORMATS_LABEL}.`);
          setLoading(false);
          return;
        }
        if (!validateFile(selectedFile)) {
          setLoading(false);
          return;
        }
        const contractTypeId = resolveContractTypeId(contractTypeChoice);
        setProcessingTitle('Subiendo contrato');
        setProcessingMessage('Preparando envío…');
        setProcessingPercent(4);
        setProcessingHint(DIGITAL_FORMAT_HINT);
        const contract = await uploadAndRegisterContract(user.uid, selectedFile, {
          contractTypeId,
          country: contractCountry,
          onUploadProgress: (percent) => {
            setProcessingMessage(`Subiendo documento… ${Math.round(percent)}%`);
            setProcessingPercent(Math.round(percent * 0.82));
          },
        });
        setProcessingMessage('Registrando contrato…');
        setProcessingPercent(90);
        contractId = contract.id;
      } else {
        if (!selectedContractId) {
          setError('Selecciona un contrato de tu historial.');
          setLoading(false);
          return;
        }
        contractId = selectedContractId;
      }

      if (intent === 'upload') {
        onClose();
        onUploadSuccess?.();
        if (!location.pathname.startsWith('/panel/contratos')) {
          navigate('/panel/contratos');
        }
        return;
      }

      if (intent === 'analyze') {
        setProcessingTitle('Analizando contrato');
        setProcessingMessage('Preparando análisis…');
        setProcessingPercent(8);
        setProcessingHint(DIGITAL_FORMAT_HINT);
      }

      const analysisCountry =
        mode === 'existing'
          ? (contracts.find((c) => c.id === contractId)?.country ?? contractCountry)
          : contractCountry;

      const result = await runAnalysis(contractId, analysisCountry, {
        onProgress: (progress) => {
          setProcessingTitle('Analizando contrato');
          updateAnalysisProgress(progress);
        },
      });
      onClose();
      navigate(contractAnalysisPath(contractId), { state: { analysisPayload: result } });
    } catch (err) {
      if (isQuotaError(err)) {
        setQuotaError(true);
        setError(getQuotaErrorMessage(err));
      } else {
        setError(
          getUserFacingErrorMessage(err, {
            action: intent === 'upload' ? 'guardar el contrato' : 'analizar el contrato',
          })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open || !intent) return null;

  const title = intent === 'upload' ? 'Cargar contrato' : 'Nuevo análisis';
  const description =
    intent === 'upload'
      ? 'Guarda un PDF digital o Word (.docx) en tu historial.'
      : 'Sube un documento nuevo o elige uno guardado para analizarlo.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-action-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-outline-variant bg-surface shadow-card sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/60 p-6 pb-4">
          <div>
            <h2 id="contract-action-title" className="font-display text-xl font-bold text-on-surface">
              {title}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && processingMessage && (
            <DocumentProcessingProgress
              className="mb-4"
              title={processingTitle ?? (intent === 'analyze' ? 'Analizando contrato' : 'Subiendo contrato')}
              message={processingMessage}
              percent={processingPercent}
              hint={processingHint}
            />
          )}

          {intent === 'analyze' && (
            <div className="mb-4 flex rounded-xl bg-surface-container p-1">
              <button
                type="button"
                disabled={loading}
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
                disabled={loading}
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
          )}

          {(mode === 'upload' || intent === 'upload') && (
            <DocumentUploadGuidance
              variant="full"
              ocrAllowed={ocrAllowed}
              className="mb-4"
            />
          )}

          {showUploadForm && (
            <div className="mb-4 space-y-4">
              <ContractCountrySelect
                value={contractCountry}
                onChange={setContractCountry}
                disabled={loading}
              />
              <ContractTypeSelect
                value={contractTypeChoice}
                onChange={setContractTypeChoice}
                contractTypes={contractTypes}
                loading={loadingContractTypes}
                disabled={loading}
              />
            </div>
          )}

          {showUploadForm ? (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container/50 p-5 text-center transition hover:border-primary/40 ${
                loading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <span className="material-symbols-outlined mb-2 text-3xl text-primary">upload_file</span>
              <span className="text-sm font-semibold text-on-surface">
                {selectedFile ? selectedFile.name : `Arrastra PDF digital o Word (.doc, .docx)`}
              </span>
              {selectedFile && (
                <span className="mt-1 text-xs text-on-surface-variant">
                  {formatBytes(selectedFile.size)}
                </span>
              )}
              <span className="mt-2 text-xs text-on-surface-variant">
                Máx. {maxFileSizeMb} MB en plan {planLabel} · PDF con texto seleccionable o Word
                (.doc, .docx)
              </span>
              <input
                type="file"
                accept={CONTRACT_FILE_ACCEPT}
                className="sr-only"
                disabled={loading}
                onChange={onFileChange}
              />
            </label>
          ) : (
            <div className="rounded-xl border border-outline-variant bg-surface-container/50 p-4">
              {loadingContracts ? (
                <p className="text-sm text-on-surface-variant">Cargando contratos…</p>
              ) : contracts.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  No tienes contratos guardados. Sube uno primero.
                </p>
              ) : (
                <select
                  value={selectedContractId}
                  disabled={loading}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 text-sm"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} · {c.fileName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                quotaError ? 'bg-amber-50 text-amber-900' : 'bg-red-50 text-red-800'
              }`}
            >
              {error}
              {quotaError && (
                <a href="/pricing" className="mt-1 block font-semibold underline">
                  Ver planes
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-outline-variant/60 p-6 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-soft hover:bg-primary/90 disabled:opacity-60"
          >
            {loading
              ? intent === 'analyze'
                ? 'Analizando…'
                : 'Subiendo…'
              : intent === 'analyze'
                ? 'Iniciar análisis'
                : 'Guardar contrato'}
          </button>
        </div>
      </div>
    </div>
  );
}
