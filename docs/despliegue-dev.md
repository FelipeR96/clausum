# Despliegue a `clausum-dev`

Primer despliegue del proyecto. `clausum-dev` hace de staging: es donde se
prueba la pasarela de pagos y el OCR, que no se pueden probar en local.
Produccion (`clausum-prod`) no existe todavia y se crea al lanzar.

**Da por hecho que algo va a fallar.** Es la primera vez que este codigo
corre fuera de los emuladores, y el runtime de Functions es Node 20 mientras
que en local usas Node 24 y el CI usa Node 22. Cualquier incompatibilidad
con Node 20 aparece aqui por primera vez.

---

## 0. Antes de empezar

| Que | Por que |
|---|---|
| Plan Blaze activo en `clausum-dev` | Cloud Functions v2, Cloud Tasks y Secret Manager lo exigen |
| Llaves de sandbox de Wompi (`pub_test_`, `prv_test_`) | Del panel de Wompi. El codigo detecta sandbox solo, por el `test` en la llave publica |
| `frontend/.env.production.local` | Ya creado. Ver la seccion "La mina del .env" mas abajo |


> **`pnpm exec` delante de todo.** `firebase-tools` es una dependencia del
> repo, no un programa global: `firebase` a secas da
> "no se reconoce como nombre de un cmdlet". Que viva en el repo es lo
> correcto — fija la version para todas las maquinas — pero obliga al
> prefijo.

```powershell
cd C:\Users\User\repos\contratos
pnpm exec firebase login
pnpm exec firebase use dev --config backend/firebase/firebase.json
```

`firebase use` debe responder `clausum-dev`. Si responde otra cosa, para.

---

## 1. Habilitar Secret Manager

Los 403 que salian al arrancar los emuladores eran esto: la API nunca se
habilito en el proyecto.

https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=clausum-dev

Dale a "Habilitar" y espera un par de minutos a que propague.

---

## 2. Cargar los seis secretos

Uno por uno; cada comando pide el valor por consola y no queda en el
historial de PowerShell.

```powershell
pnpm exec firebase functions:secrets:set DEEPSEEK_API_KEY       --project clausum-dev
pnpm exec firebase functions:secrets:set WOMPI_PRIVATE_KEY      --project clausum-dev
pnpm exec firebase functions:secrets:set WOMPI_INTEGRITY_SECRET --project clausum-dev
pnpm exec firebase functions:secrets:set WOMPI_EVENTS_SECRET    --project clausum-dev
pnpm exec firebase functions:secrets:set PAYPAL_CLIENT_SECRET   --project clausum-dev
pnpm exec firebase functions:secrets:set PAYPAL_WEBHOOK_ID      --project clausum-dev
```

Para PayPal, si todavia no tienes cuenta de sandbox, pon un valor
cualquiera: el codigo solo exige que el secreto exista.

`WOMPI_PUBLIC_KEY` **no** es un secreto (va al navegador) y se configura
como variable de entorno normal en el `.env` desplegado de functions, no
aqui.

Comprobar:

```powershell
pnpm exec firebase functions:secrets:access DEEPSEEK_API_KEY --project clausum-dev
```

---

## 3. Reglas primero, siempre

Las reglas se despliegan antes que el codigo. Si se hace al reves, hay una
ventana en la que funciones nuevas escriben contra reglas viejas.

```powershell
pnpm deploy:rules
```

Y los indices, que `deploy:rules` NO incluye:

```powershell
pnpm exec firebase deploy --only firestore:indexes --config backend/firebase/firebase.json
```

Son 22 indices compuestos. Sin ellos, toda consulta con filtro + orden
(historial, alertas, panel) falla en tiempo de ejecucion con "requires an
index". Se construyen en segundo plano y tardan unos minutos, asi que
conviene lanzarlos cuanto antes.

---

## 4. Los seeds

Los planes en Firestore llevan los precios. Sin esto, el proyecto
desplegado no tiene catalogo de planes y la facturacion no sabe cuanto
cobrar.

```powershell
pnpm seed:firestore
pnpm seed:legal-catalog
pnpm import:co-corpus
```

OJO: estos scripts apuntan al emulador cuando `FIRESTORE_EMULATOR_HOST`
esta definido. En una terminal limpia, sin emuladores corriendo, van al
proyecto real. Verificalo antes: si la variable existe, cierra la terminal
y abre otra.

---

## 5. Desplegar

```powershell
pnpm build
pnpm deploy
```

Si el despliegue de functions falla, lo mas probable es Node 20. El error
dira que modulo o sintaxis no soporta.

---

## 6. Probar, en este orden

El orden importa: cada paso descarta una causa antes de pasar al siguiente.

1. **Abrir el sitio.** Si sale "No hay conexion", el build se llevo la
   configuracion de emuladores. Ver la seccion de abajo.
2. **Registrarse.** Valida Auth y la creacion del documento de usuario.
3. **Subir un PDF digital y analizarlo.** Es el camino que ya funciona en
   local: si falla aqui, el problema es del despliegue, no del codigo.
4. **Mirar `tokensUsed`** en el documento del analisis y meterlo en el
   modelo de costo:
   `node scripts/cost-model.cjs --in=<entrada> --out=<salida>`
   Es el primer dato real de coste del proyecto.
5. **Subir un PDF escaneado corto** (menos de 15 paginas). Primera vez que
   el OCR corre en la vida del proyecto. Cronometralo.
6. **Subir un escaneado de mas de 15 paginas.** Confirma que se trunca en
   silencio — es el problema de confianza que hay que arreglar despues.
7. **Pagar con una tarjeta de prueba de Wompi** y comprobar que el webhook
   llega y activa Pro.

---

## La mina del `.env`

Vite carga los archivos por prioridad:

```
.env.production.local  >  .env.production  >  .env.local  >  .env
```

`.env.local` tiene `VITE_USE_FIREBASE_EMULATORS=true`, y gana sobre
`.env.production`. Sin un `.env.production.local`, un `pnpm build` empaqueta
un sitio que intenta hablar con `127.0.0.1`: desplegado, no funciona nada y
el sintoma en el navegador de cada visitante es "No hay conexion".

El archivo ya esta creado con los valores de Firebase copiados y
`VITE_USE_FIREBASE_EMULATORS=false`. Esta en `.gitignore`.

Para comprobar que el build salio limpio, antes de desplegar:

```powershell
pnpm build:web
Select-String -Path frontend/dist/assets/*.js -Pattern "127.0.0.1" -SimpleMatch
```

Si encuentra algo, el build se llevo los emuladores. No despliegues.

---

## Volver atras

```powershell
pnpm exec firebase hosting:rollback --project clausum-dev
```

Functions no tiene rollback de un comando: se vuelve al commit anterior y se
despliega otra vez.
