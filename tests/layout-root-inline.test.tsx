// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { cleanup, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { FormGroup, ListItemAvatar, ThemeProvider, createTheme } from '../packages/material/src';

afterEach(cleanup);
const wrappers = [
  ['MuiFormGroup', FormGroup],
  ['MuiListItemAvatar', ListItemAvatar],
] as const;
test.each(wrappers)(
  '%s native border shorthands replace computed corners and edge paint',
  (name, Root) => {
    const theme = createTheme({
      components: {
        [name]: {
          styleOverrides: {
            root: {
              borderTopLeftRadius: 0,
              borderBottomRightRadius: 1,
              borderLeftWidth: 3,
              borderLeftColor: 'red',
            },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Root testID="root" style={{ borderRadius: 7, borderWidth: 0, borderColor: 'blue' }} />
      </ThemeProvider>,
    );
    const style = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(style).toMatchObject({ borderRadius: 7, borderWidth: 0, borderColor: 'blue' });
    for (const key of [
      'borderTopLeftRadius',
      'borderBottomRightRadius',
      'borderLeftWidth',
      'borderLeftColor',
    ])
      expect(style[key]).toBeUndefined();
  },
);
test.each(wrappers)(
  '%s keeps genuine native specific border fields through later shorthands',
  (name, Root) => {
    const theme = createTheme({
      components: {
        [name]: {
          styleOverrides: {
            root: {
              borderTopLeftRadius: 0,
              borderBottomRightRadius: 1,
              borderLeftWidth: 3,
              borderLeftColor: 'red',
            },
          },
        },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Root
          testID="root"
          style={[
            { borderTopLeftRadius: 2, borderLeftWidth: 4, borderLeftColor: 'purple' },
            { borderRadius: 7, borderWidth: 0, borderColor: 'blue' },
          ]}
        />
      </ThemeProvider>,
    );
    expect(tree.getByTestId('root')).toHaveStyle({
      borderRadius: 7,
      borderTopLeftRadius: 2,
      borderWidth: 0,
      borderLeftWidth: 4,
      borderColor: 'blue',
      borderLeftColor: 'purple',
    });
    expect(
      StyleSheet.flatten(tree.getByTestId('root').props.style).borderBottomRightRadius,
    ).toBeUndefined();
  },
);
test.each(wrappers)(
  '%s native gap resets CSS axes while authored axes retain native precedence',
  (name, Root) => {
    const theme = createTheme({
      components: { [name]: { styleOverrides: { root: { rowGap: 8, columnGap: 9 } } } },
    });
    const content = (style: { gap: number; rowGap?: number }[]) => (
      <ThemeProvider theme={theme}>
        <Root testID="root" style={style} />
      </ThemeProvider>
    );
    const tree = render(content([{ gap: 0 }]));
    let style = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(style).toMatchObject({ gap: 0 });
    expect(style.rowGap).toBeUndefined();
    expect(style.columnGap).toBeUndefined();
    tree.rerender(content([{ gap: 5, rowGap: 4 }, { gap: 0 }]));
    style = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(style).toMatchObject({ gap: 0, rowGap: 4 });
    expect(style.columnGap).toBeUndefined();
  },
);
test.each(wrappers)(
  '%s native flex resets CSS longhands without deleting authored native longhands',
  (name, Root) => {
    const theme = createTheme({
      components: {
        [name]: { styleOverrides: { root: { flexGrow: 0, flexShrink: 1, flexBasis: 80 } } },
      },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <Root testID="root" style={[{ flexGrow: 3 }, { flex: 1 }]} />
      </ThemeProvider>,
    );
    const style = StyleSheet.flatten(tree.getByTestId('root').props.style);
    expect(style).toMatchObject({ flex: 1, flexGrow: 3 });
    expect(style.flexShrink).toBeUndefined();
    expect(style.flexBasis).toBeUndefined();
  },
);
