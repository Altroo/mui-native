const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const Module = require('node:module');
const requireConsumer = createRequire(path.resolve(process.argv[2], 'package.json'));
const load = Module._load;
// Only module/export identity is checked here. Native rendering is tested separately.
Module._load = function (request, parent, main) {
  if (request === 'react-native')
    return { Platform: { OS: 'ios' }, StyleSheet: { flatten: (value) => value } };
  return load.call(this, request, parent, main);
};
try {
  const root = requireConsumer('@altroo/mui-native-system');
  const defaults = requireConsumer('@altroo/mui-native-system/DefaultPropsProvider');
  const hooks = requireConsumer('@altroo/mui-native-system/useThemeProps');
  const material = requireConsumer('@altroo/mui-native');
  const materialDefaults = requireConsumer('@altroo/mui-native/DefaultPropsProvider');
  for (const [actual, expected] of [
    [defaults.default, root.DefaultPropsProvider],
    [defaults.useDefaultProps, root.useDefaultProps],
    [hooks.default, root.useThemeProps],
    [hooks.getThemeProps, root.getThemeProps],
    [materialDefaults.default, root.DefaultPropsProvider],
    [material.useDefaultProps, root.useDefaultProps],
  ]) {
    assert.equal(typeof actual, 'function');
    assert.equal(
      actual,
      expected,
      'Installed root/deep imports must share the same context-owning implementation.',
    );
  }
  for (const name of [
    'FormControl',
    'FormLabel',
    'Typography',
    'Button',
    'InputBase',
    'Input',
    'FilledInput',
    'OutlinedInput',
    'InputAdornment',
  ])
    assert.equal(
      requireConsumer('@altroo/mui-native/' + name).default,
      material[name],
      `Installed ${name} must share its root implementation.`,
    );
  assert.equal(
    requireConsumer('@altroo/mui-native/FormControl').useFormControl,
    material.useFormControl,
  );
  assert.equal('NativeInputControl' in requireConsumer('@altroo/mui-native/InputBase'), false);
  const textField = requireConsumer('@altroo/mui-native/TextField');
  const utils = requireConsumer('@altroo/mui-native/utils');
  assert.equal(textField.default, material.TextField);
  assert.equal(textField.NativeTextFieldInput, material.NativeTextFieldInput);
  for (const name of ['useForkRef', 'setRef']) {
    assert.equal(typeof utils[name], 'function');
    assert.equal(utils[name], material[name]);
  }
  console.log(
    'Installed root/deep providers, hooks and Material components share their implementations.',
  );
} finally {
  Module._load = load;
}
