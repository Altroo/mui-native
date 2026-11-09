/* CardContent composition adapts MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * Source hashes: tests/fixtures/mui-card-content-9.5.0.json. Native root selection is OPEN.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import {
  forwardRef,
  useContext,
  type ComponentType,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from 'react';
import { View, useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  componentRootStyle,
  useNativeRootProps,
  useNativeTextContext,
  nativeTextStyleContext,
  joinClassNames,
  NativeTextScope,
  useNativeTextRootRef,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  diagnostic,
  type Theme,
  type NativeStyle,
  type NativePreparedStyle,
  type StyleContext,
} from '@altroo/mui-native-system';
import { useTheme, THEME_ID } from './themeProvider';
import { getCardContentUtilityClass } from './cardContentClasses';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import type { NativeCardContentComponent, NativeCardContentRootProps } from './cardContentTypes';

/** Private unresolved backend handoff, never a new public CardContent prop. */
export interface CardContentBackendInput {
  Root: ComponentType<any>;
  /** Genuine forwarded custom-root data; only constructed for an opted-in path. */
  cooperation?: Readonly<{ props: Record<string, unknown> }>;
  hostProps: Record<string, unknown>;
  nativeRef: RefCallback<ViewInstance>;
  rootRef: RefObject<ViewInstance | null>;
  className: string;
  theme: Theme;
  /** Preserved conditional CSS; backend must select physical facts before layout. */
  prepared: NativePreparedStyle;
  computed: NativeStyle;
  authored: StyleProp<NativeStyle>;
  /** Retained complete CSS carrier, evaluated before native structural selection. */
  styleProgram: StyleProp<NativeStyle>;
  styleContext: StyleContext;
  parentDirection: 'ltr' | 'rtl';
  /** Text-scope presentation under UNKNOWN structure, not a correct native fallback. */
  unselectedPresentation: StyleProp<NativeStyle>;
  /** Already computed input to the canonical text scope, before structural selection. */
  ordinaryText: { presentation: NativeStyle; metrics: Record<string, unknown> };
  children: ReactNode;
}
function MissingBackend(): never {
  throw Error('CardContent structural backend is not integrated');
}
const baseStyle = { padding: 16, '&:last-child': { paddingBottom: 24 } };
/** Draft factory injects a private backend; its public component keeps reviewed props. */
export function createCardContentRuntime(
  Backend: ComponentType<CardContentBackendInput> = MissingBackend,
): NativeCardContentComponent {
  return forwardRef<ViewInstance, NativeCardContentRootProps>(
    function CardContentDraft(inProps, forwarded) {
      const { props, style: preparedStyle } = useNativeRootProps({
        props: inProps,
        name: 'MuiCardContent',
      });
      const { className, component = 'div', ...other } = props;
      const ownerState = { ...props, component };
      const classes = ownerState.classes,
        generated = getCardContentUtilityClass('root');
      // Source composeClasses observes a truthy root accessor twice.
      const rootClass = joinClassNames(
        classes?.root ? `${generated} ${classes.root}` : generated,
        className,
      );
      // Source JSX spreads other last, including own undefined/null as/ownerState/ref.
      const rootProps = {
        as: component,
        className: rootClass,
        ownerState,
        ref: forwarded,
        ...other,
      } as Record<string, unknown>;
      const chosen = rootProps.as || 'div';
      if (typeof chosen === 'string' && chosen !== 'div')
        diagnostic(
          'card-content-component',
          'Use a custom native component for CardContent roots other than the div alias.',
        );
      const Root = typeof chosen === 'string' ? View : (chosen as ComponentType<any>);
      const { root, ref } = useNativeTextRootRef(
        rootProps.ref as Parameters<typeof useNativeTextRootRef<ViewInstance>>[0],
      );
      const nativeRef = useNativeStyleRef(root, ref);
      const providerTheme = useTheme(),
        parent = useNativeTextContext(),
        rules = useContext(NativeButtonGroupRules),
        { width } = useWindowDimensions();
      const explicit = rootProps.theme;
      const theme =
        explicit && typeof explicit === 'object'
          ? (explicit as Theme & Record<string, Theme>)[THEME_ID] || (explicit as Theme)
          : providerTheme;
      const tokens = rootClass.split(/\s+/).filter(Boolean);
      const styleContext = {
        ...nativeTextStyleContext(parent, other.style, theme),
        width,
        classes: tokens,
        rootProps,
        baseStyle,
        ancestors: nativeStyleAncestors(rules, { classes: tokens }),
        protectPhysicalGeometry: true,
        // Structural truth is deliberately absent. Never inspect React children.
      };
      const {
        computed,
        authored,
        prepared,
        programme: styleProgram,
      } = componentRootStyle(
        theme,
        'MuiCardContent',
        rootProps.ownerState as Record<string, unknown>,
        other.sx,
        preparedStyle,
        styleContext,
        true,
      );
      const parentDirection = parent?.direction ?? theme.direction;
      const merged = mergeNativeRootStyle(parentDirection, computed, authored);
      const textMetrics = nativeStyleTextMetrics([computed, authored]);
      const presentation = applyNativeTextMetrics(merged, computed, textMetrics) ?? merged;
      const {
        as: _as,
        className: _className,
        classes: _classes,
        ownerState: _ownerState,
        theme: _theme,
        sx: _sx,
        style: _style,
        ref: _ref,
        children,
        ...hostProps
      } = rootProps;
      if (Root !== View) {
        const visible = { ...hostProps, className: rootClass } as Record<string, unknown>;
        if (Object.hasOwn(rootProps, 'style')) visible.style = rootProps.style;
        return (
          <Backend
            Root={Root}
            cooperation={{ props: visible }}
            hostProps={hostProps}
            nativeRef={nativeRef}
            rootRef={root}
            className={rootClass}
            theme={theme}
            prepared={prepared}
            computed={computed}
            authored={authored}
            styleProgram={styleProgram}
            styleContext={styleContext}
            parentDirection={parentDirection}
            unselectedPresentation={presentation}
            ordinaryText={{ presentation, metrics: textMetrics }}
          >
            {children as ReactNode}
          </Backend>
        );
      }
      return (
        <NativeStyleScope root={root} theme={theme} classes={tokens} prepared={prepared}>
          <NativeTextScope
            rootRef={root}
            theme={theme}
            style={presentation}
            content={children as ReactNode}
          >
            {(unselectedPresentation, content) => (
              <Backend
                Root={Root}
                hostProps={hostProps}
                nativeRef={nativeRef}
                rootRef={root}
                className={rootClass}
                theme={theme}
                prepared={prepared}
                computed={computed}
                authored={authored}
                styleProgram={styleProgram}
                styleContext={styleContext}
                parentDirection={parentDirection}
                unselectedPresentation={unselectedPresentation}
                ordinaryText={{ presentation, metrics: textMetrics }}
              >
                {content}
              </Backend>
            )}
          </NativeTextScope>
        </NativeStyleScope>
      );
    },
  ) as NativeCardContentComponent;
}
