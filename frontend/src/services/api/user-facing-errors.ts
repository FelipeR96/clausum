import { formatAuthError } from '@/auth/auth-errors';
import { isApiError } from '@/services/api/errors';

export type ErrorContext = {
  /** Acción que el usuario intentaba (ej. "cargar contratos") */
  action?: string;
  /** Recurso afectado (ej. "contrato", "análisis") */
  resource?: string;
  /** Mensaje si no hay otro más específico */
  fallback?: string;
};

const ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  // Contratos
  CONTRACT_NOT_FOUND: 'No encontramos ese contrato. Puede que haya sido eliminado.',
  CONTRACT_DELETED: 'Este contrato fue eliminado y ya no está disponible.',
  CONTRACT_LIMIT:
    'Alcanzaste el límite de contratos de tu plan. Elimina alguno o actualiza a Pro.',
  CONTRACT_EXISTS: 'Ya existe un contrato con ese identificador. Vuelve a intentar la subida.',
  INVALID_STORAGE_PATH: 'Hubo un problema al guardar el archivo. Vuelve a subirlo.',
  INVALID_FILE_TYPE: 'Solo se permiten archivos PDF o Word (.doc, .docx).',
  FILE_TOO_LARGE: 'El archivo es demasiado grande para tu plan actual.',
  FILE_NOT_IN_STORAGE:
    'El archivo no se subió correctamente. Espera unos segundos e inténtalo de nuevo.',
  NO_PDF: 'Este contrato no tiene un documento válido para analizar.',

  // Permisos y sesión
  FORBIDDEN: 'No tienes permiso para acceder a este recurso.',
  FEATURE_PRO_REQUIRED: 'Esta función requiere el plan Pro.',
  OCR_PRO_REQUIRED:
    'Este PDF parece escaneado. En Free usa un PDF con texto seleccionable o Word (.docx) sin límite de páginas. En Pro el OCR solo lee las primeras 7 páginas del escaneo.',

  // Cuotas
  QUOTA_ANALYSES_EXCEEDED:
    'Has usado todos los análisis de tu plan este mes. Actualiza a Pro para continuar.',
  QUOTA_COMPARISONS_EXCEEDED:
    'Has usado todas las comparaciones de tu plan este mes. Actualiza a Pro para continuar.',

  // Análisis y comparación
  ANALYSIS_FAILED:
    'No pudimos analizar el contrato. Revisa que el PDF sea legible e inténtalo de nuevo.',
  RISKS_FAILED:
    'No pudimos generar el perfil de riesgo. Inténtalo de nuevo en unos minutos.',
  COMPARE_FAILED:
    'No pudimos comparar los contratos. Verifica que ambos documentos estén completos.',
  COMPARISON_NOT_FOUND: 'No encontramos esa comparación. Puede que haya expirado o sido eliminada.',
  COMPARISON_NOT_READY: 'La comparación aún no está lista. Espera unos segundos e inténtalo de nuevo.',
  COMPARISON_ALREADY_REVIEWED: 'Esta comparación ya fue revisada.',
  ALERT_NOT_FOUND: 'No encontramos esa notificación.',

  // Validación y servidor
  VALIDATION_ERROR: 'Algunos datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
  INTERNAL_ERROR: 'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.',
  STORAGE_DOWNLOAD_ERROR: 'No pudimos leer el archivo del contrato. Vuelve a subirlo.',
  DEEPSEEK_ERROR:
    'El servicio de inteligencia artificial no está disponible en este momento. Inténtalo más tarde.',
  DEEPSEEK_EMPTY: 'El análisis no devolvió resultados. Inténtalo con otro documento.',
  DEEPSEEK_TIMEOUT:
    'El análisis tardó demasiado. Prueba con un PDF más corto o inténtalo de nuevo.',

  // Firebase Storage (códigos usados en runtime)
  'storage/unauthorized': 'No tienes permiso para subir archivos. Inicia sesión de nuevo.',
  'storage/canceled': 'La subida del archivo fue cancelada.',
  'storage/unknown': 'No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo.',
  'storage/retry-limit-exceeded':
    'La subida falló tras varios intentos. Comprueba tu conexión e inténtalo de nuevo.',
  'storage/quota-exceeded': 'Se alcanzó el límite de almacenamiento. Contacta con soporte.',
};

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.',
  401: 'Tu sesión expiró o no has iniciado sesión. Vuelve a entrar en tu cuenta.',
  403: 'No tienes permiso para realizar esta acción con tu plan actual.',
  404: 'No encontramos el recurso solicitado. Si estás en local, comprueba que los emuladores estén activos.',
  409: 'Hay un conflicto con los datos actuales. Recarga la página e inténtalo de nuevo.',
  413: 'El archivo es demasiado grande.',
  422: 'No se pudo procesar el documento. Verifica que sea un PDF o DOCX válido.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  500: 'Error interno del servidor. Inténtalo de nuevo en unos minutos.',
  502: 'El servidor no respondió correctamente. Inténtalo de nuevo en unos minutos.',
  503: 'El servicio no está disponible temporalmente. Inténtalo más tarde.',
  504: 'La operación tardó demasiado. Inténtalo de nuevo.',
};

function isGenericHttpMessage(message: string): boolean {
  return /^Error HTTP \d{3}$/.test(message.trim());
}

function getFirebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

function getMessageForHttpStatus(status: number, context?: ErrorContext): string {
  const base = HTTP_STATUS_MESSAGES[status];
  if (base) {
  if (status === 404 && context?.action) {
    return `No pudimos ${context.action}. Verifica que el servidor esté en marcha o que tengas sesión iniciada.`;
  }
    return base;
  }
  if (context?.action) {
    return `No pudimos ${context.action}. Error del servidor (${status}).`;
  }
  return `Ocurrió un error del servidor (${status}). Inténtalo de nuevo.`;
}

function getNetworkErrorMessage(context?: ErrorContext): string {
  if (context?.action) {
    return `No pudimos ${context.action}. Comprueba tu conexión a internet o que el servidor esté en marcha.`;
  }
  return 'No hay conexión con el servidor. Comprueba tu internet o que la aplicación esté ejecutándose en local.';
}

/**
 * Convierte cualquier error (API, red, Firebase, etc.) en un mensaje claro para el usuario.
 */
export function getUserFacingErrorMessage(
  error: unknown,
  context?: ErrorContext
): string {
  const firebaseCode = getFirebaseErrorCode(error);
  if (firebaseCode?.startsWith('auth/') || firebaseCode === 'permission-denied') {
    return formatAuthError(error);
  }
  if (firebaseCode && ERROR_MESSAGES_BY_CODE[firebaseCode]) {
    return ERROR_MESSAGES_BY_CODE[firebaseCode];
  }

  if (isApiError(error)) {
    if (error.code && ERROR_MESSAGES_BY_CODE[error.code]) {
      return ERROR_MESSAGES_BY_CODE[error.code];
    }
    if (error.message && !isGenericHttpMessage(error.message)) {
      return error.message;
    }
    return getMessageForHttpStatus(error.status, context);
  }

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed')
    ) {
      return getNetworkErrorMessage(context);
    }
  }

  if (error instanceof Error) {
    if (isGenericHttpMessage(error.message)) {
      const match = error.message.match(/\d{3}/);
      const status = match ? Number(match[0]) : 500;
      return getMessageForHttpStatus(status, context);
    }
    if (
      error.message.includes('PERMISSION_DENIED') ||
      error.message.includes('permission-denied')
    ) {
      return formatAuthError(error);
    }
    if (
      error.message.toLowerCase().includes('failed to fetch') ||
      error.message.toLowerCase().includes('network')
    ) {
      return getNetworkErrorMessage(context);
    }
    return error.message;
  }

  return context?.fallback ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

/**
 * Mensaje amigable para errores de cuota (incluye enlace a planes en la UI).
 */
export function getQuotaErrorMessage(error: unknown): string {
  if (isApiError(error) && error.code && ERROR_MESSAGES_BY_CODE[error.code]) {
    return ERROR_MESSAGES_BY_CODE[error.code];
  }
  return getUserFacingErrorMessage(error, {
    fallback: 'Has alcanzado el límite de tu plan este mes.',
  });
}
