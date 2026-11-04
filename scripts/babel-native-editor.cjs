// Monorepo source aliases make these dependency adapters look like application
// files. Their private ABI is fingerprinted separately at native build time.
// Keep ordinary application deep-import warnings enabled.
const nativeEditorVendor =
  /packages[/\\]native-host[/\\]src[/\\]nativeTextInput(Runtime|NativeComponent)\.js$/;
module.exports = function nativeEditorBabel(preset) {
  // Expo also loads Babel without a filename to compute its cache key.
  // Function predicates permit that preflight; RegExp patterns reject it.
  const matchesEditor = (filename) =>
    typeof filename === 'string' && nativeEditorVendor.test(filename);
  return {
    overrides: [
      { test: matchesEditor, presets: [[preset, { disableDeepImportWarnings: true }]] },
      { exclude: matchesEditor, presets: [preset] },
    ],
  };
};
