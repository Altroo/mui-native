/* Root/filtering/class composition adapts MIT Material/System Box 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/box.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { forwardRef, useContext } from 'react';
import { View, useWindowDimensions, type ViewInstance } from 'react-native';
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
} from '@altroo/mui-native-system';
import {
  NativeRootHandoffContext,
  registerNativeRoot,
  useNativeRootHandoff,
} from '@altroo/mui-native-system/internal/prepared-style';
import { THEME_ID } from './themeProvider';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import { NativeButtonGroupRules } from './buttonGroupContext';
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
    const handoff = useNativeRootHandoff(boxRoot);
    const { root, ref } = useNativeTextRootRef(forwarded),
      nativeRef = useNativeStyleRef(root, ref);
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
    const rootClass = joinClassNames(className, generateClassName(defaultClassName)),
      classes = rootClass.split(/\s+/).filter(Boolean);
    const parent = useNativeTextContext(),
      rules = useContext(NativeButtonGroupRules),
      { width } = useWindowDimensions();
    const authoredStyle = restoreNativeRootStyle(input, props);
    const { computed, authored, prepared, programme } = componentRootStyle(
      theme,
      '',
      props as Record<string, unknown>,
      sx,
      authoredStyle,
      {
        ...nativeTextStyleContext(parent, style, theme),
        width,
        classes,
        ancestors: nativeStyleAncestors(rules, { classes }),
        protectPhysicalGeometry: true,
      },
      handoff !== null,
    );
    const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, computed, authored);
    const finalStyle =
      applyNativeTextMetrics(merged, computed, nativeStyleTextMetrics([computed, authored])) ??
      merged;
    if (handoff) {
      if (chosen !== View && chosen !== 'div') throw Error('Cooperating Box requires View/div');
      const context = {
        ...nativeTextStyleContext(parent, style, theme),
        width,
        classes,
        protectPhysicalGeometry: true,
      };
      const preparation = handoff.prepare({
        theme,
        programme,
        context,
        parentDirection: parent?.direction ?? theme.direction,
      });
      return (
        <NativeTextScope
          rootRef={root}
          theme={theme}
          style={preparation.presentation}
          content={children}
        >
          {(presentation, content) => (
            <NativeRootHandoffContext.Provider value={null}>
              {handoff.render({
                preparation,
                hostProps: native,
                nativeRef,
                children: content,
                presentation,
                theme,
                classes,
              })}
            </NativeRootHandoffContext.Provider>
          )}
        </NativeTextScope>
      );
    }
    return (
      <NativeStyleScope root={root} theme={theme} classes={classes} prepared={prepared}>
        <NativeTextScope rootRef={root} theme={theme} style={finalStyle} content={children}>
          {(style, content) => (
            <Root
              {...native}
              {...(Root === View ? {} : { className: rootClass })}
              ref={nativeRef}
              style={style}
            >
              {content}
            </Root>
          )}
        </NativeTextScope>
      </NativeStyleScope>
    );
  },
) as NativeBoxComponent;

const boxRoot = Box;
registerNativeRoot(boxRoot);
