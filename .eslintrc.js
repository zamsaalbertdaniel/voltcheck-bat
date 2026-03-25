module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // must be last — disables rules that conflict with Prettier
  ],
  rules: {
    // Allow explicit `any` with a warning (too strict for existing codebase)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow unused vars if prefixed with _
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // React 17+ doesn't need React in scope
    'react/react-in-jsx-scope': 'off',
    // Prop types not needed with TypeScript
    'react/prop-types': 'off',
    // Enforce hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // No console.log in production code
    'no-console': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'web-build/',
    'functions/lib/',
    'functions/node_modules/',
    '.expo/',
    '*.config.js',
  ],
};
