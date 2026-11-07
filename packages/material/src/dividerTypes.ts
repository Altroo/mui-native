/* Props adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/divider.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { View, ViewProps, ViewInstance, StyleProp } from 'react-native';
import type { NativeStyle, SxProps } from '@altroo/mui-native-system';
import type { DividerClasses } from './dividerClasses';
export interface DividerPropsVariantOverrides {}
type VariantFlags = Omit<
  Record<'fullWidth' | 'inset' | 'middle', true>,
  keyof DividerPropsVariantOverrides
> &
  DividerPropsVariantOverrides;
export type DividerVariant = Extract<
  { [K in keyof VariantFlags]: true extends VariantFlags[K] ? K : never }[keyof VariantFlags],
  string
>;
export interface DividerOwnProps {
  absolute?: boolean | undefined;
  children?: React.ReactNode;
  classes?: Partial<DividerClasses> | undefined;
  className?: string | undefined;
  flexItem?: boolean | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  sx?: SxProps | undefined;
  textAlign?: 'center' | 'left' | 'right' | undefined;
  variant?: DividerVariant | undefined;
  style?: StyleProp<NativeStyle> | undefined;
}
type Root = React.ComponentType<any> | 'hr' | 'div';
// A declared ref must expose a native host. Ref-less wrappers remain valid;
// TypeScript cannot inspect which host a structurally compatible wrapper renders.
type NativeRoot<R extends Root> = R extends 'hr' | 'div'
  ? R
  : R extends React.ComponentType<any>
    ? [React.ComponentRef<R>] extends [never]
      ? R
      : React.ComponentRef<R> extends ViewInstance
        ? R
        : never
    : never;
// Default-props objects cannot infer a custom root's props. A bivariant call
// signature accepts required native wrapper props while still checking a declared
// ref against the native host. Structurally compatible ref-less wrappers remain
// the author's responsibility, as with the generic JSX overload.
type ConfiguredRoot =
  | 'hr'
  | 'div'
  | { call(props: ViewProps & React.RefAttributes<ViewInstance>): React.ReactNode }['call']
  | (new (props: any) => ViewInstance);
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RootProps<R extends Root> = R extends 'hr' | 'div'
  ? React.ComponentPropsWithRef<typeof View>
  : R extends React.ComponentType<any>
    ? React.ComponentPropsWithRef<R>
    : never;
export interface DividerTypeMap<AdditionalProps = {}, RootComponent extends Root = typeof View> {
  props: AdditionalProps & DividerOwnProps;
  defaultComponent: NativeRoot<RootComponent>;
}
export type DividerProps<R extends Root = typeof View, AdditionalProps = {}> = [
  NativeRoot<R>,
] extends [never]
  ? never
  : DividerOwnProps &
      AdditionalProps &
      DistributiveOmit<
        RootProps<R>,
        keyof DividerOwnProps | keyof AdditionalProps | 'component'
      > & {
        component?: ConfiguredRoot | undefined;
      };
type Keys<T> = T extends unknown ? keyof T : never;
// Preserve the relationship between a conditional spread's root and its props;
// a default-root branch must not acquire another branch's required custom props.
type InferredDividerProps<P extends DividerProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? DividerProps
    : NonNullable<P['component']> extends infer R extends Root
      ? DividerProps<R>
      : DividerProps
  : never;
// Read keys before a union with broad default props can absorb a custom branch.
type InferredDividerKeys<P extends DividerProps> = P extends unknown
  ? Keys<InferredDividerProps<P>>
  : never;
export interface NativeDividerComponent {
  <R extends Root>(
    props: DividerProps<R> & { component: R & NativeRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: Omit<DividerProps, 'component'> & { component?: undefined }): React.JSX.Element;
  // Styled/default-props objects retain their public props shape. Concrete or
  // optional known roots still require their declared props, and inference must
  // not turn unknown attributes into accepted component props.
  <P extends DividerProps>(
    props: P &
      NoInfer<InferredDividerProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredDividerKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export type NativeDividerRootProps = Omit<ViewProps, 'style'> &
  DividerOwnProps & { component?: Root | undefined };
