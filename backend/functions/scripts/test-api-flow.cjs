/**
 * Prueba el backend SIN frontend.
 *
 * Uso (emuladores corriendo en otra terminal):
 *   pnpm test:api -- ruta/al/contrato.pdf
 *   pnpm test:api -- ruta/al/contrato.docx
 *
 * Variables opcionales:
 *   TEST_EMAIL=test@clausum.com
 *   TEST_PASSWORD=Test1234!
 */
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

const projectId = process.env.GCLOUD_PROJECT ?? 'clausum-dev';
const filePath = process.argv[2];

if (!filePath) {
  console.error('Uso: pnpm test:api -- <ruta-archivo.pdf|docx>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error('Archivo no encontrado:', filePath);
  process.exit(1);
}

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';

initializeApp({ projectId, storageBucket: `${projectId}.firebasestorage.app` });

const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

const email = process.env.TEST_EMAIL ?? 'test@clausum.com';
const password = process.env.TEST_PASSWORD ?? 'Test1234!';

async function getIdToken(uid) {
  const customToken = await auth.createCustomToken(uid);
  const url = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) {
    throw new Error('No se pudo obtener idToken: ' + JSON.stringify(data));
  }
  return data.idToken;
}

async function main() {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.pdf', '.docx'].includes(ext)) {
    throw new Error('Solo se admiten .pdf y .docx');
  }

  const contentType =
    ext === '.pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log('✓ Usuario creado:', user.uid);
  }

  await db.collection('users').doc(user.uid).set(
    {
      email,
      planId: 'pro',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const contractRef = db.collection('contracts').doc();
  const fileName = `${contractRef.id}${ext}`;
  const storagePath = `users/${user.uid}/contracts/${fileName}`;

  await bucket.upload(filePath, {
    destination: storagePath,
    metadata: { contentType },
  });
  console.log('✓ Archivo subido a Storage:', storagePath);

  await contractRef.set({
    userId: user.uid,
    title: path.basename(filePath, ext),
    fileName,
    storagePath,
    status: 'uploaded',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log('✓ Contrato en Firestore:', contractRef.id);

  const idToken = await getIdToken(user.uid);
  console.log('✓ Token obtenido');

  const apiBase = `http://127.0.0.1:5001/${projectId}/us-east1/api/api`;
  const endpoints = [
    { name: 'analyze', path: '/analyze', body: { contractId: contractRef.id } },
    { name: 'risks', path: '/risks', body: { contractId: contractRef.id } },
  ];

  for (const ep of endpoints) {
    console.log(`\n→ POST ${ep.name}...`);
    const res = await fetch(`${apiBase}${ep.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ep.body),
    });
    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    console.log(JSON.stringify(data, null, 2).slice(0, 1500));
    if (!res.ok) {
      console.error(`✗ Falló ${ep.name}`);
      process.exit(1);
    }
  }

  console.log('\n✅ Prueba completada. Revisa Firestore en http://localhost:4000');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
