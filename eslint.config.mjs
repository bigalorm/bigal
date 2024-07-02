import { defaultConfig } from 'eslint-config-decent';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  ...defaultConfig(),
  {
    files: ['**/*.mjs'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
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
);
