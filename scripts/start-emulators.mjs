import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const EMULATOR_DATA_DIR = join(process.cwd(), 'emulator-data');

function resolveJavaHome() {
  const candidates = [];

  if (process.env.JAVA_HOME) {
    candidates.push(process.env.JAVA_HOME);
  }

  const adoptiumRoot = 'C:\\Program Files\\Eclipse Adoptium';
  if (existsSync(adoptiumRoot)) {
    for (const dir of readdirSync(adoptiumRoot)) {
      if (/^jdk-(1[1-9]|[2-9]\d)/.test(dir)) {
        candidates.push(join(adoptiumRoot, dir));
      }
    }
  }

  const programFilesJava = 'C:\\Program Files\\Java';
  if (existsSync(programFilesJava)) {
    for (const dir of readdirSync(programFilesJava)) {
      if (/^jdk-/.test(dir)) {
        candidates.push(join(programFilesJava, dir));
      }
    }
  }

  for (const home of candidates) {
    if (existsSync(join(home, 'bin', 'java.exe'))) {
      return home;
    }
  }

  return null;
}

const javaHome = resolveJavaHome();

if (!javaHome) {
  console.error(
    '\n❌ No se encontró JDK 11+. Instala JDK 17:\n' +
      '   winget install EclipseAdoptium.Temurin.17.JDK\n'
  );
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${join(javaHome, 'bin')};${process.env.PATH ?? ''}`,
  /** Carga pesada (pdfkit, tesseract, mammoth) supera el default de 10s */
  FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT ?? '60',
};

console.log(
  `⏱️  FUNCTIONS_DISCOVERY_TIMEOUT=${env.FUNCTIONS_DISCOVERY_TIMEOUT}s (carga pesada de Functions)\n`
);

console.log(`☕ Usando Java: ${javaHome}\n`);

if (!existsSync(EMULATOR_DATA_DIR)) {
  mkdirSync(EMULATOR_DATA_DIR, { recursive: true });
  console.log('💾 Persistencia: carpeta emulator-data/ creada (datos nuevos).\n');
} else {
  console.log(`💾 Persistencia: cargando datos desde ${EMULATOR_DATA_DIR}\n`);
}

const firebaseBin = join(process.cwd(), 'node_modules', '.bin', 'firebase');
const command = existsSync(firebaseBin) ? `"${firebaseBin}"` : 'npx firebase';
const importPath = JSON.stringify(EMULATOR_DATA_DIR);

const child = spawn(
  `${command} emulators:start --import=${importPath} --export-on-exit=${importPath}`,
  [],
  { stdio: 'inherit', shell: true, env }
);

child.on('exit', (code) => process.exit(code ?? 1));
