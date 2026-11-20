/**
 * @file   eslint.config.js
 * @brief  ESLint flat config: Mini Games' strict typed TypeScript rules and size limits.
 *
 * Responsibility: the rules of Mini Games' eslint.config.js without its layer rules (the kit
 *                 has one layer): typed strict rules, no default exports, the size and
 *                 complexity limits, unused variables as errors. Formatting is Prettier's.
 * Depends on:     tsconfig.json (typed linting)
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Default exports are banned so every import names what it uses.
const NO_DEFAULT_EXPORT = [
  { selector: 'ExportDefaultDeclaration', message: 'Use a named export.' },
  { selector: 'ExportSpecifier[exported.name="default"]', message: 'Use a named export.' },
];

export default defineConfig(
  // The compiled output (checked against the source in CI instead) and install folders.
  { ignores: ['**/node_modules/', 'dist/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-restricted-syntax': ['error', ...NO_DEFAULT_EXPORT],
      'max-lines': ['error', { max: 300 }],
      'max-lines-per-function': ['error', { max: 60 }],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      // Underscore-prefix is the TS convention for a deliberately unused parameter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The early theme script is plain ES5 for the browser, run before any module loads.
    files: ['browser/**/*.js'],
    // ES5 has no optional catch binding, so a catch's unused error is allowed here.
    languageOptions: { globals: { window: 'readonly', document: 'readonly' } },
    rules: {
      'no-var': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    // The CI scripts run in Node, which provides these globals (tsc checks them via checkJs).
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', fetch: 'readonly' } },
  },
  {
    // Test files may run to 400 lines.
    files: ['**/*.test.ts'],
    rules: { 'max-lines': ['error', { max: 400 }] },
  },
  {
    // Tool config files must default-export their configuration.
    files: ['*.config.js', '*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
