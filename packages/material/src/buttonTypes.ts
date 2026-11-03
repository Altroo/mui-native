import type React from 'react';
import type { ViewInstance } from 'react-native';
import type { NativePressable } from '@altroo/mui-native-host';
import type { ButtonBaseProps } from './buttonBase';
import type { ButtonClasses, IconButtonClasses } from './buttonClasses';
export interface ButtonPropsVariantOverrides {}
export interface ButtonPropsColorOverrides {}
export interface ButtonPropsSizeOverrides {}
export interface IconButtonPropsColorOverrides {}
export interface IconButtonPropsSizeOverrides {}
type OverrideUnion<Base extends string, Overrides> = Extract<
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
type Shared = Omit<ButtonBaseProps, 'children' | 'component' | 'ref'> & {
  children?: React.ReactNode;
  id?: string;
  className?: string;
  focusVisibleClassName?: string;
  disableFocusRipple?: boolean;
};
export interface ButtonOwnProps extends Shared {
  classes?: Partial<ButtonClasses>;
  variant?: OverrideUnion<'text' | 'outlined' | 'contained', ButtonPropsVariantOverrides>;
  color?: OverrideUnion<
    'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'inherit',
    ButtonPropsColorOverrides
  >;
  size?: OverrideUnion<'small' | 'medium' | 'large', ButtonPropsSizeOverrides>;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
  loadingPosition?: 'start' | 'end' | 'center';
  disableElevation?: boolean;
}
export interface IconButtonOwnProps extends Shared {
  classes?: Partial<IconButtonClasses>;
  color?: OverrideUnion<
    'default' | 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning',
    IconButtonPropsColorOverrides
  >;
  size?: OverrideUnion<'small' | 'medium' | 'large', IconButtonPropsSizeOverrides>;
  edge?: 'start' | 'end' | false;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
}
type NativeProps<Own, Root extends React.ComponentType<any>, Additional> = Own &
  Additional &
  Omit<React.ComponentPropsWithoutRef<Root>, keyof Own | keyof Additional | 'ref' | 'component'> & {
    ref?: React.Ref<ViewInstance>;
  } & (Root extends typeof NativePressable ? { component?: Root } : { component: Root });
export type ButtonProps<
  RootComponent extends React.ComponentType<any> = typeof NativePressable,
  AdditionalProps = {},
> = NativeProps<ButtonOwnProps, RootComponent, AdditionalProps>;
export type IconButtonProps<
  RootComponent extends React.ComponentType<any> = typeof NativePressable,
  AdditionalProps = {},
> = NativeProps<IconButtonOwnProps, RootComponent, AdditionalProps>;
export interface NativeButtonComponent {
  <Root extends React.ComponentType<any>>(
    props: ButtonProps<Root> & { component: Root },
  ): React.ReactNode;
  (props: ButtonProps): React.ReactNode;
  displayName?: string;
}
export interface NativeIconButtonComponent {
  <Root extends React.ComponentType<any>>(
    props: IconButtonProps<Root> & { component: Root },
  ): React.ReactNode;
  (props: IconButtonProps): React.ReactNode;
  displayName?: string;
}
