import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  vue: true,
}, {
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
    'ts/explicit-function-return-type': 'off',
    'ts/no-unsafe-function-type': 'off',
    'unused-imports/no-unused-vars': 'off',
    'ts/no-this-alias': 'off',
    'ts/no-use-before-define': 'off',
    'no-new-func': 'off',
    'style/brace-style': ['error', '1tbs'],
  },
})
