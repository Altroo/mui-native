const { createRequire } = require('node:module');
// Resolve the same Expo preset as the SDK's fallback, without a second version.
const expoRequire = createRequire(require.resolve('expo/package.json'));
module.exports = require('../../scripts/babel-native-editor.cjs')(
  expoRequire.resolve('babel-preset-expo'),
);
