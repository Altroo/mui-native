import React, { forwardRef, useContext, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewProps,
  type ViewInstance,
  type ScrollViewProps,
  type StyleProp,
} from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  NativeIconStyleContext,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
  type SxProps,
  diagnostic,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { ListContext } from './listContext';
import { nativeListProps, listDirection } from './listStyles';
export interface NativeListRootProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  ref?: React.Ref<ViewInstance>;
}
export type NativeListComponent = React.ComponentType<NativeListRootProps>;
export interface ListOwnProps {
  children?: React.ReactNode;
  component?: NativeListComponent;
  dense?: boolean;
  disablePadding?: boolean;
  subheader?: React.ReactNode;
  /** Native scroll ownership enables sticky direct subheaders. Bound the viewport with style/sx. */
  scrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, 'ref' | 'children' | 'style'>;
}
export interface ListProps extends Omit<NativeListRootProps, 'children'>, ListOwnProps {}
export interface ListItemIconProps extends NativeListRootProps {
  component?: NativeListComponent;
}
export type ListItemIconOwnProps = ListItemIconProps;
export interface ListItemAvatarProps extends NativeListRootProps {
  component?: NativeListComponent;
}
export type ListItemAvatarOwnProps = ListItemAvatarProps;
export interface ListSubheaderOwnProps {
  color?: 'default' | 'primary' | 'inherit';
  component?: NativeListComponent;
  disableGutters?: boolean;
  disableSticky?: boolean;
  inset?: boolean;
}
export interface ListSubheaderProps extends NativeListRootProps, ListSubheaderOwnProps {}
function flattenChildren(children: React.ReactNode, prefix = ''): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child, index) => {
    const key = `${prefix}/${React.isValidElement(child) ? child.key : index}`;
    return React.isValidElement<{ children?: React.ReactNode }>(child)
      ? child.type === React.Fragment
        ? flattenChildren(child.props.children, key)
        : [React.cloneElement(child, { key })]
      : [child];
  });
}
const contentKeys = new Set([
  'alignContent',
  'alignItems',
  'justifyContent',
  'flexDirection',
  'flexWrap',
  'gap',
  'rowGap',
  'columnGap',
]);
export const List: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListProps>(function List(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiList' });
  const headerDefaults = useDefaultProps({
    props: {} as ListSubheaderProps,
    name: 'MuiListSubheader',
  });
  const {
    children,
    component,
    dense = false,
    disablePadding = false,
    subheader,
    scrollable = false,
    scrollViewProps,
    sx,
    style,
    ...other
  } = props;
  const theme = useTheme(),
    outer = useContext(ListContext),
    parent = useNativeTextContext();
  const owner = { ...props, dense, disablePadding };
  const resolved = useComponentStyle('MuiList', owner, sx, {
    ...nativeTextStyleContext(parent, style, theme),
    overrideKeys: [
      ...(!disablePadding ? ['padding'] : []),
      ...(dense ? ['dense'] : []),
      ...(subheader ? ['subheader'] : []),
    ],
    baseStyle: {
      margin: 0,
      padding: 0,
      position: 'relative',
      direction: outer.direction ?? theme.direction,
      paddingTop: !disablePadding ? 8 : 0,
      paddingBottom: !disablePadding ? 8 : 0,
      ...(subheader ? { paddingTop: 0 } : {}),
    },
  });
  const rootDirection = listDirection(
    StyleSheet.flatten([resolved, style])?.direction,
    outer.direction ?? theme.direction,
  );
  const direction = scrollable
    ? listDirection(
        StyleSheet.flatten(scrollViewProps?.contentContainerStyle)?.direction,
        rootDirection,
      )
    : rootDirection;
  const context = useMemo(() => ({ dense, direction }), [dense, direction]);
  const Root = (component ?? (scrollable ? ScrollView : View)) as React.ComponentType<any>;
  const groups = [
    <React.Fragment key="subheader">{subheader}</React.Fragment>,
    <React.Fragment key="items">{children}</React.Fragment>,
  ];
  const content = scrollable ? flattenChildren(groups) : groups;
  return (
    <ListContext.Provider value={context}>
      <NativeTextScope theme={theme} style={[resolved, style]} content={content}>
        {(native, content) => {
          if (!scrollable)
            return (
              <Root
                {...nativeListProps(other)}
                ref={ref}
                role={other.role ?? 'list'}
                style={native}
              >
                {content}
              </Root>
            );
          const viewport: Record<string, unknown> = {},
            container: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(StyleSheet.flatten(native) ?? {}))
            (key.startsWith('padding') || contentKeys.has(key) ? container : viewport)[key] = value;
          const items = React.Children.toArray(content);
          const sticky = items.flatMap((child, index) =>
            React.isValidElement<ListSubheaderProps>(child) &&
            child.type === ListSubheader &&
            !(child.props.disableSticky ?? headerDefaults.disableSticky ?? false)
              ? [index]
              : [],
          );
          const requestedSticky = scrollViewProps?.stickyHeaderIndices ?? sticky;
          const horizontal = scrollViewProps?.horizontal === true;
          if (horizontal && requestedSticky.length)
            diagnostic(
              'list-sticky-horizontal',
              'React Native does not support sticky headers in horizontal ScrollViews; native List disables those indices.',
            );
          return (
            <Root
              {...nativeListProps(other)}
              {...scrollViewProps}
              ref={ref}
              role={other.role ?? 'list'}
              style={viewport}
              contentContainerStyle={[container, scrollViewProps?.contentContainerStyle]}
              stickyHeaderIndices={horizontal ? [] : requestedSticky}
              keyboardShouldPersistTaps={scrollViewProps?.keyboardShouldPersistTaps ?? 'handled'}
            >
              {content}
            </Root>
          );
        }}
      </NativeTextScope>
    </ListContext.Provider>
  );
});
function useAccessory(name: string, props: NativeListRootProps, icon: boolean) {
  const { alignItems, menuItem, dense } = useContext(ListContext),
    theme = useTheme(),
    parent = useNativeTextContext();
  const resolved = useComponentStyle(name, { ...props, alignItems }, props.sx, {
    ...nativeTextStyleContext(parent, props.style, theme),
    overrideKeys: alignItems === 'flex-start' ? ['alignItemsFlexStart'] : [],
    baseStyle: {
      minWidth: icon ? (menuItem ? 36 : theme.spacing(4.5)) : 56,
      flexShrink: 0,
      ...(icon ? { color: theme.palette.action.active } : {}),
      ...(alignItems === 'flex-start' ? { marginTop: 8 } : {}),
    },
  });
  return { theme, resolved, menuItem, dense };
}
export const ListItemIcon: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemIconProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemIconProps>(function ListItemIcon(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListItemIcon' });
  const { component: Root = View, children, style, sx, ...native } = props;
  const { theme, resolved, menuItem, dense } = useAccessory('MuiListItemIcon', props, true);
  const inheritedIcon = useContext(NativeIconStyleContext);
  const iconScope = useMemo(
    () => (menuItem && dense ? { ...inheritedIcon, fontSize: 20 } : inheritedIcon),
    [menuItem, dense, inheritedIcon],
  );
  return (
    <NativeIconStyleContext.Provider value={iconScope}>
      <NativeTextScope theme={theme} style={[resolved, style]} content={children}>
        {(style, content) => (
          <Root {...nativeListProps(native)} ref={ref} style={style}>
            {content}
          </Root>
        )}
      </NativeTextScope>
    </NativeIconStyleContext.Provider>
  );
});
export const ListItemAvatar: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemAvatarProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemAvatarProps>(function ListItemAvatar(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListItemAvatar' });
  const { component: Root = View, children, style, sx, ...native } = props;
  const { theme, resolved } = useAccessory('MuiListItemAvatar', props, false);
  return (
    <NativeTextScope theme={theme} style={[resolved, style]} content={children}>
      {(style, content) => (
        <Root {...nativeListProps(native)} ref={ref} style={style}>
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
});
export const ListSubheader: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListSubheaderProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListSubheaderProps>(function ListSubheader(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListSubheader' });
  const {
    component: Root = View,
    color = 'default',
    disableGutters = false,
    disableSticky = false,
    inset = false,
    children,
    style,
    sx,
    ...native
  } = props;
  const theme = useTheme(),
    parent = useNativeTextContext();
  const owner = { ...props, color, disableGutters, disableSticky, inset };
  const resolved = useComponentStyle('MuiListSubheader', owner, sx, {
    ...nativeTextStyleContext(parent, style, theme),
    overrideKeys: [
      ...(color !== 'default' ? [`color${color[0].toUpperCase()}${color.slice(1)}`] : []),
      ...(!disableGutters ? ['gutters'] : []),
      ...(inset ? ['inset'] : []),
      ...(!disableSticky ? ['sticky'] : []),
    ],
    baseStyle: {
      fontFamily: theme.typography.fontFamily,
      fontWeight: theme.typography.fontWeightMedium,
      fontSize: theme.typography.pxToRem(14),
      lineHeight: '48px',
      color:
        color === 'primary'
          ? theme.palette.primary.main
          : color === 'inherit'
            ? 'inherit'
            : theme.palette.text.secondary,
      paddingStart: inset ? 72 : disableGutters ? 0 : 16,
      paddingEnd: disableGutters ? 0 : 16,
      ...(!disableSticky ? { zIndex: 1, backgroundColor: theme.palette.background.paper } : {}),
    },
  });

  return (
    <NativeTextScope theme={theme} style={[resolved, style]} content={children}>
      {(style, content) => (
        <Root
          {...nativeListProps(native)}
          ref={ref}
          accessibilityRole={native.accessibilityRole ?? 'header'}
          style={style}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
});
