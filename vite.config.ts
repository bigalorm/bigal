import { oxlintConfig } from 'oxlint-config-decent';
import { type UserConfig } from 'vite';
import { defineConfig } from 'vite-plus';

const baseLintConfig = oxlintConfig({ enableReact: false, enableTestingLibrary: false, enableVitest: true });

const config: UserConfig = defineConfig({
  fmt: {
    printWidth: 200,
    singleQuote: true,
  },
  lint: {
    ...baseLintConfig,
    rules: {
      ...baseLintConfig.rules,
      // The base exceptions plus uppercase letters: single-letter generic type
      // parameters (T, K, P, U, ...) are house style for the query builder API.
      'eslint/id-length': [
        'error',
        {
          exceptions: ['_', '$', 'e', 'i', 'j', 'k', 'q', 't', 'x', 'y', 'A', 'D', 'K', 'P', 'T', 'U'],
        },
      ],
      // Helper functions are commonly declared below their first use.
      'eslint/no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
      // Repositories return custom thenables so query chains can be awaited
      // directly; `void` appears deliberately in their resolve unions and in
      // the NotEntityBrand marker type.
      'unicorn/no-thenable': 'off',
      'typescript/no-invalid-void-type': 'off',
      // Every switch in this codebase handles the remaining union members in a
      // default clause; treat that as exhaustive.
      'typescript/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
    },
    overrides: [
      ...(baseLintConfig.overrides ?? []),
      {
        // Type-level assertion helpers need single-use generic parameters, and
        // Promise.all() over a single query deliberately exercises the
        // PromiseLike query implementation.
        files: ['**/*.test.ts'],
        rules: {
          'eslint/id-length': 'off',
          'typescript/no-unnecessary-type-parameters': 'off',
          'unicorn/no-single-promise-in-promise-methods': 'off',
        },
      },
    ],
    ignorePatterns: [...(baseLintConfig.ignorePatterns ?? []), '.agents/**', '.claude/skills/**', 'docs/**'],
  },
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: { oxc: true },
  },
  staged: {
    '*.md': ['vp fmt', 'markdownlint --config=.github/linters/.markdown-lint.yml --fix'],
    '*.{js,cjs,mjs,ts}': ['vp fmt', 'vp lint --fix'],
    '*.{json5,yml}': ['vp fmt'],
  },
});

export default config;
