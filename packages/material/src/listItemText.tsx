import React, { forwardRef, useContext } from 'react';
import { View, useWindowDimensions, type ViewInstance, type TextInstance } from 'react-native';
import {
  useDefaultProps,
  resolveSlotProps,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  type SlotProps,
} from '@altroo/mui-native-system';
import { useComponentStyle, useTheme } from './themeProvider';
import { Typography, type TypographyProps } from './typography';
import { ListContext } from './listContext';
import { listSlotStyle, nativeListProps } from './listStyles';
import type { NativeListRootProps, NativeListComponent } from './lists';
import { useForkRef } from './utils';
export interface ListItemTextRootSlotPropsOverrides {}
export type ListItemTextTypographySlotProps = TypographyProps & React.RefAttributes<TextInstance>;
export interface ListItemTextSlots {
  root?: NativeListComponent;
  primary?: React.ComponentType<ListItemTextTypographySlotProps>;
  secondary?: React.ComponentType<ListItemTextTypographySlotProps>;
}
export interface ListItemTextOwnProps extends NativeListRootProps {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  disableTypography?: boolean;
  inset?: boolean;
  slots?: ListItemTextSlots;
  slotProps?: {
    root?: SlotProps<
      NativeListRootProps & ListItemTextRootSlotPropsOverrides,
      ListItemTextOwnerState
    >;
    primary?: SlotProps<ListItemTextTypographySlotProps, ListItemTextOwnerState>;
    secondary?: SlotProps<ListItemTextTypographySlotProps, ListItemTextOwnerState>;
  };
}
export interface ListItemTextProps extends ListItemTextOwnProps {}
export interface ListItemTextOwnerState
  extends Omit<ListItemTextProps, 'primary' | 'secondary' | 'slots' | 'slotProps'> {
  primary: boolean;
  secondary: boolean;
  dense?: boolean;
}
export const ListItemText: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ListItemTextProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, ListItemTextProps>(function ListItemText(inProps, forwarded) {
  const props = useDefaultProps({ props: inProps, name: 'MuiListItemText' });
  const {
    children,
    primary: primaryProp,
    secondary: secondaryProp,
    disableTypography = false,
    inset = false,
    slots = {},
    slotProps = {},
    style,
    sx,
    ...native
  } = props;
  const { dense, menuItem } = useContext(ListContext),
    theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  let primary = primaryProp != null ? primaryProp : children,
    secondary = secondaryProp;
  const owner = {
    ...props,
    disableTypography,
    inset,
    primary: !!primary,
    secondary: !!secondary,
    dense,
  };
  const root = resolveSlotProps(slotProps.root, owner) ?? {},
    primaryProps = resolveSlotProps(slotProps.primary, owner) ?? {},
    secondaryProps = resolveSlotProps(slotProps.secondary, owner) ?? {};
  const primaryDefaults = useDefaultProps({ props: primaryProps, name: 'MuiTypography' }),
    secondaryDefaults = useDefaultProps({ props: secondaryProps, name: 'MuiTypography' });
  const ref = useForkRef(forwarded, root.ref);
  const Root = slots.root ?? View,
    Primary = slots.primary ?? Typography,
    Secondary = slots.secondary ?? Typography;
  const resolved = useComponentStyle(
    'MuiListItemText',
    owner,
    [...(Array.isArray(sx) ? sx : [sx]), ...(Array.isArray(root.sx) ? root.sx : [root.sx])],
    {
      ...nativeTextStyleContext(parent, [style, root.style], theme),
      overrideKeys: [
        ...(inset ? ['inset'] : []),
        ...(dense ? ['dense'] : []),
        ...(primary && secondary ? ['multiline'] : []),
      ],
      baseStyle: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 'auto',
        minWidth: 0,
        marginTop: primary && secondary ? 6 : 4,
        marginBottom: primary && secondary ? 6 : 4,
        ...(inset ? { paddingStart: 56 } : {}),
      },
    },
  );
  const primaryStyle = listSlotStyle(theme, 'MuiListItemText', 'primary', owner, width),
    secondaryStyle = listSlotStyle(theme, 'MuiListItemText', 'secondary', owner, width);
  if (
    primary != null &&
    !(React.isValidElement(primary) && primary.type === Typography) &&
    !disableTypography
  )
    primary = (
      <Primary
        variant={dense ? 'body2' : 'body1'}
        {...primaryProps}
        style={[primaryStyle, primaryDefaults.style]}
      >
        {primary}
      </Primary>
    );
  if (
    secondary != null &&
    !(React.isValidElement(secondary) && secondary.type === Typography) &&
    !disableTypography
  )
    secondary = (
      <Secondary
        variant="body2"
        color="textSecondary"
        {...secondaryProps}
        style={[secondaryStyle, secondaryDefaults.style]}
      >
        {secondary}
      </Secondary>
    );
  const { sx: rootSx, style: rootStyle, ref: rootRef, ...rootNative } = root;
  return (
    <NativeTextScope
      theme={theme}
      style={[
        resolved,
        menuItem
          ? { marginTop: 0, marginBottom: 0, ...(inset ? { paddingStart: 36 } : {}) }
          : undefined,
        style,
        rootStyle,
      ]}
      content={
        <>
          <React.Fragment key="primary">{primary}</React.Fragment>
          <React.Fragment key="secondary">{secondary}</React.Fragment>
        </>
      }
    >
      {(style, content) => (
        <Root {...nativeListProps(native)} {...nativeListProps(rootNative)} ref={ref} style={style}>
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
});
