import { dirname } from 'path';
import { fileURLToPath } from 'url';
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import nextPlugin from '@next/eslint-plugin-next';
import jestPlugin from 'eslint-plugin-jest';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    rules: {
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^React$|^__filename$|^__dirname$',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      // Disable accessibility rules that require significant refactoring
      // These can be re-enabled incrementally as components are updated
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/heading-has-content': [
        'error',
        {
          components: [''],
        },
      ],
      // Regex warnings - these are intentional for sanitization
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'securestoryboard/**',
      'coverage/**',
      'e2e/**',
      'k6/**',
      'scripts/**',
      '__mocks__/**',
      'jest.config.js',
      'tailwind.config.js',
      'postcss.config.js',
    ],
  },
  {
    files: ['__tests__/**/*.{ts,tsx,js,jsx}', 'test-utils/**/*.{ts,tsx,js,jsx}', 'jest.setup.js', 'jest.setup-after-env.js'],
    ...jestPlugin.configs['flat/recommended'],
    languageOptions: {
      globals: {
        ...globals.jest,
        global: true,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Add or override jest rules if needed
    },
  },
];
