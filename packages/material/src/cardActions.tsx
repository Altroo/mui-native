/* CardActions props, defaults and class composition adapt MIT Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/card-actions.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef } from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  useNativeRootProps,
  joinClassNames,
} from '@altroo/mui-native-system';
import { useTheme, useComponentRootStyle } from './themeProvider';
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
  ownerState?: object;
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
      ownerState: _ownerState,
      children,
      disableSpacing = false,
      id,
      sx,
      style,
      ...native
    } = props as CardActionsProps & CardActionsNativeRootProps;
    const componentRoot = Component === 'div' ? View : Component;
    const selectedRoot = componentRoot === View ? (as ?? View) : componentRoot;
    const Root = (selectedRoot === 'div' ? View : selectedRoot) as React.ComponentType<any>;
    const mergedRef = useForkRef(ref, slotRef);
    const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(mergedRef);
    const theme = useTheme(),
      parent = useNativeTextContext();
    const token = (slot: 'root' | 'spacing') => {
      let value = getCardActionsUtilityClass(slot);
      // Match composeClasses: a truthy active entry is read once again when appended.
      if (classes && classes[slot]) value += ' ' + classes[slot];
      return value;
    };
    const rootClass = joinClassNames(token('root'), !disableSpacing && token('spacing'), className);
    const owner = { ...props, disableSpacing };
    const { disableSpacing: _disableSpacing, ...styledProps } = props;
    const { computed: resolved, authored } = useComponentRootStyle(
      'MuiCardActions',
      owner,
      sx,
      preparedStyle,
      {
        ...nativeTextStyleContext(parent, style, theme),
        slot: 'root',
        overrideKeys: disableSpacing ? [] : ['spacing'],
        classes: rootClass.split(/\s+/).filter(Boolean),
        rootProps: {
          ...styledProps,
          ...(as || Component !== View ? { as: as ?? Component } : {}),
          className: rootClass,
        },
        baseStyle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: 8,
          // Yoga gap preserves caller-owned children and mirrors with the native row direction.
          columnGap: disableSpacing ? 0 : 8,
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
            {...(componentRoot !== View && as ? { as } : {})}
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
