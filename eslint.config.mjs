// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

// TypeScript 7 checks TS/TSX with noUnusedLocals/noUnusedParameters in pnpm typecheck.
// Keep that supported compiler instead of forcing an incompatible typescript-eslint peer.
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '.cache/**',
    '.tools/**',
    '.idea/**',
    'artifacts/**',
    'coverage/**',
    'upstream/**',
    'apps/native-catalog/android/**',
    'apps/native-catalog/ios/**',
    'apps/native-benchmark/android/**',
    'apps/native-benchmark/ios/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', globals: globals.node },
    rules: {
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: [
      'scripts/reference/check-controls-keyboard.mjs',
      'scripts/reference/svg-icon-browser.mjs',
      'scripts/reference/button-group-browser.mjs',
      'scripts/reference/button-group-preparation-browser.mjs',
    ],
    languageOptions: { globals: globals.browser },
  },
]);
