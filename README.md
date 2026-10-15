# Clausum

SaaS de análisis de contratos con IA para Colombia y LATAM. El usuario sube un
contrato en PDF o Word y la plataforma lo analiza con un modelo de lenguaje
**anclado al marco normativo colombiano mediante RAG**: resumen ejecutivo,
desglose por cláusulas, riesgos priorizados, cláusulas ausentes y las
referencias legales concretas que sustentan cada hallazgo.

Tres operaciones sobre un contrato: **analizar**, **detectar riesgos** y
**comparar** dos versiones. Planes Free y Pro, con pasarela propia por región
(Wompi en Colombia, PayPal en el resto de LATAM).

> Clausum no es un bufete de abogados ni sustituye el juicio de un profesional
> colegiado. Es una herramienta de apoyo a la revisión contractual.

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│  frontend  ·  @clausum/web                                       │
│  React 19 · Vite 6 · Tailwind 3 · React Router 7                 │
│  Firebase SDK (Auth, Firestore, Storage) desde el cliente        │
└───────────────┬──────────────────────────────────────────────────┘
                │  subida directa a Storage  +  fetch /api/*
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  backend/functions  ·  @clausum/functions                        │
│  Cloud Functions v2 · un único Express `api` en us-east1         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ routes/      analysis · contract · subscription · billing  │  │
│  │              legal · alerts                                │  │
│  │ services/    analysis · risks · comparison · document      │  │
│  │              subscription · wompi · paypal · export        │  │
│  │              legal/ (LegalKnowledgeService + providers)    │  │
│  │ integrations/ deepseek · pdf (+OCR) · document · wompi     │  │
│  │ schedulers/  renovación Wompi · limpieza de Storage        │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────┬────────────────────────┬─────────────────────────┘
                │                        │
                ▼                        ▼
      ┌───────────────────┐     ┌──────────────────┐
      │  Firestore        │     │  DeepSeek API    │
      │  Storage          │     │  (contexto RAG)  │
      │  Auth             │     └──────────────────┘
      └───────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  shared  ·  @clausum/shared                                      │
│  Tipos y constantes que consumen frontend Y backend:             │
│  planes, entitlements, límites de documento, colecciones,        │
│  moneda y precios, tipos de contrato y analisis                  │
└──────────────────────────────────────────────────────────────────┘
```

**Por qué un solo Express y no una Function por endpoint:** un único
`onRequest` comparte instancia en caliente y evita pagar arranque en frío por
cada ruta. El rewrite de Hosting manda `/api/**` a esa función.

**Por qué parte de las escrituras va solo por el backend:** las reglas de
Firestore dejan al cliente leer lo suyo pero **no** escribir en `analyses`,
`comparisons`, `payments`, `subscriptions` ni en los campos de plan del
usuario. Todo eso lo escribe el Admin SDK desde Functions, que salta las
reglas. Así el plan y los resultados de IA no son manipulables desde el
navegador.

### El flujo central

1. El cliente sube el archivo **directo a Storage**
   (`users/{uid}/contracts/{id}.pdf|doc|docx`) y registra el contrato con
   `POST /api/contracts`.
2. `POST /api/analyze` reserva cuota del plan, crea el documento en `analyses`
   con estado `processing` y devuelve `202`.
3. Extracción de texto: `pdf-parse`; si el PDF viene escaneado, **OCR con
   Tesseract.js**. `.docx` con mammoth, `.doc` con word-extractor.
4. El clasificador deduce el tipo de contrato por keywords (o se pasa
   explícito).
5. `LegalKnowledgeService` busca artículos aplicables en la colección `laws`.
6. Se arma el contexto RAG (contrato + artículos + tipo + temas) y va a
   DeepSeek; la respuesta se valida con Zod.
7. Se persiste con `legalArticleIds` y `lawReferences`, se escribe historial y
   se genera la alerta. El frontend sigue el progreso por etapas.

---

## Arranque local

Requisitos: **Node 20+**, **pnpm 9+**, **Java 11+** (lo exige el emulador de
Firestore) y una API key de DeepSeek.

```bash
# 1 — Dependencias
pnpm install

# 2 — Variables de entorno
cp backend/functions/.env.example backend/functions/.env.local
cp frontend/.env.example          frontend/.env.local
#    Editar backend/functions/.env.local y poner DEEPSEEK_API_KEY=sk-...
#    Para el frontend, los valores de emulador del ejemplo ya sirven.

# 3 — Emuladores (deja esta terminal abierta)
pnpm dev:emulators

# 4 — Datos base (en otra terminal, con los emuladores arriba)
pnpm seed:firestore        # planes + config
pnpm seed:legal-catalog    # tipos de contrato + temas legales
pnpm import:co-corpus      # corpus legal colombiano (151 artículos)

# 5 — Frontend
pnpm dev
```

O todo junto: `pnpm dev:all` (arranca emuladores y frontend en paralelo).

| URL | Qué es |
|---|---|
| http://localhost:5173 | Frontend (Vite) |
| http://localhost:4000 | Emulator UI — inspeccionar Firestore, Auth, Storage |
| http://localhost:5001 | Functions |

El proxy de Vite manda `/api` al emulador de Functions, así que no hace falta
CORS en desarrollo.

**Nota sobre OCR en Windows:** `tesseract.js` puede fallar en local con
`OCR_UNAVAILABLE`. En el runtime de Firebase (Linux, Node 20) funciona. Si
necesitas probar OCR, usa un PDF con texto embebido en local y deja el
escaneado para staging.

---

## Scripts

Todos se corren desde la raíz del repo.

### Desarrollo

| Script | Qué hace |
|---|---|
| `pnpm dev` | Solo el frontend (Vite) |
| `pnpm dev:emulators` | Compila functions y arranca todos los emuladores |
| `pnpm dev:all` | Emuladores + frontend en paralelo |

### Build y calidad

| Script | Qué hace |
|---|---|
| `pnpm build` | shared → web → functions, en ese orden |
| `pnpm build:web` / `pnpm build:functions` | Build de un solo paquete |
| `pnpm lint` / `pnpm lint:fix` | ESLint sobre todo el monorepo |
| `pnpm format` | Prettier sobre todo el monorepo |
| `pnpm typecheck` | `tsc --noEmit` en los tres paquetes |
| `pnpm test` | Suite de pruebas |

### Datos

| Script | Qué hace |
|---|---|
| `pnpm seed:firestore` | Planes y configuración global |
| `pnpm seed:legal-catalog` | Tipos de contrato y temas legales |
| `pnpm build:co-corpus` | Regenera `co-mvp-corpus.json` desde `data/co-corpus/*` |
| `pnpm import:co-corpus` | Carga el corpus en la colección `laws` |
| `pnpm import:laws -- ./ruta.json` | Carga un corpus externo |
| `pnpm test:api` | Script manual de humo del flujo de análisis |

### Despliegue

| Script | Qué hace |
|---|---|
| `pnpm deploy` | Build + deploy completo (hosting, functions, rules) |
| `pnpm deploy:hosting` | Solo el frontend |
| `pnpm deploy:functions` | Solo las functions |
| `pnpm deploy:rules` | Solo reglas de Firestore y Storage |
| `pnpm firebase:use` | Cambiar de proyecto (`dev`, `staging`, `prod`) |

**Antes de desplegar a producción, lee
[`docs/roadmap.md`](docs/roadmap.md).** Hay tareas marcadas 🔴 que son
bloqueantes: los secretos de las pasarelas aún no están declarados como
secretos de Firebase, y el trabajo pesado del análisis todavía corre después
de cerrar la respuesta HTTP (no sobrevive de forma fiable en Cloud Run).

---

## Variables de entorno

No se documentan aquí para no duplicar; la fuente de verdad son los dos
archivos de ejemplo, que están comentados:

- **`backend/functions/.env.example`** — DeepSeek, OCR, Wompi, PayPal, corpus
  legal, CORS. Nada de esto va al cliente.
- **`frontend/.env.example`** — config pública de Firebase, emuladores, URL de
  la API, dominio canónico para SEO.

En producción, las claves sensibles van como **secretos de Firebase**, no en
un `.env` desplegado:

```bash
firebase functions:secrets:set DEEPSEEK_API_KEY --config backend/firebase/firebase.json
```

---

## Estructura

```
contratos/
├── frontend/              @clausum/web
│   ├── src/
│   │   ├── app/           App.tsx — todas las rutas
│   │   ├── auth/          AuthProvider, ProtectedRoute
│   │   ├── components/    ~90 componentes por dominio
│   │   ├── pages/         Landing, panel, resultado, legales
│   │   ├── seo/           JSON-LD, metas, sitemap
│   │   ├── services/      Cliente de API + un servicio por dominio
│   │   └── utils/         Mappers y polling
│   └── scripts/           Generación de sitemap y robots en build
│
├── backend/
│   ├── firebase/          firebase.json, rules, índices, .firebaserc
│   └── functions/         @clausum/functions
│       ├── src/           config · routes · services · integrations
│       │                  middleware · schedulers · utils
│       ├── data/          Corpus legal colombiano
│       └── scripts/       Seeds e importadores
│
├── shared/                @clausum/shared — tipos y constantes
├── docs/                  Documentación (ver abajo)
└── scripts/               Utilidades de arranque de emuladores
```

---

## Documentación

| Documento | Para qué |
|---|---|
| [`docs/roadmap.md`](docs/roadmap.md) | **Plan de cierre a producción.** Qué falta, en qué orden, con criterios de aceptación |
| [`docs/firebase-setup.md`](docs/firebase-setup.md) | Guía completa de Firebase: crear el proyecto, cada servicio, emuladores, despliegue |
| [`docs/backend-api.md`](docs/backend-api.md) | Endpoints, flujo RAG interno, formatos soportados, cómo probar sin frontend |
| [`docs/architecture/data-model.md`](docs/architecture/data-model.md) | Modelo de datos Firestore: cada colección, campos, índices, seguridad y escalabilidad |

---

## Licencia

Propietario. Todos los derechos reservados.
