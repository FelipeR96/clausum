import { Link } from 'react-router-dom';

/**
 * La autorizacion de tratamiento de datos de quien analiza sin cuenta.
 *
 * No es un descargo de cortesia: es donde se recoge una autorizacion que no
 * puede venir de ningun otro sitio. La Ley 1581 de 2012 exige autorizacion
 * previa e informada del titular para tratar sus datos personales, y la
 * politica de privacidad dice que esa autorizacion se da "al registrarse".
 * Aqui no hay registro, asi que sin este aviso no habria autorizacion
 * ninguna --y el texto del contrato, que puede traer nombres y cedulas
 * dentro, sale del pais para poder analizarlo.
 *
 * Va justo encima del boton y no al pie de la pagina a proposito: una
 * autorizacion que hay que ir a buscar no es informada. Por la misma razon
 * nombra lo concreto --que el texto sale de Colombia-- en vez de remitir
 * a la politica y confiar en que alguien la abra.
 *
 * El texto vive en un solo componente, como el aviso antes de pagar: copiado
 * en cada sitio, el dia que cambie la redaccion cambiaria en unos y no en
 * otros, y el que se quede atras sera justo el que alguien reclame.
 */
export function AvisoAntesDeAnalizar() {
  return (
    <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
      Al continuar autorizas que extraigamos el texto de tu documento y lo transmitamos a
      nuestro proveedor de inteligencia artificial, cuya infraestructura está fuera de
      Colombia, con el único fin de producir tu análisis. Si tu contrato contiene nombres,
      cédulas o salarios, forman parte de ese texto. No se guarda el archivo y el análisis
      se borra al entregártelo. Detalle completo en la{' '}
      <Link to="/legal/privacidad" className="font-semibold text-primary hover:underline">
        Política de privacidad
      </Link>
      .
    </p>
  );
}
