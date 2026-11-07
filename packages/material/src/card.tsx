/* Card composition adapts MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/card.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import {
  forwardRef,
  useContext,
  type ComponentType,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from 'react';
import { View, useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  createNativeStyledStyle,
  useNativeRootProps,
  useNativeTextContext,
  nativeTextStyleContext,
  joinClassNames,
  componentRootStyle,
  NativeTextScope,
  useNativeTextRootRef,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  diagnostic,
  type Theme,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { Paper, type NativePaperRootProps } from './paper';
import { useTheme, THEME_ID } from './themeProvider';
import { getCardUtilityClass } from './cardClasses';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import type { NativeCardComponent, NativeCardRootProps } from './cardTypes';
export type { CardOwnProps, CardProps, CardTypeMap, CardPropsColorOverrides } from './cardTypes';
export * from './cardClasses';

// Internal native props already passed Card's public root/ref constraint.
const CardRoot = Paper as ForwardRefExoticComponent<
  NativePaperRootProps & RefAttributes<ViewInstance>
>;
type AlternateRoot = ComponentType<any> | 'div';
// Emotion's `as` replaces the styled base itself. Use the existing native root
// boundaries here rather than sending an alternate component through Paper.
const AlternateCardRoot = forwardRef<
  ViewInstance,
  {
    component: AlternateRoot;
    native: Record<string, unknown>;
    children: ReactNode;
    className: string;
    theme: Theme;
    style: StyleProp<NativeStyle>;
  }
>(function AlternateCardRoot({ component, native, children, className, theme, style }, forwarded) {
  const { root, ref } = useNativeTextRootRef(forwarded),
    nativeRef = useNativeStyleRef(root, ref);
  const parent = useNativeTextContext(),
    rules = useContext(NativeButtonGroupRules),
    { width } = useWindowDimensions();
  const classes = className.split(/\s+/).filter(Boolean);
  const { computed, authored, prepared } = componentRootStyle(theme, '', {}, undefined, style, {
    ...nativeTextStyleContext(parent, undefined, theme),
    width,
    classes,
    ancestors: nativeStyleAncestors(rules, { classes }),
    protectPhysicalGeometry: true,
  });
  const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, computed, authored);
  const finalStyle =
    applyNativeTextMetrics(merged, computed, nativeStyleTextMetrics([computed, authored])) ??
    merged;
  if (typeof component === 'string' && component !== 'div')
    diagnostic(
      'card-component',
      'Use a custom native component for Card alternate roots other than the div alias.',
    );
  const Root = typeof component === 'string' ? View : component;
  return (
    <NativeStyleScope root={root} theme={theme} classes={classes} prepared={prepared}>
      <NativeTextScope rootRef={root} theme={theme} style={finalStyle} content={children}>
        {(nativeStyle, content) => (
          <Root
            {...native}
            {...(Root === View ? {} : { className })}
            ref={nativeRef}
            style={nativeStyle}
          >
            {content}
          </Root>
        )}
      </NativeTextScope>
    </NativeStyleScope>
  );
});
export const Card: NativeCardComponent = forwardRef<ViewInstance, NativeCardRootProps>(
  function Card(inProps, ref) {
    const { props, style: preparedStyle } = useNativeRootProps({ props: inProps, name: 'MuiCard' });
    const { className, raised = false, ...other } = props;
    const ownerState = { ...props, raised };
    const classes = ownerState.classes;
    const generated = getCardUtilityClass('root');
    // Source composeClasses reads an active root accessor twice.
    const rootClass = joinClassNames(
      classes?.root ? `${generated} ${classes.root}` : generated,
      className,
    );
    // The source spreads other last: an explicit elevation, even undefined,
    // replaces the raised default before Paper resolves its own defaults.
    const rootProps = { className: rootClass, elevation: raised ? 8 : undefined, ...other };
    const reserved = other as typeof other & {
      ownerState?: Record<string, unknown> | null;
      theme?: Theme;
      as?: AlternateRoot | null;
    };
    const selectedOwnerState = Object.hasOwn(other, 'ownerState')
      ? reserved.ownerState
      : ownerState;
    const providerTheme = useTheme(),
      parent = useNativeTextContext(),
      { width } = useWindowDimensions();
    // Explicit complete native themes style this Card layer. Paper still uses
    // its provider theme; do not introduce a provider or mutate either input.
    const explicit = reserved.theme;
    const theme =
      explicit && typeof explicit === 'object'
        ? (explicit as Theme & Record<string, Theme>)[THEME_ID] || explicit
        : providerTheme;
    const style = createNativeStyledStyle(
      theme,
      'MuiCard',
      selectedOwnerState as Record<string, unknown>,
      other.sx,
      {
        ...nativeTextStyleContext(parent, other.style, theme),
        width,
        classes: rootClass.split(/\s+/).filter(Boolean),
        rootProps,
        baseStyle: { overflow: 'hidden' },
        protectPhysicalGeometry: true,
      },
      preparedStyle,
      Object.hasOwn(props, 'style'),
    );
    // Material's named styled root consumes these props. Prepared CSS travels
    // privately, keeping exact authored ownerState identity and style presence.
    const {
      classes: _classes,
      sx: _sx,
      style: _style,
      ownerState: _owner,
      theme: _theme,
      as: _as,
      ...native
    } = reserved;
    if (reserved.as)
      return (
        <AlternateCardRoot
          component={reserved.as}
          native={{ elevation: raised ? 8 : undefined, ...native }}
          className={rootClass}
          theme={theme}
          style={style}
          ref={ref}
        >
          {other.children}
        </AlternateCardRoot>
      );
    return (
      <CardRoot
        className={rootClass}
        elevation={raised ? 8 : undefined}
        ref={ref}
        {...native}
        style={style}
      />
    );
  },
) as NativeCardComponent;
