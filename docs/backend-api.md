# Backend API — Cloud Functions

## Endpoints

Todos requieren `Authorization: Bearer <firebase-id-token>` salvo `/api/health`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/me` | Perfil + suscripción |
| GET | `/api/subscription` | Resumen plan y uso |
| GET | `/api/history` | Historial de actividad |
| POST | `/api/export` | Export PDF (Pro) |
| GET | `/api/legal/countries` | Países soportados |
| GET | `/api/legal/contract-types` | Catálogo tipos de contrato |
| GET | `/api/legal/topics` | Catálogo temas legales |
| POST | `/api/analyze` | Analizar contrato (RAG) — **202, asíncrono** |
| POST | `/api/risks` | Detectar riesgos (RAG) — **202, asíncrono** |
| POST | `/api/compare` | Comparar dos contratos (RAG) — **202, asíncrono** |
| GET | `/api/analyses/:id` | Estado y resultado de un análisis |
| GET | `/api/comparisons/:id` | Estado y resultado de una comparación |

### POST `/api/analyze`

```json
{
  "contractId": "abc123",
  "country": "CO",
  "contractTypeId": "arrendamiento"
}
```

`country` y `contractTypeId` son opcionales. Si no se envían, el sistema detecta país (default `CO`) y tipo por keywords.

Respuesta **`202`**:

```json
{ "analysisId": "xyz789", "status": "processing" }
```

El documento queda en `analyses/{analysisId}` con `status: 'processing'` y un
campo `processingProgress` que se va actualizando por etapas. Cuando termina,
`status: 'done'` y el documento incluye `legalArticleIds`, `lawReferences` y
`legalSearchMethod`; si falla, `status: 'error'` con `errorMessage`.

**Las tres operaciones de IA son asíncronas y responden `202`.** `/compare`
devuelve `comparisonId` en vez de `analysisId`, y su documento vive en
`comparisons/`.

### POST `/api/risks`

```json
{ "contractId": "abc123", "country": "CO", "contractTypeId": "arrendamiento" }
```

### POST `/api/compare`

```json
{
  "contractIdA": "id1",
  "contractIdB": "id2",
  "country": "CO",
  "contractTypeId": "arrendamiento"
}
```

## Flujo interno (RAG)

El trabajo está partido en dos: lo que corre **dentro de la request** y lo que
corre en una **tarea de Cloud Tasks**.

```
DENTRO DE LA REQUEST (rápido, responde 202)
1. Validar token + body (Zod)
2. Verificar cuota del plan (free/pro) y reservarla
3. Crear el documento en `processing` con processingProgress
4. Encolar la tarea
→ 202 { analysisId, status: 'processing' }

EN LA TAREA (tasks/jobs.task.ts — hasta 540s, 2GiB)
5. Descargar archivo → extraer texto (PDF/DOC/DOCX, con OCR si hace falta)
6. Clasificar tipo de contrato (explícito o keywords)
7. LegalKnowledgeService → buscar artículos en laws/
8. Construir contexto: contrato + artículos + tipo + temas
9. Enviar contexto a DeepSeek (JSON only)
10. Validar respuesta (Zod)
11. Guardar con legalArticleIds y lawReferences; borrar processingProgress
12. Historial + alertas
```

**Por qué una cola y no trabajo tras la respuesta.** Functions v2 corre sobre
Cloud Run: al cerrarse la respuesta HTTP la CPU se estrangula y la instancia
puede reciclarse. Un `await` después de `res.json()` funciona en emuladores y
falla de forma intermitente en producción, dejando trabajos colgados en
`processing`.

**Reintentos.** Cada cola reintenta hasta 3 veces con backoff. En un intento
intermedio el documento se mantiene en `processing` (el usuario no ve un fallo
que todavía puede resolverse) y la cuota sigue reservada; solo el último
intento persiste `status: 'error'` y devuelve la cuota. Al entrar, cada
trabajo comprueba si el documento ya está en `done` y, si lo está, no hace
nada: la cola puede entregar la misma tarea dos veces.

**En emulador** las colas no siempre están disponibles, así que el trabajo se
ejecuta en línea. El contrato de la API es el mismo.

### Cómo espera el cliente

El frontend abre un listener de Firestore sobre el documento
(`onSnapshot`), que es instantáneo y gratuito comparado con preguntar por
HTTP. Si el listener no se puede abrir, cae a polling contra
`GET /api/analyses/:id` o `GET /api/comparisons/:id`. Ver
`frontend/src/utils/wait-for-job.ts`.

Si `laws/` está vacío, el análisis continúa indicando en el prompt que no hay corpus cargado.

## Variables de entorno

Copia `backend/functions/.env.example` → `backend/functions/.env` para emuladores.

| Variable | Descripción |
|----------|-------------|
| `DEEPSEEK_API_KEY` | API DeepSeek |
| `LEGAL_SEARCH_PROVIDER` | `firestore` (default) o `vector` (futuro) |
| `LEGAL_DEFAULT_COUNTRY` | País por defecto (`CO`) |
| `LEGAL_MAX_ARTICLES` | Máx artículos en contexto RAG (25; subir a 30 en `.env` si hace falta) |

### Secretos vs. configuración

Las **credenciales** se declaran con `defineSecret` en
`src/config/env.ts` y se inyectan en cada función (`secrets: ALL_SECRETS`),
incluidos los schedulers. Se leen con `readSecret()`, que cae a
`process.env` en emulador:

`DEEPSEEK_API_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`,
`WOMPI_EVENTS_SECRET`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.

Lo demás (llaves públicas, ids de plan, URLs, límites, config del corpus) no
es sensible y puede vivir en un `.env` desplegado junto a la función.

> Un `.env.local` **no se despliega**: es exclusivo del emulador. Una
> credencial que solo esté ahí no existe en producción.

En producción:

```bash
firebase functions:secrets:set DEEPSEEK_API_KEY --config backend/firebase/firebase.json
```

## Seeds y corpus legal

```bash
pnpm seed:firestore           # planes + config
pnpm seed:legal-catalog       # contract_types + legal_topics (sin leyes)
pnpm import:laws -- ./ruta/articulos.json   # cuando tengas el corpus
```

Ver `backend/functions/scripts/import-laws.example.json` para el formato de cada artículo.

## Formatos soportados

| Formato | Método | Notas |
|---------|--------|-------|
| **PDF digital** | `pdf-parse` | Texto embebido, rápido |
| **PDF escaneado** | `pdf-parse` → **Tesseract.js OCR** | Máx 7 páginas (`OCR_MAX_PAGES`) |
| **Word .docx** | **mammoth** | — |
| **Word .doc** | **word-extractor** | Formato antiguo |

OCR en local Windows puede fallar (`OCR_UNAVAILABLE`); en **Firebase Linux (Node 20)** funciona al desplegar.

## Probar SIN frontend

### Requisitos

1. `backend/functions/.env` con `DEEPSEEK_API_KEY=sk-...`
2. Emuladores corriendo: `pnpm dev:emulators`
3. Seed: `pnpm seed:firestore` y `pnpm seed:legal-catalog`
4. Un archivo `.pdf` o `.docx` de prueba

### Opción A — Script automático (recomendado)

```powershell
cd c:\Users\User\repos\contratos
pnpm test:api -- "C:\ruta\a\tu-contrato.pdf"
```

### Ver resultados

- **Emulator UI**: http://localhost:4000 → Firestore → `analyses`, `comparisons`
- **Logs**: terminal de emuladores

## Estructura del código

```
backend/functions/src/
├── integrations/
│   ├── deepseek/    # Cliente, prompts RAG, schemas Zod
│   └── document/    # PDF, DOCX
├── services/
│   ├── legal/       # LegalKnowledgeService + providers
│   ├── contract-classifier.service.ts
│   └── legal-context.service.ts
├── routes/
└── utils/
```
