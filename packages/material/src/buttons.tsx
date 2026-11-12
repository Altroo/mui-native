/* Button wrappers and group defaults adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE,
 * upstream/reuse.json and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import {
  refreshNativeStyle,
  prepareNativeCompositeSource,
  nativeInlineStyle,
  NativeCssInsertionScope,
  useNativeDefaultPropsSource,
  useNativeSourceDefaultProps,
  useNativeStyleCache,
  useNativeStyleCacheRevision,
} from '@altroo/mui-native-system/internal/prepared-style';
import { buttonConstructorCss, buttonOverrideCss } from './nativeButtonCss';
import React, { forwardRef, useId, useContext, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  type ViewInstance,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  isNativeTextStyleProperty,
  componentStyle,
  componentRootStyle,
  separateNativeRootProps,
  restoreNativeRootStyle,
  alpha,
  diagnostic,
  type NativeStyle,
  type Theme,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import {
  ButtonBase,
  mergeNativeButtonStyle,
  type ButtonBaseState,
  type NativeButtonBaseStyleSheet,
} from './buttonBase';
import { Typography } from './typography';
import {
  ButtonGroupContext,
  ButtonGroupButtonContext,
  NativeButtonGroupRules,
  resolveButtonGroupDefaults,
} from './buttonGroupContext';
import { getButtonUtilityClass, type ButtonClassKey } from './buttonClasses';
import type {
  ButtonOwnProps,
  IconButtonOwnProps,
  NativeButtonComponent,
  NativeIconButtonComponent,
} from './buttonTypes';
export * from './buttonTypes';
export * from './buttonClasses';
// Only root identities participate in the finite group cascade. Icon/loading
// slot classes still require native slot styles and retain migration diagnostics.
const buttonRootClassKeys = new Set([
  'root',
  'disabled',
  'focusVisible',
  'text',
  'outlined',
  'contained',
  'disableElevation',
  'fullWidth',
  'loading',
  'loadingPositionCenter',
  'loadingPositionStart',
  'loadingPositionEnd',
  'sizeSmall',
  'sizeMedium',
  'sizeLarge',
  'colorInherit',
  'colorPrimary',
  'colorSecondary',
  'colorSuccess',
  'colorError',
  'colorInfo',
  'colorWarning',
]);
const cap = (value: string) => value[0].toUpperCase() + value.slice(1);
function typographyTextRoot(
  child: React.ReactElement<{ component?: unknown }>,
  defaultComponent: unknown,
) {
  const component = child.props.component === undefined ? defaultComponent : child.props.component;
  return child.type === Typography && (component == null || typeof component === 'string');
}
function literalOnly(children: React.ReactNode): boolean {
  return React.Children.toArray(children).every(
    (child) =>
      !React.isValidElement<{ children?: React.ReactNode }>(child) ||
      (child.type === React.Fragment && literalOnly(child.props.children)),
  );
}
function textOnly(children: React.ReactNode, defaultComponent: unknown): boolean {
  return React.Children.toArray(children).every(
    (child) =>
      !React.isValidElement<{ children?: React.ReactNode; component?: unknown }>(child) ||
      child.type === Text ||
      typographyTextRoot(child, defaultComponent) ||
      (child.type === React.Fragment && textOnly(child.props.children, defaultComponent)),
  );
}
function Content({
  defaultTypographyComponent,
  theme,
  style,
  children,
  hidden = false,
}: {
  theme: Theme;
  defaultTypographyComponent?: unknown;
  style: StyleProp<NativeStyle>;
  children: React.ReactNode;
  hidden?: boolean;
}) {
  const { root, ref } = useNativeTextRootRef<ViewInstance>();
  // Authored Text roots must keep their native scaling policy. Keep their
  // boundary stable when a public scaling prop changes or is cleared.
  const text = literalOnly(children);
  const inline = !text && textOnly(children, defaultTypographyComponent);
  return (
    <NativeTextScope
      rootRef={root}
      theme={theme}
      kind={text ? 'text' : 'view'}
      style={style}
      content={children}
    >
      {(native, content) =>
        text ? (
          <Text ref={ref} style={[native, hidden ? { opacity: 0 } : undefined]}>
            {content}
          </Text>
        ) : (
          <View
            ref={ref}
            style={[
              native,
              { flexShrink: 1, minWidth: 0 },
              inline
                ? { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }
                : undefined,
              hidden ? { opacity: 0 } : undefined,
            ]}
          >
            {content}
          </View>
        )
      }
    </NativeTextScope>
  );
}
function palette(theme: Theme, color: string, inherited: unknown) {
  const inherit = typeof inherited === 'string' ? inherited : theme.palette.text.primary;
  if (color === 'inherit') return { main: inherit, dark: inherit, contrastText: inherit };
  const entry = (
    theme.palette as unknown as Record<
      string,
      { main?: string; dark?: string; contrastText?: string }
    >
  )[color];
  if (entry && typeof entry.main === 'string')
    return {
      main: entry.main,
      dark: entry.dark ?? entry.main,
      contrastText: entry.contrastText ?? theme.palette.getContrastText(entry.main),
    };
  diagnostic('button-color', `Native button color ${color} needs a palette entry with main.`);
  return theme.palette.primary;
}
function classDiagnostic(classes: unknown, className: unknown, generated?: string) {
  if (classes || (className && className !== generated))
    diagnostic(
      'button-classes',
      'Native button class helpers identify slots; use sx, native styles and theme overrides for styling.',
    );
}
// A slot owns its CSS even when native presentation changes above it. Retain
// only source inputs; color/layout supplied by the current native frame stays
// in the ordinary NativeTextScope presentation layer.
function NativeButtonSlotScope({
  name,
  slots,
  owner,
  width,
  style,
  ...props
}: React.ComponentProps<typeof NativeTextScope> & {
  name: string;
  slots: readonly string[];
  owner: object;
  width: number;
}) {
  const keys = slots.join('|');
  const styleCache = useNativeStyleCache();
  const parent = useNativeTextContext();
  useNativeStyleCacheRevision();
  const sources = useMemo(
    () =>
      slots.map((key) =>
        componentRootStyle(props.theme, name, { ...owner }, undefined, undefined, {
          styleCache,
          slot: key,
          rootSlot: key,
          width,
          skipVariants: true,
        }),
      ),
    [props.theme, name, keys, owner, width, styleCache],
  );
  const css = sources.map((source) =>
    componentStyle(props.theme, name, { ...owner }, undefined, {
      preparedRoot: source.prepared,
      styleCache,
      width,
      ...nativeTextStyleContext(parent, style, props.theme),
    }),
  );
  return (
    <NativeCssInsertionScope style={sources.map((source) => source.computed)} registerClass={false}>
      <NativeTextScope {...props} style={[style, ...css]} />
    </NativeCssInsertionScope>
  );
}

function readableButtonName(
  children: React.ReactNode,
  defaultComponent: unknown,
): string | undefined {
  let result = '';
  for (const child of React.Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      result += String(child);
      continue;
    }
    if (
      !React.isValidElement<{
        children?: React.ReactNode;
        component?: unknown;
        accessibilityLabel?: string;
        'aria-label'?: string;
      }>(child)
    )
      continue;
    if (
      child.type !== React.Fragment &&
      child.type !== Text &&
      !typographyTextRoot(child, defaultComponent)
    )
      return undefined;
    const text =
      child.props['aria-label'] ??
      child.props.accessibilityLabel ??
      readableButtonName(child.props.children, defaultComponent);
    if (text === undefined) return undefined;
    result += text;
  }
  return result.trim() ? result : undefined;
}
function DefaultProgress({ color, label, id }: { color: string; label?: string; id: string }) {
  const scope = useNativeTextContext();
  const effective = typeof scope?.style.color === 'string' ? scope.style.color : color;
  return (
    <ActivityIndicator
      nativeID={`${id}-progress`}
      size="small"
      color={effective}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    />
  );
}
export const Button = forwardRef<ViewInstance, ButtonOwnProps>(function Button(inProps, ref) {
  const rootInput = useMemo(() => separateNativeRootProps(inProps), [inProps]);
  const group = useContext(ButtonGroupContext),
    groupPosition = useContext(ButtonGroupButtonContext),
    groupRules = useContext(NativeButtonGroupRules);
  const groupProps = useMemo(
    () => resolveButtonGroupDefaults(group, rootInput.props),
    [group, rootInput.props],
  );
  const props = useNativeSourceDefaultProps({
    props: groupProps,
    name: 'MuiButton',
  });
  const typographyDefaults = useDefaultProps({
    props: {} as { component?: unknown },
    name: 'MuiTypography',
  });
  const {
    children,
    sx,
    style: _style,
    color = 'primary',
    variant = 'text',
    size = 'medium',
    fullWidth = false,
    startIcon,
    endIcon,
    loading = null,
    loadingIndicator,
    loadingPosition = 'center',
    disabled = false,
    disableElevation = false,
    disableFocusRipple = false,
    classes,
    className,
    _muiNativeClassName,
    focusVisibleClassName,
    id,
    'aria-label': ariaLabel,
    onHoverIn,
    onHoverOut,
    ...other
  } = props;
  const style = restoreNativeRootStyle(rootInput, props);
  if (!groupRules.length || Object.keys(classes ?? {}).some((key) => !buttonRootClassKeys.has(key)))
    classDiagnostic(
      classes,
      className ?? focusVisibleClassName,
      focusVisibleClassName ? undefined : (_muiNativeClassName ?? group.className),
    );
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions(),
    generated = useId();
  const startIconTextRoot = useRef<ViewInstance | null>(null),
    endIconTextRoot = useRef<ViewInstance | null>(null),
    startLoadingTextRoot = useRef<ViewInstance | null>(null),
    endLoadingTextRoot = useRef<ViewInstance | null>(null),
    centerLoadingTextRoot = useRef<ViewInstance | null>(null);
  const colors = palette(theme, color, parent?.style.color),
    inactive = disabled || loading === true,
    hide = loading === true && loadingPosition === 'center';
  const label =
    ariaLabel ??
    other.accessibilityLabel ??
    readableButtonName(children, typographyDefaults.component);
  const nativeID = id ?? other.nativeID ?? (loading ? `mui-button-${generated}` : undefined);
  const indicator = loadingIndicator ?? (
    <DefaultProgress
      color={theme.palette.action.disabled}
      label={label}
      id={nativeID ?? generated}
    />
  );
  const owner = {
    ...props,
    color,
    variant,
    size,
    fullWidth,
    loading,
    loadingPosition,
    disabled,
    disableElevation,
    disableFocusRipple,
    loadingIndicator: indicator,
  };
  const styleCache = useNativeStyleCache();
  const defaultsSource = useNativeDefaultPropsSource();
  let baseSheet: NativeButtonBaseStyleSheet | undefined;
  let cache:
    | {
        pressed: boolean;
        focusVisible: boolean;
        hovered: boolean;
        sheet?: NativeButtonBaseStyleSheet;
        computed: NativeStyle;
        authored: StyleProp<NativeStyle>;
        style: NativeStyle;
      }
    | undefined;
  const primary = variant === 'contained' ? colors.contrastText : colors.main;
  const foreground = inactive ? theme.palette.action.disabled : primary;
  const inheritBg =
    theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.grey[800];
  const background =
    variant === 'contained'
      ? inactive
        ? theme.palette.action.disabledBackground
        : color === 'inherit'
          ? inheritBg
          : colors.main
      : 'transparent';
  const vertical = size === 'small' ? 4 : size === 'large' ? 8 : 6;
  const horizontal =
    variant === 'text'
      ? size === 'small'
        ? 5
        : size === 'large'
          ? 11
          : 8
      : size === 'small'
        ? 10
        : size === 'large'
          ? 22
          : 16;
  const outlined = variant === 'outlined';
  const nativeBase = [
    theme.typography.button,
    {
      minHeight: 44,
      minWidth: 64,
      paddingLeft: horizontal - (outlined ? 1 : 0),
      paddingRight: horizontal - (outlined ? 1 : 0),
      paddingTop: vertical - (outlined ? 1 : 0),
      paddingBottom: vertical - (outlined ? 1 : 0),
      ...(size === 'small' || size === 'large'
        ? { fontSize: theme.typography.pxToRem(size === 'small' ? 13 : 15) }
        : {}),
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',

      ...(fullWidth ? { width: '100%' } : {}),
      borderRadius: theme.shape.borderRadius,
      backgroundColor: background,
      borderWidth: outlined ? 1 : 0,
      borderColor: inactive
        ? theme.palette.action.disabledBackground
        : outlined
          ? alpha(colors.main, 0.5)
          : colors.main,
      color: foreground,
      ...(variant === 'contained'
        ? {
            boxShadow: 2,
            '&.Mui-hover': { boxShadow: 4 },
            '&.Mui-active': { boxShadow: 8 },
            '&.Mui-focusVisible': {
              ...(theme.focusVisible || {}),
              boxShadow:
                theme.focusVisible && theme.focusVisible.boxShadow
                  ? `${theme.shadows[6]}, ${theme.focusVisible.boxShadow}`
                  : 6,
            },
          }
        : {}),
      '&.Mui-hover': {
        backgroundColor:
          variant === 'contained'
            ? color === 'inherit'
              ? theme.palette.grey[400]
              : colors.dark
            : alpha(
                color === 'inherit' ? theme.palette.text.primary : colors.main,
                theme.palette.action.hoverOpacity,
              ),
        ...(outlined ? { borderColor: colors.main } : {}),
        ...(variant === 'contained' ? { boxShadow: 4 } : {}),
      },
      '&.Mui-disabled': {
        color: theme.palette.action.disabled,
        ...(variant === 'contained'
          ? { backgroundColor: theme.palette.action.disabledBackground, boxShadow: 0 }
          : {}),
        ...(outlined
          ? { borderWidth: 1, borderColor: theme.palette.action.disabledBackground }
          : {}),
      },
      ...(hide ? { '&.MuiButton-loading': { color: 'transparent' } } : {}),
    },
    ...(disableElevation
      ? [
          {
            boxShadow: 'none',
            '&.Mui-hover': { boxShadow: 'none' },
            '&.Mui-focusVisible': {
              boxShadow: (theme.focusVisible ? theme.focusVisible.boxShadow : undefined) ?? 'none',
            },
            '&.Mui-active': { boxShadow: 'none' },
            '&.Mui-disabled': { boxShadow: 'none' },
          },
        ]
      : []),
  ];
  const staticStyle =
    typeof style === 'function'
      ? restoreNativeRootStyle(
          { props: { style: undefined }, prepared: rootInput.prepared },
          { style: undefined },
        )
      : style;
  const source = useMemo(
    () => ({
      ...componentRootStyle(theme, 'MuiButton', owner, sx, staticStyle, {
        sourceClass: true,
        baseProgramme: buttonConstructorCss(theme, owner),
        styleCache,
        overrideProgramme: buttonOverrideCss,
        ...nativeTextStyleContext(parent, staticStyle, theme),
        width,
        rootProps: { ...props, ...owner, disabled: inactive },
        overrideKeys: [
          variant,
          `size${cap(size)}`,
          ...(color === 'inherit' ? ['colorInherit'] : []),
          ...(disableElevation ? ['disableElevation'] : []),
          ...(fullWidth ? ['fullWidth'] : []),
          ...(loading ? ['loading'] : []),
        ],
        baseStyle: nativeBase,
      }),
      owner,
    }),
    [inProps, group, groupPosition, theme, parent, width, styleCache, defaultsSource],
  );
  const frameClasses = (state: ButtonBaseState, hovered: boolean) => {
    // Match the original Button and ButtonBase root utility slots. These finite
    // identities let an owning group target classes without a global CSS engine.
    const activeHover = hovered && !inactive;
    const rootSlots: (ButtonClassKey | false)[] = [
      'root',
      variant,
      `size${cap(size)}` as ButtonClassKey,
      `color${cap(color)}` as ButtonClassKey,
      disableElevation && 'disableElevation',
      fullWidth && 'fullWidth',
      loading === true && 'loading',
      loading === true && (`loadingPosition${cap(loadingPosition)}` as ButtonClassKey),
      inactive && 'disabled',
      state.focusVisible && 'focusVisible',
    ];
    return [
      ...(group.className ?? '').split(/\s+/),
      ...(className ?? '').split(/\s+/),
      ...(groupPosition ?? '').split(/\s+/),
      'MuiButtonBase-root',
      ...rootSlots.flatMap((key) =>
        key ? [getButtonUtilityClass(key), classes?.[key] ?? ''] : [],
      ),
      ...(state.focusVisible ? (focusVisibleClassName ?? '').split(/\s+/) : []),
      ...(activeHover ? ['Mui-hover'] : []),
      ...(state.pressed && !inactive ? ['Mui-active'] : []),
    ]
      .flatMap((token) => token.split(/\s+/))
      .filter(Boolean);
  };
  const compile = (
    state: ButtonBaseState,
    sheet: NativeButtonBaseStyleSheet | undefined,
    authored?: StyleProp<NativeStyle>,
    hovered = false,
  ) => {
    const groupTokens = frameClasses(state, hovered);
    return componentStyle(theme, 'MuiButton', owner, undefined, {
      preparedRoot: sheet?.sourcePrepared ?? source.prepared,
      nativeLayout: groupRules.length
        ? { flexShrink: 1 }
        : { alignSelf: fullWidth ? 'stretch' : 'flex-start' },
      styleCache,
      classes: groupTokens,
      ancestors: [
        ...(sheet && !sheet.sourcePrepared ? [sheet] : []),
        ...groupRules.map((rule) => rule.cascade(groupTokens)),
      ],
      ...nativeTextStyleContext(parent, authored, theme),
      width,
      states: [
        ...(inactive ? ['disabled'] : []),
        ...(loading ? ['loading'] : []),
        ...(state.focusVisible ? ['focusVisible'] : []),
        ...(hovered && !inactive ? ['hover'] : []),
        ...(state.pressed && !inactive ? ['active'] : []),
      ],
    });
  };
  const sourceFor = useMemo(
    () => (sheet: NativeButtonBaseStyleSheet) =>
      prepareNativeCompositeSource(sheet.prepared!, source.prepared, styleCache),
    [source],
  );
  let nativeHovered = false;
  const styled = (
    state: ButtonBaseState,
    sheet = baseSheet,
    hovered = nativeHovered,
  ): NativeStyle => {
    baseSheet = sheet;
    nativeHovered = hovered;
    if (
      cache &&
      cache.pressed === state.pressed &&
      cache.focusVisible === state.focusVisible &&
      cache.hovered === hovered &&
      cache.sheet === sheet
    ) {
      const computed = refreshNativeStyle(cache.computed);
      if (computed !== cache.computed) {
        cache.computed = computed;
        cache.style = mergeNativeButtonStyle(computed, cache.authored);
      }
      return cache.style;
    }
    const authored = nativeInlineStyle(typeof style === 'function' ? style(state) : style);
    const computed = compile(state, sheet, authored, hovered);
    const value = mergeNativeButtonStyle(computed, authored);
    cache = {
      pressed: state.pressed,
      focusVisible: state.focusVisible,
      hovered,
      sheet,
      computed,
      authored,
      style: value,
    };
    return value;
  };
  const icon = (node: React.ReactNode, position: 'start' | 'end', state: ButtonBaseState) => {
    const replace = loading === true && loadingPosition === position;
    const has = Boolean(node) && typeof node !== 'boolean';
    if (!has && !replace) return null;
    const iconSize = size === 'small' ? 18 : size === 'large' ? 22 : 20;
    const key = position === 'start' ? 'startIcon' : 'endIcon';
    return (
      <View
        style={{
          minWidth: iconSize,
          minHeight: iconSize,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <NativeButtonSlotScope
          name="MuiButton"
          slots={[key, ...(loading ? [`${key}Loading${cap(position)}`] : [])]}
          owner={source.owner}
          width={width}
          rootRef={position === 'start' ? startIconTextRoot : endIconTextRoot}
          theme={theme}
          style={[
            {
              fontSize: iconSize,
              color: styled(state).color,
              minWidth: iconSize,
              minHeight: iconSize,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: replace || hide ? 0 : 1,
            },
          ]}
          content={
            has ? (
              node
            ) : (
              <NativeButtonSlotScope
                name="MuiButton"
                slots={['loadingIconPlaceholder']}
                owner={source.owner}
                width={width}
                theme={theme}
                style={{ width: iconSize, height: iconSize }}
              >
                {(native) => <View style={native} />}
              </NativeButtonSlotScope>
            )
          }
        >
          {(native, content) => (
            <View ref={position === 'start' ? startIconTextRoot : endIconTextRoot} style={native}>
              {content}
            </View>
          )}
        </NativeButtonSlotScope>
        {replace ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NativeButtonSlotScope
              name="MuiButton"
              slots={['loadingIndicator']}
              owner={source.owner}
              width={width}
              rootRef={position === 'start' ? startLoadingTextRoot : endLoadingTextRoot}
              theme={theme}
              style={[{ color: styled(state).color }]}
              content={indicator}
            >
              {(native, content) => (
                <View
                  ref={position === 'start' ? startLoadingTextRoot : endLoadingTextRoot}
                  style={native}
                >
                  {content}
                </View>
              )}
            </NativeButtonSlotScope>
          </View>
        ) : null}
      </View>
    );
  };
  const loader = (_state: ButtonBaseState) =>
    typeof loading === 'boolean' ? (
      <NativeButtonSlotScope
        name="MuiButton"
        slots={['loadingWrapper']}
        owner={source.owner}
        width={width}
        theme={theme}
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        {(wrapperStyle) => (
          <View pointerEvents="none" style={wrapperStyle}>
            {loading && loadingPosition === 'center' ? (
              <NativeButtonSlotScope
                name="MuiButton"
                slots={['loadingIndicator']}
                owner={source.owner}
                width={width}
                rootRef={centerLoadingTextRoot}
                theme={theme}
                style={[{ color: theme.palette.action.disabled }]}
                content={indicator}
              >
                {(native, content) => (
                  <View ref={centerLoadingTextRoot} style={native}>
                    {content}
                  </View>
                )}
              </NativeButtonSlotScope>
            ) : null}
          </View>
        )}
      </NativeButtonSlotScope>
    ) : null;
  return (
    <NativeCssInsertionScope style={source.computed}>
      <ButtonBase
        {...other}
        ref={ref}
        nativeID={nativeID}
        accessibilityLabel={label}
        accessibilityState={{
          ...other.accessibilityState,
          disabled: inactive,
          busy: loading === true,
        }}
        disabled={inactive}
        // The original inherited Mui-disabled class blocks pointer targeting even
        // when a child explicitly retains disabled=false and keyboard eligibility.
        pointerEvents={
          [group.className, className, classes?.root].some((value) =>
            value?.split(/\s+/).includes('Mui-disabled'),
          )
            ? 'none'
            : other.pointerEvents
        }
        focusRipple={other.focusRipple ?? !disableFocusRipple}
        sx={undefined}
        style={styled}
        _muiNativeSourceStyle={sourceFor}
        _muiNativeStyle={(state, sheet, hovered) => {
          styled(state, sheet, hovered);
          return { computed: cache!.computed, authored: cache!.authored };
        }}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
      >
        {(state) => {
          const resolved = styled(state),
            text = Object.fromEntries(
              Object.entries(resolved).filter(([key]) => isNativeTextStyleProperty(key)),
            ) as TextStyle;
          return (
            <>
              {icon(startIcon, 'start', state)}
              {loadingPosition !== 'end' ? loader(state) : null}
              <Content
                defaultTypographyComponent={typographyDefaults.component}
                theme={theme}
                style={[
                  { flexShrink: 1 },
                  applyNativeTextMetrics(text, resolved, nativeStyleTextMetrics(resolved)),
                ]}
                hidden={hide}
              >
                {children}
              </Content>
              {loadingPosition === 'end' ? loader(state) : null}
              {icon(endIcon, 'end', state)}
            </>
          );
        }}
      </ButtonBase>
    </NativeCssInsertionScope>
  );
}) as NativeButtonComponent;

export const IconButton = forwardRef<ViewInstance, IconButtonOwnProps>(
  function IconButton(inProps, ref) {
    const rootInput = useMemo(() => separateNativeRootProps(inProps), [inProps]);
    const props = useNativeSourceDefaultProps({ props: rootInput.props, name: 'MuiIconButton' });
    const typographyDefaults = useDefaultProps({
      props: {} as { component?: unknown },
      name: 'MuiTypography',
    });
    const {
      children,
      sx,
      style: _style,
      color = 'default',
      size = 'medium',
      edge = false,
      disabled = false,
      disableFocusRipple = false,
      loading = null,
      loadingIndicator,
      classes,
      className,
      _muiNativeClassName,
      focusVisibleClassName,
      id,
      'aria-label': ariaLabel,
      onHoverIn,
      onHoverOut,
      ...other
    } = props;
    const style = restoreNativeRootStyle(rootInput, props);
    classDiagnostic(
      classes,
      className ?? focusVisibleClassName,
      focusVisibleClassName ? undefined : _muiNativeClassName,
    );
    const theme = useTheme(),
      parent = useNativeTextContext(),
      { width } = useWindowDimensions(),
      generated = useId();
    const styleCache = useNativeStyleCache();
    const defaultsSource = useNativeDefaultPropsSource();
    const loadingTextRoot = useRef<ViewInstance | null>(null);
    const colors =
        color === 'default'
          ? { main: theme.palette.action.active }
          : palette(theme, color, parent?.style.color),
      inactive = disabled || loading === true;
    const label =
        ariaLabel ??
        other.accessibilityLabel ??
        readableButtonName(children, typographyDefaults.component),
      nativeID = id ?? other.nativeID ?? (loading ? `mui-icon-button-${generated}` : undefined);
    const indicator = loadingIndicator ?? (
      <DefaultProgress
        color={theme.palette.action.disabled}
        label={label}
        id={nativeID ?? generated}
      />
    );
    const owner = {
      ...props,
      color,
      size,
      edge,
      disabled,
      disableFocusRipple,
      loading,
      loadingIndicator: indicator,
    };
    const padding = size === 'small' ? 5 : size === 'large' ? 12 : 8;
    const staticStyle =
      typeof style === 'function'
        ? restoreNativeRootStyle(
            { props: { style: undefined }, prepared: rootInput.prepared },
            { style: undefined },
          )
        : style;
    const source = useMemo(
      () => ({
        ...componentRootStyle(theme, 'MuiIconButton', owner, sx, staticStyle, {
          sourceClass: true,
          styleCache,
          ...nativeTextStyleContext(parent, staticStyle, theme),
          width,
          overrideKeys: [
            ...(loading ? ['loading'] : []),
            ...(color !== 'default' ? [`color${cap(color)}`] : []),
            ...(edge ? [`edge${cap(edge)}`] : []),
            `size${cap(size)}`,
          ],
          baseStyle: {
            minWidth: 44,
            minHeight: 44,
            paddingLeft: padding,
            paddingRight: padding,
            paddingTop: padding,
            paddingBottom: padding,
            flexShrink: 0,
            borderRadius: 9999,
            backgroundColor: 'transparent',
            ...(!other.disableRipple
              ? {
                  '&.Mui-hover': {
                    backgroundColor: alpha(colors.main, theme.palette.action.hoverOpacity),
                  },
                }
              : {}),
            color: inactive ? theme.palette.action.disabled : colors.main,
            fontSize: theme.typography.pxToRem(size === 'small' ? 18 : size === 'large' ? 28 : 24),
            lineHeight: 1,
            ...(edge
              ? { [edge === 'start' ? 'marginStart' : 'marginEnd']: size === 'small' ? -3 : -12 }
              : {}),
          },
        }),
        owner,
      }),
      [inProps, theme, parent, width, styleCache, defaultsSource],
    );
    const compile = (
      state: ButtonBaseState,
      sheet: NativeButtonBaseStyleSheet | undefined,
      hovered: boolean,
      authored?: StyleProp<NativeStyle>,
    ) =>
      componentStyle(theme, 'MuiIconButton', source.owner, undefined, {
        preparedRoot: sheet?.sourcePrepared ?? source.prepared,
        styleCache,
        ancestors: sheet && !sheet.sourcePrepared ? [sheet] : [],
        ...nativeTextStyleContext(parent, authored, theme),
        width,
        classes: [
          'MuiButtonBase-root',
          'MuiIconButton-root',
          `MuiIconButton-size${cap(size)}`,
          ...(color !== 'default' ? [`MuiIconButton-color${cap(color)}`] : []),
          ...(edge ? [`MuiIconButton-edge${cap(edge)}`] : []),
          ...(inactive ? ['Mui-disabled'] : []),
          ...(loading ? ['MuiIconButton-loading'] : []),
          ...(state.focusVisible ? ['Mui-focusVisible'] : []),
          ...(hovered && !inactive ? ['Mui-hover'] : []),
          ...(state.pressed && !inactive ? ['Mui-active'] : []),
          ...(className ?? '').split(/\s+/),
          ...(classes?.root ?? '').split(/\s+/),
        ].filter(Boolean),
        states: [
          ...(inactive ? ['disabled'] : []),
          ...(loading ? ['loading'] : []),
          ...(state.focusVisible ? ['focusVisible'] : []),
          ...(hovered && !inactive ? ['hover'] : []),
          ...(state.pressed && !inactive ? ['active'] : []),
        ],
      });
    const sourceFor = useMemo(
      () => (sheet: NativeButtonBaseStyleSheet) =>
        prepareNativeCompositeSource(sheet.prepared!, source.prepared, styleCache),
      [source],
    );
    let baseSheet: NativeButtonBaseStyleSheet | undefined;
    let nativeHovered = false;
    let cache:
      | {
          pressed: boolean;
          focusVisible: boolean;
          hovered: boolean;
          sheet?: NativeButtonBaseStyleSheet;
          computed: NativeStyle;
          authored: StyleProp<NativeStyle>;
          style: NativeStyle;
        }
      | undefined;
    const styled = (state: ButtonBaseState, sheet = baseSheet, hovered = nativeHovered) => {
      baseSheet = sheet;
      nativeHovered = hovered;
      if (
        cache &&
        cache.pressed === state.pressed &&
        cache.focusVisible === state.focusVisible &&
        cache.hovered === hovered &&
        cache.sheet === sheet
      ) {
        const computed = refreshNativeStyle(cache.computed);
        if (computed !== cache.computed) {
          cache.computed = computed;
          cache.style = mergeNativeButtonStyle(computed, cache.authored);
        }
        return cache.style;
      }
      const authored = nativeInlineStyle(typeof style === 'function' ? style(state) : style);
      const computed = compile(state, sheet, hovered, authored);
      const value = mergeNativeButtonStyle(computed, authored);
      cache = {
        pressed: state.pressed,
        focusVisible: state.focusVisible,
        hovered,
        sheet,
        computed,
        authored,
        style: value,
      };
      return value;
    };
    return (
      <NativeCssInsertionScope style={source.computed}>
        <ButtonBase
          {...other}
          ref={ref}
          nativeID={nativeID}
          accessibilityLabel={label}
          accessibilityState={{
            ...other.accessibilityState,
            disabled: inactive,
            busy: loading === true,
          }}
          disabled={inactive}
          focusRipple={other.focusRipple ?? !disableFocusRipple}
          sx={undefined}
          style={styled}
          _muiNativeSourceStyle={sourceFor}
          _muiNativeStyle={(state, sheet, hovered) => {
            styled(state, sheet, hovered);
            return { computed: cache!.computed, authored: cache!.authored };
          }}
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
        >
          {(state) => (
            <>
              {typeof loading === 'boolean' ? (
                <View
                  pointerEvents="none"
                  style={[
                    { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
                    { alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <NativeButtonSlotScope
                    name="MuiIconButton"
                    slots={['loadingIndicator']}
                    owner={source.owner}
                    width={width}
                    rootRef={loadingTextRoot}
                    theme={theme}
                    style={[
                      { display: loading ? 'flex' : 'none', color: theme.palette.action.disabled },
                    ]}
                    content={loading ? indicator : null}
                  >
                    {(native, content) => (
                      <View ref={loadingTextRoot} style={native}>
                        {content}
                      </View>
                    )}
                  </NativeButtonSlotScope>
                </View>
              ) : null}
              <Content
                defaultTypographyComponent={typographyDefaults.component}
                theme={theme}
                style={applyNativeTextMetrics(
                  Object.fromEntries(
                    Object.entries(styled(state)).filter(([key]) => isNativeTextStyleProperty(key)),
                  ),
                  styled(state),
                  nativeStyleTextMetrics(styled(state)),
                )}
                hidden={loading === true}
              >
                {children}
              </Content>
            </>
          )}
        </ButtonBase>
      </NativeCssInsertionScope>
    );
  },
) as NativeIconButtonComponent;
