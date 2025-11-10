module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  ignorePatterns: ['**/dist/**', '**/node_modules/**'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['server/src/**/*.ts', 'server/tests/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './server/tsconfig.test.json',
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
      },
    },
    {
      files: ['web/src/**/*.{ts,tsx}', 'web/tests/**/*.ts', 'web/tests/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './web/tsconfig.test.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
    },
  ],
};
