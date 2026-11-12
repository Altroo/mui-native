/* CardActions props, defaults and class composition adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/card-actions.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef } from 'react';
import { View, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  useNativeRootProps,
  joinClassNames,
  componentRootStyle,
  type Theme,
} from '@altroo/mui-native-system';
import { useTheme, THEME_ID } from './themeProvider';
import { useForkRef } from './utils/refs';
import type { BoxProps } from './boxTypes';
import { getCardActionsUtilityClass } from './cardActionsClasses';
export * from './cardActionsClasses';

export interface CardActionsProps extends Omit<BoxProps, 'component'> {
  component?: BoxProps['component'];
  classes?: Partial<import('./cardActionsClasses').CardActionsClasses> | undefined;
  className?: string | undefined;
  disableSpacing?: boolean | undefined;
}
type CardActionsNativeRootProps = {
  as?: BoxProps['component'];
  ownerState?: Record<string, unknown> | null | undefined;
  theme?: Theme | null | undefined;
};
type ActionRoot = React.ComponentType<any> | 'div';
type NativeActionRoot<R extends ActionRoot> = R extends 'div'
  ? R
  : R extends React.ComponentType<any>
    ? [React.ComponentRef<R>] extends [never]
      ? R
      : React.ComponentRef<R> extends ViewInstance
        ? R
        : never
    : never;
type PropsForRoot<R extends ActionRoot> = Omit<CardActionsProps, 'component'> &
  Omit<BoxProps<R>, 'component'> & {
    component?: (R & NativeActionRoot<R>) | undefined;
  };
type DefaultActionsProps = Omit<CardActionsProps, 'component'> & { component?: undefined };
type InferredActionsProps<P extends CardActionsProps> = P extends unknown
  ? [NonNullable<P['component']>] extends [never]
    ? DefaultActionsProps
    : NonNullable<P['component']> extends infer R extends ActionRoot
      ? PropsForRoot<R>
      : CardActionsProps
  : never;
type InferredActionsKeys<P extends CardActionsProps> = P extends unknown
  ? keyof InferredActionsProps<P>
  : never;
// Infer the actual root before checking its ref. A widened ComponentType/props
// field alone loses that relationship and silently accepts browser hosts.
interface NativeCardActionsComponent {
  <R extends ActionRoot>(
    props: PropsForRoot<R> & { component: R & NativeActionRoot<NoInfer<R>> },
  ): React.JSX.Element;
  (props: DefaultActionsProps): React.JSX.Element;
  <P extends CardActionsProps>(
    props: P &
      NoInfer<InferredActionsProps<P>> &
      Record<Exclude<keyof P, NoInfer<InferredActionsKeys<P>>>, never>,
  ): React.JSX.Element;
  displayName?: string | undefined;
}
export const CardActions: NativeCardActionsComponent = forwardRef<ViewInstance, CardActionsProps>(
  function CardActions(inProps, ref) {
    const { props, style: preparedStyle } = useNativeRootProps({
      props: inProps,
      name: 'MuiCardActions',
    });
    const {
      classes,
      className,
      component: Component = View,
      as,
      ref: slotRef,
      ownerState: authoredOwner,
      theme: explicitTheme,
      children,
      disableSpacing = false,
      id,
      sx,
      style,
      ...native
    } = props as CardActionsProps & CardActionsNativeRootProps;
    // The earlier Box-backed native entry gives a present as prop precedence,
    // including undefined selecting the default View rather than component.
    const selectedRoot = Object.hasOwn(props, 'as') ? as || View : Component;
    const Root = (selectedRoot === 'div' ? View : selectedRoot) as React.ComponentType<any>;
    const mergedRef = useForkRef(ref, slotRef);
    const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(mergedRef);
    const providerTheme = useTheme(),
      parent = useNativeTextContext(),
      { width } = useWindowDimensions();
    // A root-local theme selects this styled layer without changing provider
    // defaults or the context seen by independently themed descendants.
    const theme =
      explicitTheme && typeof explicitTheme === 'object'
        ? (explicitTheme as Theme & Record<string, Theme>)[THEME_ID] || explicitTheme
        : providerTheme;
    const token = (slot: 'root' | 'spacing') => {
      let value = getCardActionsUtilityClass(slot);
      // Match composeClasses: a truthy active entry is read once again when appended.
      if (classes && classes[slot]) value += ' ' + classes[slot];
      return value;
    };
    const rootClass = joinClassNames(token('root'), !disableSpacing && token('spacing'), className);
    const generatedOwner = { ...props, disableSpacing };
    // Original JSX spreads other after ownerState. Class composition still uses
    // generated component state; named styling receives the authored object.
    const owner = Object.hasOwn(props, 'ownerState') ? authoredOwner : generatedOwner;
    const { disableSpacing: _disableSpacing, ...styledProps } = props;
    const { computed: resolved, authored } = componentRootStyle(
      theme,
      'MuiCardActions',
      owner as Record<string, unknown>,
      sx,
      preparedStyle,
      {
        ...nativeTextStyleContext(parent, style, theme),
        width,
        slot: 'root',
        // Source overridesResolver observes owner state after every slot resolves.
        overrideKeys: () =>
          (owner as { disableSpacing?: boolean }).disableSpacing ? [] : ['spacing'],
        classes: rootClass.split(/\s+/).filter(Boolean),
        rootProps: {
          ...styledProps,
          ...(Object.hasOwn(props, 'as') ? { as } : Component !== View ? { as: Component } : {}),
          className: rootClass,
        },
        baseStyle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: 8,
          // Preserve the constructor predicate at its source preparation stage.
          // Yoga gap keeps caller-owned native hosts and children intact.
          columnGap: 0,
          variants: [{ props: { disableSpacing: false }, style: { columnGap: 8 } }],
        },
      },
    );
    // Keep native array precedence: an inline gap does not erase a named columnGap.
    return (
      <NativeTextScope
        rootRef={scopeRoot}
        theme={theme}
        style={[resolved, authored]}
        content={children}
      >
        {(rootStyle, content) => (
          <Root
            {...native}
            nativeID={id ?? native.nativeID}
            {...(Root === View ? {} : { className: rootClass, ownerState: owner })}
            ref={scopeRef}
            style={rootStyle}
          >
            {content}
          </Root>
        )}
      </NativeTextScope>
    );
  },
) as NativeCardActionsComponent;
