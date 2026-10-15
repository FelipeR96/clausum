export function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null;

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este correo ya tiene cuenta. Inicia sesión o usa otro email.';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/missing-email':
      return 'Escribe tu correo para recuperar la contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de inicio de sesión. Inténtalo de nuevo.';
    case 'auth/cancelled-popup-request':
      return 'Ya hay un inicio de sesión en curso. Espera un momento.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente. Permítelas para este sitio.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Comprueba tu internet e inténtalo de nuevo.';
    case 'auth/requires-recent-login':
      return 'Por seguridad, vuelve a iniciar sesión antes de cambiar tu contraseña.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Correo o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    case 'permission-denied':
      return 'No se pudo guardar tu perfil. Recarga la página e inténtalo de nuevo.';
    default:
      break;
  }

  if (error instanceof Error) {
    if (error.message.includes('PERMISSION_DENIED')) {
      return 'No se pudo guardar tu perfil en la base de datos. Recarga e inténtalo de nuevo.';
    }
    return error.message;
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
