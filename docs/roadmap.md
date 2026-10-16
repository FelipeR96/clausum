# Clausum — Plan de cierre a producción

> Estado al 2026-10-15: producto ~80% construido. El flujo RAG, la seguridad
> multi-tenant, los dos gateways de pago y el modelo de datos están resueltos.
> Lo que falta es infraestructura de entrega, confiabilidad y los huecos
> funcionales que separan "funciona en mi máquina" de "aguanta usuarios reales".
>
> Esfuerzo total estimado: **5-6 semanas** de un dev a tiempo completo.
> Mínimo para lanzar en beta cerrada: **Fases 0 + 1 + 2** (~2,5 semanas).

---

## Estado de ejecución

Actualizado: 2026-10-15.

| Tarea | Estado |
|---|---|
| F0-01 Git | ✅ Repo local con 4 commits · ⏳ falta `git remote add` + push |
| F0-02 README | ✅ |
| F0-03 ESLint + Prettier | ✅ Configurado y primera pasada hecha: 66 errores arreglados |
| F0-04 CI | ✅ Verde: build, typecheck, lint y 155 pruebas contra emuladores |
| F0-05 Build limpio | ✅ `pnpm build` y `pnpm typecheck` en verde en los tres paquetes |
| F1-01 Proyecto Firebase prod | ⏸️ Aplazado a propósito: `clausum-dev` (Blaze) hace de staging. `.firebaserc` ya no apunta `prod` a dev |
| F1-01b Despliegue a dev | ✅ Desplegado en `clausum-dev` (Node 22, 6 funciones, reglas, 22 índices, corpus de 151 artículos, hosting). Runbook en `docs/despliegue-dev.md` |
| F1-02 Secretos de pago | ✅ Llaves de Wompi sandbox puestas y verificadas (prefijo y longitud) |
| F1-02b Pagos probables en local | ✅ Simulador de webhooks (`sim:wompi`) + llaves ficticias en `.env.local` |
| F1-03/04 Cloud Tasks | ✅ |
| F1-05 onSnapshot | ✅ |
| F1-06 Límite de body | ✅ |
| F2-01/02 Pruebas de reglas | ✅ |
| F2-03 Pruebas de billing, esquemas y cuotas | ✅ Falta solo el clasificador |
| F2-04 Prueba de flujo completo | ✅ En el sitio desplegado: subida, OCR de escaneo (Pro), análisis completo, reintento tras fallo · ⏳ falta el camino de pago |
| F2-05 Observabilidad | ⏳ requiere cuenta de Sentry |
| F2-06 Rate limiting | ⏳ parcial: ya hay `maxInstances` y techo de concurrencia en las colas |
| F2-07 Staging | ⏳ requiere la consola de Firebase |
| F3-01 Email transaccional | ⏳ requiere cuenta de proveedor |
| F3-02 Borrado y exportación de cuenta | ✅ Retención de pagos ya declarada en la política |
| F3-03 Perfil persistido | ⏳ |
| F3-04 Inconsistencias | ✅ |
| F3-05 Accesibilidad | ⏳ |
| F3-06 Partir el bundle | ✅ Primera carga de 279 a 142 kB gzip, medido en el navegador |
| F3-07 Avisos de lint a cero | ⏳ 27 avisos, no bloquean el CI |
| Pagos Wompi (sandbox) | ✅ Probado contra Wompi real, no contra el simulador: pago aprobado activa Pro con `billingProvider`/`subscriptionId`/`subscriptionAmountInCents`; evento repetido no extiende ni pisa la transacción; firma falsa → 401; monto alterado → `AMOUNT_MISMATCH` sin activar; rechazo → `failed` sin mover el plan |
| Pagos PayPal | ⏳ 596 líneas sin una sola prueba. Requiere crear antes los planes de suscripción en el panel de PayPal |
| Módulo de administración | ✅ Claim de admin (solo desde `scripts/set-admin.cjs`, nunca desde la web), precios en Firestore, cambio de plan por correo, 12 pruebas |
| Precios como dato | ✅ `config/pricing` es la fuente de verdad para cobro y pantalla. Suscriptores existentes conservan su precio vía `subscriptionAmountInCents` |
| Fase 4 Corpus legal | ⏳ trabajo de contenido |
| Fase 5 Legal y lanzamiento | ⏳ |

### Estado actual (2026-10-16)

Desplegado y en uso en `clausum-dev`. Lo verificado **en el sitio
desplegado**, no solo en pruebas:

- Subida de contrato, análisis completo de principio a fin.
- OCR de un PDF escaneado en plan Pro (hasta 15 páginas).
- Rechazo del mismo escaneo en Free, con el motivo correcto.
- Reintento de un análisis fallido sin volver a subir el archivo.
- Módulo de administración: búsqueda por correo, concesión y retirada de
  Pro, cambio de precios.
- Borrado de cuenta.

Verde en local: `pnpm typecheck`, `pnpm lint` (0 errores, 27 avisos) y
155 pruebas contra emuladores.

**El cobro con Wompi funciona** en sandbox, verificado contra Wompi real
(16-10-2026). Lo que queda antes de cobrar dinero de verdad:

- Llaves de producción y aprobación de la cuenta de comercio.
- Un tope de gasto en Google Cloud. Blaze es pago por uso sin techo.
- Observabilidad (Sentry): hoy, si algo falla para un usuario, te enteras
  si te lo cuenta.
- Decidir si el precio lleva IVA incluido, y la facturación electrónica.
- Las renovaciones automáticas (`wompiRenewalScheduler`) siguen sin
  ejecutarse nunca contra un cobro real: el primer ciclo cae a 30 días.

### ESLint 10 y el override de `@eslint/eslintrc`

`@eslint/eslintrc@3.3.7` (que es `latest`) declara `js-yaml@^4.3.2`, y la
línea v4 de js-yaml se detiene en 4.3.0 — el tag `v4-legacy` apunta ahí. Lo
más probable es que 4.3.1/4.3.2 se publicaran y se retiraran después.
Cualquier `eslint@9` arrastra esa versión y `pnpm install` falla con
`ERR_PNPM_NO_MATCHING_VERSION`.

**Solución de raíz:** el repo usa `eslint@^10`, que ya **no depende** de
`@eslint/eslintrc` en runtime (solo lo tiene como devDependency propia). De
paso, `eslint@9` está marcado como deprecated: 9.39.5 es el tag
`maintenance`, no `latest`.

Versiones alineadas y verificadas contra el registro (todas aceptan eslint
10 como peer):

| Paquete | Versión | Peer de eslint |
|---|---|---|
| `eslint` | ^10.12.0 | — |
| `@eslint/js` | ^10.0.1 | — |
| `typescript-eslint` | ^8.71.2 | `^8.57 \|\| ^9 \|\| ^10` |
| `eslint-plugin-react-hooks` | ^7.1.1 | hasta `^10` |
| `eslint-plugin-react-refresh` | ^0.5.7 | `^9 \|\| ^10` |
| `eslint-config-prettier` | ^10.1.8 | `>=7` |

Dos detalles que cambian con las mayores nuevas y que ya están aplicados en
`eslint.config.mjs`:

- `eslint-config-prettier` v10 expone el flat config en el subpath
  `eslint-config-prettier/flat`; el export raíz sigue siendo el objeto
  estilo `.eslintrc`.
- `eslint-plugin-react-hooks` ha movido su configuración recomendada entre
  mayores (`configs.recommended` en unas, `configs['recommended-latest']` en
  otras). La config la toma de donde exista en lugar de fijar una forma, así
  que sobrevive a la próxima mudanza.

**El override**, en `pnpm-workspace.yaml` (pnpm 10+ ya **no lee**
`pnpm.overrides` de `package.json` — avisa con
*"The pnpm field in package.json is no longer read by pnpm"*), fija
`@eslint/eslintrc` a `3.3.1`, que pide `js-yaml@^4.1.0`. Con eslint 10 no
debería activarse nunca; está por si algún plugin lo arrastra de forma
transitiva. Para saber si ya sobra:

```powershell
pnpm why @eslint/eslintrc
```

Si no aparece nada, borra el bloque `overrides` de `pnpm-workspace.yaml`.

### Node local vs. Node del runtime

`pnpm install` avisa: `Unsupported engine: wanted {"node":"20"} (current
v24.5.0)`. No es un error, pero conviene no ignorarlo: **Cloud Functions
corre Node 20**, así que desarrollar en 24 puede ocultar incompatibilidades
que solo aparecen al desplegar (y al contrario, hacer que algo falle en
local y funcione en producción). Lo más limpio es fijar la versión del
proyecto con `nvm-windows` o Volta:

```powershell
volta pin node@20
```

Si prefieres seguir en 24, al menos corre `pnpm build:functions` antes de
cada despliegue y confía en el CI, que sí usa Node 20.

### Subir a GitHub

```powershell
gh repo create clausum --private --source=. --remote=origin --push
# o, con el repo ya creado:
git remote add origin https://github.com/<tu-usuario>/clausum.git
git push -u origin main
```

---

## Índice

- [Fase 0 — Fundaciones del repositorio](#fase-0--fundaciones-del-repositorio) · 1-2 días
- [Fase 1 — Bloqueantes de producción](#fase-1--bloqueantes-de-producción) · 1 semana
- [Fase 2 — Confiabilidad y pruebas](#fase-2--confiabilidad-y-pruebas) · 1 semana
- [Fase 3 — Huecos funcionales](#fase-3--huecos-funcionales) · 1,5 semanas
- [Fase 4 — Corpus legal y calidad del análisis](#fase-4--corpus-legal-y-calidad-del-análisis) · 1 semana
- [Fase 5 — Cumplimiento legal y lanzamiento](#fase-5--cumplimiento-legal-y-lanzamiento) · 3-4 días
- [Backlog post-lanzamiento](#backlog-post-lanzamiento)
- [Checklist de lanzamiento](#checklist-de-lanzamiento)

Convención: cada tarea lleva un ID (`F1-03`), los archivos que toca, qué hacer
y un **criterio de aceptación** verificable. Las tareas marcadas 🔴 son
bloqueantes de lanzamiento.

---

## Fase 0 — Fundaciones del repositorio

**Objetivo:** que el proyecto tenga historial, un punto de entrada y controles
automáticos de calidad antes de tocar una línea más de código.
**Duración:** 1-2 días.

### 🔴 F0-01 — Inicializar Git y subir a remoto

El `.gitignore` ya está bien escrito (cubre `.env`, `.secret.local`,
`emulator-data/`, `*serviceAccount*.json`). Solo falta el repo.

```bash
cd C:\Users\User\repos\contratos
git init -b main
git add .
git status            # VERIFICAR: ningún .env, .env.local, .secret.local ni
                      # emulator-data/ en la lista de staged
git commit -m "chore: estado inicial del monorepo Clausum"
gh repo create clausum --private --source=. --remote=origin --push
```

Antes del primer `commit`, revisar a mano que `backend/functions/.env.local` y
`backend/functions/.secret.local` NO estén en el índice. Si por accidente ya
entraron en un commit, hay que reescribir el historial (`git filter-repo`) y
**rotar todas las claves**, porque quedan en el objeto de Git para siempre.

Estrategia de ramas: `main` protegida (deploy a producción), `develop`
(integración), `feat/*` por tarea. Pull request obligatorio a `main`.

**Aceptación:** `git log` muestra el commit inicial; `gh repo view` abre el
repo privado; `git ls-files | grep -E "\.env|secret"` devuelve solo
`.env.example`.

### F0-02 — README raíz

**Archivo nuevo:** `README.md`

Hoy hay 1.656 líneas de documentación excelente repartidas en tres archivos que
no se enlazan entre sí. Falta la puerta de entrada:

1. Qué es Clausum, en tres frases.
2. Arquitectura en un diagrama ASCII (frontend / functions / shared / firebase).
3. Arranque local en 5 comandos: `pnpm install` → copiar `.env.example` →
   `pnpm dev:emulators` → `pnpm seed:firestore` + `pnpm seed:legal-catalog` +
   `pnpm import:co-corpus` → `pnpm dev`.
4. Tabla de scripts del `package.json` raíz, explicando qué hace cada uno.
5. Enlaces a `docs/firebase-setup.md`, `docs/backend-api.md`,
   `docs/architecture/data-model.md` y este roadmap.
6. Variables de entorno: apuntar a los dos `.env.example`, no duplicar.

**Aceptación:** una persona nueva levanta el entorno local siguiendo solo el
README, sin preguntar nada.

### F0-03 — ESLint + Prettier

**Archivos nuevos:** `eslint.config.js` (raíz, flat config), `.prettierrc`,
`.prettierignore`

```bash
pnpm add -Dw eslint @eslint/js typescript-eslint prettier \
  eslint-config-prettier eslint-plugin-react-hooks \
  eslint-plugin-react-refresh
```

Config en dos capas: reglas base TS para todo el monorepo, y un bloque extra
para `frontend/**` con `react-hooks` y `react-refresh`. Reglas que importan en
este código concreto:

- `@typescript-eslint/no-floating-promises` — **esta regla sola detecta el bug
  de F1-03**; es la más valiosa del set.
- `@typescript-eslint/no-explicit-any`, `no-unused-vars` con
  `argsIgnorePattern: "^_"`.
- `no-console` en `backend/functions/src/**` (ya existe un `logger` propio).

Scripts en el `package.json` raíz:

```json
"lint": "eslint . --max-warnings 0",
"lint:fix": "eslint . --fix",
"format": "prettier --write \"**/*.{ts,tsx,js,mjs,cjs,json,md}\"",
"typecheck": "pnpm -r typecheck"
```

Añadir `"typecheck": "tsc -b --noEmit"` a `backend/functions` y `shared`
(frontend ya lo tiene).

**Aceptación:** `pnpm lint` y `pnpm typecheck` pasan en verde sobre el código
actual (arreglar lo que salte, que debería ser poco).

### F0-04 — CI en GitHub Actions

**Archivo nuevo:** `.github/workflows/ci.yml`

Un solo job en `push` y `pull_request`: checkout → `pnpm/action-setup` (sin
`version`: lee `packageManager`) → **Node 22** con cache de pnpm → Java 17
(lo exigen los emuladores) → `pnpm install --frozen-lockfile` →
`pnpm build` (que ya encadena shared → web → functions) → `pnpm typecheck` →
`pnpm lint` → `pnpm test` dentro de `firebase emulators:exec`.

**Historial: tres fallos antes del verde, los tres de configuración.**

| # | Fallo | Causa |
|---|---|---|
| 1 | `pnpm 9` no leía los `overrides` | Pineé `version: 9` por suposición; el proyecto usa pnpm 11 |
| 2 | `No such built-in module: node:sqlite` | Confundí el Node de las herramientas (≥22.13 para pnpm 11) con el de Functions (20) |
| 3 | `ERR_PNPM_IGNORED_BUILDS: re2@1.25.0` | `re2` es `optionalDependency` de `superstatic` (viene con firebase-tools) y pide `node-gyp`; se declaró `re2: false` en `allowBuilds` y firebase-tools cae a regex de JS |

Lección: no se pudo reproducir en local porque con `node_modules` ya poblado
pnpm responde "Already up to date" y no ejecuta ningún script de instalación.
Reproducir el CI de verdad exige un árbol limpio.

**Resultado de la corrida #4** (`5584ef2`, 1m 29s): 6 archivos, **134 pruebas
en verde** — 66 de reglas de Firestore, 17 de reglas de Storage, 22 de
facturación, 13 de esquemas DeepSeek, 10 de cuota, 6 de borrado de cuenta.
Quedan los 27 avisos de lint de F3-07, que no bloquean.

Proteger `main`: requiere que CI pase y un PR aprobado.

**Aceptación:** un PR de prueba muestra el check verde; un PR con un error de
tipos a propósito lo muestra rojo y bloquea el merge.

### F0-05 — Verificar build limpio

Nunca se ha confirmado que el monorepo compile desde cero. Con 506 archivos y
un `tsconfig` por paquete, conviene saberlo antes de seguir.

```bash
rm -rf node_modules frontend/node_modules backend/functions/node_modules shared/node_modules
rm -rf shared/dist backend/functions/lib frontend/dist
rm -f **/*.tsbuildinfo
pnpm install
pnpm build
```

Nota: `shared/src/` tiene `.js.map` sueltos versionados (`collections.js.map`,
`plans.js.map`, etc.) que son residuos de compilación dentro de `src/`.
Borrarlos y asegurar que `.gitignore` los cubre.

**Aceptación:** `pnpm build` termina sin errores desde cero; `frontend/dist` y
`backend/functions/lib` se generan.

---

## Fase 1 — Bloqueantes de producción

**Objetivo:** que un `pnpm deploy` produzca un sistema que funcione de verdad.
Hoy no lo haría: faltan el proyecto de producción, los secretos de las
pasarelas, y hay un bug de ejecución que solo se manifiesta en Cloud Run.
**Duración:** 1 semana.

### 🔴 F1-01 — Proyecto Firebase de producción

**Archivo:** `backend/firebase/.firebaserc`

Hoy los tres alias apuntan al mismo proyecto:

```json
{ "projects": { "default": "clausum-dev", "dev": "clausum-dev", "prod": "clausum-dev" } }
```

Un `firebase use prod && pnpm deploy` despliega sobre desarrollo. Pasos:

1. Crear `clausum-prod` en Firebase Console, **plan Blaze** (Functions lo exige).
2. Registrar app web → copiar config a `frontend/.env.production`.
3. Activar Authentication (Email/Password + Google), Firestore (región
   `nam5` o `southamerica-east1`, decidir ya porque **no se puede cambiar
   después**), Storage, Functions.
4. Actualizar `.firebaserc`:
   ```json
   { "projects": { "default": "clausum-dev", "dev": "clausum-dev", "prod": "clausum-prod" } }
   ```
5. Desplegar rules e índices primero: `firebase use prod && pnpm deploy:rules`.
6. Correr los seeds contra producción: `pnpm seed:firestore`,
   `pnpm seed:legal-catalog`, `pnpm import:co-corpus`.
7. En Authentication → Settings → Authorized domains, añadir el dominio real.

Decisión de región: Functions está fijado a `us-east1` en `index.ts` y en el
rewrite de `firebase.json`. Para usuarios en Colombia, `southamerica-east1`
(São Paulo) baja la latencia ~80ms, pero no todos los servicios están
disponibles allí y habría que cambiar ambos sitios de forma coordinada.
Recomendación: mantener `us-east1` para el MVP, revisar con datos reales.

**Aceptación:** `firebase use prod` + `firebase deploy --only firestore:rules`
funciona; la consola de `clausum-prod` muestra las rules desplegadas y las
colecciones `plans`, `config`, `contract_types`, `legal_topics`, `laws`
sembradas.

### 🔴 F1-02 — Secretos de pago como secretos de Firebase

**Archivos:** `backend/functions/src/config/env.ts`,
`backend/functions/src/index.ts`,
`backend/functions/src/schedulers/wompi-renewal.scheduler.ts`,
`backend/functions/src/services/wompi.service.ts`,
`backend/functions/src/services/paypal.service.ts`

**El problema.** Solo `DEEPSEEK_API_KEY` usa `defineSecret` y se inyecta en
`onRequest({ secrets: [...] })`. Todo lo demás se lee con `process.env`:

| Variable | Dónde se lee | Declarada como secret |
|---|---|---|
| `DEEPSEEK_API_KEY` | `config/env.ts:4` | ✅ |
| `WOMPI_PRIVATE_KEY` | `wompi.service.ts:91` | ❌ |
| `WOMPI_INTEGRITY_SECRET` | `wompi.service.ts:92` | ❌ |
| `WOMPI_EVENTS_SECRET` | `wompi.service.ts:93` | ❌ |
| `PAYPAL_CLIENT_SECRET` | `paypal.service.ts:51` | ❌ |
| `PAYPAL_WEBHOOK_ID` | `paypal.service.ts:52` | ❌ |

En la carpeta solo existe `.env.local`, que Firebase **no despliega** (es
exclusivo del emulador). Resultado desplegando hoy: `getWompiConfig()` y
`getPayPalConfig()` lanzan config ausente, el checkout devuelve 500 y los
webhooks rechazan todo. Y los dos `onSchedule` tampoco declaran secretos, así
que la renovación recurrente de Wompi fallaría igual.

**La corrección.** En `config/env.ts`, declarar todos:

```ts
export const deepseekApiKeySecret    = defineSecret('DEEPSEEK_API_KEY');
export const wompiPrivateKeySecret   = defineSecret('WOMPI_PRIVATE_KEY');
export const wompiIntegritySecret    = defineSecret('WOMPI_INTEGRITY_SECRET');
export const wompiEventsSecret       = defineSecret('WOMPI_EVENTS_SECRET');
export const paypalClientSecret      = defineSecret('PAYPAL_CLIENT_SECRET');
export const paypalWebhookIdSecret   = defineSecret('PAYPAL_WEBHOOK_ID');

export const ALL_SECRETS = [
  deepseekApiKeySecret, wompiPrivateKeySecret, wompiIntegritySecret,
  wompiEventsSecret, paypalClientSecret, paypalWebhookIdSecret,
];
```

Añadir un helper con el mismo patrón de fallback que ya usa
`getDeepSeekApiKey()` (intenta `.value()`, cae a `process.env` en emulador), y
sustituir los `process.env.X` de los dos servicios por llamadas a él. Luego
`secrets: ALL_SECRETS` en `onRequest` y en **ambos** schedulers.

Lo que NO es secreto y puede seguir en `.env` desplegado:
`WOMPI_PUBLIC_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_MODE`, `PAYPAL_PLAN_ID_*`,
`APP_URL`, `CORS_ORIGINS`, `LEGAL_*`, `OCR_MAX_PAGES`, `MAX_PDF_TEXT_CHARS`,
`STORAGE_EXPORT_RETENTION_DAYS`, `NODE_ENV`.

Crear `backend/functions/.env.clausum-prod` con esos valores no sensibles
(Firebase lo carga automáticamente según el proyecto activo) y cargar los
secretos:

```bash
firebase use prod
firebase functions:secrets:set DEEPSEEK_API_KEY
firebase functions:secrets:set WOMPI_PRIVATE_KEY
# ...uno por uno
firebase functions:secrets:access DEEPSEEK_API_KEY  # verificar
```

Añadir también al esquema Zod de `env.ts` las variables que hoy se leen pero no
están declaradas: `WOMPI_PRIVATE_KEY`, `CORS_ORIGINS`,
`STORAGE_EXPORT_RETENTION_DAYS`.

**Aceptación:** desplegado en prod, `GET /api/billing/wompi/status` y
`GET /api/billing/paypal/status` responden configurado; un webhook de prueba de
sandbox se verifica correctamente y escribe en `payments`.

### F1-02b — Probar pagos sin pasarela configurada

El problema: Wompi no tiene cuenta todavía y, aunque la tuviera, su servidor
no puede alcanzar `localhost:5001` para entregar un webhook. Sin webhook no
se prueba nada de lo que importa, porque el pago se *confirma* ahí: la firma,
la verificación de monto y moneda, la activación de Pro, la idempotencia.

La solución es separar los dos tramos:

| Tramo | Qué hace | Se prueba con |
|---|---|---|
| Checkout | Crea el pago pendiente, firma la integridad, manda al widget | Llaves `pub_test_` / `prv_test_` de sandbox (opcional) |
| Webhook | Confirma o rechaza, activa Pro, ajusta el periodo | **Simulador local** (sin llaves reales) |

El segundo tramo es el que tiene la lógica de negocio y el riesgo, y es el
que ahora se puede probar entero sin pasarela:

```bash
pnpm --filter @clausum/functions sim:wompi -- --uid=<uid>
```

**Antes de nada, `.secret.local`.** Los emuladores no leen `.env.local` para
las variables declaradas con `defineSecret`: van a Secret Manager y fallan con
403 si la API no esta habilitada en el proyecto. El override va en
`backend/functions/.secret.local` (gitignored), con los cinco secretos de pago
en valores ficticios. Sin ese archivo el arranque llena la consola de 403 y
`getWompiConfig()` solo sobrevive por el `catch` de `readSecret`.

El script (`backend/functions/scripts/wompi-webhook-sim.cjs`) crea el pago
pendiente en el emulador, construye un evento `transaction.updated` firmado
con el mismo `WOMPI_EVENTS_SECRET` del `.env.local`, lo manda al endpoint
real y luego imprime el estado resultante de `payments/<ref>` y del usuario.
Las llaves del `.env.local` son ficticias a propósito: el backend solo exige
que existan, y el checksum coincide porque ambos lados usan el mismo valor.

Casos que conviene correr, en este orden:

| Caso | Comando | Resultado esperado |
|---|---|---|
| Pago aprobado | `--uid=X` | `succeeded`, usuario en Pro, periodo +1 mes |
| Reenvío del mismo evento | `--reference=<ref>` | Sin cambios: no extiende el periodo dos veces |
| Rechazado | `--uid=X --status=DECLINED` | `failed`, `failureCode: DECLINED`, sigue en Free |
| Monto alterado | `--uid=X --amount=1` | `failed`, `failureCode: AMOUNT_MISMATCH` |
| Moneda alterada | `--uid=X --currency=USD` | `failed`, `failureCode: CURRENCY_MISMATCH` |
| Firma inválida | `--uid=X --bad-signature` | HTTP 401, el pago sigue `pending` |
| Anual | `--uid=X --interval=annual` | Periodo +12 meses |
| Renovación | `--uid=X --renewal` | Extiende desde el periodo actual, no desde hoy |

Los dos últimos de la columna de fallos son los que de verdad importan: un
webhook es un endpoint público y sin autenticar, así que el único control
contra un tercero que invente un pago es la firma y la comparación de monto.

**Pendiente de este bloque:** convertir estos casos en pruebas de Vitest para
que corran en el CI, en vez de depender de que alguien ejecute el script.

**PayPal queda fuera por ahora.** Su verificación de webhook no es un HMAC
local sino una llamada a `/v1/notifications/verify-webhook-signature`, que
exige credenciales reales de sandbox. Para probarlo hace falta primero una
app en developer.paypal.com (gratis) y un túnel para que PayPal alcance el
emulador. No bloquea nada mientras Colombia sea el mercado inicial.

### 🔴 F1-03 — Mover el análisis a Cloud Tasks

**Archivos:** `backend/functions/src/routes/analysis.routes.ts`,
`backend/functions/src/services/analysis.service.ts`,
`backend/functions/src/index.ts`, archivo nuevo
`backend/functions/src/tasks/analysis.task.ts`

**El problema.** En `analysis.routes.ts:19-39`:

```ts
const { analysisId } = await initiateAnalyzeContract(uid, body.contractId);
res.status(202).json({ analysisId, status: 'processing' });
await executeAnalyzeContract(uid, body.contractId, analysisId, { ... });
```

El trabajo pesado —descarga del archivo, OCR, búsqueda legal, llamada a
DeepSeek— ocurre **después** de cerrar la respuesta HTTP. Cloud Functions v2
corre sobre Cloud Run, donde la CPU se estrangula al terminar la request y la
instancia puede reciclarse. En emuladores funciona siempre; en producción
tendrás análisis que se quedan colgados en `processing` de forma intermitente
y no reproducible, el usuario verá el polling morir a los 320s, y la cuota
quedará consumida sin resultado. Es el defecto más serio del código.

**La corrección.** Function de Cloud Tasks separada:

```ts
// backend/functions/src/tasks/analysis.task.ts
import { onTaskDispatched } from 'firebase-functions/v2/tasks';

export const processAnalysisTask = onTaskDispatched(
  {
    region: 'us-east1',
    memory: '2GiB',
    timeoutSeconds: 540,          // más margen que los 300 actuales
    secrets: ALL_SECRETS,
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 10 },
  },
  async (req) => {
    const { userId, contractId, analysisId, country, contractTypeId } = req.data;
    await executeAnalyzeContract(userId, contractId, analysisId, { country, contractTypeId });
  }
);
```

La ruta queda encolando y devolviendo de inmediato:

```ts
const { analysisId } = await initiateAnalyzeContract(uid, body.contractId);
await getFunctions().taskQueue('processAnalysisTask').enqueue({
  userId: uid, contractId: body.contractId, analysisId,
  country: body.country, contractTypeId: body.contractTypeId,
});
res.status(202).json({ analysisId, status: 'processing' });
```

Tres detalles que hay que cuidar:

- **Idempotencia.** `maxAttempts: 3` significa que `executeAnalyzeContract`
  puede correr dos veces sobre el mismo `analysisId`. Al entrar, comprobar que
  el doc sigue en `processing`; si ya está `done`, salir sin hacer nada. Y el
  reintento no debe volver a reservar cuota (la reserva ya ocurrió en
  `initiateAnalyzeContract`, que sigue en la ruta — correcto así).
- **Fallo definitivo.** Si se agotan los 3 intentos, nadie marca el análisis
  como `error` y queda colgado igual. Envolver el handler en try/catch que, en
  el último intento (`req.retryCount >= 2`), escriba
  `status: 'error'` + `errorMessage` y llame a `releaseAnalysisUsage`.
- **Emulador.** El emulador de Functions soporta task queues, pero conviene
  dejar un fallback: si `isEmulator()`, ejecutar en línea con `void` y un
  `.catch` que loguee, para no depender de la cola en desarrollo.

Permisos: el service account de Functions necesita
`roles/cloudtasks.enqueuer` y `roles/iam.serviceAccountUser`. Normalmente
Firebase los concede al desplegar; si el `enqueue` da 403, concederlos a mano.

**Aceptación:** con 20 análisis disparados en paralelo contra producción, los
20 terminan en `done` (o en `error` con mensaje, nunca colgados en
`processing`); los logs muestran la task ejecutándose después de que la request
HTTP ya cerró.

### 🔴 F1-04 — Migrar `/risks` y `/compare` al mismo patrón

**Archivos:** `backend/functions/src/routes/analysis.routes.ts`,
`backend/functions/src/services/risks.service.ts`,
`backend/functions/src/services/comparison.service.ts`,
`backend/functions/src/services/processing-progress.service.ts`,
`frontend/src/utils/poll-analysis.ts`, páginas de riesgos y comparación

Ambas rutas son hoy 100% sincrónicas: esperan a DeepSeek y devuelven `201`.
Un contrato largo con OCR puede acercarse al timeout, y —peor para la UX— no
emiten `processingProgress`, así que el usuario mira una ruleta muda mientras
que en `/analyze` ve etapas ("Extrayendo texto…", "Consultando contexto
legal…"). Y en `/compare` se procesan **dos** documentos, así que es el flujo
más lento de los tres.

Replicar el patrón de F1-03: `initiate*` → `enqueue` → `202` → task. Extender
`setAnalysisProgress` para que acepte también `comparisons` (hoy está atado a
la colección `analyses`), y generalizar `pollAnalysisUntilDone` a
`pollJobUntilDone(collection, id)` para reutilizar el mismo polling en las tres
pantallas.

**Aceptación:** las tres operaciones devuelven `202` y reportan progreso por
etapas en la UI; un `.docx` de 80 páginas comparado contra otro completa sin
timeout.

### F1-05 — Polling por `onSnapshot` en vez de HTTP

**Archivos:** `frontend/src/utils/poll-analysis.ts`,
`frontend/src/services/analysis.service.ts`

`poll-analysis.ts` hace `GET /api/analyses/:id` cada 900ms durante hasta 320s:
~350 invocaciones de Function y ~350 lecturas de Firestore por análisis, con
hasta 900ms de retardo para reflejar cada etapa. Las rules ya permiten
`allow read: if isResourceOwner()` en `analyses` y `comparisons`, así que el
cliente puede suscribirse directo:

```ts
onSnapshot(doc(db, 'analyses', analysisId), (snap) => { ... })
```

Resultado: 1 listener, progreso instantáneo, coste despreciable. Dejar el
polling HTTP como fallback si el listener falla (`error` callback), porque la
suscripción directa depende de que las rules sigan permitiéndolo.

**Aceptación:** un análisis completo genera ≤5 invocaciones de la Function
(verificable en los logs) en vez de ~350; las etapas aparecen sin retardo
perceptible.

### F1-06 — Límite de body por ruta

**Archivo:** `backend/functions/src/index.ts`

`app.use(express.json({ limit: '1mb' }))` es global, webhooks incluidos. Si
Wompi o PayPal engordan el payload de un evento, rebota con 413 y pierdes la
notificación de un pago. Montar el parser con límites distintos: `'100kb'`
para la API general (los bodies son `contractId` + opciones, nada más) y
`'5mb'` para las dos rutas de webhook.

**Aceptación:** `POST /api/billing/paypal/webhook` con un payload de 2MB
responde 200; `POST /api/analyze` con 500kb de basura responde 413.

---

## Fase 2 — Confiabilidad y pruebas

**Objetivo:** poder cambiar código sin romper el billing ni abrir un agujero de
seguridad por accidente. Hoy no hay ni un test en todo el repo.
**Duración:** 1 semana.

### 🔴 F2-01 — Tests de las Firestore rules

**Archivos nuevos:** `backend/firebase/tests/firestore.rules.test.ts`,
`vitest.config.ts`

```bash
pnpm add -Dw vitest @firebase/rules-unit-testing
```

Las rules son la única cosa que separa los contratos de un usuario de los de
otro, y son complejas: `diff().affectedKeys()`, validación de `storagePath` por
regex, listas blancas de campos. Un cambio descuidado aquí es una brecha. Es
el test de mayor valor por hora invertida de todo el proyecto.

Casos mínimos:

- `users/{uid}`: el dueño lee; un tercero no. Create solo con
  `planId: 'free'`. **Update que toque `planId`, `subscriptionStatus` o
  `subscriptionId` debe fallar** (es la defensa contra auto-upgrade a Pro).
  Update con un campo fuera de la lista blanca (`jobTitle`, por ejemplo) debe
  fallar.
- `contracts`: create con `userId` ajeno falla; create con `storagePath` que no
  casa el regex falla; update que toque `status` o `riskScore` desde el cliente
  falla; delete del dueño pasa.
- `analyses`, `comparisons`, `payments`, `subscriptions`: lectura del dueño
  pasa, cualquier escritura del cliente falla.
- `alerts`: update que solo toque `read`/`readAt` pasa; cualquier otro campo
  falla.
- `laws`, `plans`, `contract_types`, `legal_topics`: lectura autenticada pasa,
  escritura falla, lectura anónima falla.
- `system_logs` y cualquier colección no declarada: todo falla.

### 🔴 F2-02 — Tests de reglas de Storage

**Archivo nuevo:** `backend/firebase/tests/storage.rules.test.ts`

Subida a `users/{otroUid}/contracts/x.pdf` falla; `.exe` falla; 11MB falla;
`.pdf` de 1MB del dueño pasa; escritura en `users/{uid}/exports/` falla
siempre (solo el backend escribe ahí); avatar >2MB falla.

### 🔴 F2-03 — Tests unitarios de billing y cuotas

**Archivos nuevos:** `backend/functions/src/services/__tests__/`

Es donde el dinero puede romperse en silencio. Prioridad:

- `buildTransactionIntegritySignature` — vector conocido, resultado esperado.
- Verificación del checksum de eventos Wompi: firma válida pasa, firma alterada
  rechaza, `timestamp` manipulado rechaza. Confirmar que se usa comparación en
  tiempo constante (`crypto.timingSafeEqual`); si hoy es `===`, corregirlo.
- `getProAmountForRegion` para las 4 combinaciones región × intervalo, y
  `proAnnualSavingsPercentForRegion` (debe dar ~17%).
- `assertEntitlement`: Free dentro de cuota pasa, Free agotado lanza
  `QUOTA_EXCEEDED`, Pro dentro de sus topes pasa.
- `reserveAnalysisUsage` / `releaseAnalysisUsage`: ✅ **verificado** —
  `reserveMonthlyUsage` y `releaseMonthlyUsage` ya usan `runTransaction`, así
  que la reserva es atómica y dos análisis simultáneos de un usuario Free con
  1 crédito restante no pasan los dos. Cubierto con pruebas de regresión en
  `__tests__/quota.test.ts`, incluido el caso de 10 peticiones concurrentes
  con la cuota agotada y que el rollback no deje el contador en negativo.
- `normalizeKnownEntitlements`: un plan viejo en Firestore con
  `analysesPerMonth: -1` (ilimitado) debe quedar topado al default de Pro.
- `contract-classifier.service`: un contrato de arrendamiento clasifica como
  tal; un texto genérico cae al default sin reventar.
- `parseJsonResponse` + schemas Zod: respuesta de DeepSeek con markdown
  alrededor del JSON se parsea; JSON inválido lanza error controlado;
  respuesta a la que le falta un campo requerido falla la validación.

### F2-04 — Test de integración del flujo completo

**Archivo:** reescribir `backend/functions/scripts/test-api-flow.cjs` como
test automatizado en `backend/functions/src/__tests__/flow.test.ts`

Contra emuladores, con DeepSeek mockeado: crear usuario → subir PDF de prueba →
`POST /contracts` → `POST /analyze` → esperar `done` → verificar que el doc
`analyses` tiene `clauses`, `risks`, `legalArticleIds`, que se creó la entrada
de `history`, que se creó la `alert`, y que el contador de uso subió en 1.

Añadir 3-4 PDFs de prueba en `backend/functions/__fixtures__/`: uno digital
normal, uno escaneado (para OCR), uno con texto casi vacío (debe dar
`MIN_PDF_TEXT_CHARS`), y un `.docx`.

**Aceptación de F2-01 a F2-04:** `pnpm test` corre en CI contra emuladores y
pasa; cobertura ≥60% en `services/` y 100% en las rules.

### 🔴 F2-05 — Observabilidad

**Archivos:** `backend/functions/src/utils/logger.ts`, `frontend/src/main.tsx`,
nuevo `frontend/src/lib/monitoring.ts`

Hoy hay un `logger` propio y la colección `system_logs`, pero nadie mira. Un
fallo de DeepSeek o un webhook rechazado no se entera nadie hasta que un
usuario escribe.

1. **Sentry** en ambos lados (`@sentry/react` + `@sentry/node`), con el DSN por
   env y `tracesSampleRate` bajo. En el frontend, filtrar PII: los contratos son
   confidenciales, así que `beforeSend` debe limpiar el payload y **nunca**
   enviar texto de contrato ni nombres de archivo.
2. **Alertas de Google Cloud Monitoring** sobre los logs de Functions:
   - tasa de error de `api` > 5% en 5 min → email;
   - cualquier log con severidad ERROR que contenga `WOMPI_` o `PAYPAL_`
     → email inmediato (un pago roto es urgente);
   - `processAnalysisTask` con intentos agotados → email;
   - presupuesto de facturación con aviso al 50/80/100% del objetivo mensual.
3. **Dashboard mínimo**: análisis/día, tasa de éxito, latencia p50/p95, coste
   DeepSeek estimado, conversiones Free→Pro.

**Aceptación:** provocar un fallo a propósito (clave DeepSeek inválida en
staging) genera un evento en Sentry y un email de alerta en <10 min.

### F2-06 — Rate limiting en los endpoints de IA

**Archivo nuevo:** `backend/functions/src/middleware/rateLimit.ts`

La cuota del plan limita el total mensual, pero no la concurrencia. Un usuario
Pro puede disparar 50 análisis en paralelo: 50 instancias de 2GiB y 50 llamadas
a DeepSeek a la vez. Es un riesgo de coste directo.

Contador por usuario en Firestore (`users/{uid}/ratelimit/{ventana}`) con
`FieldValue.increment` y TTL: máximo N operaciones de IA concurrentes y M por
hora, configurables por plan. Responder `429` con `Retry-After`. Aplicar a
`/analyze`, `/risks`, `/compare` y `/export`.

Complementar con `maxInstances` en `onRequest` (hoy sin límite: un pico de
tráfico puede escalar sin techo y la factura también).

**Aceptación:** 20 peticiones simultáneas de un mismo usuario → las primeras N
pasan, el resto recibe 429; `maxInstances` visible en la consola.

### F2-08 — Nadie prueba sobre el Node de produccion

Hay tres versiones de Node en juego y ninguna coincide con la de
produccion:

| Dónde | Node | Por qué |
|---|---|---|
| Local (Windows) | 24.5 | La que tiene instalada el desarrollador |
| CI | 22 | pnpm 11 exige ≥22.13; en Node 20 falla al cargar `node:sqlite` |

**Resuelto el 15 de octubre de 2026.** Google anunció que Node 20 se
decomisiona el **30 de octubre de 2026**: después de esa fecha el despliegue
se rechaza. Se subió el runtime de Functions de 20 a **22** (GA, soportado
hasta abril de 2027), que es lo que ya usaba el CI. Con eso el CI y
producción corren la misma versión y una incompatibilidad deja de ser
invisible hasta el despliegue.

Local sigue en 24 para las herramientas. Se añadió un `.nvmrc` con 22 para
quien quiera alinearlo del todo (`nvm use`); el aviso de "Unsupported
engine" de pnpm es cosmético y ahora solo hay un major de diferencia.

Node 24 también es GA y llega hasta 2028, pero `firebase-tools` está en la
13.29 y es dudoso que conozca ese runtime. Saltar a 24 implica subir también
el CLI: vale la pena, pero como tarea aparte y no en la misma tanda.

| **Cloud Functions** | **20** | `engines.node` en `backend/functions/package.json` |

La consecuencia es concreta: **una incompatibilidad específica de Node 20
no la detecta nadie hasta el despliegue.** El backend usa `pdf-parse`,
`tesseract.js`, `pdfkit` y `word-extractor`, que son las dependencias con
más probabilidad de comportarse distinto entre versiones de Node.

No hay arreglo trivial, porque pnpm 11 no corre en Node 20. Las opciones,
de menor a mayor esfuerzo:

1. **Un job adicional en CI** que instale con Node 22 y luego cambie a
   Node 20 (`actions/setup-node` una segunda vez) para ejecutar solo las
   pruebas del backend. Las dependencias ya están en disco, así que no
   hace falta pnpm en ese paso.
2. **Fijar el runtime de Functions a Node 22** si Firebase ya lo soporta
   para la región usada, y alinear las tres. Es la solución limpia, pero
   cambia el runtime de producción y hay que verificar soporte.
3. **Aceptar el riesgo** y confiar en staging como última barrera. Es lo
   que hay hoy.

Hasta resolverlo, **desplegar a staging antes que a producción no es
opcional**: es el único punto donde el código se ejecuta sobre Node 20
antes de que lo vea un usuario.

### F2-07 — Entorno de staging

Tercer proyecto Firebase `clausum-staging`, idéntico a producción pero con
Wompi y PayPal en sandbox. `.firebaserc` gana el alias `staging`. El workflow
de CI despliega automáticamente a staging al mergear en `develop`; producción
solo con tag manual. Es donde se prueban los pagos de verdad sin tocar dinero
real.

**Aceptación:** merge a `develop` despliega a staging sin intervención; un
checkout de sandbox completo funciona end-to-end ahí.

---

## Fase 3 — Huecos funcionales

**Objetivo:** cerrar lo que el producto promete pero no hace.
**Duración:** 1,5 semanas.

### 🔴 F3-01 — Email transaccional

**Archivos nuevos:** `backend/functions/src/integrations/email/` (cliente +
plantillas), `backend/functions/src/services/notification.service.ts`

No existe ningún integrador de correo en el repo. Las rules ya validan un
setting `emailNotifications` que hoy no hace nada, y las alertas son solo
in-app: si un usuario no abre la app, no se entera de nada. Para un producto de
pago con suscripción recurrente, esto no es opcional — un pago fallido sin
aviso es una baja.

Proveedor: **Resend** (API simple, buen free tier, soporta React Email para
plantillas). Alternativa: SendGrid.

Correos imprescindibles:

| Disparador | Contenido |
|---|---|
| Registro | Bienvenida + cómo subir el primer contrato |
| Análisis terminado | Resumen + nº de riesgos + enlace al resultado |
| Riesgo crítico detectado | Aviso destacado + enlace |
| Pago confirmado | Recibo con monto, moneda y periodo |
| **Pago fallido** | Aviso + enlace para actualizar el método (crítico) |
| Suscripción por vencer (3 días) | Recordatorio de renovación |
| Suscripción cancelada | Confirmación + fecha de fin de acceso |
| Cuota al 80% / agotada | Aviso + invitación a Pro |

Enganchar en: `alerts.service.ts` (análisis y riesgos), `wompi.service.ts` y
`paypal.service.ts` (pagos y webhooks), `wompi-renewal.scheduler.ts`
(renovaciones y fallos), `subscription.service.ts` (cuotas).

Respetar `users/{uid}/settings.emailNotifications` en todos los correos de
producto; los transaccionales de pago se envían siempre (son obligación
contractual). Incluir enlace de baja. `RESEND_API_KEY` como secreto de Firebase.

**Aceptación:** los 8 correos se disparan en staging con datos reales y se ven
bien en Gmail y Outlook, móvil y escritorio; desactivar `emailNotifications`
silencia los de producto pero no el de pago fallido.

### 🔴 F3-02 — Borrado de cuenta y exportación de datos

**Archivos:** `backend/functions/src/routes/contract.routes.ts` (o nueva
`account.routes.ts`), `frontend/src/components/settings/SettingsSecurityTab.tsx`,
`backend/firebase/firestore.rules`

`users` tiene `allow delete: if false` y el campo `deletedAt` está previsto en
`userUpdateSafe`, pero no hay endpoint ni UI. Con contratos de clientes
almacenados y la **Ley 1581 de 2012** (habeas data) más el régimen de
protección al consumidor de la SIC, el derecho de supresión no es opcional —
y si vendes a usuarios en España o México, el GDPR/LFPDPPP añaden plazos.

`DELETE /api/account`:

1. Reautenticación reciente obligatoria (el `SettingsSecurityTab` ya importa
   `reauthenticateWithCredential`, reutilizar ese patrón).
2. Cancelar la suscripción activa en Wompi/PayPal antes de borrar nada — si se
   borra el usuario primero, el cobro recurrente sigue vivo en la pasarela y
   acabas cobrando a un fantasma.
3. Borrado en cascada: `contracts`, `analyses`, `comparisons`, `alerts`,
   subcolecciones `usage`/`settings`/`history`, archivos en
   `users/{uid}/contracts/` y `users/{uid}/exports/`, y el usuario de Firebase
   Auth. Hacerlo por lotes (`BulkWriter`) para no reventar con muchos docs.
4. **Conservar `payments`** anonimizado (`userId` → hash): la normativa
   tributaria colombiana exige retener soportes de facturación, y no puedes
   borrarlos aunque el usuario lo pida. Documentar esta excepción en la
   política de privacidad.
5. Registrar la supresión en `system_logs` para poder demostrarla.

`GET /api/account/export`: ZIP con los contratos del usuario y un JSON con sus
análisis, comparaciones e historial.

UI: sección "Zona de peligro" en Ajustes → Seguridad, con confirmación
escribiendo el email, aviso de irreversibilidad y lista de lo que se borra.

**Aceptación:** borrar una cuenta de prueba deja cero documentos del usuario en
Firestore y cero archivos en Storage (verificado con un script), la suscripción
en sandbox queda cancelada, y `payments` conserva los registros anonimizados.

### F3-03 — Persistir `jobTitle` y `organization`

**Archivos:** `frontend/src/components/settings/SettingsProfileTab.tsx`,
`backend/firebase/firestore.rules`, `shared/src/types/user.types.ts`

`SettingsProfileTab.tsx:103` guarda estos dos campos con `saveProfileExtra()`
en `localStorage`: se pierden al cambiar de navegador o limpiar datos. Y si
alguien intentara escribirlos en Firestore hoy, `userUpdateSafe()` los
rechazaría porque no están en su lista blanca.

Añadir `jobTitle` y `organization` al tipo `User`, a `hasValidUserCreate()` y a
la lista blanca de `userUpdateSafe()` (con límite de longitud para no permitir
blobs), guardarlos en el mismo `updateDoc` que `displayName`, y eliminar
`saveProfileExtra` con una migración silenciosa: al cargar el perfil, si hay
valor en `localStorage` y no en Firestore, subirlo y limpiar el local.

**Aceptación:** el cargo y la organización sobreviven a un cambio de navegador;
el test de rules de F2-01 cubre el caso.

### F3-04 — Limpiar inconsistencias detectadas

Cuatro cosas pequeñas que hoy no rompen pero son trampas:

- **`firestore.rules`, `hasValidContractCreate`**: el regex de `storagePath`
  exige `(pdf|docx)` pero el producto acepta `.doc`
  (`shared/src/constants/document-limits.ts:6` lo incluye en `accept`, las
  Storage rules permiten `application/msword`, y existe `doc.extractor.ts`).
  Hoy es regla muerta porque el contrato se crea con el Admin SDK desde el
  backend, que salta las rules — pero queda ahí para morder a quien algún día
  mueva la creación al cliente. Añadir `doc` al regex.
- **`backend/functions/src/config/plans.ts:46-47`**: el fallback dice
  `priceMonthly: 2900, currency: 'EUR'`, residuo de una versión anterior. El
  pricing real es COP 40.000 / USD 11. Alinear con `PRO_BILLING` de
  `shared/src/constants/billing.ts` o eliminar el precio del fallback.
- **`shared/src/`**: hay `.js.map` versionados dentro de `src/`
  (`collections.js.map`, `plans.js.map`, `index.js.map`, y varios en `types/`).
  Son artefactos de compilación en el árbol de fuentes. Borrar y confirmar que
  el `.gitignore` los cubre.
- **Residuos en la raíz**: `firestore-debug.log` y `tsconfig.tsbuildinfo`
  están en el working tree aunque el `.gitignore` los cubre. Limpiar antes del
  primer commit.

### ✅ Fuga de invocaciones en las landings (encontrada corriendo la app)

Detectada abriendo la aplicación en el navegador, no compilando: un
visitante **anónimo** en cualquier página de marketing o legal disparaba
`GET /api/me` **cada 8 segundos, indefinidamente**. Medido: 1 petición por
cada 10 segundos de página en reposo, todas devolviendo 401.

El mecanismo eran dos cosas en `useSubscriptionSummary`:

1. El hook lo usa `MarketingHeader`, y por tanto las tres landings de SEO y
   las cuatro páginas legales. No comprobaba si había sesión, así que un
   anónimo llamaba igual a un endpoint que exige token.
2. El `setInterval` solo se cancelaba cuando la suscripción quedaba
   confirmada. Para un anónimo eso nunca ocurre, así que el sondeo no
   terminaba nunca. Además `force: !subscriptionConfirmed` ponía
   `cachePromise = null` en cada intento, saltándose la deduplicación de
   peticiones en vuelo — de ahí las ráfagas de 4 a 10 llamadas simultáneas
   al montar varios componentes.

**Por qué importaba.** En producción eso es una invocación de Cloud
Function más una lectura de Firestore cada 8 segundos **por pestaña
abierta**, en las páginas de más tráfico del sitio: unas 450 invocaciones
por hora y pestaña, sin techo y creciendo con el tráfico orgánico que esas
landings existen para captar. Un coste que no aparece en ninguna métrica de
producto.

**Arreglo.** El hook espera a que Firebase resuelva la sesión; sin usuario
devuelve los límites del plan Free calculados en el cliente y no llama al
servidor. El sondeo se conserva —existía por una razón legítima, el
emulador de Functions tarda en arrancar en desarrollo— pero acotado a 5
intentos.

**Verificado en el navegador:** 0 peticiones a la API en 10 segundos sobre
`/analizar-contratos` y `/legal/privacidad` como anónimo, con las páginas
renderizando igual, y `/panel` seguía redirigiendo a `/login`.

### F3-07 — Liquidar los avisos de lint y pasar a estricto

La primera pasada de ESLint sobre el código existente dejó 80 hallazgos. Los
66 errores están arreglados; quedan **~26 avisos** que no bloquean el CI
todavía. El objetivo es dejarlos a cero y cambiar el script del CI de
`pnpm lint` a `pnpm lint:strict` (`--max-warnings 0`), para que la cuenta no
vuelva a crecer.

Por orden de valor:

**1. `react-hooks/set-state-in-effect` — 12 sitios.** Es la regla nueva de
react-hooks v7: avisa de `setState` sincrónico dentro de un efecto, que
provoca renders en cascada. No es un fallo de correctitud, pero varios de
estos casos no necesitan efecto en absoluto y el arreglo mejora el código:

| Archivo | Patrón | Arreglo probable |
|---|---|---|
| `LoginCard.tsx:32` | leer `localStorage` en un efecto | `useState(() => …)` como inicializador |
| `CookieConsentBanner.tsx:11` | igual | inicializador perezoso |
| `useBillingRegion.ts:19` | sincronizar prop a estado | derivar en vez de copiar |
| `AnalysisResultPage.tsx:50`, `RiskAlertsPage.tsx:85` | `setLoading(false)` cuando falta el id | calcular durante el render |
| `ContractActionDialog.tsx:94,115` | resetear al cerrar | `key` en el componente para remontarlo |
| `AppSidebar.tsx:51` | copiar `user` a estado | leer de `user` directamente |
| `NotificationsBell.tsx:46`, `ContractAiActionPicker.tsx:139`, `ContractsHistoryPage.tsx:185`, `ComparisonViewPage.tsx:87` | cargar datos al montar | correcto como patrón; la regla se queja del `setState` dentro del `.then` |

Los cuatro últimos son carga de datos al montar, que es uso legítimo de un
efecto; ahí lo razonable es `eslint-disable-next-line` **con comentario que
explique por qué**, no silenciar la regla entera.

**2. `@typescript-eslint/require-await` — 10 avisos.** Funciones `async` sin
`await`. En `VectorLegalSearchProvider` son los 7 métodos del stub de v2 y
deben seguir siendo `async` para cumplir la interfaz: ahí va un
`eslint-disable` a nivel de archivo con la razón. En `billing.routes.ts` y
`legal.routes.ts` son tres handlers que no esperan nada; se les puede quitar
el `async`.

**3. `react-refresh/only-export-components` — 4 avisos.** Archivos que
exportan un componente y además una constante o un helper, lo que rompe el
hot reload. Mover lo que no es componente a su propio archivo.

### Política de lint

`pnpm lint` (el que corre el CI) **gatea errores**. `pnpm lint:strict` añade
`--max-warnings 0` y es el objetivo al que llegar cuando se liquide lo de
arriba. La distinción existe para que introducir linting en un repo de 500
archivos no obligue a un refactor de 26 sitios antes de poder mergear nada;
no para que los avisos se queden ahí para siempre.

### F3-06 — Partir el bundle del frontend

El build actual emite **un solo chunk de 1,09 MB** (278 kB gzip) y Vite ya
avisa de ello:

```
dist/assets/index-Dyf21VmH.js   1,092.00 kB │ gzip: 278.06 kB
(!) Some chunks are larger than 500 kB after minification
```

Importa más de lo que parece en este producto concreto: las landings de SEO
(`/analizar-contratos`, `/comparar-contratos`, `/detectar-riesgos`) son la
puerta de entrada de tráfico orgánico, y hoy un visitante que llega a una de
ellas descarga **toda la aplicación autenticada** — panel, visor de diff,
ajustes, billing, el SDK de Firebase completo — antes de ver la primera
pantalla. Eso castiga el LCP, que es justo la métrica que afecta al
posicionamiento que se está persiguiendo con esas landings.

Dos cambios, por orden de rendimiento por hora invertida:

1. **`React.lazy` en las rutas protegidas.** Todo lo que cuelga de
   `/panel/*` en `App.tsx` solo hace falta después de iniciar sesión.
   Envolver esas rutas en `lazy()` + `<Suspense>` saca del chunk inicial el
   panel, el historial, el resultado de análisis, la comparación y los
   ajustes.
2. **`manualChunks` para los pesos grandes.** `firebase/firestore` y
   `firebase/storage` solo se usan dentro de la app autenticada. Separarlos
   en su propio chunk evita que el visitante anónimo los pague.

Objetivo razonable: chunk inicial por debajo de 200 kB gzip para las
landings.

**Resultado (verificado).** La landing carga 3 chunks y **142 kB
transferidos**, frente a los 279 kB iniciales: una reducción del 49%.
Medido con `performance.getEntriesByType('resource')` sobre el build de
producción servido con `vite preview`, no con la tabla del build.

**La causa raíz no estaba donde parecía.** Tres intentos fallaron antes de
dar con ella, y conviene que quede escrito:

1. `manualChunks` separando firestore/storage de auth → Rollup avisó de
   `Circular chunk`: los módulos del SDK se referencian entre sí, los dos
   trozos quedaban mutuamente dependientes y cargar auth arrastraba el
   resto igual. El chunk de entrada marcaba 135 kB pero el navegador
   descargaba 656 kB en tres archivos.
2. Importación dinámica de `firebase/firestore` en `AuthProvider` → Vite
   avisó de `dynamic import will not move module into another chunk`: un
   único import estático en el camino eager anula la carga dinámica.
3. La causa real era un **barrel file**. `frontend/src/firebase/index.ts`
   reexporta `./firestore` y `./storage`, y lo importaba
   `services/api/client.ts`, que importa casi todo el frontend. Cualquier
   página que hiciera una petición HTTP se traía los dos SDK completos.

La lección: el problema estaba en **el grafo de importaciones**, no en cómo
se agrupan los módulos. Ninguna regla de `manualChunks` puede separar lo
que un import estático ancló al camino eager. Y el tamaño del chunk de
entrada no es lo que descarga un visitante: eso solo se ve mirando la red.

**Regla para el futuro:** en el camino eager (todo lo que alcanza
`main.tsx` y las rutas no diferidas), importar del módulo concreto
(`@/firebase/auth`, `@/firebase/config`), nunca del barrel `@/firebase`.

### F3-05 — Revisión de accesibilidad y responsive

El frontend tiene ~90 componentes construidos a mano con Tailwind, sin librería
de UI accesible detrás. Antes de abrir a usuarios reales:

- Pasar axe DevTools por las pantallas principales (landing, login, panel,
  resultado de análisis, comparación, pricing, ajustes).
- Navegación completa por teclado en los diálogos (`ContractActionDialog`,
  `ContractAiActionPicker`): foco atrapado, `Esc` cierra, foco devuelto al
  disparador. Los modales hechos a mano casi siempre fallan esto.
- `aria-live` en el progreso de análisis, para que un lector de pantalla
  anuncie las etapas.
- Contraste de los chips de severidad de riesgo (los rojos/ámbar sobre fondo
  claro suelen quedarse en 3:1 cuando el mínimo es 4.5:1).
- Revisar 360px de ancho en las tablas (`ContractHistoryTable`) y en el visor
  de diff a dos columnas (`CompareDiffViewer`), que es el candidato más
  probable a romperse en móvil.

**Aceptación:** cero violaciones críticas de axe en las 7 pantallas; recorrido
completo del flujo principal solo con teclado; sin scroll horizontal a 360px.

---

## Fase 4 — Corpus legal y calidad del análisis

**Objetivo:** que la promesa central del producto —"anclado a la norma
colombiana"— se sostenga. Es lo que justifica el precio.
**Duración:** 1 semana (y luego mantenimiento continuo).

### 🔴 F4-01 — Ampliar el corpus

**Archivos:** `backend/functions/data/co-corpus/*.js`

Hoy: 151 artículos en 11 módulos. Es un MVP honesto, pero
`FirestoreLegalSearchProvider.ts:245` ya loguea el caso "corpus pendiente de
carga" y el análisis **degrada en silencio** — le dice al prompt que no hay
corpus y DeepSeek responde con conocimiento general, sin que el usuario sepa
que esa respuesta no está anclada a nada.

Prioridad por volumen de uso esperado:

1. Código Civil: obligaciones y contratos (arts. 1494-1617, 1849-1954).
2. Código de Comercio: actos de comercio, sociedades, títulos valores en lo
   contractual.
3. Código Sustantivo del Trabajo: contrato de trabajo, jornada, prestaciones,
   terminación (lo más consultado por el público objetivo).
4. Ley 820 de 2003 completa (arrendamiento de vivienda urbana) — ya empezada.
5. Estatuto del Consumidor (Ley 1480 de 2011) para cláusulas abusivas.
6. Ley 1581 de 2012 + Decreto 1377 de 2013 para cláusulas de datos personales.
7. Ley 1564 de 2012 (CGP) en lo relativo a cláusulas compromisorias y
   jurisdicción.

Objetivo: **600-800 artículos**. Con el formato que ya existe
(`id`, `country`, `codeName`, `normType`, `article`, `title`, `content`,
`summary`) y los scripts `build-co-corpus` / `import-co-corpus` ya hechos, el
trabajo es de contenido, no de código.

### 🔴 F4-02 — Proceso de actualización normativa

Una ley derogada en el corpus es un riesgo de producto y reputacional serio en
un producto legal: el análisis citaría norma inexistente con toda confianza.

- Añadir a cada artículo: `vigenciaDesde`, `vigenciaHasta` (null si vigente),
  `derogadaPor`, `fuenteUrl`, `verificadoEn`.
- Filtrar por vigencia en `FirestoreLegalSearchProvider` para no inyectar
  normas derogadas en el contexto RAG.
- Revisión trimestral calendarizada contra las fuentes oficiales
  (Secretaría del Senado, Corte Constitucional, Diario Oficial).
- Documentar el procedimiento en `docs/legal-corpus.md`: de dónde sale cada
  norma, quién la verificó y cuándo.

### F4-03 — Degradación explícita cuando no hay contexto legal

Si la búsqueda legal vuelve vacía, el usuario debe verlo. Añadir al doc de
análisis un campo `legalGrounding: 'full' | 'partial' | 'none'` y mostrarlo en
la UI: "Este análisis no pudo anclarse a normativa específica para este tipo de
contrato". Es honestidad de producto y además protección legal tuya.

**Aceptación:** un contrato de un tipo sin corpus produce un análisis marcado
como `none` y la UI lo advierte de forma visible.

### F4-04 — Evaluación de calidad del análisis

**Archivo nuevo:** `backend/functions/__fixtures__/golden/`

Sin esto, cualquier cambio de prompt o de modelo es a ciegas.

Montar 15-20 contratos reales anonimizados con las conclusiones esperadas
revisadas por un abogado: riesgos que deben detectarse, cláusulas que deben
marcarse como ausentes, artículos que deben citarse. Un script que corre el
análisis sobre todos y reporta precisión y recall.

Ejecutarlo antes de cada cambio en `legal-prompts.ts`, en el clasificador o de
versión del modelo. `DEEPSEEK_MODEL` está hoy en `deepseek-v4-flash`; cuando lo
cambies, esta suite es la única forma de saber si mejoró o empeoró.

**Aceptación:** `pnpm eval:legal` imprime una tabla de precisión/recall por
tipo de contrato; queda registrado el valor base de hoy para comparar.

### F4-05 — Decidir sobre búsqueda vectorial

`VectorLegalSearchProvider.ts` es un stub declarado para v2 y el modelo de
datos ya reserva `embeddingVersion`. Con 600-800 artículos, la búsqueda por
keywords de `FirestoreLegalSearchProvider` probablemente siga siendo suficiente
y mucho más barata. Decisión recomendada: **no implementarlo ahora**; medir con
F4-04 si la recuperación por keywords está dejando fuera artículos relevantes,
y solo entonces invertir. Dejar la decisión escrita para no re-litigarla.

---

## Fase 5 — Cumplimiento legal y lanzamiento

**Duración:** 3-4 días.

### 🔴 F5-01 — Revisión legal de los textos

Las cuatro páginas legales están escritas (`frontend/src/content/legal/`) y el
disclaimer de no-asesoría jurídica ya está donde debe. Pero antes de cobrar:

- Que un abogado colombiano revise términos, privacidad y aviso legal. Vendes
  un producto legal; si tus propios textos flojean, es el peor mensaje posible.
- Registrar la base de datos ante la SIC si aplica (Ley 1581 de 2012).
- Política de retención: cuánto tiempo se guardan los contratos subidos y qué
  pasa al cancelar la suscripción. Hoy solo hay retención de los PDF exportados
  (`STORAGE_EXPORT_RETENTION_DAYS`), no de los contratos originales.
- Verificar que la política de privacidad declara **DeepSeek como subprocesador
  y la transferencia internacional de datos**: el contenido de los contratos
  sale del país hacia la API. Es el punto más expuesto del producto y hoy
  probablemente no está declarado.
- Confirmar que DeepSeek no entrena con los datos enviados por API, y dejarlo
  dicho en la política. Si no hay garantía contractual, considerar un proveedor
  con cláusula de no-entrenamiento; para contratos confidenciales de clientes
  es un requisito, no un detalle.

### F5-01b — Dos puntos de la política que necesitan decisión de abogado

Se ampliaron las secciones 5 y 8 de la política de privacidad
(`frontend/src/content/legal/privacidad.ts`) para declarar la
transferencia internacional a DeepSeek y la retención de comprobantes
tras un borrado de cuenta. El texto redactado describe con precisión lo
que el sistema hace, pero **dos cosas no son redactables sin criterio
jurídico** y ninguna debe darse por resuelta:

**1. ¿Basta la autorización agrupada para la transferencia internacional?**

El artículo 26 de la Ley 1581 de 2012 restringe la transferencia de datos
personales a países que no ofrezcan niveles adecuados de protección, y la
SIC mantiene un listado de países considerados adecuados. La excepción
habitual es la **autorización expresa e informada del titular**.

Hoy la autorización se obtiene de forma agrupada: aceptar los Términos y
la Política al registrarse. El texto nuevo declara la transferencia con
claridad, pero **si el abogado concluye que hace falta autorización
separada**, esto deja de ser un cambio de texto y pasa a ser un cambio de
producto: una casilla propia en el registro, desmarcada por defecto,
registrada con fecha y hora como prueba de la autorización. Eso es
trabajo de implementación, no de redacción.

Conviene además verificar si la jurisdicción donde opera el proveedor
figura en el listado de países adecuados de la SIC, porque de ahí depende
cuál de las excepciones del artículo 26 aplica.

**2. ¿Qué compromisos tiene realmente el proveedor sobre entrenamiento?**

La redacción anterior afirmaba que los contratos no se usan «para
entrenar modelos públicos de terceros». Esa es una afirmación **sobre lo
que hace un tercero**, y Clausum no puede garantizarla: depende de los
términos de servicio de DeepSeek, que pueden cambiar sin intervención
nuestra.

El texto nuevo limita el compromiso a lo que Clausum sí controla (no
vender, no entrenar modelos propios, no compartir con terceros ajenos) y
remite al proveedor para el resto. **Antes de cobrar**, hay que leer los
términos vigentes de la API de DeepSeek y confirmar qué dicen sobre
retención y entrenamiento. Si no hay garantía contractual de
no-entrenamiento, hay dos caminos: declararlo con esa misma honestidad en
la política, o cambiar a un proveedor que sí la ofrezca. Para contratos
confidenciales de clientes de abogados, lo segundo puede ser un requisito
comercial, no solo legal.

**Plazo de retención de comprobantes.** El texto dice «la normativa
tributaria y contable» sin fijar años a propósito: el plazo exacto lo
determina el régimen aplicable y debe escribirlo el abogado.

### F5-02 — Dominio, facturación y SEO

- Dominio real + certificado en Firebase Hosting; `VITE_SITE_URL` apunta a
  `https://clausum.com` en el `.env.example`, confirmar propiedad.
- `CORS_ORIGINS` con el dominio de producción (hoy `localhost:5173`).
- Facturación electrónica DIAN: Wompi no la emite por ti. Decidir proveedor
  (Alegra, Siigo) y si es manual en el MVP.
- Google Search Console + verificar que el `sitemap.xml` generado en build
  sale correcto en producción; `robots.txt` revisado.
- Analítica respetuosa con el consentimiento del banner de cookies que ya
  existe (Plausible o GA4 con consent mode).

### F5-03 — Pruebas de carga y de pago real

- 100 análisis concurrentes contra staging: medir latencia p95, errores, coste
  real de DeepSeek por análisis (dato clave para saber si el precio de Pro
  tiene margen).
- Un ciclo completo de pago real en producción con tarjeta propia: checkout →
  webhook → activación de Pro → renovación forzada → cancelación → verificar
  que el acceso cae en la fecha correcta.
- Probar el camino triste: tarjeta rechazada, webhook duplicado (idempotencia),
  webhook fuera de orden.

### F5-04 — Runbook de operación

**Archivo nuevo:** `docs/runbook.md`

Qué hacer cuando: DeepSeek está caído, un webhook de Wompi falló, un análisis
se quedó colgado, un usuario reclama un cobro, hay que rotar una clave, hay que
revertir un deploy. Incluir cómo restaurar Firestore desde backup — y
**activar los backups automáticos de Firestore**, que no están configurados.

---

## Backlog post-lanzamiento

No bloquean el lanzamiento; ordenados por valor percibido:

1. **Chat sobre el contrato** — preguntar en lenguaje natural sobre el
   documento analizado. Es la feature que más piden los usuarios de este tipo
   de producto y el RAG ya está construido.
2. **Redacción de cláusulas sugeridas** — no solo detectar la cláusula
   ausente, sino proponer el texto.
3. **Carpetas y etiquetas** — `folderId` y `tags` ya están en el modelo de
   datos y en las rules, sin UI.
4. **Plan Equipo** — multi-usuario con contratos compartidos. Requiere repensar
   las rules (hoy todo es estrictamente por `uid`), así que es un cambio
   grande, no incremental.
5. **Más países** — `CountryCode` y `LEGAL_DEFAULT_COUNTRY` ya están
   parametrizados; México y Perú serían los siguientes. El coste está en el
   corpus, no en el código.
6. **Export a Word** con comentarios en las cláusulas de riesgo (hoy solo PDF).
7. **Historial de versiones** de un mismo contrato, aprovechando el motor de
   comparación que ya existe.
8. **API pública** para despachos que quieran integrar.
9. **Búsqueda vectorial** — solo si F4-04 demuestra que hace falta.

---

## Checklist de lanzamiento

**Repositorio**
- [ ] Git inicializado, remoto privado, sin secretos en el historial
- [ ] README que permite arrancar el proyecto desde cero
- [ ] Lint + typecheck + tests en verde en CI
- [ ] `main` protegida, deploy solo por tag

**Infraestructura**
- [ ] `clausum-prod` creado en plan Blaze, `.firebaserc` corregido
- [ ] `clausum-staging` creado y desplegando desde `develop`
- [ ] Los 6 secretos cargados y verificados en producción
- [ ] Rules e índices desplegados; seeds y corpus importados
- [ ] Backups automáticos de Firestore activos
- [ ] `maxInstances` y alertas de presupuesto configuradas

**Corrección de código**
- [ ] Análisis, riesgos y comparación por Cloud Tasks (nada después del `res`)
- [ ] Idempotencia y marcado de `error` en fallo definitivo
- [ ] Progreso por etapas en los tres flujos
- [ ] Límite de body por ruta

**Pruebas**
- [ ] Rules de Firestore y Storage con cobertura completa
- [ ] Billing: firmas, cuotas atómicas, rollback
- [ ] Flujo end-to-end contra emuladores
- [ ] Suite de evaluación legal con valor base registrado

**Producto**
- [ ] Los 8 correos transaccionales funcionando
- [ ] Borrado y exportación de cuenta
- [ ] Perfil persistido en servidor
- [ ] Degradación visible cuando no hay anclaje legal
- [ ] Accesibilidad sin violaciones críticas; responsive a 360px

**Legal y comercial**
- [ ] Textos legales revisados por abogado
- [ ] DeepSeek declarado como subprocesador + transferencia internacional
- [ ] Política de retención de contratos definida y publicada
- [ ] Dominio, CORS y SEO en producción
- [ ] Un ciclo de pago real completo verificado en cada pasarela
- [ ] Runbook escrito
