import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.es2022,
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 2022
      }
    },
    files: ['js/*.js']
  },
  pluginJs.configs.recommended,
  {

    rules: {
      // 120文字を超える行はエラー
      'max-len': ['error', { 'code': 120 }],
      // ; は必要
      'semi': ['error', 'always'],
      // シングルクォートのみ許可
      'quotes': ['error', 'single'],
      // インデントはスペース2つ
      'indent': ['error', 2],
      // カンマの前にスペースは不要
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      // オブジェクトの最後のカンマは不要
      'comma-dangle': ['error', 'never'],
      // キーワードの前後にスペースは必要
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      // camelCaseのみ許可
      'camelcase': ['error', { 'properties': 'always' }],
      // 行末のスペースは不要
      'no-trailing-spaces': ['error']
    }
  }
];