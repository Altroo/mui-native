/* Paper state/classes/overlay adapt MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/paper.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { forwardRef, useContext } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
} from 'react-native';
import {
  useNativeRootProps,
  NativeTextScope,
  NativeTextStyleContext,
  componentRootStyle,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  alpha,
  joinClassNames,
  diagnostic,
  resolveSx,
  type NativeStyle,
} from '@altroo/mui-native-system';
import {
  useNativeStructuralFacts,
  nativeInlineStyle,
  retainNativeRootCss,
  useNativeStyleCache,
  NativeCssRootBoundary,
  refreshNativeStyle,
  retainNativeStyleTransform,
} from '@altroo/mui-native-system/internal/prepared-style';
import { NativeRootTextBoundary } from './nativeRootTextBoundary';
import {
  AccordionStructuralView,
  prepareAccordionStructuralCases,
  useAccordionStructuralRoot,
} from './accordionStructuralRoot';
import { paperConstructorCss, paperOverrideCss } from './nativeAccordionCss';
import { useTheme } from './themeProvider';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { useAccordionRootMotion, renderAccordionRootMotion } from './accordionRootMotion';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { getPaperUtilityClass, type PaperClasses } from './paperClasses';
import type { NativePaperComponent, NativePaperRootProps } from './paperTypes';
export * from './paperTypes';
export * from './paperClasses';

// Keep the source logarithmic curve and rounding; this is not a shadow-depth approximation.
function getOverlayAlpha(elevation: number): number {
  const value = elevation < 1 ? 5.11916 * elevation ** 2 : 4.5 * Math.log(elevation + 1) + 2;
  return Math.round(value * 10) / 1000;
}
function classNames(slots: readonly string[], classes?: Partial<PaperClasses>, className?: string) {
  return joinClassNames(
    slots
      .filter(Boolean)
      .map((slot) => {
        const generated = getPaperUtilityClass(slot);
        // Source composeClasses reads an active custom accessor twice.
        return classes?.[slot as keyof PaperClasses]
          ? `${generated} ${classes[slot as keyof PaperClasses]}`
          : generated;
      })
      .join(' '),
    className,
  );
}
// This retained callback must not share the component render's lexical scope:
// that scope also contains children and source prop callbacks.
function paperPainter(direction: 'ltr' | 'rtl', inline: StyleProp<NativeStyle>) {
  return (computed: NativeStyle) => {
    const merged = mergeNativeRootStyle(direction, computed, inline);
    return (
      applyNativeTextMetrics(merged, computed, nativeStyleTextMetrics([computed, inline])) ?? merged
    );
  };
}

export const Paper: NativePaperComponent = forwardRef<ViewInstance, NativePaperRootProps>(
  function Paper(inProps, forwarded) {
    const { root, ref } = useNativeTextRootRef(forwarded);
    const nativeRef = useNativeStyleRef(root, ref);
    const structuralFacts = useNativeStructuralFacts(root);
    const rootMotion = useAccordionRootMotion();
    const structuralRoot = useAccordionStructuralRoot(inProps.className);
    const { props, style: preparedStyle } = useNativeRootProps({
      props: inProps,
      name: 'MuiPaper',
    });
    const {
      component = 'div',
      elevation = 1,
      square = false,
      variant = 'elevation',
      className,
      classes,
      sx,
      style,
      children,
      ...native
    } = props;
    const styleCache = useNativeStyleCache();
    const { width } = useWindowDimensions();
    const theme = useTheme(),
      parent = useNativeTextContext(),
      rules = useContext(NativeButtonGroupRules);
    if (typeof component === 'string' && component !== 'div')
      diagnostic(
        'paper-component',
        'Use a custom native component for Paper roots other than the div alias.',
      );
    const Root = typeof component === 'string' ? View : component;
    const ownerState = { ...props, component, elevation, square, variant };
    const slots = [
      'root',
      variant,
      ...(!square ? ['rounded'] : []),
      ...(variant === 'elevation' ? [`elevation${elevation}`] : []),
    ];
    const rootClass = classNames(slots, classes, className),
      tokens = rootClass.split(/\s+/).filter(Boolean);
    // Source diagnostics observe the requested index in development even for
    // outlined/custom variants. Production only observes an active elevation.
    if (process.env.NODE_ENV !== 'production' && theme.shadows[elevation] === undefined)
      diagnostic(
        'paper-elevation',
        `The Paper elevation ${elevation} is not available in theme.shadows.`,
      );
    let shadow: string | undefined;
    let shadowStyle: NativeStyle | undefined;
    if (variant === 'elevation') {
      const shadows = theme.shadows;
      shadow = shadows[elevation];
      if (typeof shadow === 'string') {
        if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
          // Reuse the existing numeric legacy approximation with the captured
          // value. Descriptor overlays never mutate/enumerate caller shadows or
          // re-read a getter, and authored layers still use the original theme.
          const captured = Object.create(theme, {
            shadows: { value: Object.create(shadows, { [elevation]: { value: shadow } }) },
          });
          shadowStyle = resolveSx({ boxShadow: elevation }, captured, { mode: 'css' });
        } else if (/^(0|[1-9]\d*)$/.test(shadow)) {
          // A literal theme value must not become another sx token lookup.
          diagnostic('box-shadow', `Unsupported literal Paper shadow: ${shadow}`);
        } else shadowStyle = { boxShadow: shadow };
      } else if (shadow !== undefined)
        diagnostic('box-shadow', `Unsupported literal Paper shadow: ${String(shadow)}`);
    }
    const overlayColor =
      variant === 'elevation' && theme.palette.mode === 'dark'
        ? alpha('#fff', getOverlayAlpha(elevation))
        : undefined;
    // Generated paint belongs to Paper's constructor CSS. Keeping it in the
    // prepared sheet lets a custom styling-aware root apply normal specificity.
    // Genuine native image declarations, including explicit resets, stay last.
    const inlineImage = StyleSheet.flatten(nativeInlineStyle(preparedStyle));
    const nativeOverlay =
      overlayColor &&
      !Object.hasOwn(inlineImage ?? {}, 'backgroundImage') &&
      !Object.hasOwn(inlineImage ?? {}, 'experimental_backgroundImage')
        ? {
            backgroundImage: [
              {
                type: 'linear-gradient' as const,
                colorStops: [{ color: overlayColor }, { color: overlayColor }],
              },
            ],
          }
        : undefined;
    // These source style variables are callback arguments only. Native hosts get
    // concrete shadow/gradient values, never unresolved browser custom properties.
    const rootStyle = {
      ...(variant === 'elevation'
        ? {
            '--Paper-shadow': shadow,
            ...(overlayColor
              ? { '--Paper-overlay': `linear-gradient(${overlayColor}, ${overlayColor})` }
              : {}),
          }
        : {}),
      ...StyleSheet.flatten(style),
    };
    const rootProps = { ...props, as: component, className: rootClass, style: rootStyle };
    for (const key of ['component', 'elevation', 'square', 'variant'])
      Reflect.deleteProperty(rootProps, key);
    const { computed, authored, prepared, programme } = componentRootStyle(
      theme,
      'MuiPaper',
      ownerState,
      sx,
      preparedStyle,
      {
        styleCache,
        sourceClass: true,
        baseProgramme: paperConstructorCss(theme, ownerState),
        overrideProgramme: paperOverrideCss,
        width,
        ...nativeTextStyleContext(parent, style, theme),
        classes: tokens,
        ...structuralFacts,
        rootProps,
        ancestors: nativeStyleAncestors(rules, { classes: tokens }),
        overrideKeys: slots.slice(1),
        protectPhysicalGeometry: true,
        baseStyle: {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          ...(!square ? { borderRadius: theme.shape.borderRadius } : {}),
          ...(variant === 'outlined' ? { border: `1px solid ${theme.palette.divider}` } : {}),
          ...shadowStyle,
          ...nativeOverlay,
        },
      },
      true,
    );
    const inlineLayers = authored;
    const paint = paperPainter(parent?.direction ?? theme.direction, inlineLayers);
    const finalStyle = retainNativeStyleTransform(paint(computed), computed, paint);
    const structuralCases =
      structuralRoot && Root === View
        ? prepareAccordionStructuralCases({
            theme,
            programme,
            direction: parent?.direction ?? theme.direction,
            context: {
              styleCache,
              width,
              classes: tokens,
              ...structuralFacts,
              ...nativeTextStyleContext(parent, style, theme),
              protectPhysicalGeometry: true,
            },
          })
        : undefined;
    return (
      <NativeCssRootBoundary style={computed} registerClass={Root !== View}>
        {() => (
          <NativeStyleScope root={root} theme={theme} classes={tokens} prepared={prepared}>
            <NativeTextScope
              rootRef={Root === View ? root : undefined}
              theme={theme}
              style={refreshNativeStyle(finalStyle)}
              content={Root === View ? children : undefined}
            >
              {(resolvedStyle, content, fallback) =>
                renderAccordionRootMotion(
                  rootMotion,
                  root,
                  resolvedStyle,
                  (nativeStyle, presentation) =>
                    structuralCases ? (
                      <AccordionStructuralView
                        {...native}
                        cases={structuralCases}
                        nativeRef={nativeRef}
                        presentation={presentation}
                        style={nativeStyle}
                      >
                        {content}
                      </AccordionStructuralView>
                    ) : Root === View ? (
                      <Root {...native} ref={nativeRef} style={nativeStyle}>
                        {content}
                      </Root>
                    ) : (
                      <NativeTextStyleContext.Provider value={parent}>
                        <Root
                          {...native}
                          {...{ className: rootClass }}
                          ref={nativeRef}
                          style={retainNativeRootCss(
                            inlineLayers,
                            programme,
                            Object.hasOwn(props, 'style'),
                            nativeStyle,
                          )}
                        >
                          <NativeRootTextBoundary
                            parent={parent}
                            fallback={fallback}
                            rootRef={root}
                            theme={theme}
                          >
                            {children}
                          </NativeRootTextBoundary>
                        </Root>
                      </NativeTextStyleContext.Provider>
                    ),
                )
              }
            </NativeTextScope>
          </NativeStyleScope>
        )}
      </NativeCssRootBoundary>
    );
  },
) as NativePaperComponent;
