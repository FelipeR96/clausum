export const COLLECTIONS = {
  users: 'users',
  plans: 'plans',
  subscriptions: 'subscriptions',
  contracts: 'contracts',
  analyses: 'analyses',
  comparisons: 'comparisons',
  alerts: 'alerts',
  payments: 'payments',
  config: 'config',
  systemLogs: 'system_logs',
  laws: 'laws',
  contractTypes: 'contract_types',
  legalTopics: 'legal_topics',
  bugReports: 'bug_reports',
  /** Compras de un analisis suelto, sin cuenta. */
  singleAnalysisOrders: 'single_analysis_orders',
} as const;

export const USER_SUBCOLLECTIONS = {
  usage: 'usage',
  settings: 'settings',
  history: 'history',
} as const;

export const CONFIG_DOCS = {
  app: 'app',
  features: 'features',
  limits: 'limits',
  prompts: 'prompts',
} as const;
