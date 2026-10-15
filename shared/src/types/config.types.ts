import type { FirestoreDate } from './common.types';

export interface AppConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  minAppVersion?: string;
  supportEmail?: string;
  updatedAt?: FirestoreDate;
}

export interface FeaturesConfig {
  compareEnabled: boolean;
  risksEnabled: boolean;
  paypalEnabled: boolean;
  betaUsers?: string[];
  updatedAt?: FirestoreDate;
}

export interface LimitsConfig {
  freeAnalysesOverride?: number;
  updatedAt?: FirestoreDate;
}

export type ConfigDocument = AppConfig | FeaturesConfig | LimitsConfig;
