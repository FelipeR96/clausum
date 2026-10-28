import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_COUNTRY,
  LEGAL_ENTITY_NAME,
  type LegalSection,
} from './constants';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'resumen',
    title: 'En resumen',
    paragraphs: [
      'Esta sección no reemplaza el resto del documento, pero si solo va a leer una parte, lea esta.',
    ],
    bullets: [
      'Para analizar su contrato, el texto del documento sale de Colombia. Se envía a un proveedor internacional de inteligencia artificial. Sin ese envío no hay análisis posible.',
      'No enviamos su nombre, su correo ni sus datos de pago junto con ese texto.',
      'No vendemos sus contratos ni los usamos para entrenar modelos.',
      'El análisis lo genera una máquina y puede equivocarse. No es asesoría legal.',
      'Puede descargar todos sus datos y eliminar su cuenta cuando quiera, desde Ajustes.',
      'Los comprobantes de pago no se borran, porque la ley tributaria obliga a conservarlos; lo que hacemos es desvincularlos de su identidad.',
    ],
  },
  {
    id: 'responsable',
    title: '1. Responsable del tratamiento',
    paragraphs: [
      `${LEGAL_ENTITY_NAME} (en adelante, «Clausum», «nosotros» o «el Responsable») es el responsable del tratamiento de los datos personales que usted (el «Titular» o «Usuario») nos proporcione al registrarse, usar la plataforma o contactarnos.`,
      `Clausum opera un servicio de análisis contractual asistido por inteligencia artificial, orientado principalmente a usuarios en ${LEGAL_COUNTRY}. Para ejercer sus derechos o formular consultas sobre privacidad puede escribir a ${LEGAL_CONTACT_EMAIL}.`,
      'Puede solicitar por ese mismo medio los datos completos de identificación del responsable.',
    ],
  },
  {
    id: 'alcance',
    title: '2. Alcance y marco normativo',
    paragraphs: [
      'Esta Política describe cómo recopilamos, usamos, almacenamos, transmitimos y protegemos sus datos personales cuando utiliza el sitio web, la aplicación y los servicios asociados de Clausum.',
      'El tratamiento se realiza conforme al artículo 15 de la Constitución Política de Colombia, la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015), las circulares de la Superintendencia de Industria y Comercio (SIC) y demás normas aplicables en materia de protección de datos personales y comercio electrónico.',
      'Al crear una cuenta o utilizar Clausum, usted declara haber leído esta política. Cuando la ley exija autorización previa, expresa e informada, la solicitaremos de forma separada antes de tratar datos para finalidades distintas de las descritas aquí.',
    ],
  },
  {
    id: 'datos',
    title: '3. Datos personales que tratamos',
    paragraphs: ['Recopilamos las siguientes categorías de datos, según su interacción con el servicio:'],
    bullets: [
      'Datos de identificación y contacto: nombre, correo electrónico, foto de perfil si la sube, identificador interno de cuenta.',
      'Datos de autenticación: credenciales gestionadas por nuestro proveedor de infraestructura de identidad. Si usted elige iniciar sesión mediante un proveedor de identidad externo, recibimos únicamente la información que ese proveedor comparta según la configuración de su propia cuenta. Nunca conocemos la contraseña de ese proveedor.',
      'Documentos y su contenido: los archivos PDF o Word que usted sube, el texto extraído de ellos, sus metadatos (nombre del archivo, fechas, tipo de contrato) y los resultados del análisis (resúmenes, cláusulas identificadas, alertas, referencias normativas).',
      'Datos de uso y facturación: plan contratado, región de facturación, consumo mensual, historial de actividad, y los registros de los pagos procesados por la pasarela correspondiente. No almacenamos el número completo de su tarjeta ni su código de seguridad: esos datos los captura la pasarela en su propio entorno y nunca pasan por nuestros servidores.',
      'Datos técnicos: dirección IP, tipo de navegador, identificadores de sesión, registros de errores y eventos de seguridad necesarios para operar el servicio y detectar abusos.',
      'Comunicaciones: los mensajes que nos envíe a soporte o mediante el formulario de reporte de problemas, y las preferencias de novedades por correo si las autoriza.',
      'Si analiza un documento SIN crear cuenta, recogemos mucho menos y conviene detallarlo: el archivo no se almacena en ningún momento —se extrae su texto en memoria y el archivo se descarta—, no hay nombre ni cuenta asociados, y del origen de la petición guardamos un valor derivado irreversible, no su dirección IP, con el único fin de limitar el abuso por volumen. Si pide el informe por correo, guardamos esa dirección hasta entregarlo y la borramos con el análisis.',
    ],
  },
  {
    id: 'finalidades',
    title: '4. Finalidades del tratamiento',
    paragraphs: ['Tratamos sus datos únicamente para las siguientes finalidades:'],
    bullets: [
      'Crear y administrar su cuenta de usuario y autenticar su acceso.',
      'Prestar el servicio: analizar, comparar y detectar riesgos en los contratos que usted cargue.',
      'Procesar sus documentos mediante extracción de texto, reconocimiento óptico de caracteres cuando el documento sea una imagen, y envío controlado a un proveedor internacional de modelos de lenguaje para generar el resultado.',
      'Consultar el corpus normativo configurado y enriquecer el análisis con referencias legales.',
      'Gestionar planes, límites de uso, cobros, renovaciones y facturación.',
      'Enviarle notificaciones operativas: confirmación de un análisis, avisos sobre su cuenta o su suscripción, y cambios relevantes en el servicio o en estas políticas.',
      'Atender solicitudes de soporte, reportes de errores y el ejercicio de sus derechos como titular.',
      'Prevenir fraude y uso abusivo, y proteger la seguridad e integridad de la plataforma.',
      'Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridad competente.',
      'Con su consentimiento separado y revocable: enviarle novedades sobre el producto. Nunca le enviaremos publicidad sin ese consentimiento, y puede retirarlo desde cualquier correo o desde Ajustes.',
    ],
  },
  {
    id: 'ia',
    title: '5. Qué pasa exactamente cuando usted analiza un contrato',
    paragraphs: [
      'Esta es la sección más importante de esta política y la escribimos sin rodeos: el contenido de sus contratos sale del país.',
      'Cuando usted solicita un análisis, una comparación o una detección de riesgos, Clausum extrae el texto del documento y lo transmite a un proveedor internacional de modelos de lenguaje, cuya infraestructura se encuentra fuera de Colombia. Junto con ese texto viajan los artículos normativos que acompañan la consulta. No se transmiten su nombre, su correo electrónico, su identificador de cuenta ni sus datos de facturación: el proveedor recibe el texto a analizar, no su identidad.',
      'Conviene que entienda la consecuencia práctica: si su contrato contiene nombres, cédulas, salarios, direcciones o cualquier otro dato personal dentro de su propio texto, esa información forma parte del texto que se transmite. Si un documento es demasiado sensible para salir del país, no lo analice aquí.',
      'Sin esa transmisión el servicio no puede funcionar. No es una opción que podamos desactivar manteniendo la función de análisis.',
      'Esto ocurre igual con cuenta y sin ella: quien compra el análisis de un documento suelto tampoco puede obtenerlo sin que su texto salga del país. La diferencia es cuánto se conserva después, no por dónde pasa: en ese caso el análisis se borra al entregarlo y, en todo caso, veinticuatro horas después de subir el documento.',
      'Sobre el entrenamiento de modelos: Clausum no vende sus contratos, no los utiliza para entrenar modelos propios ni los comparte con terceros distintos de los encargados descritos en esta política. Las condiciones bajo las cuales el proveedor de inteligencia artificial trata la información que recibe se rigen por el contrato que tenemos suscrito con él y por sus términos de servicio, que pueden cambiar sin nuestra intervención. Cuando esas condiciones cambien de forma relevante, actualizaremos esta política y se lo informaremos.',
      'Para alojar la aplicación, autenticar su acceso, guardar sus archivos y ejecutar el servicio utilizamos además proveedores internacionales de infraestructura en la nube, con centros de datos que pueden estar fuera de Colombia. Esos proveedores actúan como encargados del tratamiento y no utilizan su información para fines propios.',
      `Puede solicitar en cualquier momento la relación actualizada de los encargados que intervienen en el servicio y los países donde operan, escribiendo a ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: 'internacional',
    title: '6. Transmisión y transferencia internacional de datos',
    paragraphs: [
      'La ley colombiana distingue dos figuras que conviene no confundir. Hay transmisión internacional cuando los datos salen del país hacia un encargado que los trata siguiendo nuestras instrucciones y por nuestra cuenta; hay transferencia internacional cuando los datos pasan a un tercero que los trata para fines propios.',
      'Lo que ocurre en Clausum es una transmisión: los proveedores descritos en la sección anterior procesan la información por encargo nuestro, conforme a contratos que regulan el alcance del tratamiento, las medidas de seguridad y la prohibición de usar los datos para finalidades distintas.',
      'Algunos de esos proveedores operan desde países que la SIC no ha declarado con nivel adecuado de protección. Por esa razón, y para que no quede ninguna duda sobre la licitud del envío, al aceptar esta política y utilizar las funciones de análisis usted otorga su autorización expresa e informada para que sus datos sean transmitidos y tratados fuera de Colombia en los términos aquí descritos.',
      'Si no desea que el contenido de sus documentos salga del país, no utilice las funciones de análisis. Puede mantener su cuenta y usar el resto de la plataforma.',
    ],
  },
  {
    id: 'automatizadas',
    title: '7. Decisiones automatizadas y revisión humana',
    paragraphs: [
      'El análisis, la puntuación de riesgo y las alertas que Clausum produce se generan de forma totalmente automatizada, sin intervención humana.',
      'Queremos ser claros sobre su alcance: ese resultado es información para que usted decida, no una decisión que nosotros tomemos sobre usted. Clausum no utiliza esos resultados para concederle o negarle un servicio, calificarlo crediticiamente, evaluarlo laboralmente ni adoptar ninguna otra decisión que produzca efectos jurídicos sobre su persona.',
      'Las únicas decisiones automatizadas que afectan su cuenta son operativas y verificables: el conteo de su consumo frente a los límites de su plan y la activación o vencimiento de su suscripción según los pagos registrados. Si considera que alguna de ellas es incorrecta, puede pedir revisión humana escribiendo a soporte, y la atenderemos.',
      'Un resultado de análisis que le parezca equivocado no es un dato personal inexacto susceptible de rectificación, sino una opinión generada por una máquina: puede reportárnoslo y lo tendremos en cuenta para mejorar el servicio, pero la vía para no depender de él es contrastarlo con un abogado.',
    ],
  },
  {
    id: 'terceros',
    title: '8. Datos de terceros contenidos en sus documentos',
    paragraphs: [
      'Los contratos que usted sube suelen contener datos personales de otras personas: contrapartes, empleados, representantes, testigos.',
      'Respecto de esos datos, Clausum actúa como encargado y usted como responsable: nosotros los tratamos únicamente siguiendo sus instrucciones y con el solo fin de prestarle el servicio que solicitó. No los usamos para ninguna finalidad propia, no los cruzamos con otros documentos ni construimos perfiles con ellos.',
      'Al cargar un documento, usted declara que cuenta con legitimación suficiente para hacerlo: porque es parte del contrato, porque tiene autorización de los titulares, porque obra en ejercicio de su actividad profesional, o por cualquier otro título válido. Esa responsabilidad es suya y no podemos verificarla.',
      'Si una de esas personas se dirige a nosotros para ejercer sus derechos sobre datos contenidos en un documento suyo, le trasladaremos la solicitud para que usted la atienda, salvo que la ley nos obligue a proceder de otro modo.',
    ],
  },
  {
    id: 'autorizacion',
    title: '9. Autorización y revocatoria',
    paragraphs: [
      'Al registrarse y aceptar los Términos y esta Política, usted autoriza el tratamiento de sus datos para las finalidades descritas, salvo aquellas que requieren un consentimiento adicional y separado, como el envío de novedades comerciales.',
      'Si usa Clausum sin crear cuenta, esa autorización no puede venir de un registro que no existe, así que se recoge donde corresponde: en la pantalla donde sube el documento le advertimos, antes de que pulse el botón, que para analizarlo extraeremos su texto y lo transmitiremos a un proveedor fuera de Colombia, y al pulsarlo usted lo autoriza. No analizamos nada antes de ese momento.',
      'Puede revocar su autorización o solicitar la supresión de sus datos cuando la ley lo permita. Tenga en cuenta dos límites: la revocatoria no tiene efectos retroactivos sobre tratamientos ya realizados de forma lícita, y no procede sobre datos cuya conservación nos imponga una obligación legal o contractual vigente, como los soportes de facturación.',
      'Revocar la autorización para las finalidades esenciales equivale a terminar la relación: sin ellas no podemos prestarle el servicio.',
    ],
  },
  {
    id: 'derechos',
    title: '10. Sus derechos y cómo ejercerlos',
    paragraphs: [
      'Como titular de datos personales en Colombia usted tiene derecho a conocer, actualizar y rectificar sus datos; a solicitar prueba de la autorización que otorgó; a ser informado sobre el uso que les damos; a revocar la autorización o solicitar la supresión cuando proceda; a acceder de forma gratuita a sus datos; y a presentar quejas ante la Superintendencia de Industria y Comercio.',
      `Para ejercerlos, escriba a ${LEGAL_CONTACT_EMAIL} desde el correo con el que se registró, indicando su nombre, el derecho que desea ejercer y una descripción clara de su solicitud. Podemos pedirle información adicional para verificar su identidad antes de atender solicitudes que afecten la cuenta, como una supresión.`,
      'La ley distingue dos trámites con plazos distintos, y estos son los que nos obligan:',
    ],
    bullets: [
      'Consultas (artículo 14 de la Ley 1581 de 2012): cuando usted pide conocer la información que tenemos sobre su persona. Respondemos en un máximo de diez (10) días hábiles desde que recibimos la consulta. Si no nos es posible, le informaremos los motivos y la fecha en que responderemos, que nunca superará los cinco (5) días hábiles siguientes al vencimiento del primer plazo.',
      'Reclamos (artículo 15): cuando usted considera que un dato debe corregirse, actualizarse o suprimirse, o que incumplimos algún deber. Respondemos en un máximo de quince (15) días hábiles contados desde el día siguiente a su recepción, prorrogables hasta por ocho (8) días hábiles más informándole los motivos.',
      'Si el reclamo llega incompleto, se lo haremos saber dentro de los cinco (5) días siguientes para que lo complete. Si transcurren dos (2) meses desde ese requerimiento sin que recibamos la información, se entenderá que desistió.',
      'Mientras un reclamo esté en trámite, incluiremos en el dato correspondiente la leyenda «reclamo en trámite» y el motivo, según exige la ley.',
      'Queja ante la SIC (artículo 16): la ley exige haber agotado antes la consulta o el reclamo ante nosotros. Una vez agotado, puede acudir a la Superintendencia de Industria y Comercio sin ninguna restricción de nuestra parte.',
    ],
  },
  {
    id: 'portabilidad',
    title: '11. Descarga de sus datos',
    paragraphs: [
      'Desde Ajustes → Seguridad → Descargar mis datos puede obtener en cualquier momento, y sin necesidad de solicitárnoslo, una copia de su perfil, sus contratos, sus análisis y su historial de actividad en un formato legible por máquina.',
      'Le recomendamos hacerlo antes de eliminar su cuenta: la eliminación es irreversible.',
    ],
  },
  {
    id: 'conservacion',
    title: '12. Conservación y eliminación de la cuenta',
    paragraphs: [
      'Conservamos sus datos mientras mantenga una cuenta activa o mientras sea necesario para prestar el servicio, cumplir obligaciones legales o atender reclamaciones.',
      'Cuando usted elimina su cuenta desde Ajustes, el proceso se ejecuta en este orden: primero cancelamos su suscripción ante la pasarela de pago, para que no se genere ningún cobro posterior; después eliminamos su perfil, sus contratos y los archivos que subió, sus análisis, comparaciones, alertas e historial de actividad.',
      'Hay una excepción y queremos que quede explícita: los comprobantes de pago no se eliminan. La normativa tributaria y contable obliga a conservar los soportes de facturación, y esa obligación prevalece sobre la supresión. Lo que hacemos es desvincularlos de usted: sustituimos su identificador de usuario por un código irreversible, de modo que el registro contable subsiste sin seguir siendo un dato atribuible a su persona. No conservamos su nombre, su correo ni el contenido de sus documentos asociados a esos comprobantes.',
      'En el análisis sin cuenta no hay nada que eliminar a petición, porque se elimina solo: el archivo nunca se guarda, el texto extraído se borra al terminar el análisis, y el resultado se borra en cuanto se lo entregamos o, si no lo recoge, veinticuatro horas después de subirlo. Pasado ese plazo no conservamos copia alguna y no podríamos recuperarlo ni a petición suya. Del cobro subsiste únicamente el comprobante, sin su nombre ni el contenido de su documento.',
      'Las copias de respaldo técnicas pueden retener información durante un período adicional limitado, hasta su rotación normal. Los registros técnicos y de seguridad se conservan por períodos acotados, proporcionales a la finalidad de detectar incidentes y abusos.',
    ],
  },
  {
    id: 'seguridad',
    title: '13. Seguridad de la información',
    paragraphs: [
      'Aplicamos medidas técnicas y organizativas razonables y proporcionales al riesgo:',
    ],
    bullets: [
      'Comunicaciones cifradas con el servidor mediante HTTPS, y cifrado de la información almacenada por parte de nuestros proveedores de infraestructura.',
      'Reglas de acceso verificadas en el servidor sobre la base de datos y el almacenamiento de archivos, de modo que cada usuario solo puede leer y escribir lo suyo. El control no depende de lo que haga el navegador.',
      'Las credenciales de acceso a servicios externos se guardan en un gestor de secretos y nunca se exponen al navegador ni se incluyen en el código.',
      'Separación entre el entorno de desarrollo y el de producción, y registro de las acciones administrativas con la cuenta que las ejecutó.',
      'Revisión de los límites de uso y de la autenticación en cada petición al servidor.',
    ],
  },
  {
    id: 'incidentes',
    title: '14. Incidentes de seguridad',
    paragraphs: [
      'Ningún sistema es invulnerable, y prometerle lo contrario sería deshonesto.',
      'Si se produce un incidente que afecte la seguridad de sus datos personales, lo reportaremos a la Superintendencia de Industria y Comercio en los términos y plazos que exige la normativa, y se lo comunicaremos a usted por correo electrónico cuando el incidente pueda representarle un riesgo, explicándole qué ocurrió, qué datos se vieron afectados y qué puede hacer al respecto.',
      'Usted también tiene una parte: mantenga la confidencialidad de su contraseña, no la reutilice en otros servicios y avísenos de inmediato si sospecha de un acceso no autorizado a su cuenta.',
    ],
  },
  {
    id: 'menores',
    title: '15. Menores de edad',
    paragraphs: [
      'Clausum no está dirigido a menores de dieciocho (18) años y no recopilamos intencionalmente sus datos. Si detectamos una cuenta creada por un menor, procederemos a eliminarla junto con la información asociada.',
      'Si usted es madre, padre o representante legal y cree que un menor a su cargo nos ha proporcionado datos, escríbanos y los suprimiremos.',
    ],
  },
  {
    id: 'cookies',
    title: '16. Cookies y tecnologías similares',
    paragraphs: [
      'El uso de cookies, almacenamiento local y tokens de sesión se describe en detalle en nuestra Política de Cookies, que forma parte integral de esta política.',
    ],
  },
  {
    id: 'cambios',
    title: '17. Cambios a esta política',
    paragraphs: [
      'Podemos actualizar esta Política para reflejar cambios legales, de los proveedores que intervienen en el servicio o de la propia plataforma. Publicaremos la versión vigente en esta misma dirección e indicaremos la fecha de actualización.',
      'Cuando los cambios sean sustanciales —en particular si amplían las finalidades o modifican las condiciones del envío de su información al exterior— se lo notificaremos por correo electrónico o mediante aviso destacado en la aplicación antes de que entren en vigor, y cuando la ley lo exija le solicitaremos una nueva autorización.',
    ],
  },
  {
    id: 'contacto',
    title: '18. Contacto y autoridad de control',
    paragraphs: [
      `Responsable del tratamiento: ${LEGAL_ENTITY_NAME}.`,
      `Correo para privacidad y habeas data: ${LEGAL_CONTACT_EMAIL}.`,
      'Autoridad de control: Superintendencia de Industria y Comercio (SIC), Delegatura para la Protección de Datos Personales — www.sic.gov.co. Recuerde que la ley exige agotar primero la consulta o el reclamo ante nosotros.',
    ],
  },
];
