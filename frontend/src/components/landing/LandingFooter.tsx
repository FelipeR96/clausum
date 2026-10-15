import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant bg-surface py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              Análisis de contratos con inteligencia artificial y contexto
              jurídico. Hecho para equipos que valoran claridad antes de firmar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-on-surface">Producto</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li>
                  <Link to="/analizar-contratos" className="hover:text-primary">
                    Analizar contratos
                  </Link>
                </li>
                <li>
                  <Link to="/comparar-contratos" className="hover:text-primary">
                    Comparar contratos
                  </Link>
                </li>
                <li>
                  <Link to="/detectar-riesgos" className="hover:text-primary">
                    Detectar riesgos
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-primary">
                    Precios
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Cuenta</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li>
                  <Link to="/login" className="hover:text-primary">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-primary">
                    Registrarse
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Legal</p>
              <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                <li>
                  <Link to="/legal/privacidad" className="hover:text-primary">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link to="/legal/terminos" className="hover:text-primary">
                    Términos de uso
                  </Link>
                </li>
                <li>
                  <Link to="/legal/aviso-legal" className="hover:text-primary">
                    Aviso legal
                  </Link>
                </li>
                <li>
                  <Link to="/legal/cookies" className="hover:text-primary">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-outline-variant pt-8 text-sm text-on-surface-variant sm:flex-row">
          <p>© {year} Clausum. Todos los derechos reservados.</p>
          <p className="text-xs">
            <Link to="/legal/aviso-legal" className="hover:text-primary hover:underline">
              Aviso legal
            </Link>
            {' · '}
            El análisis de Clausum no constituye asesoría legal.
          </p>
        </div>
      </div>
    </footer>
  );
}
