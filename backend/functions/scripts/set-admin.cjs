/**
 * Concede o revoca el rol de administrador.
 *
 * El rol vive en un custom claim del token de Firebase, no en Firestore: va
 * firmado por Google, el cliente no puede falsificarlo, y el backend lo ve
 * en cada peticion sin consultar la base de datos.
 *
 * Como esto cambia quien puede tocar precios y planes, no hay forma de
 * hacerlo desde la web, ni siquiera siendo ya administrador. Se hace desde
 * aqui, a proposito.
 *
 * ── Credenciales ────────────────────────────────────────────────────────
 * Contra el proyecto real hacen falta credenciales de servicio. Dos formas:
 *
 *   a) Clave de cuenta de servicio (no requiere instalar nada):
 *      Consola de Firebase -> Configuracion del proyecto -> Cuentas de
 *      servicio -> Generar nueva clave privada. Guardar el JSON FUERA del
 *      repositorio y:
 *        $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\clave.json"
 *
 *   b) Si tienes gcloud:
 *        gcloud auth application-default login
 *
 * ── Uso ─────────────────────────────────────────────────────────────────
 *   node scripts/set-admin.cjs <correo>            # conceder
 *   node scripts/set-admin.cjs <correo> --revocar  # revocar
 *   node scripts/set-admin.cjs --listar            # ver quien lo tiene
 *
 *   --project=<id>   por defecto clausum-dev
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const projectArg = args.find((a) => a.startsWith('--project='));
const email = args.find((a) => !a.startsWith('--'));

const projectId =
  projectArg?.split('=')[1] ?? process.env.GCLOUD_PROJECT ?? 'clausum-dev';

function explicarCredenciales(error) {
  console.error('\n❌ No se pudo autenticar contra ' + projectId + '.');
  console.error('   ' + (error?.message ?? error));
  console.error('\n   Hacen falta credenciales de servicio. La via mas corta:');
  console.error('   1. Consola de Firebase -> Configuracion del proyecto');
  console.error('      -> Cuentas de servicio -> Generar nueva clave privada');
  console.error('   2. Guardar el JSON fuera del repositorio');
  console.error('   3. $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\clave.json"');
  console.error('   4. Repetir este comando\n');
  process.exit(1);
}

(async () => {
  try {
    initializeApp({ credential: applicationDefault(), projectId });
  } catch (error) {
    explicarCredenciales(error);
  }

  const auth = getAuth();

  if (flags.has('--listar')) {
    console.log(`\nAdministradores en ${projectId}:\n`);
    let encontrados = 0;
    let pageToken;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        if (u.customClaims?.admin === true) {
          console.log(`  · ${u.email ?? '(sin correo)'}  ${u.uid}`);
          encontrados += 1;
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
    if (encontrados === 0) console.log('  (ninguno)');
    console.log('');
    return;
  }

  if (!email) {
    console.error('\nFalta el correo.\n');
    console.error('  node scripts/set-admin.cjs <correo>');
    console.error('  node scripts/set-admin.cjs <correo> --revocar');
    console.error('  node scripts/set-admin.cjs --listar\n');
    process.exit(1);
  }

  const revocar = flags.has('--revocar');

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ No hay ningun usuario con ${email} en ${projectId}.`);
      console.error('   Hay que registrarse en la aplicacion primero.\n');
      process.exit(1);
    }
    explicarCredenciales(error);
  }

  // Se conservan los demas claims: sobrescribir el objeto entero borraria
  // cualquier otro que hubiera.
  const claims = { ...(user.customClaims ?? {}) };
  if (revocar) delete claims.admin;
  else claims.admin = true;

  await auth.setCustomUserClaims(user.uid, claims);

  console.log(
    `\n✅ ${revocar ? 'Revocado' : 'Concedido'} el rol de administrador a ${email}`
  );
  console.log(`   uid: ${user.uid}`);
  console.log(`   proyecto: ${projectId}`);
  console.log(
    '\n⚠️  El cambio entra cuando se renueve el token: cerrar sesion y volver\n' +
      '   a entrar, o esperar hasta una hora.\n'
  );
})().catch((error) => {
  console.error('\n❌ ' + (error?.message ?? error) + '\n');
  process.exit(1);
});
