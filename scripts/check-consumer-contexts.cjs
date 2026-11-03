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
  for (const name of [
    'NativeTextScope',
    'NativeTextStyleContext',
    'useNativeTextContext',
    'NativeIconStyleContext',
  ])
    assert.equal(material[name], root[name]);
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
  const materialStyles = requireConsumer('@altroo/mui-native/styles');
  for (const name of ['ThemeProvider', 'useTheme', 'useThemeProps', 'styled']) {
    assert.equal(materialStyles[name], material[name]);
    assert.equal(requireConsumer('@altroo/mui-native/styles/' + name).default, material[name]);
  }
  assert.equal(materialStyles.THEME_ID, '$$material');
  assert.equal(requireConsumer('@altroo/mui-native/styles/identifier').default, material.THEME_ID);
  for (const name of ['ThemeProvider', 'useTheme', 'useThemeWithoutDefault', 'RtlProvider'])
    assert.equal(requireConsumer('@altroo/mui-native-system/' + name).default, root[name]);
  assert.equal(requireConsumer('@altroo/mui-native-system/RtlProvider').useRtl, root.useRtl);
  assert.equal(
    requireConsumer('@altroo/mui-native-system/useTheme').systemDefaultTheme,
    root.systemDefaultTheme,
  );
  assert.notEqual(material.ThemeProvider, root.ThemeProvider);
  assert.notEqual(material.useTheme, root.useTheme);
  for (const name of [
    'Fade',
    'Grow',
    'Popover',
    'ButtonBase',
    'List',
    'MenuItem',
    'MenuList',
    'Menu',
    'Select',
    'ListItemIcon',
    'ListItemAvatar',
    'ListSubheader',
    'ListItem',
    'ListItemSecondaryAction',
    'ListItemButton',
    'ListItemText',
    'Modal',
    'Backdrop',
    'Dialog',
    'FormControl',
    'FormLabel',
    'InputLabel',
    'FormHelperText',
    'Typography',
    'Button',
    'IconButton',
    'Switch',
    'Checkbox',
    'Radio',
    'RadioGroup',
    'FormGroup',
    'FormControlLabel',
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
  for (const name of ['createTransitions', 'createMotion'])
    assert.equal(requireConsumer('@altroo/mui-native/styles/' + name).default, root[name]);
  for (const name of ['duration', 'easing'])
    assert.deepEqual(
      requireConsumer('@altroo/mui-native/styles/createTransitions')[name],
      root[name],
    );
  for (const name of ['PopoverRoot', 'PopoverPaper', 'getOffsetTop', 'getOffsetLeft'])
    assert.equal(requireConsumer('@altroo/mui-native/Popover')[name], material[name]);
  assert.equal(requireConsumer('@altroo/mui-native/MenuList').MenuListRoot, material.MenuListRoot);
  for (const name of ['MenuPaper', 'menuClasses', 'getMenuUtilityClass'])
    assert.equal(requireConsumer('@altroo/mui-native/Menu')[name], material[name]);
  assert.equal(
    requireConsumer('@altroo/mui-native/Menu/menuClasses').default,
    material.menuClasses,
  );
  for (const [component, classes, helper] of [
    ['Chip', 'chipClasses', 'getChipUtilityClass'],
    ['Button', 'buttonClasses', 'getButtonUtilityClass'],
    ['IconButton', 'iconButtonClasses', 'getIconButtonUtilityClass'],
    ['Switch', 'switchClasses', 'getSwitchUtilityClass'],
    ['Checkbox', 'checkboxClasses', 'getCheckboxUtilityClass'],
    ['Radio', 'radioClasses', 'getRadioUtilityClass'],
    ['RadioGroup', 'radioGroupClasses', 'getRadioGroupUtilityClass'],
    ['FormGroup', 'formGroupClasses', 'getFormGroupUtilityClass'],
    ['FormControlLabel', 'formControlLabelClasses', 'getFormControlLabelUtilityClasses'],
  ]) {
    const entry = requireConsumer('@altroo/mui-native/' + component);
    const deep = requireConsumer('@altroo/mui-native/' + component + '/' + classes);
    assert.equal(entry.default, material[component]);
    assert.equal(entry[classes], material[classes]);
    assert.equal(entry[helper], material[helper]);
    assert.equal(deep.default, material[classes]);
    assert.equal(deep[helper], material[helper]);
  }
  assert.equal(
    requireConsumer('@altroo/mui-native/RadioGroup/useRadioGroup').default,
    material.useRadioGroup,
  );
  assert.equal(
    requireConsumer('@altroo/mui-native/RadioGroup').useRadioGroup,
    material.useRadioGroup,
  );
  for (const name of ['selectClasses', 'getSelectUtilityClasses'])
    assert.equal(requireConsumer('@altroo/mui-native/Select')[name], material[name]);
  assert.equal(
    requireConsumer('@altroo/mui-native/Select/selectClasses').default,
    material.selectClasses,
  );
  assert.equal(typeof requireConsumer('@altroo/mui-native/Select/SelectInput').default, 'object');
  assert.equal(typeof requireConsumer('@altroo/mui-native-host').getNativeFocusedView, 'function');
  assert.equal(material.Grow.muiSupportAuto, true);
  requireConsumer('@altroo/mui-native/transitions');
  requireConsumer('@altroo/mui-native/transitions/types');
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
