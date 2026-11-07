/* Props adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/paper.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { View, ViewProps, ViewInstance, StyleProp } from 'react-native';
import type { NativeStyle, SxProps } from '@altroo/mui-native-system';
import type { PaperClasses } from './paperClasses';
export interface PaperPropsVariantOverrides {}
type VariantFlags = Omit<Record<'elevation' | 'outlined', true>, keyof PaperPropsVariantOverrides> &
  PaperPropsVariantOverrides;
export type PaperVariant = Extract<
  { [K in keyof VariantFlags]: true extends VariantFlags[K] ? K : never }[keyof VariantFlags],
  string
>;
export interface PaperOwnProps {
  children?: React.ReactNode;
  classes?: Partial<PaperClasses> | undefined;
  className?: string | undefined;
  elevation?: number | undefined;
  square?: boolean | undefined;
  sx?: SxProps | undefined;
  variant?: PaperVariant | undefined;
  style?: StyleProp<NativeStyle> | undefined;
}
type Root = React.ComponentType<any> | 'div';
// A declared ref must expose a native host. Ref-less wrappers remain valid;
// TypeScript cannot inspect which host a structurally compatible wrapper renders.
type NativeRoot<R extends Root> = R extends 'div'
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
  | 'div'
  | { call(props: ViewProps & React.RefAttributes<ViewInstance>): React.ReactNode }['call']
  | (new (props: any) => ViewInstance);
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RootProps<R extends Root> = R extends 'div'
  ? React.ComponentPropsWithRef<typeof View>
  : R extends React.ComponentType<any>
    ? React.ComponentPropsWithRef<R>
    : never;
export interface PaperTypeMap<AdditionalProps = {}, RootComponent extends Root = typeof View> {
  props: AdditionalProps & PaperOwnProps;
  defaultComponent: NativeRoot<RootComponent>;
}
export type PaperProps<R extends Root = typeof View, AdditionalProps = {}> = [
  NativeRoot<R>,
] extends [never]
  ? never
  : PaperOwnProps &
      AdditionalProps &
      DistributiveOmit<RootProps<R>, keyof PaperOwnProps | keyof AdditionalProps | 'component'> & {
        component?: ConfiguredRoot | undefined;
      };
type Keys<T> = T extends unknown ? keyof T : never;
// Preserve the relationship between a conditional spread's root and its props;
// a default-root branch must not acquire another branch's required custom props.
type InferredPaperProps<P extends PaperProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? PaperProps
    : NonNullable<P['component']> extends infer R extends Root
      ? PaperProps<R>
      : PaperProps
  : never;
// Read keys before a union with broad default props can absorb a custom branch.
type InferredPaperKeys<P extends PaperProps> = P extends unknown
  ? Keys<InferredPaperProps<P>>
  : never;
export interface NativePaperComponent {
  <R extends Root>(
    props: PaperProps<R> & { component: R & NativeRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: Omit<PaperProps, 'component'> & { component?: undefined }): React.JSX.Element;
  // Styled/default-props objects retain their public props shape. Concrete or
  // optional known roots still require their declared props, and inference must
  // not turn unknown attributes into accepted component props.
  <P extends PaperProps>(
    props: P &
      NoInfer<InferredPaperProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredPaperKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export type NativePaperRootProps = Omit<ViewProps, 'style'> &
  PaperOwnProps & { component?: Root | undefined };
