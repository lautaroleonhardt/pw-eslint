export default {
  apiVersion: 2,
  id: 'custom-bad-version-rule',
  description: 'A custom rule with unsupported apiVersion',
  defaultSeverity: 'warn',
  fixable: false,
  check(_context) {},
};
