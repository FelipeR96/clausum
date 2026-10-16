# Dónde retomar — 16 de octubre de 2026

Estado al cerrar la sesión del 15 de octubre, 22:00.

## Lo que quedó funcionando

Clausum está desplegado en `clausum-dev` (que hace de staging; producción no
existe todavía, a propósito).

| | |
|---|---|
| Sitio | https://clausum-dev.web.app |
| API | `/api/health` responde `{"status":"ok",...}` |
| Runtime | Node 22 en las seis funciones |
| CI | Corrida #10 verde: build, typecheck, lint y 139 pruebas |
| Repo | `origin/main` al día, sin cambios sin subir |

Desplegado: seis funciones (API, dos schedulers, tres colas de tareas),
reglas de Firestore y Storage, 22 índices compuestos, corpus legal de 151
artículos, planes con los precios nuevos, y el frontend.

Precios vigentes: **$35.000 COP/mes**, $350.000/año; **USD 10/mes**, 100/año.
OCR ampliado a **15 páginas**.

## Lo primero de mañana

**1. Probar el producto con una sesión real.** Es lo único que dice si
Clausum sirve, y no se puede hacer sin un navegador con sesión iniciada.
En Chrome, sobre https://clausum-dev.web.app, en este orden:

1. Registrarse.
2. Subir un **PDF digital** y analizarlo. Es el control: si falla aquí, el
   problema es del despliegue, no del código.
3. Mirar `tokensUsed` en el documento del análisis en Firestore y meterlo en
   el modelo de costo:
   `cd backend/functions && node scripts/cost-model.cjs --in=<entrada> --out=<salida>`
   Será el primer dato real de coste del proyecto; hasta ahora todo son
   estimaciones.
4. Subir un **PDF escaneado corto** (menos de 15 páginas). Será la primera
   vez que el OCR se ejecuta en la historia del proyecto. Cronometrarlo.
5. Subir un escaneado de **más de 15 páginas**: confirma que se trunca en
   silencio, que es el problema de confianza a arreglar después.

**2. Comprobar que el OCR ya corre en local.** Con canvas 3 instalado
debería funcionar en Windows por primera vez:

```powershell
cd C:\Users\User\repos\contratos\backend\functions
node scripts\check-ocr-pages.cjs
```

Antes moría con `Cannot find module '../build/Release/canvas.node'`.

**3. Llaves de sandbox de Wompi** (`pub_test_`, `prv_test_`) para cerrar el
camino de pago. Los secretos desplegados son de relleno; volver a correr
`functions:secrets:set` crea una versión nueva y la función toma la última.
El código detecta sandbox solo, por el `test` de la llave pública.

## Lo siguiente, por orden de lo que de verdad importa

**Tope de presupuesto en Google Cloud.** Ya hay algo desplegado que puede
llamar a DeepSeek. El escenario que duele no es un usuario que analice
mucho — la cuota lo frena — sino un bug que encole la misma tarea mil veces.
Eso no lo frena nada hoy, y nadie te avisaría.

**Sentry y alertas** (F2-05). Un fallo en producción solo se ve si alguien
abre los logs a mano.

**Propagar la bandera de truncado.** El extractor calcula `truncated` y
`document.service` la descarta. Resultado: un contrato escaneado de 40
páginas produce un análisis de las primeras 15 que parece completo, y
`pageCount` dice 15. Para un producto de análisis legal eso es riesgo de
responsabilidad, no una limitación técnica.

**Convertir en pruebas los ocho casos del simulador de Wompi.** Hoy dependen
de que alguien ejecute `sim:wompi` a mano; en el CI no existen.

Después: correo transaccional (F3-01), persistir `jobTitle` y
`organization` (F3-03), accesibilidad (F3-05), ampliar el corpus más allá de
los 151 artículos, y bajar a cero los 27 avisos de lint (F3-07) para pasar
el CI a `lint:strict`.

## Cosas que conviene no olvidar

- **`firebase-functions` está desactualizado.** El despliegue avisa en cada
  corrida y anuncia cambios incompatibles al subir. Hacerlo con calma.
- **Node 24** es GA hasta 2028, pero exige subir `firebase-tools` (13.29) a
  la vez. Node 22 aguanta hasta abril de 2027: no hay prisa.
- **La limpieza de imágenes de build falla** en cada despliegue y puede
  dejar una factura pequeña en Container Registry.
- **Revisión legal pendiente** (F5-01b): si la autorización agrupada basta
  para la transferencia internacional a DeepSeek, qué comprometen sus
  términos sobre retención, y el plazo exacto de conservación de los
  comprobantes de pago.
- **El panel de navegador de Claude no sirve para probar Clausum**: bloquea
  las peticiones entre los puertos locales de Firebase. Usar Chrome.

## Lo que costó esta sesión, para no repetirlo

Siete intentos de despliegue. Ninguno falló por el código del producto.

| Causa | Lección |
|---|---|
| `firebase.json` en `backend/firebase/` | Las functions tienen que quedar dentro de la carpeta del config |
| `workspace:*` en el package.json | Cloud Build instala con npm, que no entiende el protocolo de pnpm |
| @clausum/shared en devDependencies | Cloud Build **sí** instala devDependencies |
| Timeout de 10s al analizar el código | El límite ya estaba subido para los emuladores, no para el despliegue |
| Override de canvas solo en pnpm | Hay dos gestores de paquetes: el override va en los dos sitios |
| "Deploy complete" sin desplegar | Firebase compara un hash del bundle; si no cambia, se lo salta y reporta éxito |

Lo de fondo: cuatro de esos fallos fueron por suposiciones sin verificar y
por iterar más rápido de lo que se podía comprobar. Cuando eso vuelva a
pasar, parar y medir sale más barato que probar otra vez.
