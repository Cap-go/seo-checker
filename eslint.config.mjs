import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
    rules: {
      'no-console': 'off',
      'no-control-regex': 'off',
      'node/prefer-global/process': 'off',
      'regexp/no-dupe-disjunctions': 'off',
      'regexp/no-unused-capturing-group': 'off',
      'unused-imports/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
    ignores: [
      'dist',
      'node_modules',
    ],
  },
)
