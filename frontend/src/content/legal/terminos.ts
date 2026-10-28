import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_COUNTRY,
  LEGAL_ENTITY_NAME,
  type LegalSection,
} from './constants';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'aceptacion',
    title: '1. Aceptación de los términos',
    paragraphs: [
      `Estos Términos y Condiciones de Uso (los «Términos») regulan el acceso y uso del sitio web, la aplicación y los servicios de ${LEGAL_ENTITY_NAME} («Clausum», «nosotros»).`,
      'Al registrarse, iniciar sesión o utilizar cualquier funcionalidad, usted («Usuario») declara ser mayor de edad, tener capacidad legal para contratar y aceptar íntegramente estos Términos y la Política de Privacidad.',
      'La aceptación se expresa por medios electrónicos y tiene plena validez conforme a la Ley 527 de 1999. Conservamos el registro del momento en que usted aceptó y de la versión vigente en ese momento.',
      'Si no está de acuerdo con alguna parte, no debe usar el servicio.',
    ],
  },
  {
    id: 'servicio',
    title: '2. Qué es y qué no es Clausum',
    paragraphs: [
      'Clausum es una plataforma en línea que permite cargar contratos en formato PDF o Word, analizarlos con inteligencia artificial, comparar versiones y obtener alertas de riesgo apoyadas en un corpus normativo configurado, principalmente de Colombia.',
      'Clausum no es un bufete de abogados, no presta servicios de abogacía ni representación, y no interviene en la relación contractual entre usted y sus contrapartes.',
      'El servicio incluye un plan gratuito y planes de pago con distintos límites, descritos en la página de Precios. Las funcionalidades pueden evolucionar; los cambios relevantes se publicarán en el sitio o se comunicarán por correo.',
    ],
  },
  {
    id: 'no-asesoria',
    title: '3. No constituye asesoría legal',
    paragraphs: [
      'Clausum NO presta asesoría jurídica, consultoría vinculante ni dictamen legal. Los análisis, puntuaciones, alertas y referencias normativas son herramientas informativas generadas automáticamente por un sistema de inteligencia artificial.',
      'El uso de la plataforma no crea una relación abogado-cliente ni genera secreto profesional sobre la información que usted cargue.',
      'Usted es el único responsable de las decisiones que tome sobre sus contratos. Debe consultar a un abogado antes de firmar, modificar, rechazar o ejecutar obligaciones contractuales.',
      'Las referencias a leyes o artículos pueden estar incompletas, desactualizadas o mal interpretadas por el sistema. No garantizamos la vigencia de las normas citadas ni su aplicabilidad al caso concreto.',
    ],
  },
  {
    id: 'cuenta',
    title: '4. Registro y cuenta',
    paragraphs: [
      'Debe proporcionar información veraz y mantenerla actualizada. Es responsable de la confidencialidad de sus credenciales y de toda la actividad realizada desde su cuenta.',
      'Una cuenta corresponde a una persona natural o a una persona jurídica a través de quien la represente. No puede compartir credenciales ni revender el acceso sin autorización escrita.',
      'Podemos suspender o cerrar cuentas que infrinjan estos Términos o la ley, o que representen un riesgo de seguridad o fraude, conforme a la sección de Terminación.',
    ],
  },
  {
    id: 'contenido',
    title: '5. Sus documentos y la licencia que nos otorga',
    paragraphs: [
      'Usted conserva la propiedad de los documentos y datos que carga. No adquirimos ningún derecho sobre su contenido.',
      'Nos otorga una licencia limitada, no exclusiva, revocable y gratuita para alojar, procesar, transmitir a los proveedores que intervienen en el servicio y mostrarle dicho contenido, con el único fin de prestarle el servicio que solicitó. Esa licencia termina cuando usted elimina el documento o su cuenta.',
      'No usamos sus documentos para entrenar modelos de inteligencia artificial, ni los vendemos, ni los cedemos a terceros con fines comerciales.',
      'Usted declara tener derecho a cargar los documentos y que su uso en Clausum no infringe derechos de terceros ni obligaciones de confidencialidad que le vinculen. Si un documento está sujeto a un deber de reserva que impida su tratamiento por terceros, no lo cargue.',
    ],
  },
  {
    id: 'planes',
    title: '6. Planes, precios y pagos',
    paragraphs: [
      'Clausum ofrece dos formas de pago distintas: la compra de un análisis suelto, que no exige crear cuenta y se describe en la sección siguiente, y las suscripciones, que amplían límites y funcionalidades y se renuevan según el período elegido.',
      'Una cuenta sin suscripción vigente no incluye análisis mensuales. Conserva el acceso a los análisis que usted ya haya realizado mientras la cuenta exista.',
      'Los precios vigentes, la moneda y los límites de cada plan son los publicados en la página de Precios en el momento de la contratación. Esa página prevalece sobre cualquier cifra mencionada en otro lugar del sitio.',
      'Los precios mostrados son finales e incluyen los impuestos aplicables, si los hubiere. No añadimos cargos no anunciados en el momento de la compra.',
      'Los pagos en Colombia se procesan a través de Wompi (tarjeta, PSE, Nequi u otros medios habilitados). Los pagos desde otros países se procesan a través de PayPal. Clausum no captura ni almacena los datos completos de su medio de pago: los recoge la pasarela en su propio entorno.',
      'El cobro aparecerá en su extracto con el nombre de la pasarela correspondiente o el de Clausum, según el medio utilizado.',
    ],
  },
  {
    id: 'compra-unica',
    title: '7. Compra de un análisis sin cuenta',
    paragraphs: [
      'Puede pagar el análisis de un solo documento sin registrarse. Sus condiciones son distintas de las de una suscripción y conviene conocerlas antes de pagar.',
      'El análisis se realiza ANTES de que usted pague. Al subir el documento le mostramos sin costo el veredicto del contrato, cuántas cláusulas de riesgo encontramos y una cita textual de cada una. Lo que usted paga es el informe completo: en qué consiste cada riesgo, qué consecuencias tiene y con qué redacción corregirlo. De este modo puede ver qué compra antes de comprarlo.',
      'El precio aplicable es el que se le muestra en esa pantalla, y queda fijado al subir el documento. Un cambio posterior de nuestra lista de precios no afecta a una compra ya iniciada.',
      'La entrega es UNA sola. Puede descargar el informe en PDF o pedirnos que lo enviemos a un correo electrónico, pero no las dos cosas: al completarse la primera entrega el análisis se borra de nuestros servidores. Se lo advertimos en pantalla antes de que elija.',
      'Como no hay cuenta, no tenemos forma de recuperar el informe después. Si pierde el archivo descargado o escribe mal su correo, no podremos reenviárselo porque ya no existe. Guarde el PDF en cuanto lo reciba.',
      'Si la descarga se interrumpe o el envío de correo falla, la entrega no se considera completada y puede volver a intentarlo.',
      'Aunque usted no lo recoja, el análisis se borra veinticuatro (24) horas después de subir el documento. Si paga, ese plazo vuelve a contar veinticuatro horas desde el momento del pago, para que pagar sobre el límite no le deje sin tiempo.',
      'El documento que usted sube no se almacena en ningún momento: se extrae su texto en memoria y el archivo se descarta. El texto extraído existe únicamente mientras dura el análisis y se borra al terminarlo.',
      'Esta modalidad no admite PDF escaneados, que requieren reconocimiento óptico de caracteres y están disponibles solo en los planes de suscripción. El sistema los rechaza al subirlos, antes de cobrar nada.',
      'La compra de un análisis no crea una suscripción, no se renueva y no genera cobros posteriores.',
    ],
  },
  {
    id: 'renovacion',
    title: '8. Renovación automática y cancelación',
    paragraphs: [
      'Las suscripciones de pago se renuevan automáticamente al final de cada período —mensual o anual, según el plan que elija— y se cobran al mismo medio de pago, hasta que usted las cancele. Al contratar, usted acepta expresamente esta renovación.',
      'Puede cancelar en cualquier momento desde Ajustes, sin dar explicaciones, sin llamar a nadie y sin penalización.',
      'Cancelar no corta el servicio de inmediato: usted conserva el plan de pago hasta el final del período que ya abonó. A partir de esa fecha su cuenta deja de incluir análisis y comparaciones mensuales, pero conserva el acceso a los que ya realizó: no pierde su historial por dejar de pagar. No se emiten devoluciones por el tiempo no utilizado del período en curso, salvo lo previsto en la sección de Reversión del pago o cuando la ley lo imponga.',
      'Si cambia de un plan mensual a uno anual estando vigente su período, los días que le quedaban se suman al nuevo período: no los pierde.',
      'Si un cobro de renovación falla, intentaremos notificárselo y su cuenta dejará de incluir análisis mensuales al vencer el período pagado, conservando el acceso a su historial. No acumulamos deuda ni lo cobramos después.',
      'Le avisaremos por correo de cualquier modificación del precio de su suscripción con antelación razonable y antes de que se aplique a una renovación, para que pueda cancelar si no está de acuerdo.',
    ],
  },
  {
    id: 'retracto',
    title: '9. Derecho de retracto',
    paragraphs: [
      'El artículo 47 de la Ley 1480 de 2011 reconoce al consumidor un derecho de retracto de cinco (5) días hábiles en las ventas realizadas a distancia. Ese mismo artículo establece que el retracto no procede, entre otros casos, «en los servicios cuya prestación haya comenzado con el acuerdo del consumidor».',
      'Clausum se encuentra en ese supuesto y queremos que usted lo sepa antes de pagar, no después: el servicio se habilita de forma inmediata una vez confirmado el pago. Desde ese mismo instante su cuenta queda en el plan contratado y usted puede analizar documentos sin esperar.',
      'Al completar el pago, usted solicita y acepta expresamente que la prestación del servicio comience de inmediato, y reconoce que, por esa razón, no dispondrá del derecho de retracto previsto en el artículo 47.',
      'Esto no le deja sin salida: puede cancelar la renovación automática cuando quiera, conservando el servicio hasta el final del período pagado, y conserva íntegros los derechos descritos en las dos secciones siguientes, que ninguna cláusula de este contrato puede limitar.',
      'En la compra de un análisis suelto el servicio no solo comienza de inmediato: ya está prestado. El análisis se ejecuta antes del pago y usted ve parte de su resultado en pantalla; al pagar, el informe completo queda disponible en el acto y se entrega a su elección. Por esa razón esa compra tampoco admite retracto, y al completar el pago usted solicita y acepta expresamente que la prestación se tenga por iniciada.',
      'Si prefiere no renunciar al retracto, no complete la compra y escríbanos antes a soporte para buscar una alternativa.',
    ],
  },
  {
    id: 'reversion',
    title: '10. Reversión del pago',
    paragraphs: [
      'Con independencia de lo anterior, el artículo 51 de la Ley 1480 de 2011 le permite solicitar la reversión del pago cuando la compra se hizo por medios electrónicos y ocurre alguna de estas situaciones: fue víctima de fraude, la operación no fue solicitada por usted, el servicio no le fue prestado, o el servicio prestado no corresponde a lo que contrató o resulta defectuoso.',
      'Para ejercerlo debe presentar la solicitud dentro de los cinco (5) días hábiles siguientes a que tuvo noticia de la operación, dirigiéndola tanto a nosotros como a la entidad emisora de su medio de pago.',
      `Puede dirigirnos esa solicitud a ${LEGAL_CONTACT_EMAIL}. No le pondremos trabas: si la solicitud es procedente colaboraremos con su banco o pasarela para que la reversión se haga efectiva en los plazos legales.`,
    ],
  },
  {
    id: 'garantia',
    title: '11. Garantía legal del servicio',
    paragraphs: [
      'Conforme a los artículos 7 y 8 de la Ley 1480 de 2011, respondemos por la calidad e idoneidad del servicio que prestamos: que la plataforma funcione, que sus documentos se procesen, que sus datos estén disponibles y que las funcionalidades contratadas estén operativas.',
      'Esta garantía cubre el funcionamiento del servicio, no el acierto del contenido generado por la inteligencia artificial. Un análisis que omita una cláusula o interprete mal una norma no es una falla de la plataforma, sino una limitación propia de la tecnología, advertida expresamente en estos Términos y en el Aviso Legal. Por eso insistimos en que ningún resultado debe usarse sin verificación profesional.',
      'Si el servicio presenta fallas de funcionamiento, escríbanos a soporte: repararemos el problema, y si no es posible, le devolveremos la parte proporcional de lo pagado por el tiempo en que no pudo usarlo.',
    ],
  },
  {
    id: 'uso-aceptable',
    title: '12. Uso aceptable',
    paragraphs: ['Está prohibido:'],
    bullets: [
      'Intentar acceder a datos, documentos o cuentas de otros usuarios.',
      'Realizar ingeniería inversa, extracción masiva de datos o cualquier acción que sobrecargue deliberadamente la infraestructura.',
      'Usar el servicio para fines ilícitos, para elaborar documentos fraudulentos o para analizar documentos obtenidos ilegalmente.',
      'Eludir los límites de su plan o cualquier control técnico.',
      'Revender, sublicenciar o prestar el servicio a terceros sin autorización escrita.',
      'Cargar contenido malicioso, archivos infectados o datos manifiestamente excesivos frente a lo necesario para el análisis.',
    ],
  },
  {
    id: 'propiedad',
    title: '13. Propiedad intelectual',
    paragraphs: [
      'El software, el diseño, la marca Clausum, los textos del sitio y el corpus legal curado son propiedad de Clausum o de sus licenciantes. No se le concede ningún derecho sobre ellos más allá del uso permitido por estos Términos.',
      'Los textos de normas oficiales son de dominio público según su fuente; lo que es propio de Clausum es su selección, organización y anotación.',
      'Los resultados que la plataforma genera sobre sus documentos son suyos y puede usarlos libremente.',
    ],
  },
  {
    id: 'disponibilidad',
    title: '14. Disponibilidad del servicio',
    paragraphs: [
      'Procuramos la mayor disponibilidad posible, pero no garantizamos un servicio ininterrumpido ni libre de errores. Puede haber ventanas de mantenimiento, fallos de los proveedores de infraestructura, de inteligencia artificial o de las pasarelas de pago, y eventos de fuerza mayor ajenos a nuestro control.',
      'Cuando el mantenimiento sea programado, procuraremos avisar con antelación y realizarlo en horarios de bajo uso.',
      'Podemos modificar, suspender o discontinuar funcionalidades. Si una funcionalidad que usted paga desaparece de forma permanente, podrá cancelar y le devolveremos la parte proporcional del período no disfrutado.',
    ],
  },
  {
    id: 'limitacion',
    title: '15. Limitación de responsabilidad',
    paragraphs: [
      'EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY COLOMBIANA, CLAUSUM NO SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, LUCRO CESANTE, PÉRDIDA DE OPORTUNIDAD NI POR LAS CONSECUENCIAS DE DECISIONES QUE USTED ADOPTE CON BASE EN UN ANÁLISIS GENERADO POR LA PLATAFORMA.',
      'Nuestra responsabilidad total acumulada por cualquier reclamación relacionada con el servicio no excederá el monto que usted nos haya pagado en los doce (12) meses anteriores al hecho que la origine. Para quienes no tengan una suscripción de pago vigente —incluidas las cuentas sin suscripción y quienes hayan comprado el análisis de un documento suelto—, ese límite será de cincuenta mil pesos colombianos (COP $50.000) o su equivalente, aunque lo pagado haya sido menor.',
      'Nada de lo anterior limita ni excluye la responsabilidad por dolo o culpa grave, la garantía legal, el derecho a la reversión del pago, ni ninguno de los demás derechos que la ley colombiana reconoce al consumidor como irrenunciables. Si alguna disposición de esta sección resultara contraria a esas normas, se tendrá por no escrita y el resto conservará su validez.',
    ],
  },
  {
    id: 'indemnidad',
    title: '16. Indemnidad',
    paragraphs: [
      'Usted mantendrá indemne a Clausum frente a reclamaciones de terceros derivadas del contenido que cargue, de su falta de legitimación para cargarlo o del incumplimiento de estos Términos, en la medida permitida por la ley y sin que ello afecte sus derechos como consumidor.',
    ],
  },
  {
    id: 'terminacion',
    title: '17. Terminación y suspensión',
    paragraphs: [
      'Usted puede terminar la relación cuando quiera, cancelando su suscripción o eliminando su cuenta desde Ajustes.',
      'Nosotros podemos suspender o terminar su acceso si incumple gravemente estos Términos o la ley, si su uso compromete la seguridad de la plataforma o de otros usuarios, o si existe fraude en el pago. Salvo que la gravedad o una obligación legal exijan actuar de inmediato, le avisaremos antes y le daremos la oportunidad de corregir la situación.',
      'Si terminamos su cuenta sin que exista incumplimiento suyo, le devolveremos la parte proporcional de lo pagado por el período no disfrutado.',
      'Antes de cualquier eliminación podrá descargar sus datos desde Ajustes. El tratamiento posterior de la información se rige por la Política de Privacidad.',
    ],
  },
  {
    id: 'datos',
    title: '18. Protección de datos personales',
    paragraphs: [
      'El tratamiento de sus datos personales se rige por la Política de Privacidad, que forma parte integral de estos Términos.',
      'Llamamos su atención sobre un punto en particular: para analizar sus documentos, el texto que contienen se transmite a un proveedor internacional de inteligencia artificial situado fuera de Colombia. Esa sección de la Política de Privacidad merece una lectura atenta antes de cargar documentos sensibles.',
    ],
  },
  {
    id: 'modificaciones',
    title: '19. Modificación de estos Términos',
    paragraphs: [
      'Podemos modificar estos Términos para reflejar cambios en el servicio, en la ley o en los proveedores que intervienen. Publicaremos la versión vigente en esta dirección con su fecha de actualización.',
      'Los cambios sustanciales —en especial los que afecten precios, límites de los planes, condiciones de pago o sus derechos— se le comunicarán por correo electrónico o mediante aviso destacado en la aplicación, con antelación razonable a su entrada en vigor.',
      'Si no acepta una modificación sustancial, puede cancelar su suscripción antes de que entre en vigor y conservará el servicio hasta el final del período ya pagado. Las condiciones que usted aceptó rigen el período en curso.',
    ],
  },
  {
    id: 'comunicaciones',
    title: '20. Comunicaciones y notificaciones',
    paragraphs: [
      'Nos comunicaremos con usted a la dirección de correo registrada en su cuenta y mediante avisos dentro de la aplicación. Es su responsabilidad mantener ese correo actualizado y revisar la carpeta de no deseados.',
      `Usted puede comunicarse con nosotros en ${LEGAL_CONTACT_EMAIL} o desde el formulario de reporte de problemas disponible en el menú de la aplicación.`,
      'Las notificaciones electrónicas se entienden recibidas al día hábil siguiente de su envío, salvo prueba en contrario.',
    ],
  },
  {
    id: 'ley',
    title: '21. Ley aplicable, reclamaciones y jurisdicción',
    paragraphs: [
      `Estos Términos se rigen por las leyes de la República de ${LEGAL_COUNTRY}.`,
      'Antes de acudir a instancias formales, le pedimos que nos escriba: la mayoría de los problemas se resuelven en un intercambio de correos y preferimos resolverlos así.',
      'Si no queda satisfecho, como consumidor puede presentar su reclamación ante la Superintendencia de Industria y Comercio, que ejerce funciones jurisdiccionales en materia de protección al consumidor, o ante los jueces competentes.',
      'Ninguna cláusula de estos Términos le obliga a renunciar al fuero que la ley le reconoce como consumidor ni a someterse a una jurisdicción distinta de la que le corresponda.',
    ],
  },
  {
    id: 'generales',
    title: '22. Disposiciones generales',
    paragraphs: [
      'Si una cláusula de estos Términos resulta inválida o inaplicable, las demás conservan plena vigencia.',
      'El hecho de que no ejerzamos un derecho en un momento dado no significa que renunciemos a él.',
      'Estos Términos, junto con la Política de Privacidad, la Política de Cookies y el Aviso Legal, constituyen el acuerdo completo entre usted y Clausum respecto del servicio.',
      'Usted no puede ceder su posición en este contrato sin nuestra autorización. Nosotros podremos cederlo en caso de reorganización o transferencia del negocio, informándoselo previamente y sin menoscabo de sus derechos.',
    ],
  },
  {
    id: 'contacto',
    title: '23. Contacto',
    paragraphs: [`Consultas sobre estos Términos: ${LEGAL_CONTACT_EMAIL}.`],
  },
];
