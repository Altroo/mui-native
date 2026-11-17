/* Props adapt MIT Material/System Box 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/box.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { View, ViewProps, ViewInstance, ViewStyle, StyleProp } from 'react-native';
import type { NativeStyle, SxProps, Theme } from '@altroo/mui-native-system';
export interface BoxOwnProps<ThemeInput extends Theme = Theme> {
  children?: React.ReactNode;
  ref?: React.Ref<ViewInstance> | undefined;
  sx?: SxProps<ThemeInput> | undefined;
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
// Prop objects cannot infer a custom root's props. A bivariant call
// signature accepts required native wrapper props while still checking a declared
// ref against the native host. Structurally compatible ref-less wrappers remain
// the author's responsibility, as with the generic JSX overload.
type ConfiguredRoot =
  | 'div'
  | { call(props: ViewProps & React.RefAttributes<ViewInstance>): React.ReactNode }['call']
  | (new (props: any) => ViewInstance);
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NativeHostProps<P> = P &
  ('className' extends keyof P ? {} : { className?: string | undefined });
type RawRootProps<R extends Root> = R extends 'div'
  ? NativeHostProps<React.ComponentPropsWithRef<typeof View>>
  : R extends React.ComponentType<any>
    ? R extends typeof View
      ? NativeHostProps<React.ComponentPropsWithRef<R>>
      : React.ComponentPropsWithRef<R>
    : never;
// Keep root requirements/discriminants intact. Standard View style containers
// gain native text metrics; custom narrower style inputs retain their shape.
// Reserved theme/as values must remain native rather than browser root inputs.
type ReservedRootProps<P> = {
  [K in keyof P]: K extends 'theme'
    ? Extract<P[K], Theme>
    : K extends 'style'
      ? StyleProp<ViewStyle> extends P[K]
        ? StyleProp<NativeStyle>
        : P[K] & StyleProp<NativeStyle>
      : K extends 'as'
        ? Required<P>[K] extends infer R
          ? R extends Root
            ? NativeRoot<R>
            : R extends undefined
              ? undefined
              : never
          : never
        : P[K];
};
type RootProps<R extends Root> = ReservedRootProps<RawRootProps<R>>;
export interface BoxTypeMap<
  AdditionalProps = {},
  RootComponent extends Root = typeof View,
  ThemeInput extends Theme = Theme,
> {
  props: AdditionalProps & BoxOwnProps<ThemeInput>;
  defaultComponent: NativeRoot<RootComponent>;
}
export type BoxProps<R extends Root = typeof View, AdditionalProps = {}> = [NativeRoot<R>] extends [
  never,
]
  ? never
  : BoxTypeMap<AdditionalProps, R>['props'] &
      DistributiveOmit<RootProps<R>, Exclude<keyof BoxOwnProps, 'ref'> | keyof AdditionalProps> & {
        // Keep default native wrapper props compatible, but retain an explicitly
        // chosen custom root when a BoxProps<R> object is later spread.
        component?: (typeof View extends R ? ConfiguredRoot : R) | undefined;
      };
type DefaultBoxProps = Omit<BoxProps, 'component'> & { component?: undefined };
type Keys<T> = T extends unknown ? keyof T : never;
// Preserve the relationship between a conditional spread's root and its props;
// a default-root branch cannot accept a concrete custom component. Otherwise,
// that broad branch would absorb a missing-prop custom branch in the same union.
type InferredBoxProps<P extends BoxProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? DefaultBoxProps
    : NonNullable<P['component']> extends infer R extends Root
      ? BoxProps<R>
      : BoxProps
  : never;
// Read keys before a union with broad default props can absorb a custom branch.
type InferredBoxKeys<P extends BoxProps> = P extends unknown ? Keys<InferredBoxProps<P>> : never;
export interface NativeBoxComponent {
  <R extends Root>(
    props: BoxProps<R> & { component: R & NativeRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: DefaultBoxProps): React.JSX.Element;
  // Styled and ordinary prop objects retain their public props shape. Concrete or
  // optional known roots still require their declared props, and inference must
  // not turn unknown attributes into accepted component props.
  <P extends BoxProps>(
    props: P &
      NoInfer<InferredBoxProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredBoxKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export type NativeBoxRootProps = Omit<ViewProps, 'style'> &
  BoxOwnProps & {
    className?: string | undefined;
    style?: StyleProp<NativeStyle> | undefined;
    component?: Root | undefined;
    as?: Root | undefined;
    theme?: Theme | null | undefined;
  };
