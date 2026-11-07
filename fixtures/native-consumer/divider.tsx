// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Divider, { type DividerProps, dividerClasses } from '@mui/material/Divider';
import { Divider as RootDivider } from '@mui/material';
import NativeDivider from '@altroo/mui-native/Divider';
import { createTheme, type ComponentsPropsList } from '@mui/material/styles';

const NativeRoot = forwardRef<ViewInstance, ViewProps & { tracking: string }>(
  ({ tracking, ...native }, ref) => <View {...native} nativeID={tracking} ref={ref} />,
);
export const sameRoot: typeof Divider = RootDivider;
export const sameNative: typeof Divider = NativeDivider;
export const props: DividerProps<typeof NativeRoot> = { tracking: 'section' };
export const defaults: ComponentsPropsList['MuiDivider'] = {
  component: NativeRoot,
  classes: { wrapper: 'section-label' },
};
export const theme = createTheme({
  components: {
    MuiDivider: { defaultProps: defaults, styleOverrides: { root: { opacity: 0.8 } } },
  },
});
export const line = (
  <Divider
    {...props}
    component={NativeRoot}
    ref={createRef<ViewInstance>()}
    variant="middle"
    classes={{ root: dividerClasses.root }}
    onLayout={(event) => event.nativeEvent.layout.width}
    accessibilityLabel="Section"
  >
    Notes
  </Divider>
);
// @ts-expect-error Custom native root requirements survive packaged declarations.
export const missing = <Divider component={NativeRoot} testID="missing" />;
// @ts-expect-error Common native attributes do not permit unknown component fields.
export const unknown = <Divider testID="unknown" expanded />;
// @ts-expect-error Native aliases expose native hosts rather than browser node refs.
export const browserRef = <Divider ref={createRef<{ innerHTML: string }>()} />;

export const clearComponents = createTheme({ components: undefined });
