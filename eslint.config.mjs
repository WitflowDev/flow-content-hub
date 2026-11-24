import flowHabits from './eslint/flow-habits.mjs'
import { parseForESLint } from './eslint/ts-parser.mjs'

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: { parseForESLint },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { flow: flowHabits },
    rules: {
      'flow/imports-at-top': 'error',
      'flow/theme-switch-never': 'error',
    },
  },
]
