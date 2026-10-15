import type {
  ContractStatus,
  FirestoreDate,
  WithTimestamps,
} from './common.types';
import type { CountryCode } from './legal.types';

export interface Contract extends WithTimestamps {
  userId: string;
  title: string;
  fileName: string;
  storagePath: string;
  fileSizeBytes?: number;
  pageCount?: number;
  language?: string;
  /** País de aplicación legal (ISO 3166-1 alpha-2) */
  country?: CountryCode;
  /** Tipo elegido por el usuario */
  contractTypeId?: string;
  /** Tipo detectado automáticamente por el clasificador */
  detectedContractTypeId?: string;
  status: ContractStatus;
  lastAnalysisId?: string;
  riskScore?: number;
  tags?: string[];
  folderId?: string;
  deletedAt?: FirestoreDate;
}
