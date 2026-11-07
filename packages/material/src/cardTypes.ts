/* Props adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/card.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import type React from 'react';
import type { View, ViewProps, ViewInstance } from 'react-native';
import type { PaperOwnProps } from './paperTypes';
import type { CardClasses } from './cardClasses';
import type { Theme } from '@altroo/mui-native-system';
export interface CardPropsColorOverrides {}
export interface CardOwnProps extends Omit<PaperOwnProps, 'classes'> {
  classes?: Partial<CardClasses> | undefined;
  raised?: boolean | undefined;
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
type RawRootProps<R extends Root> = R extends 'div'
  ? React.ComponentPropsWithRef<typeof View>
  : R extends React.ComponentType<any>
    ? React.ComponentPropsWithRef<R>
    : never;
// The styled Card root consumes reserved values before a custom root renders.
// Preserve declared presence/nullability while requiring complete native themes
// and native-compatible alternate hosts instead of browser roots.
type ReservedRootProps<P> = {
  [K in keyof P]: K extends 'theme'
    ? Extract<P[K], Theme | undefined>
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
export interface CardTypeMap<AdditionalProps = {}, RootComponent extends Root = typeof View> {
  props: AdditionalProps & CardOwnProps;
  defaultComponent: NativeRoot<RootComponent>;
}
export type CardProps<R extends Root = typeof View, AdditionalProps = {}> = [
  NativeRoot<R>,
] extends [never]
  ? never
  : CardOwnProps &
      AdditionalProps &
      DistributiveOmit<RootProps<R>, keyof CardOwnProps | keyof AdditionalProps | 'component'> & {
        component?: (typeof View extends R ? ConfiguredRoot : R) | undefined;
      };
type Keys<T> = T extends unknown ? keyof T : never;
// Reconstruct selected roots for styled and prop objects. Ordinary conditional
// spreads retain the original default branch's structural assignment boundary.
type InferredCardProps<P extends CardProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? CardProps
    : NonNullable<P['component']> extends infer R extends Root
      ? CardProps<R>
      : CardProps
  : never;
// Read keys before a union with broad default props can absorb a custom branch.
type InferredCardKeys<P extends CardProps> = P extends unknown ? Keys<InferredCardProps<P>> : never;
export interface NativeCardComponent {
  <R extends Root>(
    props: CardProps<R> & { component: R & NativeRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: Omit<CardProps, 'component'> & { component?: undefined }): React.JSX.Element;
  // Styled/default-props objects retain their public props shape. Concrete or
  // optional known roots still require their declared props, and inference must
  // not turn unknown attributes into accepted component props.
  <P extends CardProps>(
    props: P &
      NoInfer<InferredCardProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredCardKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export type NativeCardRootProps = Omit<ViewProps, 'style'> &
  CardOwnProps & { component?: Root | undefined };
