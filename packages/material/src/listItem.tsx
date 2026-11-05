import React, { forwardRef, useContext, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
} from 'react-native';
import {
  useDefaultProps,
  resolveSlotProps,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  type SlotProps,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { ListContext } from './listContext';
import { listSlotStyle, nativeListProps, parentSizedListAction, listDirection } from './listStyles';
import type { NativeListRootProps, NativeListComponent } from './lists';
import { useForkRef } from './utils';
export interface ListItemRootSlotPropsOverrides {}
export interface ListItemSecondaryActionSlotPropsOverrides {}
export interface ListItemBaseProps extends NativeListRootProps {
  alignItems?: 'center' | 'flex-start';
  component?: NativeListComponent;
  dense?: boolean;
  disableGutters?: boolean;
  disablePadding?: boolean;
  divider?: boolean;
  secondaryAction?: React.ReactNode;
}
export interface ListItemOwnProps extends ListItemBaseProps {
  slots?: { root?: NativeListComponent; secondaryAction?: NativeListComponent };
  slotProps?: {
    root?: SlotProps<NativeListRootProps & ListItemRootSlotPropsOverrides, ListItemOwnerState>;
    secondaryAction?: SlotProps<
      NativeListRootProps & ListItemSecondaryActionSlotPropsOverrides,
      ListItemOwnerState
    >;
  };
}
export interface ListItemProps extends ListItemOwnProps {}
export interface ListItemOwnerState extends Omit<ListItemProps, 'slots' | 'slotProps'> {}
export interface ListItemSecondaryActionProps extends NativeListRootProps {
  component?: NativeListComponent;
}
export type ListItemSecondaryActionOwnProps = ListItemSecondaryActionProps;
interface NativeSecondaryActionProps extends ListItemSecondaryActionProps {
  slotStyle?: StyleProp<NativeStyle>;
}
const NativeSecondaryAction: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeSecondaryActionProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, NativeSecondaryActionProps>(
  function ListItemSecondaryAction(inProps, ref) {
    const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
    const props = useDefaultProps({ props: inProps, name: 'MuiListItemSecondaryAction' });
    const { component: Root = View, children, sx, style, slotStyle, ...native } = props;
    const { disableGutters, reportActionSize, direction } = useContext(ListContext),
      theme = useTheme(),
      parent = useNativeTextContext();
    const resolved = useComponentStyle(
      'MuiListItemSecondaryAction',
      { ...props, disableGutters },
      sx,
      {
        ...nativeTextStyleContext(parent, style, theme),
        overrideKeys: disableGutters ? ['disableGutters'] : [],
        baseStyle: {
          position: 'absolute',
          end: disableGutters ? 0 : 16,
          top: '50%',
          transform: [{ translateY: '-50%' }],
        },
      },
    );
    return (
      <NativeTextScope
        rootRef={scopeRoot}
        theme={theme}
        style={[resolved, slotStyle, style]}
        content={children}
      >
        {(style, content) => (
          <Root
            {...nativeListProps(native)}
            ref={scopeRef}
            style={style}
            onLayout={(event) => {
              const final = StyleSheet.flatten(style);
              const { width, height } = event.nativeEvent.layout;
              const actualDirection =
                final?.direction === 'rtl' || final?.direction === 'ltr'
                  ? final.direction
                  : (direction ?? theme.direction);
              reportActionSize?.(
                parentSizedListAction(final, 'width', actualDirection) ? 0 : width,
                parentSizedListAction(final, 'height', actualDirection) ? 0 : height,
              );
              native.onLayout?.(event);
            }}
          >
            {content}
          </Root>
        )}
      </NativeTextScope>
    );
  },
);
export const ListItemSecondaryAction: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemSecondaryActionProps> & React.RefAttributes<ViewInstance>
> = NativeSecondaryAction;
export const ListItem: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemProps>(function ListItem(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListItem' });
  const {
    alignItems = 'center',
    component,
    children,
    dense = false,
    disableGutters = false,
    disablePadding = false,
    divider = false,
    secondaryAction,
    slots = {},
    slotProps = {},
    sx,
    style,
    ...other
  } = props;
  const context = useContext(ListContext),
    theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const inheritedDense = dense || context.dense || false;
  const [actionLayout, setActionLayout] = useState({ width: 0, height: 0 });
  const reportActionSize = useCallback((width: number, height: number) => {
    if (Number.isFinite(width) && Number.isFinite(height) && width >= 0 && height >= 0)
      setActionLayout((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
  }, []);
  const actionSpace = secondaryAction
    ? Math.max(48, actionLayout.width + (disableGutters ? 0 : 16) + 8)
    : undefined;
  const actionMinHeight = secondaryAction
    ? Math.max(48, actionLayout.height + (disablePadding ? 0 : inheritedDense ? 8 : 16))
    : undefined;
  const owner = {
    ...props,
    dense: inheritedDense,
    alignItems,
    disableGutters,
    disablePadding,
    divider,
    secondaryAction,
  };
  const root = resolveSlotProps(slotProps.root, owner) ?? {},
    secondary = resolveSlotProps(slotProps.secondaryAction, owner) ?? {};
  const ref = useForkRef(forwarded, root.ref);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const Root = slots.root ?? component ?? View,
    Secondary = NativeSecondaryAction;
  const resolved = useComponentStyle(
    'MuiListItem',
    owner,
    [...(Array.isArray(sx) ? sx : [sx]), ...(Array.isArray(root.sx) ? root.sx : [root.sx])],
    {
      ...nativeTextStyleContext(parent, [style, root.style], theme),
      overrideKeys: [
        ...(inheritedDense ? ['dense'] : []),
        ...(alignItems === 'flex-start' ? ['alignItemsFlexStart'] : []),
        ...(divider ? ['divider'] : []),
        ...(!disableGutters ? ['gutters'] : []),
        ...(!disablePadding ? ['padding'] : []),
      ],
      baseStyle: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems,
        position: 'relative',
        width: '100%',
        direction: context.direction ?? theme.direction,
        ...(actionMinHeight ? { minHeight: actionMinHeight } : {}),
        ...(!disablePadding
          ? {
              paddingTop: inheritedDense ? 4 : 8,
              paddingBottom: inheritedDense ? 4 : 8,
              paddingStart: disableGutters ? 0 : 16,
              paddingEnd: actionSpace ?? (disableGutters ? 0 : 16),
            }
          : {}),
        ...(divider ? { borderBottomWidth: 1, borderBottomColor: theme.palette.divider } : {}),
      },
    },
  );
  const authoredDirection = StyleSheet.flatten([resolved, style, root.style])?.direction;
  const direction = listDirection(authoredDirection, context.direction ?? theme.direction);
  const childContext = useMemo(
    () => ({
      dense: inheritedDense,
      direction,
      alignItems,
      disableGutters,
      secondaryAction: actionSpace,
      reportActionSize: secondaryAction ? reportActionSize : undefined,
    }),
    [
      inheritedDense,
      alignItems,
      disableGutters,
      actionSpace,
      !!secondaryAction,
      reportActionSize,
      direction,
    ],
  );
  const { sx: rootSx, style: rootStyle, ref: rootRef, ...rootNative } = root;
  const { sx: secondarySx, style: secondaryStyle, ...secondaryNative } = secondary;
  const secondaryTheme = listSlotStyle(theme, 'MuiListItem', 'secondaryAction', owner, width);
  return (
    <ListContext.Provider value={childContext}>
      <NativeTextScope
        rootRef={scopeRoot}
        theme={theme}
        style={[resolved, style, rootStyle]}
        content={
          <>
            <React.Fragment key="content">{children}</React.Fragment>
            {secondaryAction ? (
              <Secondary
                key="secondaryAction"
                component={slots.secondaryAction}
                {...secondaryNative}
                sx={secondarySx}
                slotStyle={secondaryTheme}
                style={secondaryStyle}
              >
                {secondaryAction}
              </Secondary>
            ) : null}
          </>
        }
      >
        {(style, content) => (
          <Root
            {...nativeListProps(other)}
            {...nativeListProps(rootNative)}
            ref={scopeRef}
            role={root.role ?? other.role ?? 'listitem'}
            style={style}
          >
            {content}
          </Root>
        )}
      </NativeTextScope>
    </ListContext.Provider>
  );
});
