/* Root/filtering/class composition adapts MIT Material/System Box 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/box.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { forwardRef, useContext } from 'react';
import { View, Text, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useTheme as useSystemTheme,
  separateNativeRootProps,
  restoreNativeRootStyle,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  componentRootStyle,
  joinClassNames,
  diagnostic,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  type Theme,
  type NativeStyle,
} from '@altroo/mui-native-system';
import {
  NativeRootHandoffContext,
  useNativeRootStyleForward,
  clearNativeRootStyleForward,
  retainNativeRootCss,
  registerNativeRoot,
  useNativeRootHandoff,
  useNativeStyleCache,
  NativeCssRootBoundary,
  retainNativeStyleTransform,
  refreshNativeStyle,
  refreshNativeRootPreparation,
} from '@altroo/mui-native-system/internal/prepared-style';
import { useNativeStructuralFacts } from '@altroo/mui-native-system/internal/prepared-style';
import { THEME_ID } from './themeProvider';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { useAccordionRootMotion, renderAccordionRootMotion } from './accordionRootMotion';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
import {
  AccordionStructuralView,
  createAccordionStructuralPreparation,
  useAccordionStructuralRoot,
} from './accordionStructuralRoot';
import { boxClasses } from './boxClasses';
import { unstable_ClassNameGenerator } from './classNameGenerator';
import type { NativeBoxComponent, NativeBoxRootProps } from './boxTypes';
export * from './boxTypes';
export * from './boxClasses';
const warned = new Set<string>();
function warnOnce(code: string, message: string) {
  if (process.env.NODE_ENV === 'production' || warned.has(code)) return;
  warned.add(code);
  diagnostic(code, message);
}
// createBox captures both values on construction, while configure/reset updates
// the generator's existing closure. Later object-method replacement is not read.
const defaultClassName = boxClasses.root;
const generateClassName = unstable_ClassNameGenerator.generate;
export const Box: NativeBoxComponent = forwardRef<ViewInstance, NativeBoxRootProps>(
  function Box(inProps, forwarded) {
    const styleCache = useNativeStyleCache();
    const handoff = useNativeRootHandoff(boxRoot, inProps.className);
    const forwardedStyle = useNativeRootStyleForward(boxRoot, inProps.className);
    const { root, ref } = useNativeTextRootRef(forwarded),
      nativeRef = useNativeStyleRef(root, ref);
    const structuralFacts = useNativeStructuralFacts(root);
    const rootMotion = useAccordionRootMotion();
    const structuralRoot = useAccordionStructuralRoot(inProps.className);
    // Box is anonymous to styled/theme defaults: it must never resolve MuiBox.
    const input = separateNativeRootProps(inProps),
      props = input.props;
    const {
      className,
      component = 'div',
      sx,
      style,
      children,
      theme: explicitTheme,
      as: explicitAs,
      ...native
    } = props;
    const raw = useSystemTheme<Theme & Record<string, unknown>>(),
      scoped = raw[THEME_ID];
    const selected = (scoped || raw) as Theme;
    const suppliedTheme = Object.hasOwn(props, 'theme');
    let theme = selected;
    if (explicitTheme != null && typeof explicitTheme === 'object') theme = explicitTheme;
    else if (suppliedTheme && (scoped || explicitTheme != null))
      warnOnce(
        'box-theme',
        'Box theme overrides require a complete native Theme. Omit theme or pass createTheme(); raw scoped null/undefined themes retain the selected native scope.',
      );
    const chosen = Object.hasOwn(props, 'as') ? explicitAs || 'div' : component || 'div';
    if (typeof chosen === 'string' && chosen !== 'div')
      warnOnce(
        'box-component',
        'Use a custom native component for Box roots other than the div alias.',
      );
    const Root = typeof chosen === 'string' ? View : chosen;
    const terminal = Root === View || Root === Text;
    const rootClass = joinClassNames(className, generateClassName(defaultClassName)),
      classes = rootClass.split(/\s+/).filter(Boolean);
    const parent = useNativeTextContext(),
      rules = useContext(NativeButtonGroupRules),
      { width } = useWindowDimensions();
    const restoredStyle = restoreNativeRootStyle(input, props);
    const authoredStyle = forwardedStyle
      ? retainNativeRootCss(restoredStyle, forwardedStyle.programme, Object.hasOwn(props, 'style'))
      : restoredStyle;
    const { computed, authored, prepared, programme } = componentRootStyle(
      theme,
      '',
      props as Record<string, unknown>,
      sx,
      authoredStyle,
      {
        sourceClass: true,
        styleCache,
        ...nativeTextStyleContext(parent, style, theme),
        width,
        classes,
        ...structuralFacts,
        ancestors: nativeStyleAncestors(rules, { classes }),
        protectPhysicalGeometry: true,
      },
      handoff !== null || !terminal || structuralRoot,
    );
    const paint = (next: NativeStyle) => {
      const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, next, authored);
      return (
        applyNativeTextMetrics(merged, next, nativeStyleTextMetrics([next, authored])) ?? merged
      );
    };
    const finalStyle = retainNativeStyleTransform(paint(computed), computed, paint);
    if (handoff) {
      if (chosen !== View && chosen !== 'div') throw Error('Cooperating Box requires View/div');
      const context = {
        styleCache,
        ...nativeTextStyleContext(parent, style, theme),
        width,
        classes,
        ...structuralFacts,
        protectPhysicalGeometry: true,
      };
      const preparation = handoff.prepare({
        theme,
        programme,
        context,
        parentDirection: parent?.direction ?? theme.direction,
      });
      return clearNativeRootStyleForward(
        forwardedStyle,
        <NativeCssRootBoundary style={preparation.presentation} registerClass={false}>
          {() => {
            const current = refreshNativeRootPreparation(preparation);
            return (
              <NativeTextScope
                rootRef={root}
                theme={theme}
                style={current.presentation}
                content={children}
              >
                {(resolvedStyle, content) =>
                  renderAccordionRootMotion(rootMotion, root, resolvedStyle, (presentation) => (
                    <NativeRootHandoffContext.Provider value={null}>
                      {handoff.render({
                        preparation: current,
                        hostProps: native,
                        nativeRef,
                        children: content,
                        presentation,
                        theme,
                        classes,
                      })}
                    </NativeRootHandoffContext.Provider>
                  ))
                }
              </NativeTextScope>
            );
          }}
        </NativeCssRootBoundary>,
        handoff?.retained,
      );
    }
    const structuralPreparation =
      structuralRoot && Root === View
        ? createAccordionStructuralPreparation({
            theme,
            programme,
            direction: parent?.direction ?? theme.direction,
            context: {
              styleCache,
              width,
              classes,
              ...structuralFacts,
              ...nativeTextStyleContext(parent, style, theme),
              protectPhysicalGeometry: true,
            },
          })
        : undefined;
    return clearNativeRootStyleForward(
      forwardedStyle,
      <NativeCssRootBoundary style={computed} registerClass={!terminal}>
        {() => {
          const structuralCases = structuralPreparation
            ? refreshNativeRootPreparation(structuralPreparation)
            : undefined;
          return (
            <NativeStyleScope root={root} theme={theme} classes={classes} prepared={prepared}>
              <NativeTextScope
                rootRef={root}
                theme={theme}
                style={refreshNativeStyle(finalStyle)}
                content={children}
              >
                {(resolvedStyle, content) =>
                  renderAccordionRootMotion(
                    rootMotion,
                    root,
                    resolvedStyle,
                    (style, presentation) =>
                      structuralCases ? (
                        <AccordionStructuralView
                          {...native}
                          cases={structuralCases}
                          nativeRef={nativeRef}
                          presentation={presentation}
                          style={style}
                        >
                          {content}
                        </AccordionStructuralView>
                      ) : (
                        <Root
                          {...native}
                          {...(Root === View ? {} : { className: rootClass })}
                          ref={nativeRef}
                          style={
                            terminal
                              ? style
                              : retainNativeRootCss(
                                  authored,
                                  programme,
                                  Object.hasOwn(props, 'style'),
                                  style,
                                )
                          }
                        >
                          {content}
                        </Root>
                      ),
                  )
                }
              </NativeTextScope>
            </NativeStyleScope>
          );
        }}
      </NativeCssRootBoundary>,
    );
  },
) as NativeBoxComponent;

const boxRoot = Box;
registerNativeRoot(boxRoot);
