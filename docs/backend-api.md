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
| POST | `/api/analyze` | Analizar contrato (RAG) |
| POST | `/api/risks` | Detectar riesgos (RAG) |
| POST | `/api/compare` | Comparar dos contratos (RAG) |

### POST `/api/analyze`

```json
{
  "contractId": "abc123",
  "country": "CO",
  "contractTypeId": "arrendamiento"
}
```

`country` y `contractTypeId` son opcionales. Si no se envían, el sistema detecta país (default `CO`) y tipo por keywords.

Respuesta `201` incluye `legalArticleIds`, `lawReferences`, `legalSearchMethod`.

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

```
1. Validar token + body (Zod)
2. Verificar cuota del plan (free/pro)
3. Descargar archivo → extraer texto (PDF/DOCX)
4. Clasificar tipo de contrato (explícito o keywords)
5. LegalKnowledgeService → buscar artículos en laws/
6. Construir contexto: contrato + artículos + tipo + temas
7. Enviar contexto a DeepSeek (JSON only)
8. Validar respuesta (Zod)
9. Guardar en Firestore con legalArticleIds y lawReferences
10. Historial + alertas
```

Si `laws/` está vacío, el análisis continúa indicando en el prompt que no hay corpus cargado.

## Variables de entorno

Copia `backend/functions/.env.example` → `backend/functions/.env` para emuladores.

| Variable | Descripción |
|----------|-------------|
| `DEEPSEEK_API_KEY` | API DeepSeek |
| `LEGAL_SEARCH_PROVIDER` | `firestore` (default) o `vector` (futuro) |
| `LEGAL_DEFAULT_COUNTRY` | País por defecto (`CO`) |
| `LEGAL_MAX_ARTICLES` | Máx artículos en contexto RAG (25; subir a 30 en `.env` si hace falta) |

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
| **PDF escaneado** | `pdf-parse` → **Tesseract.js OCR** | Máx 5 páginas (`OCR_MAX_PAGES`) |
| **Word .docx** | **mammoth** | Solo `.docx`, no `.doc` antiguo |

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
