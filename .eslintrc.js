module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": ["off", {"ignoreRestArgs": false}],
    "@typescript-eslint/interface-name-prefix": ["off"],
    "@typescript-eslint/member-delimiter-style": ["off"],
    "@typescript-eslint/no-empty-interface": ["off"],
    "@typescript-eslint/no-inferrable-types": ["off"]
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
};