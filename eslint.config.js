import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'server/node_modules',
    // Root one-off migration/utility scripts (not app runtime)
    'enhance_face.cjs',
    'fix_security.cjs',
    'remove-emoji.js',
    'remove-emoji.mjs',
  ]),
  // API, server, and scripts (Node.js environment)
  {
    files: ['api/**/*.js', 'server/**/*.js', 'scripts/**/*.{js,cjs}', 'deploy/**/*.cjs', '*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  // Vitest
  {
    files: ['src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  // React source files (Browser environment)
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/test/**/*'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      // Data-fetch-on-mount pattern is intentional across this codebase
      'react-hooks/set-state-in-effect': 'off',
      // Context providers + shared helpers legitimately co-export with components
      'react-refresh/only-export-components': 'off',
    },
  },
])
