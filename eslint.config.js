import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const unused = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }];

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', 'server/.data/**'] },
  js.configs.recommended,
  {
    files: ['server/**/*.js', 'scripts/**/*.js', '*.js'],
    languageOptions: { globals: globals.node, sourceType: 'module', ecmaVersion: 2023 },
    rules: { 'no-unused-vars': unused },
  },
  { files: ['client/*.js'], languageOptions: { globals: globals.node, sourceType: 'module', ecmaVersion: 2023 } },
  { files: ['server/tests/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.jest } } },
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: { globals: globals.browser, sourceType: 'module', ecmaVersion: 2023, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': unused,
      // Acceptance check 14: the session token must never be kept in browser storage.
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
      'no-restricted-properties': ['error', { object: 'window', property: 'localStorage' }, { object: 'window', property: 'sessionStorage' }],
    },
  },
];
