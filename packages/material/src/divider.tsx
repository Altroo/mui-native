/* Divider state/layout adapts MIT Material UI 9.5.0. Copyright (c) MUI contributors.
 * See NOTICE and upstream/divider.json.
 * Native adaptation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef, useContext } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import {
  useNativeRootProps,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleBorderStyle,
  joinClassNames,
  diagnostic,
  resolveSx,
  type NativeStyle,
  type Theme,
} from '@altroo/mui-native-system';
import { useTheme, useComponentRootStyle } from './themeProvider';
import { nativeRootStylePainter } from './nativeControlStyles';
import { NativeStyleScope, nativeStyleAncestors, useNativeStyleRef } from './nativeStyleScope';
import {
  NativeCssPeerView,
  NativeCssRootBoundary,
  refreshNativeStyle,
  retainNativeStyleTransform,
  useNativeStyleCache,
} from '@altroo/mui-native-system/internal/prepared-style';
import { NativeButtonGroupRules } from './buttonGroupContext';
import { getDividerUtilityClass, type DividerClasses } from './dividerClasses';
import type { NativeDividerComponent, NativeDividerRootProps } from './dividerTypes';
export * from './dividerTypes';
export * from './dividerClasses';
function classNames(
  slots: readonly string[],
  classes?: Partial<DividerClasses>,
  className?: string,
) {
  return joinClassNames(
    slots
      .filter(Boolean)
      .map((slot) => {
        const generated = getDividerUtilityClass(slot);
        // Match composeClasses' two reads of an active custom class accessor.
        return classes?.[slot as keyof DividerClasses]
          ? `${generated} ${classes[slot as keyof DividerClasses]}`
          : generated;
      })
      .join(' '),
    className,
  );
}
function literalText(content: React.ReactNode): string | undefined {
  let text = '';
  for (const child of React.Children.toArray(content)) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint')
      text += String(child);
    else if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      const nested = literalText(child.props.children);
      if (nested === undefined) return undefined;
      text += nested;
    } else return undefined;
  }
  return text;
}
// Keep cache-only line refreshes independent of owner props and source callbacks.
function dividerLinePainter(theme: Theme, vertical: boolean) {
  const color = theme.palette.divider;
  return (style: NativeStyle) =>
    resolveSx(
      {
        alignSelf: 'center',
        flexBasis: 0,
        flexShrink: 1,
        borderColor: color,
        borderStyle: nativeStyleBorderStyle(style) ?? 'solid',
        ...(vertical ? { borderLeftWidth: 1 } : { borderTopWidth: 1 }),
      },
      theme,
      {
        parentDirection: style.direction === 'rtl' ? 'rtl' : 'ltr',
        protectPhysicalGeometry: true,
        mode: 'css',
      },
    );
}
function DividerLabel({
  ownerState,
  className,
  children,
  lineStyle,
}: {
  ownerState: Record<string, unknown>;
  className: string;
  children: React.ReactNode;
  lineStyle: () => NativeStyle;
}) {
  const styleCache = useNativeStyleCache();
  const theme = useTheme(),
    parent = useNativeTextContext(),
    rules = useContext(NativeButtonGroupRules);
  const vertical = ownerState.orientation === 'vertical';
  const { root, ref } = useNativeTextRootRef<ViewInstance>();
  const nativeRef = useNativeStyleRef(root, ref);
  const classes = className.split(/\s+/).filter(Boolean);
  const {
    computed: resolved,
    authored,
    prepared,
  } = useComponentRootStyle('MuiDivider', ownerState, undefined, undefined, {
    styleCache,
    sourceClass: true,
    rejectPseudoElements: true,
    ...nativeTextStyleContext(parent, undefined, theme),
    classes,
    slot: 'wrapper',
    rootSlot: 'wrapper',
    skipVariants: true,
    rootProps: { className, children },
    ancestors: nativeStyleAncestors(rules, { classes }),
    overrideKeys: vertical ? ['wrapperVertical'] : [],
    baseStyle: {
      flexShrink: 0,
      paddingLeft: `calc(1.2 * ${theme.spacing(1)})`,
      paddingRight: `calc(1.2 * ${theme.spacing(1)})`,
      ...(vertical
        ? {
            paddingTop: `calc(1.2 * ${theme.spacing(1)})`,
            paddingBottom: `calc(1.2 * ${theme.spacing(1)})`,
          }
        : {}),
    },
    protectPhysicalGeometry: true,
  });
  const paint = nativeRootStylePainter(parent?.direction ?? theme.direction, authored);
  const style = retainNativeStyleTransform(paint(resolved), resolved, paint);
  // Literal labels implement the source nowrap default. Authored elements keep
  // their native text policy and identity rather than being flattened into text.
  const literal = literalText(children);
  const content =
    literal === undefined ? children : literal ? <Text numberOfLines={1}>{literal}</Text> : null;
  const before =
    !vertical && ownerState.textAlign === 'left'
      ? 1
      : !vertical && ownerState.textAlign === 'right'
        ? 9
        : 1;
  const after =
    !vertical && ownerState.textAlign === 'left'
      ? 9
      : !vertical && ownerState.textAlign === 'right'
        ? 1
        : 1;
  return (
    <NativeCssRootBoundary style={resolved} registerClass={false}>
      {() => (
        <>
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[refreshNativeStyle(lineStyle()), { flexGrow: before }]}
          />
          <NativeStyleScope root={root} theme={theme} classes={classes} prepared={prepared}>
            <NativeTextScope
              rootRef={root}
              theme={theme}
              style={refreshNativeStyle(style)}
              content={content}
            >
              {(native, content) => (
                <NativeCssPeerView
                  ref={nativeRef}
                  style={native}
                  prepared={prepared}
                  classNames={classes}
                >
                  {content}
                </NativeCssPeerView>
              )}
            </NativeTextScope>
          </NativeStyleScope>
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={[refreshNativeStyle(lineStyle()), { flexGrow: after }]}
          />
        </>
      )}
    </NativeCssRootBoundary>
  );
}
const consumed = [
  'absolute',
  'children',
  'className',
  'orientation',
  'component',
  'flexItem',
  'role',
  'textAlign',
  'variant',
] as const;
export const Divider: NativeDividerComponent = forwardRef<ViewInstance, NativeDividerRootProps>(
  function Divider(inProps, forwarded) {
    const { root, ref } = useNativeTextRootRef(forwarded);
    const nativeRef = useNativeStyleRef(root, ref);
    const { props, style: preparedStyle } = useNativeRootProps({
      props: inProps,
      name: 'MuiDivider',
    });
    const {
      absolute = false,
      children,
      className,
      orientation = 'horizontal',
      component = children || orientation === 'vertical' ? 'div' : 'hr',
      flexItem = false,
      role = component !== 'hr' ? 'separator' : undefined,
      textAlign = 'center',
      variant = 'fullWidth',
      classes,
      sx,
      style,
      ...native
    } = props;
    const theme = useTheme(),
      parent = useNativeTextContext(),
      rules = useContext(NativeButtonGroupRules);
    if (typeof component === 'string' && component !== 'hr' && component !== 'div')
      diagnostic(
        'divider-component',
        'Use a custom native component for Divider roots other than hr/div aliases.',
      );
    const Root = typeof component === 'string' ? View : component;
    const Host = (Root === View ? NativeCssPeerView : Root) as React.ComponentType<any>;
    const styleCache = useNativeStyleCache();
    const ownerState = {
      ...props,
      absolute,
      component,
      flexItem,
      orientation,
      role,
      textAlign,
      variant,
    };
    const vertical = orientation === 'vertical';
    const slots = [
      'root',
      ...(absolute ? ['absolute'] : []),
      variant,
      ...(vertical ? ['vertical'] : []),
      ...(flexItem ? ['flexItem'] : []),
      ...(children ? ['withChildren'] : []),
      ...(!vertical && (textAlign === 'left' || textAlign === 'right')
        ? [textAlign === 'left' ? 'textAlignLeft' : 'textAlignRight']
        : []),
    ];
    const rootClass = classNames(slots, classes, className),
      tokens = rootClass.split(/\s+/).filter(Boolean);
    const wrapperClass = classNames(['wrapper', ...(vertical ? ['wrapperVertical'] : [])], classes);
    let lineStyle: NativeStyle = {};
    const label = children ? (
      <DividerLabel ownerState={ownerState} className={wrapperClass} lineStyle={() => lineStyle}>
        {children}
      </DividerLabel>
    ) : null;
    const rootProps: Record<string, unknown> = {
      ...props,
      as: component,
      className: rootClass,
      role,
      children: label,
      'aria-orientation':
        role === 'separator' && (component !== 'hr' || vertical) ? orientation : undefined,
    };
    for (const key of consumed)
      if (key !== 'className' && key !== 'role' && key !== 'children') delete rootProps[key];
    const {
      computed: resolved,
      authored,
      prepared,
    } = useComponentRootStyle('MuiDivider', ownerState, sx, preparedStyle, {
      rejectPseudoElements: true,
      styleCache,
      sourceClass: Root === View,
      ...nativeTextStyleContext(parent, style, theme),
      classes: tokens,
      rootProps,
      ancestors: nativeStyleAncestors(rules, { classes: tokens }),
      overrideKeys: slots.slice(1),
      protectPhysicalGeometry: true,
      baseStyle: [
        {
          margin: 0,
          flexShrink: 0,
          borderWidth: 0,
          borderStyle: 'solid',
          borderColor: theme.palette.divider,
          borderBottomWidth: 1,
        },
        absolute && { position: 'absolute', bottom: 0, left: 0, width: '100%' },
        variant === 'inset' && { marginLeft: 72 },
        variant === 'middle' &&
          (vertical
            ? { marginTop: theme.spacing(1), marginBottom: theme.spacing(1) }
            : { marginLeft: theme.spacing(2), marginRight: theme.spacing(2) }),
        vertical && { height: '100%', borderBottomWidth: 0, borderRightWidth: 1 },
        flexItem && { alignSelf: 'stretch', height: 'auto' },
        children
          ? {
              flexDirection: vertical ? 'column' : 'row',
              borderWidth: 0,
              textAlign: 'center',
            }
          : false,
      ],
    });
    const paint = nativeRootStylePainter(parent?.direction ?? theme.direction, authored);
    const finalStyle = retainNativeStyleTransform(paint(resolved), resolved, paint);
    // The valid native solid/zero payload may encode CSS none. Owned lines
    // inherit its semantic style before resolving their own native paint.
    const paintLine = dividerLinePainter(theme, vertical);
    lineStyle = retainNativeStyleTransform(paintLine(finalStyle), finalStyle, paintLine);
    // RN gives role precedence over accessibilityRole. Preserve source owner
    // defaults, while letting an authored native role replace the fallback.
    return (
      <NativeCssRootBoundary style={resolved} registerClass={false}>
        {() => (
          <NativeStyleScope root={root} theme={theme} classes={tokens} prepared={prepared}>
            <NativeTextScope rootRef={root} theme={theme} style={refreshNativeStyle(finalStyle)}>
              {(nativeStyle) => (
                <Host
                  {...native}
                  {...(Root === View ? { prepared, classNames: tokens } : { className: rootClass })}
                  role={
                    props.role ??
                    (native.accessibilityRole == null ? (role ?? 'separator') : undefined)
                  }
                  ref={nativeRef}
                  style={nativeStyle}
                >
                  {label}
                </Host>
              )}
            </NativeTextScope>
          </NativeStyleScope>
        )}
      </NativeCssRootBoundary>
    );
  },
) as NativeDividerComponent;
