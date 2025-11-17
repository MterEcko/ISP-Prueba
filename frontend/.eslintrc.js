module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: '@babel/eslint-parser'
  },
  rules: {
    // Convertir errores molestos a warnings en desarrollo
    'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'vue/multi-word-component-names': 'warn',
    'vue/no-parsing-error': 'warn',
    'vue/no-deprecated-destroyed-lifecycle': 'warn',
    'no-undef': 'warn',
    'no-prototype-builtins': 'warn',

    // Desactivar completamente algunos checks molestos
    'vue/no-unused-vars': 'off',

    // Mantener reglas críticas como error
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
};
