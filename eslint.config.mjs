import pluginJs from "@eslint/js";


export default [
  pluginJs.configs.recommended,
  {
    rules: {
      // semicolom
      "semi": ["error", "always"],
      // no-unused-vars
      "no-unused-vars": ["error", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
      // 1line 120
      "max-len": ["error", { "code": 120 }],
      // tab 2
      "indent": ["error", 2],
    }
  }
];