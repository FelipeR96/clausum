# Plan de pruebas — primera pasada sobre `clausum-dev`

Nada de esto se ha probado nunca con una sesión real. Todo lo que hay son
139 pruebas automáticas de reglas, facturación, esquemas y cuota: ninguna
toca DeepSeek, el OCR, la subida de archivos ni la pasarela.

**Dónde:** https://clausum-dev.web.app, en **Chrome**. El panel de navegador
de Claude bloquea las peticiones entre los puertos locales de Firebase y no
sirve para esto.

**Qué anotar en cada caso:** lo que pasó, no si "funcionó". Si algo falla,
el mensaje exacto y, si es un 500, el stack desde `system_logs` en Firestore.

---

## Bloque 0 — antes de abrir el navegador

- [ ] **OCR en local.** Con canvas 3 instalado debería ejecutarse en Windows
      por primera vez:
      `cd backend\functions && node scripts\check-ocr-pages.cjs`
      Antes moría con `Cannot find module '../build/Release/canvas.node'`.

- [ ] **Tener a mano cuatro archivos de prueba:**
      un PDF digital de ~10 páginas, uno escaneado de menos de 15 páginas,
      uno escaneado de más de 15, y un .docx. Contratos reales si es posible:
      un contrato inventado no sirve para juzgar si el análisis es útil.

**Dato importante:** `/dev/set-plan` devuelve **404 fuera del emulador**. En
el entorno desplegado no se puede pasar a Pro con un atajo; hay que pagar o
editar `users/{uid}` a mano en la consola de Firestore.

---

## Bloque 1 — cuenta y acceso

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | Registro con correo y contraseña | Crea el usuario y entra al panel |
| ☐ | Registro con Google | Igual, por ventana emergente |
| ☐ | Cerrar sesión y volver a entrar | Mantiene los datos |
| ☐ | "Olvidé mi contraseña" | Llega el correo de Firebase |
| ☐ | Abrir `/legal/privacidad` **sin sesión** | Carga. Hubo un fallo donde las páginas legales quedaron detrás del login |
| ☐ | `/panel` sin sesión | Redirige a login, no muestra el panel un instante |

**Hueco conocido:** no hay verificación de correo. Cualquiera se registra con
una dirección falsa. Decisión de producto pendiente, no un fallo.

---

## Bloque 2 — el núcleo: analizar un contrato

Esto es lo que decide si Clausum sirve. Lo demás es andamiaje.

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | Subir un PDF digital | Sube a Storage y aparece en contratos |
| ☐ | Lanzarle un análisis | Responde rápido (202) y el progreso avanza solo, sin recargar |
| ☐ | **Leer el informe entero** | ¿Las cláusulas detectadas son las que hay? ¿Los riesgos tienen sentido? ¿Las recomendaciones sirven? |
| ☐ | **Revisar los artículos citados** | Salen de tus 151 artículos. ¿Son los pertinentes o relleno? |
| ☐ | Apuntar `tokensUsed` del análisis en Firestore | Primer dato real de coste: `node scripts/cost-model.cjs --in=<entrada> --out=<salida>` |
| ☐ | Subir un **.docx** y analizarlo | Mismo camino sin pasar por OCR |
| ☐ | Detectar riesgos (`/panel/riesgos`) | |
| ☐ | Comparar dos contratos | El diff se entiende |
| ☐ | Panel y dashboard | Las cifras cuadran con lo que subiste |
| ☐ | Historial | Aparece todo, ordenado |
| ☐ | Alertas | Se generan y se marcan como leídas |

Si el informe es correcto pero no **útil**, eso es trabajo de prompts y
corpus, y es más importante que cualquier cosa de infraestructura
pendiente.

---

## Bloque 3 — los límites del plan Free

Que la cuota frene de verdad es lo que separa el plan gratis del de pago.

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | Gastar los 3 análisis del mes y pedir un cuarto | Bloquea y ofrece Pro |
| ☐ | Gastar la comparación e intentar otra | Igual |
| ☐ | Subir un **PDF escaneado** en Free | 403 con mensaje de que el OCR es de Pro |
| ☐ | Intentar exportar a PDF en Free | Bloqueado |
| ☐ | Subir un archivo de más de 5 MB | Rechazado con mensaje claro |
| ☐ | Subir un .txt o .xlsx | "Formato no soportado" |

---

## Bloque 4 — Pro, y la primera ejecución real del OCR

Para pasar a Pro sin pagar: consola de Firebase → Firestore → `users/{tu uid}`
→ `planId: "pro"` y `subscriptionStatus: "active"`.

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | **PDF escaneado de menos de 15 páginas** | Primera vez que el OCR corre en este proyecto. Cronometrar |
| ☐ | ¿El texto reconocido es legible? | Si sale basura, el OCR no sirve aunque "funcione" |
| ☐ | **Escaneado de más de 15 páginas** | Analiza las primeras 15 **sin avisar**, y `pageCount` dirá 15. Defecto conocido, confirmar que pasa |
| ☐ | Exportar un análisis a PDF | Se abre y se lee bien |
| ☐ | Historial completo | Sin el recorte de Free |

El caso del escaneado largo no es para ver si "funciona": es para confirmar
el problema antes de arreglarlo. Un abogado recibiría un informe de 15 de 40
páginas creyéndolo completo.

---

## Bloque 5 — pagos

Necesita llaves de sandbox de Wompi (`pub_test_`, `prv_test_`). El código
detecta sandbox solo, por el `test` de la llave pública.

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | Cargar las llaves reales de sandbox | `functions:secrets:set` crea una versión nueva; la función toma la última |
| ☐ | Checkout con tarjeta de prueba | Llega al widget de Wompi |
| ☐ | **El webhook llega y activa Pro** | Es el tramo que el simulador no cubre: que Wompi acepte tu firma y entregue el evento |
| ☐ | Reenviar el mismo evento | Idempotente: no extiende el periodo dos veces |
| ☐ | Cancelar la suscripción | Conserva Pro hasta el fin del periodo pagado |

**Lo que no se puede probar todavía:** la renovación automática. El
scheduler necesita pubsub y nunca se ha ejecutado, ni en local ni
desplegado. Habrá que invocarlo a mano.

PayPal queda fuera: su verificación de webhook exige credenciales reales de
sandbox y un túnel. No bloquea mientras Colombia sea el mercado inicial.

---

## Bloque 6 — datos personales (Ley 1581)

| | Caso | Qué debe pasar |
|---|---|---|
| ☐ | Exportar mis datos | Descarga un JSON con todo |
| ☐ | Borrar la cuenta (con una de prueba) | Pide contraseña reciente y borra |
| ☐ | Mirar `payments` después del borrado | Los comprobantes **siguen ahí**, con `userId` sustituido por un hash |
| ☐ | Mirar Storage después del borrado | Sin archivos del usuario |

El tercer caso es el que importa: es la obligación tributaria de conservar
soportes conviviendo con el derecho de supresión. Está implementado y nunca
se ha verificado con datos reales.

---

## Lo que ya sabemos que está pendiente

No hace falta probarlo: está documentado y a la espera de arreglo.

- La bandera `truncated` se calcula y se descarta antes de llegar al usuario.
- Los schedulers (renovación, limpieza de Storage) nunca se han ejecutado.
- "No hay conexión. Comprueba tu internet" sale ante cualquier petición que
  falle, también por un bloqueador o una extensión. Dice algo que no sabe.
- No hay tope de presupuesto en Google Cloud ni alertas de error.
