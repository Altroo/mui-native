/* Native contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import type React from 'react';
import type { View, ViewProps, StyleProp } from 'react-native';
import type { NativeStyle, SxProps } from '@altroo/mui-native-system';
import type { ButtonGroupClasses } from './buttonGroupClasses';
export interface ButtonGroupPropsColorOverrides {}
export interface ButtonGroupPropsSizeOverrides {}
export interface ButtonGroupPropsVariantOverrides {}
type Union<Base extends string, Overrides> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)]: true extends (Omit<
      Record<Base, true>,
      keyof Overrides
    > &
      Overrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)],
  string
>;
export interface ButtonGroupOwnProps {
  children?: React.ReactNode;
  classes?: Partial<ButtonGroupClasses> | undefined;
  className?: string | undefined;
  color?:
    | Union<
        'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
        ButtonGroupPropsColorOverrides
      >
    | undefined;
  size?: Union<'small' | 'medium' | 'large', ButtonGroupPropsSizeOverrides> | undefined;
  variant?: Union<'text' | 'outlined' | 'contained', ButtonGroupPropsVariantOverrides> | undefined;
  disabled?: boolean | undefined;
  disableElevation?: boolean | undefined;
  disableFocusRipple?: boolean | undefined;
  disableRipple?: boolean | undefined;
  fullWidth?: boolean | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  sx?: SxProps | undefined;
  style?: StyleProp<NativeStyle> | undefined;
  id?: string | undefined;
  'data-testid'?: string | undefined;
}
type Root = React.ComponentType<any> | 'div';
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RootProps<R extends Root> = R extends 'div'
  ? React.ComponentPropsWithRef<typeof View>
  : R extends React.ComponentType<any>
    ? React.ComponentPropsWithRef<R>
    : never;
export interface ButtonGroupTypeMap<
  AdditionalProps = {},
  RootComponent extends Root = typeof View,
> {
  props: AdditionalProps & ButtonGroupOwnProps;
  defaultComponent: RootComponent;
}
export type ButtonGroupProps<
  R extends Root = typeof View,
  AdditionalProps = {},
> = ButtonGroupOwnProps &
  AdditionalProps &
  DistributiveOmit<RootProps<R>, keyof ButtonGroupOwnProps | keyof AdditionalProps | 'component'> &
  (R extends typeof View | 'div' ? { component?: R | undefined } : { component: R });
export interface NativeButtonGroupComponent {
  <R extends Root>(props: ButtonGroupProps<R> & { component: R }): React.JSX.Element | null;
  (props: ButtonGroupProps): React.JSX.Element | null;
  propTypes?: any;
  displayName?: string | undefined;
}
export interface ButtonGroupOwnerState extends ButtonGroupOwnProps {
  component: Root;
  color: NonNullable<ButtonGroupOwnProps['color']>;
  size: NonNullable<ButtonGroupOwnProps['size']>;
  variant: NonNullable<ButtonGroupOwnProps['variant']>;
  orientation: NonNullable<ButtonGroupOwnProps['orientation']>;
  disabled: boolean;
  disableElevation: boolean;
  disableFocusRipple: boolean;
  disableRipple: boolean;
  fullWidth: boolean;
}
export type ButtonGroupNativeRootProps = Omit<ViewProps, 'style'> & ButtonGroupOwnProps;
