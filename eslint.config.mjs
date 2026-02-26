import { config } from 'eslint-config-decent';

export default [
  ...config({
    tsconfigRootDir: import.meta.dirname,
    enableTestingLibrary: false,
  }),
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
];
