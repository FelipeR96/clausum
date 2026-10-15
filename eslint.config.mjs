import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
// En v10 el flat config vive en el subpath /flat; el export raiz sigue
// siendo el objeto estilo .eslintrc.
import prettier from 'eslint-config-prettier/flat';

// `eslint-plugin-react-hooks` ha movido de sitio su configuracion
// recomendada entre versiones mayores (configs.recommended en unas,
// configs['recommended-latest'] en otras). Las reglas son las mismas en
// todas, asi que se toma de donde exista en vez de fijar una forma.
const reactHooksRules =
  reactHooks.configs?.['recommended-latest']?.rules ??
  reactHooks.configs?.flat?.rules ??
  reactHooks.configs?.recommended?.rules ??
  {};

export default tseslint.config(
  // ─── Ignorados ─────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/*.tsbuildinfo',
      'emulator-data/**',
      'frontend/public/**',
      'backend/functions/data/**',
      'shared/dist/**',
    ],
  },

  // ─── Base para todo el monorepo ────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },

  // ─── Backend: reglas con información de tipos ──────────────
  // `no-floating-promises` necesita el type checker. Es la regla más
  // importante del set: detecta trabajo asíncrono que se dispara sin
  // esperar — exactamente la clase de bug que no sobrevive en Cloud Run.
  {
    files: ['backend/functions/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./backend/functions/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/require-await': 'warn',
      // Ya existe un logger propio que escribe estructurado a Cloud Logging.
      'no-console': 'error',
    },
  },

  // ─── Shared ────────────────────────────────────────────────
  {
    files: ['shared/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./shared/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ─── Frontend ──────────────────────────────────────────────
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        project: ['./frontend/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooksRules,
      // Regla nueva de react-hooks v7: avisa de setState sincrono dentro de
      // un efecto, que provoca renders en cascada. Son 12 sitios de codigo
      // anterior a la regla y arreglarlos bien es un refactor, no un
      // cambio mecanico. Queda como aviso para no bloquear el CI; ver
      // F3-07 en docs/roadmap.md para liquidarlo.
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ─── Scripts de Node (CJS y ESM sueltos) ───────────────────
  {
    files: ['**/*.cjs', '**/*.mjs', '**/*.js', 'eslint.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Los .cjs son CommonJS: sin esto, `require`, `module` y `exports` salen
  // como no definidos.
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },

  // El logger ES la capa que escribe a stdout, que es como Cloud Logging
  // recoge los logs estructurados. Prohibirle console seria prohibirle
  // hacer su trabajo.
  {
    files: ['backend/functions/src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // ─── Tests ─────────────────────────────────────────────────
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Prettier al final: desactiva todo lo que choca con el formateador.
  prettier
);
