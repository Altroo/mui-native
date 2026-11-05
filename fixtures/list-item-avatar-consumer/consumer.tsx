// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { View, StyleSheet, type ViewProps, type ViewInstance } from 'react-native';
import {
  ThemeProvider,
  ListItemAvatar as Root,
  listItemAvatarClasses as rootClasses,
  getListItemAvatarUtilityClass as rootUtility,
  type ListItemAvatarProps,
} from '@mui/material';
import Deep, {
  type ListItemAvatarRootProps,
  type ListItemAvatarClassKey,
} from '@mui/material/ListItemAvatar';
import {
  listItemAvatarClasses as classes,
  getListItemAvatarUtilityClass,
  type ListItemAvatarClasses,
} from '@mui/material/ListItemAvatar';
import Native, { type ListItemAvatarProps as NativeProps } from '@altroo/mui-native/ListItemAvatar';
import { listItemAvatarClasses as nativeClasses } from '@altroo/mui-native/ListItemAvatar';
import { createTheme, type ComponentsPropsList } from '@mui/material/styles';

declare module '@altroo/mui-native/ListItemAvatar' {
  interface ListItemAvatarClasses {
    customSlot: string;
  }
}
const root = React.forwardRef<ViewInstance, ListItemAvatarRootProps>(
  ({ className: _className, ...props }, ref) => <View {...props} ref={ref} />,
);
const legacyRoot = React.forwardRef<ViewInstance, ViewProps>((props, ref) => (
  <View {...props} ref={ref} />
));
const ref: React.RefCallback<ViewInstance> = (node) => {
  node?.measureInWindow(() => {});
  return () => {};
};
const props: ListItemAvatarProps = {
  children: undefined,
  component: undefined,
  classes: undefined,
  className: undefined,
  sx: undefined,
  style: undefined,
  ref: undefined,
  id: undefined,
  nativeID: undefined,
  testID: undefined,
  accessible: undefined,
  role: undefined,
  onLayout: undefined,
  onFocus: undefined,
  onBlur: undefined,
  onClick: undefined,
  onKeyDown: undefined,
  onKeyUp: undefined,
  onTouchStart: undefined,
  onPointerDown: undefined,
  onAccessibilityAction: undefined,
};
type NativeEvents = {
  [Key in keyof ViewProps]-?: Key extends `on${string}` ? Key : never;
}[keyof ViewProps];
export function acceptAllNativeEvents(
  events: Pick<ViewProps, NativeEvents>,
): Pick<ListItemAvatarProps, NativeEvents> {
  return events;
}
export function acceptAllNativeAttributes(
  attributes: Omit<ViewProps, 'style'>,
): Omit<ListItemAvatarProps, 'style'> {
  return attributes;
}
const insetStyles = StyleSheet.create({ edge: { marginTop: 8, paddingLeft: 7 } });
const equivalent: NativeProps = props;
const componentDefaults: ComponentsPropsList['MuiListItemAvatar'] = props;
const augmented: ListItemAvatarClasses = {
  root: 'root',
  alignItemsFlexStart: 'top',
  customSlot: 'extra',
};
const key: ListItemAvatarClassKey = 'customSlot';
const utilityClasses: Record<string, string> = {
  canonical: classes.root,
  originalRoot: rootClasses.root,
  directNative: nativeClasses.root,
  rootUtility: rootUtility('root'),
  canonicalUtility: getListItemAvatarUtilityClass('root'),
};
const theme = createTheme({
  components: {
    MuiListItemAvatar: {
      defaultProps: {
        ...componentDefaults,
        classes: { root: 'theme-root' },
        className: 'theme-class',
        component: root,
      },
      styleOverrides: {
        root: ({ ownerState }) => ({ opacity: ownerState.alignItems === 'flex-start' ? 0.5 : 1 }),
        alignItemsFlexStart: { marginTop: 10 },
      },
      variants: [{ props: { className: 'theme-class' }, style: { opacity: 0.8 } }],
    },
  },
});
export const content = (
  <ThemeProvider theme={theme}>
    <Root {...props} ref={ref} component={root} classes={augmented} />
    <Deep
      ref={ref}
      component={legacyRoot}
      className={Object.values(utilityClasses).join(' ')}
      classes={{ [key]: augmented[key] }}
    />
    <Native {...equivalent} />
    <Deep
      style={[insetStyles.edge, false, [{ margin: 0, padding: 0, direction: 'rtl', marginEnd: 6 }]]}
    />
    <Deep
      onLayout={(event) => event.nativeEvent.layout.width.toFixed()}
      onFocus={(event) => event.nativeEvent.target}
      onClick={(event) => event.preventDefault()}
      onAccessibilityAction={(event) => event.nativeEvent.actionName.toUpperCase()}
      sx={[(theme) => ({ color: theme.palette.primary.main }), false, undefined]}
      style={[{ opacity: 0.5 }, null]}
    />
  </ThemeProvider>
);
// @ts-expect-error Browser element refs are not native View refs.
export const browserRef = <Deep ref={React.createRef<HTMLDivElement>()} />;
// @ts-expect-error Browser string roots have no native host contract.
export const browserRoot = <Deep component="div" />;
// @ts-expect-error This original component has no slot replacement API.
export const inventedSlot = <Deep slots={{ root }} />;
// @ts-expect-error Original class keys and declared augmentations are finite.
export const invalidClass = <Deep classes={{ invented: 'invalid' }} />;
