// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// List accessory composition adapts MIT Material UI 9.5.0. See NOTICE,
// upstream/list-item-avatar.json and upstream/list-item-icon.json.
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
  useNativeRootProps,
  NativeTextScope,
  useNativeTextRootRef,
  NativeIconStyleContext,
  useNativeTextContext,
  nativeTextStyleContext,
  type NativeStyle,
  type SxProps,
  diagnostic,
  joinClassNames,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle, useComponentRootStyle } from './themeProvider';
import { ListContext } from './listContext';
import { nativeListProps, listDirection } from './listStyles';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { getListItemAvatarUtilityClass, type ListItemAvatarClasses } from './listItemAvatarClasses';
export * from './listItemAvatarClasses';
import { getListItemIconUtilityClass, type ListItemIconClasses } from './listItemIconClasses';
export * from './listItemIconClasses';
export interface NativeListRootProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<NativeStyle> | undefined;
  sx?: SxProps | undefined;
  ref?: React.Ref<ViewInstance> | undefined;
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
/** Native custom roots receive class metadata and the inherited View contract. */
export interface ListItemIconRootProps extends NativeListRootProps {
  className?: string | undefined;
}
export interface ListItemIconProps extends ListItemIconRootProps {
  classes?: Partial<ListItemIconClasses> | undefined;
  component?: React.ComponentType<ListItemIconRootProps> | undefined;
}
export type ListItemIconOwnProps = ListItemIconProps;
/** Native custom roots receive computed class metadata, never CSS styling internals. */
export interface ListItemAvatarRootProps extends NativeListRootProps {
  className?: string | undefined;
}
export interface ListItemAvatarProps extends ListItemAvatarRootProps {
  classes?: Partial<ListItemAvatarClasses> | undefined;
  component?: React.ComponentType<ListItemAvatarRootProps> | undefined;
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
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
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
      <NativeTextScope
        rootRef={scopeRoot}
        theme={theme}
        style={[resolved, style]}
        content={content}
      >
        {(native, content) => {
          if (!scrollable)
            return (
              <Root
                {...nativeListProps(other)}
                ref={scopeRef}
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
              ref={scopeRef}
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
// The original declaration returns JSX.Element. Retain the existing native
// forward-ref metadata while describing that truthful, non-null wrapper return.
interface NativeListItemIconComponent
  extends Omit<
    React.ForwardRefExoticComponent<
      React.PropsWithoutRef<ListItemIconProps> & React.RefAttributes<ViewInstance>
    >,
    never
  > {
  (props: ListItemIconProps): React.JSX.Element;
}
export const ListItemIcon: NativeListItemIconComponent = forwardRef<
  ViewInstance,
  ListItemIconProps
>(function ListItemIcon(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiListItemIcon',
  });
  const { component: Root = View, children, style, sx, classes, className, ...native } = props;
  const { alignItems, menuItem, dense, direction } = useContext(ListContext);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const token = (slot: keyof ListItemIconClasses) => {
    let value = getListItemIconUtilityClass(slot);
    // composeClasses observes an active accessor for truthiness, then append.
    if (classes && classes[slot]) value += ' ' + classes[slot];
    return value;
  };
  const rootClass = joinClassNames(
    token('root'),
    alignItems === 'flex-start' && token('alignItemsFlexStart'),
    className,
  );
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiListItemIcon',
    { ...props, alignItems },
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      overrideKeys: alignItems === 'flex-start' ? ['alignItemsFlexStart'] : [],
      baseStyle: {
        // inline-flex uses row flow; RN Views otherwise default to column.
        flexDirection: 'row',
        // The MenuItem parent owns this existing native reservation extension.
        minWidth: menuItem ? 36 : theme.spacing(4.5),
        flexShrink: 0,
        color: theme.palette.action.active,
        ...(alignItems === 'flex-start' ? { marginTop: 8 } : {}),
      },
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...props,
        ...(props.component ? { as: props.component } : {}),
        className: rootClass,
      },
    },
  );
  const merged = mergeNativeRootStyle(
    parent?.direction ?? direction ?? theme.direction,
    resolved,
    authored,
  );
  const computed =
    applyNativeTextMetrics(merged, resolved, nativeStyleTextMetrics([resolved, authored])) ??
    merged;
  const inheritedIcon = useContext(NativeIconStyleContext);
  const cssRootFontSize = theme.cssRootFontSize ?? 16;
  const iconScope = useMemo(
    // Original dense MenuItem CSS is 1.25rem. Convert authored units only;
    // operating-system fontScale is owned by native text, not vector geometry.
    () =>
      menuItem && dense ? { ...inheritedIcon, fontSize: 1.25 * cssRootFontSize } : inheritedIcon,
    [menuItem, dense, inheritedIcon, cssRootFontSize],
  );
  return (
    <NativeIconStyleContext.Provider value={iconScope}>
      <NativeTextScope rootRef={scopeRoot} theme={theme} style={computed} content={children}>
        {(style, content) => (
          <Root
            {...native}
            {...(Root === View ? {} : { className: rootClass })}
            ref={scopeRef}
            style={style}
          >
            {content}
          </Root>
        )}
      </NativeTextScope>
    </NativeIconStyleContext.Provider>
  );
}) as NativeListItemIconComponent;
export const ListItemAvatar: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemAvatarProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemAvatarProps>(function ListItemAvatar(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiListItemAvatar',
  });
  const { component: Root = View, children, style, sx, classes, className, ...native } = props;
  const { alignItems, direction } = useContext(ListContext);
  const parent = useNativeTextContext(),
    theme = useTheme();
  const token = (slot: keyof ListItemAvatarClasses) => {
    let value = getListItemAvatarUtilityClass(slot);
    // Source composeClasses reads an active map entry for truthiness, then append.
    if (classes && classes[slot]) value += ' ' + classes[slot];
    return value;
  };
  const rootClass = joinClassNames(
    token('root'),
    alignItems === 'flex-start' && token('alignItemsFlexStart'),
    className,
  );
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiListItemAvatar',
    { ...props, alignItems },
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      overrideKeys: alignItems === 'flex-start' ? ['alignItemsFlexStart'] : [],
      baseStyle: {
        minWidth: 56,
        flexShrink: 0,
        ...(alignItems === 'flex-start' ? { marginTop: 8 } : {}),
      },
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...props,
        ...(props.component ? { as: props.component } : {}),
        className: rootClass,
      },
    },
  );
  const merged = mergeNativeRootStyle(
    parent?.direction ?? direction ?? theme.direction,
    resolved,
    authored,
  );
  const computed =
    applyNativeTextMetrics(merged, resolved, nativeStyleTextMetrics([resolved, authored])) ??
    merged;
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={computed} content={children}>
      {(style, content) => (
        <Root
          {...native}
          {...(Root === View ? {} : { className: rootClass })}
          ref={scopeRef}
          style={style}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
});
export const ListSubheader: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListSubheaderProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListSubheaderProps>(function ListSubheader(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
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
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={[resolved, style]} content={children}>
      {(style, content) => (
        <Root
          {...nativeListProps(native)}
          ref={scopeRef}
          accessibilityRole={native.accessibilityRole ?? 'header'}
          style={style}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
});
