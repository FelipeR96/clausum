import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

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
      ...reactHooks.configs.recommended.rules,
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
    files: ['**/*.cjs', '**/*.mjs', '**/scripts/**/*.js', 'eslint.config.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', __dirname: 'readonly' },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
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
