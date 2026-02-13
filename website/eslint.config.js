import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React — JSX transform means no React import needed, but track JSX usage
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General quality
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'no-control-regex': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
