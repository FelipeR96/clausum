import { Link } from 'react-router-dom';

/**
 * Aviso legal que acompana a cada bloque de pago.
 *
 * No es letra pequena por costumbre. El articulo 47 de la Ley 1480 de 2011
 * da al consumidor cinco dias habiles de retracto en las ventas a
 * distancia, y solo lo excluye, entre otros casos, «en los servicios cuya
 * prestacion haya comenzado con el acuerdo del consumidor».
 *
 * Clausum habilita el plan en el instante en que se confirma el pago, asi
 * que encaja en esa excepcion. Pero la excepcion exige el ACUERDO del
 * consumidor, y un acuerdo que solo existe enterrado en la pagina de
 * terminos es dificil de probar ante la SIC, donde la carga es del
 * proveedor. Por eso el aviso va donde se decide el pago.
 *
 * Se renderiza una vez por BLOQUE de pago, no por boton: con Wompi
 * recurrente activo conviven el boton de suscripcion y el de pago unico, y
 * dos avisos identicos apilados en la misma tarjeta no refuerzan nada,
 * estorban.
 *
 * El texto vive en un solo componente a proposito. Copiado en cada sitio,
 * el dia que cambie la redaccion cambiaria en unos y no en otros, y el que
 * se quede atras sera justo el que alguien reclame.
 */
export function AvisoAntesDePagar() {
  return (
    <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
      Al continuar aceptas los{' '}
      <Link
        to="/legal/terminos"
        target="_blank"
        className="font-medium text-primary hover:underline"
      >
        Términos y Condiciones
      </Link>{' '}
      y la{' '}
      <Link
        to="/legal/privacidad"
        target="_blank"
        className="font-medium text-primary hover:underline"
      >
        Política de Privacidad
      </Link>
      , y solicitas que el servicio empiece de inmediato. Por eso no aplica el
      derecho de retracto (art. 47, num. 1, Ley 1480 de 2011). La suscripción se
      renueva sola y puedes cancelarla cuando quieras desde Ajustes; conservas
      el plan hasta el final del período que pagaste.
    </p>
  );
}
