import { Link } from 'react-router-dom';

export function AuthFooter() {
  return (
    <footer className="border-t border-outline-variant/60 bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div className="text-center md:text-left">
          <p className="font-display text-lg font-bold text-on-surface">Clausum</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            © {new Date().getFullYear()} Clausum. Todos los derechos reservados.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-on-surface-variant">
          <Link to="/" className="underline-offset-2 hover:text-primary hover:underline">
            Inicio
          </Link>
          <Link to="/pricing" className="underline-offset-2 hover:text-primary hover:underline">
            Precios
          </Link>
          <Link to="/analizar-contratos" className="underline-offset-2 hover:text-primary hover:underline">
            Analizar
          </Link>
          <Link to="/legal/privacidad" className="underline-offset-2 hover:text-primary hover:underline">
            Privacidad
          </Link>
          <Link to="/legal/terminos" className="underline-offset-2 hover:text-primary hover:underline">
            Términos
          </Link>
          <Link to="/legal/aviso-legal" className="underline-offset-2 hover:text-primary hover:underline">
            Aviso legal
          </Link>
        </div>
      </div>
    </footer>
  );
}
