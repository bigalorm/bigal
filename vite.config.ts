import { oxlintConfig } from 'eslint-config-decent/oxlint';
import { type UserConfig } from 'vite';
import { defineConfig } from 'vite-plus';

type LintConfig = ReturnType<typeof oxlintConfig>;
type LintRules = NonNullable<LintConfig['rules']>;

const baseLintConfig: LintConfig = oxlintConfig({ enableReact: false, enableTestingLibrary: false, enableVitest: true });

// These compat plugins import @typescript-eslint/typescript-estree, which cannot
// load alongside typescript 7 (it supports typescript <6.1 only). Drop them and
// their rules (member-ordering, explicit-member-accessibility, and a few vitest
// padding/style rules) until typescript-eslint supports typescript 7.
const estreeDependentPlugins = new Set(['@typescript-eslint/eslint-plugin', '@vitest/eslint-plugin']);
const estreeDependentRulePrefixes = ['typescript-compat/', 'vitest-compat/'];

function withoutEstreeDependentRules(rules: LintRules | undefined): LintRules {
  return Object.fromEntries(Object.entries(rules ?? {}).filter(([ruleName]) => !estreeDependentRulePrefixes.some((prefix) => ruleName.startsWith(prefix))));
}

const config: UserConfig = defineConfig({
  fmt: {
    printWidth: 200,
    singleQuote: true,
  },
  lint: {
    ...baseLintConfig,
    jsPlugins: (baseLintConfig.jsPlugins ?? []).filter((plugin) => !estreeDependentPlugins.has(typeof plugin === 'string' ? plugin : plugin.specifier)),
    rules: {
      ...withoutEstreeDependentRules(baseLintConfig.rules),
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
      ...(baseLintConfig.overrides ?? [])
        .map((override) => ({
          ...override,
          rules: withoutEstreeDependentRules(override.rules),
        }))
        .filter((override) => Object.keys(override.rules).length > 0 || override.jsPlugins),
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
