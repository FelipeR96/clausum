import net from 'node:net';

const host = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1';
const port = Number(process.env.FUNCTIONS_EMULATOR_PORT ?? 5001);
const timeoutMs = Number(process.env.FUNCTIONS_EMULATOR_WAIT_MS ?? 180_000);
const intervalMs = 1_000;

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

const started = Date.now();
console.log(`⏳ Esperando emulador Functions en ${host}:${port}…`);

while (Date.now() - started < timeoutMs) {
  if (await portOpen()) {
    console.log(`✅ Emulador Functions listo (${host}:${port})`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

console.error(
  `\n❌ El emulador Functions no respondió en ${timeoutMs / 1000}s. ` +
    'Revisa la salida de [emu] en la terminal.'
);
process.exit(1);
