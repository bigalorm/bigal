import { config } from 'eslint-config-decent';

export default [
  ...config({
    tsconfigRootDir: import.meta.dirname,
    enableJest: false,
    enableVitest: false,
    enableTestingLibrary: false,
  }),
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
