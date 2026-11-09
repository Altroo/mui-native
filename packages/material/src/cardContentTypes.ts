/* Props adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * Source hashes: tests/fixtures/mui-card-content-9.5.0.json. See NOTICE.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { View, ViewProps, ViewInstance, ViewStyle, StyleProp } from 'react-native';
import type { NativeStyle, SxProps, Theme } from '@altroo/mui-native-system';
import type { CardContentClasses } from './cardContentClasses';
export interface CardContentOwnProps {
  children?: React.ReactNode;
  classes?: Partial<CardContentClasses> | undefined;
  sx?: SxProps<Theme> | undefined;
}
type Root = React.ComponentType<any> | 'div';
// A declared ref must expose a native host. Ref-less wrappers remain valid;
// TypeScript cannot inspect which host a structurally compatible wrapper renders.
type NativeRoot<R extends Root> = R extends 'div'
  ? R
  : R extends React.ComponentType<any>
    ? [React.ComponentRef<R>] extends [never]
      ? R
      : [NonNullable<React.ComponentRef<R>>] extends [never]
        ? never
        : NonNullable<React.ComponentRef<R>> extends ViewInstance
          ? R
          : never
    : never;
// Prop objects cannot infer a custom root's props. A bivariant call
// signature accepts required native wrapper props while still checking a declared
// ref against the native host. Structurally compatible ref-less wrappers remain
// the author's responsibility, as with the generic JSX overload.
type ConfiguredRoot =
  | 'div'
  | {
      call(
        props: ViewProps & React.RefAttributes<ViewInstance>,
      ): ReturnType<React.FunctionComponent>;
    }['call']
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
    ? Extract<P[K], Theme | null | undefined>
    : K extends 'style'
      ? StyleProp<ViewStyle> extends P[K]
        ? StyleProp<NativeStyle>
        : P[K] & StyleProp<NativeStyle>
      : K extends 'as'
        ? Required<P>[K] extends infer R
          ? R extends Root
            ? NativeRoot<R>
            : R extends null | undefined
              ? R
              : never
          : never
        : P[K];
};
type RootProps<R extends Root> = ReservedRootProps<RawRootProps<R>>;
export interface CardContentTypeMap<
  AdditionalProps = {},
  RootComponent extends Root = typeof View,
> {
  props: AdditionalProps & CardContentOwnProps;
  defaultComponent: NativeRoot<RootComponent>;
}
export type CardContentProps<R extends Root = typeof View, AdditionalProps = {}> = [
  NativeRoot<R>,
] extends [never]
  ? never
  : CardContentTypeMap<AdditionalProps, R>['props'] &
      DistributiveOmit<RootProps<R>, keyof CardContentOwnProps | keyof AdditionalProps> & {
        // Keep default native wrapper props compatible, but retain an explicitly
        // chosen custom root when a CardContentProps<R> object is later spread.
        component?: (typeof View extends R ? ConfiguredRoot : R) | undefined;
      };
type DefaultCardContentProps = Omit<CardContentProps, 'component'> & { component?: undefined };
type Keys<T> = T extends unknown ? keyof T : never;
// Preserve the relationship between a conditional spread's root and its props;
// a default-root branch cannot accept a concrete custom component. Otherwise
// that broad branch would absorb a missing-prop custom branch in the same union.
type InferredCardContentProps<P extends CardContentProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? DefaultCardContentProps
    : NonNullable<P['component']> extends infer R extends Root
      ? CardContentProps<R>
      : CardContentProps
  : never;
// Read keys before a union with broad default props can absorb a custom branch.
type InferredCardContentKeys<P extends CardContentProps> = P extends unknown
  ? Keys<InferredCardContentProps<P>>
  : never;
export interface NativeCardContentComponent {
  <R extends Root>(
    props: CardContentProps<R> & { component: R & NativeRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: DefaultCardContentProps): React.JSX.Element;
  // Styled and ordinary prop objects retain their public props shape. Concrete or
  // optional known roots still require their declared props, and inference must
  // not turn unknown attributes into accepted component props.
  <P extends CardContentProps>(
    props: P &
      NoInfer<InferredCardContentProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredCardContentKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export type NativeCardContentRootProps = Omit<ViewProps, 'style'> &
  CardContentOwnProps & {
    className?: string | undefined;
    style?: StyleProp<NativeStyle> | undefined;
    component?: Root | undefined;
    as?: Root | null | undefined;
    theme?: Theme | null | undefined;
  };
