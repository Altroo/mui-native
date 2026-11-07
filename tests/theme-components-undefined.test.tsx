// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { StyleSheet, Text, View } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import * as system from '../packages/system/src';
import * as material from '../packages/material/src';

afterEach(cleanup);
const configured = (variant = 'h6'): system.ThemeOptions => ({
  components: {
    MuiTypography: { defaultProps: { variant }, styleOverrides: { root: { opacity: 0.4 } } },
  },
});
const cleared = (): system.ThemeOptions => ({ components: undefined });
type Case = {
  name: string;
  args: () => [system.ThemeOptions, ...system.ThemeOptions[]];
  variant: 'body1' | 'h6' | 'caption';
  opacity?: number;
};
// Actual pinned Material9.5 production SSR retains or clears the component
// configuration in this order. Its raw cleared value is undefined; native's
// required dictionary is normalized after merging, with the same defaults.
const cases: Case[] = [
  { name: 'initial undefined', args: () => [cleared()], variant: 'body1' },
  { name: 'late clear', args: () => [configured(), cleared()], variant: 'body1' },
  { name: 'late configure', args: () => [cleared(), configured()], variant: 'h6', opacity: 0.4 },
  {
    name: 'retain configuration',
    args: () => [configured(), { shape: { borderRadius: 9 } }],
    variant: 'h6',
    opacity: 0.4,
  },
  {
    name: 'clear then reconfigure',
    args: () => [configured(), cleared(), configured('caption')],
    variant: 'caption',
    opacity: 0.4,
  },
];
function SystemProbe() {
  const props = system.useDefaultProps({
    name: 'MuiTypography',
    props: { variant: undefined as string | undefined },
  });
  const style = system.useComponentStyle('MuiTypography', props);
  return (
    <View testID="system-root" style={style}>
      <Text>{props.variant ?? 'body1'}</Text>
    </View>
  );
}
test.each(cases)('standalone System rendering after $name', ({ args, variant, opacity }) => {
  const theme = system.createTheme(...args());
  const tree = render(
    <system.ThemeProvider theme={theme}>
      <SystemProbe />
    </system.ThemeProvider>,
  );
  expect(tree.getByText(variant)).toBeTruthy();
  expect(StyleSheet.flatten(tree.getByTestId('system-root').props.style).opacity).toBe(opacity);
  expect(theme.components).toBeDefined();
});
test.each(cases)('Material rendering after $name', ({ args, variant, opacity }) => {
  const theme = material.createTheme(...args());
  const tree = render(
    <material.ThemeProvider theme={theme}>
      <material.Typography testID="material-root">Sample</material.Typography>
    </material.ThemeProvider>,
  );
  expect(tree.getByTestId('material-root')).toHaveStyle({
    fontSize: { body1: 16, h6: 20, caption: 12 }[variant],
  });
  expect(StyleSheet.flatten(tree.getByTestId('material-root').props.style).opacity).toBe(opacity);
  expect(theme.components).toBeDefined();
});
test('a late clear empties the dictionary without mutating inputs or restoring earlier defaults', () => {
  const input = configured(),
    override = cleared(),
    before = JSON.stringify(input);
  const result = system.createTheme(input, override);
  expect(result.components).toEqual({});
  expect(JSON.stringify(input)).toBe(before);
  expect(Object.hasOwn(override, 'components')).toBe(true);
  expect(override.components).toBeUndefined();
  expect(system.createTheme(input, { shape: { borderRadius: 9 } }).shape.borderRadius).toBe(9);
});
test('normalization is confined to undefined components and leaves generic merge and null unchanged', () => {
  expect(
    system.merge({ components: { retained: true } }, { components: undefined }).components,
  ).toBeUndefined();
  // Null is outside the public options type and is deliberately not normalized.
  expect(system.createTheme({ components: null as never }).components).toBeNull();
});
