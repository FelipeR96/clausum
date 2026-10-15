# Clausum — Guía completa de Firebase

Esta guía explica paso a paso cómo funciona cada servicio, cómo se conecta con React, y cómo trabajar en desarrollo y producción.

---

## Índice

1. [Conceptos básicos](#1-conceptos-básicos)
2. [Crear el proyecto en Firebase Console](#2-crear-el-proyecto-en-firebase-console)
3. [Instalar herramientas locales](#3-instalar-herramientas-locales)
4. [Firebase Authentication](#4-firebase-authentication)
5. [Cloud Firestore](#5-cloud-firestore)
6. [Cloud Storage](#6-cloud-storage)
7. [Cloud Functions](#7-cloud-functions)
8. [Firebase Hosting](#8-firebase-hosting)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Reglas de seguridad](#10-reglas-de-seguridad)
11. [Desarrollo local con emuladores](#11-desarrollo-local-con-emuladores)
12. [Despliegue y publicación](#12-despliegue-y-publicación)
13. [Desarrollo vs producción](#13-desarrollo-vs-producción)
14. [Checklist final](#14-checklist-final)

---

## 1. Conceptos básicos

### ¿Qué es Firebase?

Firebase es una plataforma de Google que ofrece servicios en la nube para aplicaciones web y móviles. En Clausum usamos:

| Servicio | Qué hace | Analogía |
|----------|----------|----------|
| **Authentication** | Registro, login, tokens JWT | El portero del edificio |
| **Firestore** | Base de datos NoSQL en tiempo real | El archivador de documentos |
| **Storage** | Almacén de archivos (PDFs) | El almacén de cajas |
| **Functions** | Código servidor (Node.js) | La cocina (donde está la IA) |
| **Hosting** | Sirve tu React compilado | La fachada de la tienda |

### ¿Cómo se conecta todo?

```
Usuario (navegador)
    │
    ├── React (frontend/) ──► Firebase SDK cliente
    │       ├── Auth        → login, obtiene token JWT
    │       ├── Firestore   → lee/escribe contratos, análisis
    │       └── Storage     → sube/descarga PDFs
    │
    └── fetch('/api/...') ──► Cloud Functions (backend/)
            ├── Verifica token JWT
            ├── Llama a DeepSeek (IA)
            └── Escribe en Firestore (Admin SDK, bypass rules)
```

**Regla de oro:** el frontend nunca tiene claves secretas (DeepSeek, Wompi, PayPal). Solo Cloud Functions las usan.

---

## 2. Crear el proyecto en Firebase Console

### Paso 2.1 — Crear proyecto

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"**
3. Nombre: `clausum-dev` (desarrollo) o `clausum-prod` (producción)
4. Desactiva Google Analytics si no lo necesitas aún (puedes activarlo después)
5. Clic en **"Crear proyecto"**

### Paso 2.2 — Registrar app web

1. En la página principal del proyecto, clic en el icono **Web** (`</>`)
2. Apodo: `clausum-web`
3. No marques Firebase Hosting aún
4. Clic en **"Registrar app"**
5. **Copia el objeto `firebaseConfig`** — lo pegarás en `frontend/.env.local`

### Paso 2.3 — Activar Authentication

1. Menú lateral → **Build** → **Authentication**
2. Clic en **"Comenzar"**
3. Pestaña **"Sign-in method"**
4. Activa:
   - **Correo electrónico/Contraseña** → Habilitar → Guardar
   - **Google** → Habilitar → selecciona email de soporte → Guardar

### Paso 2.4 — Activar Firestore

1. Menú lateral → **Firestore Database**
2. Clic en **"Crear base de datos"**
3. Modo: **Producción** (usaremos rules del repo)
4. Ubicación: **europe-west1** (Bélgica — cercano a España, RGPD-friendly)
5. Clic en **"Habilitar"**

### Paso 2.5 — Activar Storage

1. Menú lateral → **Storage**
2. Clic en **"Comenzar"**
3. Modo: **Producción**
4. Misma ubicación: **europe-west1**
5. Clic en **"Listo"**

### Paso 2.6 — Activar Functions (plan Blaze)

Cloud Functions requiere el plan **Blaze** (pago por uso). Tiene tier gratuito generoso.

1. Menú lateral → **Functions**
2. Si te pide actualizar plan → **Actualizar a Blaze**
3. Añade tarjeta (solo se cobra lo que uses; emuladores son gratis)

### Paso 2.7 — Vincular proyecto local

Edita `backend/firebase/.firebaserc` y reemplaza `TU-PROYECTO-ID` con tu Project ID real (ej. `clausum-dev`).

---

## 3. Instalar herramientas locales

### Requisitos

- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Instalación

```bash
# En la raíz del repo
cd contratos
pnpm install

# Login en Firebase (abre el navegador)
pnpm firebase:login

# Seleccionar proyecto
firebase use clausum-dev --config backend/firebase/firebase.json
```

### Copiar variables de entorno

```bash
cp frontend/.env.example frontend/.env.local
cp backend/functions/.env.example backend/functions/.env
```

Rellena `frontend/.env.local` con los valores de Firebase Console.

---

## 4. Firebase Authentication

### ¿Cómo funciona?

1. El usuario introduce email/contraseña o hace clic en "Continuar con Google"
2. Firebase Auth valida credenciales en servidores de Google
3. Si es correcto, devuelve un **ID Token** (JWT) al navegador
4. Ese token identifica al usuario en Firestore, Storage y Functions
5. El token expira cada ~1 hora; el SDK lo renueva automáticamente

### Archivos en el proyecto

| Archivo | Rol |
|---------|-----|
| `frontend/src/firebase/auth.ts` | Inicializa Auth + emulador |
| `backend/functions/src/middleware/authenticate.ts` | Verifica token en el servidor |

### Conexión con React (flujo típico)

```typescript
// 1. Login
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@/firebase';

await signInWithEmailAndPassword(getFirebaseAuth(), email, password);

// 2. Escuchar cambios de sesión
import { onAuthStateChanged } from 'firebase/auth';

onAuthStateChanged(getFirebaseAuth(), (user) => {
  if (user) console.log('Logueado:', user.uid);
  else console.log('No logueado');
});

// 3. Llamar a la API con token
import { apiClient } from '@/services/api/client';
const profile = await apiClient('/me');
```

### Custom claims (plan Pro)

Para marcar usuarios Pro, el backend usa Admin SDK:

```typescript
// Solo en Cloud Functions, nunca en el cliente
await adminAuth().setCustomUserClaims(uid, { plan: 'pro' });
```

El frontend lee `user.getIdTokenResult()` → `claims.plan`.

---

## 5. Cloud Firestore

### ¿Cómo funciona?

Firestore es una base de datos de documentos (como JSON). Estructura:

```
Colección → Documento → Campos
              └── Subcolección → Documento → Campos
```

Ejemplo Clausum:

```
users/abc123          → { email, plan: "free", createdAt }
contracts/xyz789      → { userId: "abc123", title: "Alquiler", status: "done" }
analyses/def456       → { contractId, userId, result: { summary, risks[] } }
```

### Archivos en el proyecto

| Archivo | Rol |
|---------|-----|
| `frontend/src/firebase/firestore.ts` | Cliente Firestore |
| `backend/firebase/firestore.rules` | Quién puede leer/escribir qué |
| `backend/firebase/firestore.indexes.json` | Índices para queries compuestas |

### Conexión con React

```typescript
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/firebase';

const db = getFirebaseFirestore();
const q = query(
  collection(db, 'contracts'),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);
const contracts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
```

### ¿Por qué algunas escrituras van solo por Functions?

Los documentos `analyses/` tienen `allow write: if false` en las rules. Solo Cloud Functions (Admin SDK) puede escribirlos. Así el usuario no puede falsificar resultados de IA.

---

## 6. Cloud Storage

### ¿Cómo funciona?

Almacén de archivos en Google Cloud. Cada archivo tiene una ruta (path) y reglas de acceso.

Ruta estándar en Clausum:

```
users/{userId}/contracts/{contractId}.pdf
```

### Archivos en el proyecto

| Archivo | Rol |
|---------|-----|
| `frontend/src/firebase/storage.ts` | Cliente Storage + helper de rutas |
| `backend/firebase/storage.rules` | Límites: solo PDF, máx 10 MB, solo dueño |

### Conexión con React

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage, contractStoragePath } from '@/firebase';

const path = contractStoragePath(userId, contractId);
const storageRef = ref(getFirebaseStorage(), path);
await uploadBytes(storageRef, pdfFile, { contentType: 'application/pdf' });
const url = await getDownloadURL(storageRef);
```

### Flujo completo subir contrato

1. Usuario selecciona PDF en React
2. React sube a Storage (`users/uid/contracts/id.pdf`)
3. React crea documento en Firestore `contracts/` con metadata
4. React llama `POST /api/analyze` → Function descarga PDF, extrae texto, llama DeepSeek
5. Function guarda resultado en `analyses/`
6. React lee `analyses/` y muestra resultado

---

## 7. Cloud Functions

### ¿Cómo funciona?

Código Node.js que corre en servidores de Google. Se activa por:

- **HTTP** — peticiones web (`/api/analyze`)
- **Triggers** — eventos (nuevo documento en Firestore)
- **Scheduled** — cron jobs (reset de límites mensuales)

### Archivos en el proyecto

```
backend/functions/
├── src/
│   ├── index.ts              # Export de functions (entry point)
│   ├── firebase/admin.ts     # Admin SDK
│   ├── middleware/           # Auth, rate limit
│   └── config/env.ts         # Variables de entorno
├── package.json
└── tsconfig.json
```

### Función principal: `api`

Un Express app montado como Cloud Function. Hosting redirige `/api/**` hacia ella.

```
Navegador → Hosting → /api/health → Function `api` → Express router
```

### Conexión con React

```typescript
// frontend/src/services/api/client.ts
// Envía Authorization: Bearer <token> automáticamente
const data = await apiClient('/me');
```

### Secretos en producción

**Nunca** subas `.env` a git. En producción usa Firebase Secret Manager:

```bash
firebase functions:secrets:set DEEPSEEK_API_KEY --config backend/firebase/firebase.json
# Wompi / PayPal: configurar también como secrets o params según el entorno
```

Luego en el código:

```typescript
import { defineSecret } from 'firebase-functions/params';
const deepseekKey = defineSecret('DEEPSEEK_API_KEY');
```

---

## 8. Firebase Hosting

### ¿Cómo funciona?

Hosting sirve archivos estáticos (tu React compilado) desde la CDN de Google.

1. `pnpm build:web` genera `frontend/dist/`
2. `firebase deploy --only hosting` sube esos archivos
3. Usuarios visitan `https://TU-PROYECTO.web.app`

### Configuración (`backend/firebase/firebase.json`)

| Setting | Qué hace |
|---------|----------|
| `"public": "../../frontend/dist"` | Carpeta a publicar |
| `rewrites → /api/**` | API va a Cloud Functions |
| `rewrites → /**` | SPA: todas las rutas → `index.html` |
| `headers` | Seguridad (X-Frame-Options) y caché |

### Dominio personalizado

1. Firebase Console → Hosting → **"Agregar dominio personalizado"**
2. Ej: `clausum.com`
3. Añade registros DNS que te indique Firebase
4. SSL se configura automáticamente

---

## 9. Variables de entorno

### Frontend (`frontend/.env.local`)

| Variable | Pública | Descripción |
|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | Sí | Identifica tu proyecto (no es secreta) |
| `VITE_FIREBASE_PROJECT_ID` | Sí | ID del proyecto |
| `VITE_USE_FIREBASE_EMULATORS` | — | `true` en local, `false` en prod |
| `VITE_API_BASE_URL` | — | `/api` en prod, proxy en dev |

**Prefijo `VITE_`:** obligatorio para que Vite exponga la variable al cliente.

### Backend (`backend/functions/.env`)

| Variable | Secreta | Descripción |
|----------|---------|-------------|
| `DEEPSEEK_API_KEY` | **Sí** | API de IA |
| `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY` | **Sí** (privada) | Pagos Colombia |
| `WOMPI_INTEGRITY_SECRET` / `WOMPI_EVENTS_SECRET` | **Sí** | Firma y webhooks Wompi |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | **Sí** (secret) | Pagos LATAM |
| `PAYPAL_WEBHOOK_ID` / `PAYPAL_PLAN_ID_*` | **Sí** | Webhooks y planes PayPal |

En producción → Firebase Secret Manager, no archivos `.env`.

---

## 10. Reglas de seguridad

### Firestore Rules (`firestore.rules`)

Piensa en ellas como un **firewall de base de datos**. Cada lectura/escritura se evalúa contra las rules.

Principios Clausum:

- Usuario autenticado solo accede a **sus** documentos (`userId == auth.uid`)
- `analyses/` y `comparisons/` → solo lectura cliente; escritura solo Admin SDK
- Campos sensibles (`planId`, `billingProvider`, `wompiPaymentSourceId`, estado de suscripción) → solo backend puede cambiarlos

### Storage Rules (`storage.rules`)

- Solo PDFs menores a 10 MB
- Solo en la carpeta del propio usuario
- Exports generados por backend → solo lectura

### Probar rules localmente

```bash
firebase emulators:start --only firestore,storage --config backend/firebase/firebase.json
```

Firebase Emulator UI en `http://localhost:4000` → pestaña Firestore → simular lecturas/escrituras.

### Desplegar solo rules

```bash
pnpm deploy:rules
```

---

## 11. Desarrollo local con emuladores

### ¿Qué son los emuladores?

Versiones locales de Auth, Firestore, Storage y Functions. **No tocan producción.** Datos en memoria o disco local.

### Arrancar todo

**Terminal 1 — Emuladores:**
```bash
pnpm dev:emulators
```

**Terminal 2 — React:**
```bash
pnpm dev
```

O ambos a la vez:
```bash
pnpm dev:all
```

### URLs locales

| Servicio | URL |
|----------|-----|
| React (Vite) | http://localhost:5173 |
| Emulator UI | http://localhost:4000 |
| Auth emulator | localhost:9099 |
| Firestore emulator | localhost:8080 |
| Storage emulator | localhost:9199 |
| Functions emulator | localhost:5001 |

### Configuración emuladores en React

En `frontend/.env.local`:

```
VITE_USE_FIREBASE_EMULATORS=true
```

Los archivos `frontend/src/firebase/*.ts` conectan automáticamente a emuladores cuando esta variable es `true`.

### Importar/exportar datos de prueba

```bash
firebase emulators:export ./backend/emulators/data --config backend/firebase/firebase.json
firebase emulators:start --import=./backend/emulators/data --config backend/firebase/firebase.json
```

---

## 12. Despliegue y publicación

### Primera vez

```bash
# 1. Build
pnpm build

# 2. Desplegar todo (hosting + functions + rules)
pnpm deploy
```

### Despliegues parciales

```bash
pnpm deploy:hosting      # Solo React
pnpm deploy:functions    # Solo API
pnpm deploy:rules        # Solo firestore.rules + storage.rules
```

### Orden recomendado en CI/CD

1. `pnpm install`
2. `pnpm build`
3. `firebase deploy --only firestore:rules,storage --config backend/firebase/firebase.json`
4. `firebase deploy --only functions --config backend/firebase/firebase.json`
5. `firebase deploy --only hosting --config backend/firebase/firebase.json`

Desplegar rules **antes** que el código que depende de ellas.

### Ver logs de Functions

```bash
firebase functions:log --config backend/firebase/firebase.json
```

O en Firebase Console → Functions → Logs.

---

## 13. Desarrollo vs producción

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| Proyecto Firebase | `clausum-dev` | `clausum-prod` |
| Emuladores | `VITE_USE_FIREBASE_EMULATORS=true` | `false` |
| API keys IA / Wompi / PayPal | `.env` local | Secret Manager |
| Hosting | Vite `:5173` | `*.web.app` o dominio propio |
| Firestore | Emulator (datos temporales) | Cloud Firestore real |
| Coste | $0 (emuladores) | Plan Blaze (pay-as-you-go) |

### Cambiar entre entornos

```bash
# Desarrollo
firebase use dev --config backend/firebase/firebase.json

# Producción
firebase use prod --config backend/firebase/firebase.json
```

Usa proyectos Firebase **separados** para dev y prod. Nunca desarrolles contra producción.

---

## 14. Checklist final

### Console Firebase
- [ ] Proyecto creado
- [ ] App web registrada
- [ ] Authentication: Email + Google habilitados
- [ ] Firestore creado (europe-west1)
- [ ] Storage creado (europe-west1)
- [ ] Plan Blaze activado

### Local
- [ ] `pnpm install` ejecutado
- [ ] `firebase login` completado
- [ ] `.firebaserc` con Project ID real
- [ ] `frontend/.env.local` rellenado
- [ ] `backend/functions/.env` rellenado (solo local)
- [ ] `pnpm dev:all` arranca sin errores
- [ ] Emulator UI accesible en `:4000`
- [ ] `GET /api/health` responde `{ status: "ok" }`

### Producción
- [ ] Secretos configurados en Secret Manager
- [ ] `VITE_USE_FIREBASE_EMULATORS=false` en build de prod
- [ ] `pnpm deploy` exitoso
- [ ] App accesible en URL de Hosting
- [ ] Login funciona en producción
- [ ] Rules desplegadas

---

## Estructura de archivos Firebase creada

```
contratos/
├── backend/
│   ├── firebase/
│   │   ├── .firebaserc           # IDs de proyectos dev/prod
│   │   ├── firebase.json         # Hosting, functions, emulators
│   │   ├── firestore.rules       # Seguridad Firestore
│   │   ├── firestore.indexes.json
│   │   └── storage.rules         # Seguridad Storage
│   └── functions/
│       ├── .env.example
│       └── src/
│           ├── index.ts          # API Express
│           ├── firebase/admin.ts
│           ├── middleware/authenticate.ts
│           └── config/env.ts
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── firebase/             # SDK cliente
│       │   ├── config.ts
│       │   ├── app.ts
│       │   ├── auth.ts
│       │   ├── firestore.ts
│       │   ├── storage.ts
│       │   └── index.ts
│       └── services/api/client.ts
└── docs/
    └── firebase-setup.md         # Esta guía
```
