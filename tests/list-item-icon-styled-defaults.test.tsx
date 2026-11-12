// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import { render } from '@testing-library/react-native';
import { ListItemIcon, ThemeProvider, createTheme, styled } from '../packages/material/src';
import original from './fixtures/mui-list-item-icon-9.5.0.json';
function observeNative(input: unknown) {
  const value = input as {
    defaultStyle?: Record<string, unknown>;
    defaultSx?: Record<string, unknown>;
    style?: Record<string, unknown> | null | '$undefined';
    sx?: Record<string, unknown> | null | '$undefined';
    nested?: boolean;
    merge?: boolean;
  };
  let actual: unknown;
  const theme = createTheme({
    components: {
      mergeClassNameAndStyle: value.merge ?? false,
      MuiListItemIcon: {
        defaultProps: {
          ...(Object.hasOwn(value, 'defaultStyle') ? { style: value.defaultStyle } : {}),
          ...(Object.hasOwn(value, 'defaultSx') ? { sx: value.defaultSx } : {}),
        },
        styleOverrides: {
          root: nativeStyleCallback(({ ownerState }) => {
            actual = {
              hasStyle: Object.hasOwn(ownerState, 'style'),
              style: ownerState.style ?? null,
              hasSx: Object.hasOwn(ownerState, 'sx'),
              sx: ownerState.sx ?? null,
            };
            return {};
          }),
        },
      },
    },
  });
  const Styled = value.nested
    ? styled(styled(ListItemIcon)({ opacity: 0.6 }))({ opacity: 0.8 })
    : styled(ListItemIcon)({ opacity: 0.8 });
  // null is an observed JavaScript input, outside RN's typed style fields but a
  // valid StyleProp hole. Explicit undefined still selects the theme default.
  const style = value.style === '$undefined' ? undefined : value.style;
  const tree = render(
    <ThemeProvider theme={theme}>
      <Styled
        testID="root"
        {...(Object.hasOwn(value, 'style') ? { style } : {})}
        {...(Object.hasOwn(value, 'sx')
          ? { sx: value.sx === '$undefined' ? undefined : value.sx }
          : {})}
      />
    </ThemeProvider>,
  );
  return { actual, tree };
}
test.each(original.styledDefaults)(
  'styled/default owner state matches source: $input.name',
  ({ input, observation }) => {
    expect(observeNative(input).actual).toEqual(observation);
  },
);
test.each(original.styledDefaults)(
  'styled/default paint matches source: $input.name',
  ({ input, observation, cssOpacity }) => {
    const { tree } = observeNative(input);
    const effective =
      typeof observation.style?.opacity === 'number' ? observation.style.opacity : cssOpacity;
    expect(tree.getByTestId('root')).toHaveStyle({ opacity: effective });
  },
);
