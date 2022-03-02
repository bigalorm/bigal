module.exports = {
  // Override our default settings just for this directory
  env: {
    mocha: true,
    es6: true,
  },
  globals: {
    describe: true,
    before: true,
    after: true,
    beforeEach: true,
    afterEach: true,
    it: true,
  },
  rules: {
    'max-classes-per-file': 'off',
    // TODO: 2022-03-02 - Re-evaluate after npm update
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/unbound-method': 'off',
  },
};
