// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const Module = require('node:module');
const requireConsumer = createRequire(path.resolve(process.argv[2], 'package.json'));
const load = Module._load;
// This Node-only identity probe has no Fabric runtime. Native SVG rendering is
// checked by the maintained renderer and actual catalog scenarios separately.
const svg = { __esModule: true, default: function Svg() {}, Path: function Path() {} };
svg.Svg = svg.default;
requireConsumer.resolve('react-native-svg/package.json');
// Only module/export identity is checked here. Native rendering is tested separately.
Module._load = function (request, parent, main) {
  if (request === 'react-native-svg') return svg;
  if (request === 'react-native')
    return { Platform: { OS: 'ios' }, StyleSheet: { flatten: (value) => value } };
  return load.call(this, request, parent, main);
};
try {
  const root = requireConsumer('@altroo/mui-native-system');
  const breakpointEntry = requireConsumer('@altroo/mui-native-system/createBreakpoints');
  assert.deepEqual(Object.keys(breakpointEntry), ['unstable_createBreakpoints']);
  assert.equal(breakpointEntry.unstable_createBreakpoints, root.createBreakpoints);
  const defaults = requireConsumer('@altroo/mui-native-system/DefaultPropsProvider');
  const hooks = requireConsumer('@altroo/mui-native-system/useThemeProps');
  const material = requireConsumer('@altroo/mui-native');
  for (const [name, classes, utility] of [
    ['FormGroup', 'formGroupClasses', 'getFormGroupUtilityClass'],
    ['ListItemAvatar', 'listItemAvatarClasses', 'getListItemAvatarUtilityClass'],
    ['ListItemIcon', 'listItemIconClasses', 'getListItemIconUtilityClass'],
    ['AccordionDetails', 'accordionDetailsClasses', 'getAccordionDetailsUtilityClass'],
    ['Typography', 'typographyClasses', 'getTypographyUtilityClass'],
  ]) {
    const entry = requireConsumer('@altroo/mui-native/' + name);
    assert.equal(entry.default, material[name]);
    assert.equal(entry[name], material[name]);
    assert.equal(entry[classes], material[classes]);
    assert.equal(entry[utility], material[utility]);
  }
  const details = requireConsumer('@altroo/mui-native/AccordionDetails');
  const detailsClassEntry = requireConsumer(
    '@altroo/mui-native/AccordionDetails/accordionDetailsClasses',
  );
  const { unstable_ClassNameGenerator } = requireConsumer('@altroo/mui-native/className');
  const loadedDetailsRoot = details.accordionDetailsClasses.root;
  assert.equal(detailsClassEntry.default, details.accordionDetailsClasses);
  // Verify the installed entries share the live generator as well as export identity.
  try {
    unstable_ClassNameGenerator.configure((name) => 'Installed' + name);
    assert.equal(
      material.getAccordionDetailsUtilityClass('root'),
      'InstalledMuiAccordionDetails-root',
    );
    assert.equal(
      detailsClassEntry.getAccordionDetailsUtilityClass('root'),
      'InstalledMuiAccordionDetails-root',
    );
    assert.equal(details.getAccordionDetailsUtilityClass('disabled'), 'Mui-disabled');
    assert.equal(details.accordionDetailsClasses.root, loadedDetailsRoot);
  } finally {
    unstable_ClassNameGenerator.reset();
  }
  const groupModule = requireConsumer('@altroo/mui-native/ButtonGroup');
  assert.equal(groupModule.default, material.ButtonGroup);
  assert.equal(groupModule.ButtonGroupContext, material.ButtonGroupContext);
  assert.equal(groupModule.ButtonGroupButtonContext, material.ButtonGroupButtonContext);
  assert.equal(
    requireConsumer('@altroo/mui-native/ButtonGroup/ButtonGroupContext').default,
    material.ButtonGroupContext,
  );
  assert.equal(
    requireConsumer('@altroo/mui-native/ButtonGroup/ButtonGroupButtonContext').default,
    material.ButtonGroupButtonContext,
  );
  assert.equal(
    requireConsumer('@altroo/mui-native/ButtonGroup/buttonGroupClasses').default,
    material.buttonGroupClasses,
  );

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
    [material.DefaultPropsProvider, root.DefaultPropsProvider],
    [material.useDefaultProps, root.useDefaultProps],
  ]) {
    assert.equal(typeof actual, 'function');
    assert.equal(
      actual,
      expected,
      'Installed root/deep imports must share the same context-owning implementation.',
    );
  }
  // Material's public deep entry forwards to the shared System context through
  // distinct source-compatible functions; additive root aliases remain System's.
  assert.notEqual(materialDefaults.default, defaults.default);
  assert.notEqual(materialDefaults.useDefaultProps, defaults.useDefaultProps);
  const providerValue = Object.freeze({ Probe: Object.freeze({ value: 'default' }) });
  const providerChildren = Object.freeze(['one', 'two']);
  const forwarded = materialDefaults.default({ value: providerValue, children: providerChildren });
  assert.equal(forwarded.type, defaults.default);
  assert.equal(forwarded.props.value, providerValue);
  assert.equal(forwarded.props.children, providerChildren);
  const icons = requireConsumer('@altroo/mui-native-icons');
  assert.equal(icons.SvgIcon, material.SvgIcon);
  const glyphNames = Object.keys(icons).filter((name) => /^[A-Z]/.test(name) && name !== 'SvgIcon');
  assert.equal(
    glyphNames.length,
    10750,
    'Fresh archive must retain the complete pinned glyph catalog.',
  );
  for (const name of glyphNames)
    assert.equal(
      requireConsumer('@altroo/mui-native-icons/' + name).default,
      icons[name],
      'Installed root and deep glyph imports must share identity: ' + name,
    );
  assert.equal(requireConsumer('@altroo/mui-native-icons/index').Add, icons.Add);
  assert.equal(
    requireConsumer('@altroo/mui-native-icons/utils/createSvgIcon').default,
    material.createSvgIcon,
  );

  for (const entry of ['SvgIcon', 'SvgIcon/createSvgIcon', 'utils/createSvgIcon'])
    assert.equal(
      requireConsumer('@altroo/mui-native/' + entry).createSvgIcon,
      material.createSvgIcon,
    );
  assert.equal(
    requireConsumer('@altroo/mui-native/SvgIcon/svgIconClasses').default,
    material.svgIconClasses,
  );
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
    'SvgIcon',
    'Portal',
    'Popper',
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
    ['Popper', 'popperClasses', 'getPopperUtilityClass'],
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
