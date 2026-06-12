import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow intentionally-unused args/vars when prefixed with underscore.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Guardrail: the simulation core must stay headless. No DOM/browser globals
  // may be referenced from src/sim — keeps it runnable in tests and workers.
  {
    files: ['src/sim/**/*.ts'],
    languageOptions: {
      globals: {
        window: 'off',
        document: 'off',
        navigator: 'off',
        localStorage: 'off',
      },
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/sim must stay headless — no DOM access.' },
        { name: 'document', message: 'src/sim must stay headless — no DOM access.' },
        { name: 'navigator', message: 'src/sim must stay headless — no DOM access.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'src/sim must be deterministic — use the seeded PRNG in state.',
        },
      ],
    },
  },
  prettier,
);
