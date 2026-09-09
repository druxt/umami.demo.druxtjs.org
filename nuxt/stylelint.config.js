module.exports = {
  customSyntax: 'postcss-html',
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
    'stylelint-config-prettier',
  ],
  rules: {
    // The theme uses BEM (block__element--modifier). stylelint-config-standard
    // ships a kebab-case-only pattern, which rejects the __ and -- separators.
    // Widened rather than renaming the classes, which would lose the meaning
    // the convention carries.
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Expected class selector to be kebab-case or BEM' },
    ],
  },
}
