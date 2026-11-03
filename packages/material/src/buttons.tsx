import React, { forwardRef, useId, useState } from 'react';
import {
  StyleSheet,
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
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  isNativeTextStyleProperty,
  componentStyle,
  alpha,
  diagnostic,
  type NativeStyle,
  type Theme,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { ButtonBase, type ButtonBaseState } from './buttonBase';
import { Typography } from './typography';
import { listSlotStyle } from './listStyles';
import type {
  ButtonOwnProps,
  IconButtonOwnProps,
  NativeButtonComponent,
  NativeIconButtonComponent,
} from './buttonTypes';
export * from './buttonTypes';
export * from './buttonClasses';
const cap = (value: string) => value[0].toUpperCase() + value.slice(1);
function expandPadding(style: NativeStyle | null | undefined) {
  if (!style) return style;
  const output = { ...style };
  for (const edge of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const value =
      style[`padding${edge}`] ??
      style[edge === 'Top' || edge === 'Bottom' ? 'paddingVertical' : 'paddingHorizontal'] ??
      style.padding;
    if (value != null) output[`padding${edge}`] = value;
  }
  return output;
}
function typographyTextRoot(
  child: React.ReactElement<{ component?: unknown }>,
  defaultComponent: unknown,
) {
  const component = child.props.component === undefined ? defaultComponent : child.props.component;
  return child.type === Typography && (component == null || typeof component === 'string');
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
  const text = textOnly(children, defaultTypographyComponent);
  return (
    <NativeTextScope theme={theme} kind={text ? 'text' : 'view'} style={style} content={children}>
      {(native, content) =>
        text ? (
          <Text style={[native, hidden ? { opacity: 0 } : undefined]}>{content}</Text>
        ) : (
          <View
            style={[native, { flexShrink: 1, minWidth: 0 }, hidden ? { opacity: 0 } : undefined]}
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
function classDiagnostic(classes: unknown, className: unknown) {
  if (classes || className)
    diagnostic(
      'button-classes',
      'Native button class helpers identify slots; use sx, native styles and theme overrides for styling.',
    );
}
function slot(theme: Theme, name: string, key: string, owner: object, width: number) {
  return listSlotStyle(theme, name, key, owner, width);
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
function mergeNativeStyle(computed: NativeStyle, authored: StyleProp<NativeStyle>): NativeStyle {
  const value = StyleSheet.flatten([computed, expandPadding(StyleSheet.flatten(authored))]) ?? {};
  return (
    applyNativeTextMetrics(value, computed, nativeStyleTextMetrics([computed, authored])) ?? value
  );
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
  const props = useDefaultProps({ props: inProps, name: 'MuiButton' });
  const typographyDefaults = useDefaultProps({
    props: {} as { component?: unknown },
    name: 'MuiTypography',
  });
  const {
    children,
    sx,
    style,
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
    focusVisibleClassName,
    id,
    'aria-label': ariaLabel,
    onHoverIn,
    onHoverOut,
    ...other
  } = props;
  classDiagnostic(classes, className ?? focusVisibleClassName);
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions(),
    generated = useId();
  const [hovered, setHovered] = useState(false);
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
  let cache: { pressed: boolean; focusVisible: boolean; style: NativeStyle } | undefined;
  const styled = (state: ButtonBaseState): NativeStyle => {
    if (cache && cache.pressed === state.pressed && cache.focusVisible === state.focusVisible)
      return cache.style;
    const activeHover = hovered && !inactive;
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
            : activeHover
              ? colors.dark
              : colors.main
        : activeHover
          ? alpha(
              color === 'inherit' ? theme.palette.text.primary : colors.main,
              theme.palette.action.hoverOpacity,
            )
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
    const actualOwner = { ...owner, pressed: state.pressed, focusVisible: state.focusVisible };
    const authored = typeof style === 'function' ? style(state) : style;
    const computed = componentStyle(theme, 'MuiButton', actualOwner, sx, {
      ...nativeTextStyleContext(parent, authored, theme),
      width,
      states: [
        ...(inactive ? ['disabled'] : []),
        ...(loading ? ['loading'] : []),
        ...(state.focusVisible ? ['focusVisible'] : []),
        ...(activeHover ? ['hover'] : []),
      ],
      overrideKeys: [
        variant,
        `size${cap(size)}`,
        ...(color === 'inherit' ? ['colorInherit'] : []),
        ...(disableElevation ? ['disableElevation'] : []),
        ...(fullWidth ? ['fullWidth'] : []),
        ...(loading ? ['loading'] : []),
      ],
      baseStyle: [
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
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          ...(fullWidth ? { width: '100%' } : {}),
          borderRadius: theme.shape.borderRadius,
          backgroundColor: background,
          borderWidth: outlined ? 1 : 0,
          borderColor: inactive
            ? theme.palette.action.disabledBackground
            : outlined
              ? alpha(colors.main, 0.5)
              : colors.main,
          elevation:
            variant === 'contained' && !disableElevation && !inactive
              ? state.pressed
                ? 8
                : state.focusVisible
                  ? 6
                  : activeHover
                    ? 4
                    : 2
              : 0,
          color: foreground,
        },
      ],
    });
    const value = mergeNativeStyle(computed, authored);
    cache = { pressed: state.pressed, focusVisible: state.focusVisible, style: value };
    return value;
  };
  const icon = (node: React.ReactNode, position: 'start' | 'end', state: ButtonBaseState) => {
    const replace = loading === true && loadingPosition === position;
    const has = Boolean(node) && typeof node !== 'boolean';
    if (!has && !replace) return null;
    const iconSize = size === 'small' ? 18 : size === 'large' ? 22 : 20;
    const actualOwner = { ...owner, pressed: state.pressed, focusVisible: state.focusVisible };
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
        <NativeTextScope
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
            slot(theme, 'MuiButton', key, actualOwner, width),
            ...(loading
              ? [slot(theme, 'MuiButton', `${key}Loading${cap(position)}`, actualOwner, width)]
              : []),
          ]}
          content={
            has ? (
              node
            ) : (
              <View
                style={[
                  { width: iconSize, height: iconSize },
                  slot(theme, 'MuiButton', 'loadingIconPlaceholder', actualOwner, width),
                ]}
              />
            )
          }
        >
          {(native, content) => <View style={native}>{content}</View>}
        </NativeTextScope>
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
            <NativeTextScope
              theme={theme}
              style={[
                { color: styled(state).color },
                slot(theme, 'MuiButton', 'loadingIndicator', actualOwner, width),
              ]}
              content={indicator}
            >
              {(native, content) => <View style={native}>{content}</View>}
            </NativeTextScope>
          </View>
        ) : null}
      </View>
    );
  };
  const loader = (_state: ButtonBaseState) =>
    typeof loading === 'boolean' ? (
      <View
        pointerEvents="none"
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
        {loading && loadingPosition === 'center' ? (
          <NativeTextScope
            theme={theme}
            style={[
              { color: theme.palette.action.disabled },
              slot(theme, 'MuiButton', 'loadingIndicator', owner, width),
            ]}
            content={indicator}
          >
            {(native, content) => <View style={native}>{content}</View>}
          </NativeTextScope>
        ) : null}
      </View>
    ) : null;
  return (
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
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
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
  );
}) as NativeButtonComponent;

export const IconButton = forwardRef<ViewInstance, IconButtonOwnProps>(
  function IconButton(inProps, ref) {
    const props = useDefaultProps({ props: inProps, name: 'MuiIconButton' });
    const typographyDefaults = useDefaultProps({
      props: {} as { component?: unknown },
      name: 'MuiTypography',
    });
    const {
      children,
      sx,
      style,
      color = 'default',
      size = 'medium',
      edge = false,
      disabled = false,
      disableFocusRipple = false,
      loading = null,
      loadingIndicator,
      classes,
      className,
      focusVisibleClassName,
      id,
      'aria-label': ariaLabel,
      onHoverIn,
      onHoverOut,
      ...other
    } = props;
    classDiagnostic(classes, className ?? focusVisibleClassName);
    const theme = useTheme(),
      parent = useNativeTextContext(),
      { width } = useWindowDimensions(),
      generated = useId();
    const [hovered, setHovered] = useState(false);
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
    let cache: { pressed: boolean; focusVisible: boolean; style: NativeStyle } | undefined;
    const styled = (state: ButtonBaseState) => {
      if (cache && cache.pressed === state.pressed && cache.focusVisible === state.focusVisible)
        return cache.style;
      const activeHover = hovered && !inactive && !other.disableRipple,
        padding = size === 'small' ? 5 : size === 'large' ? 12 : 8;
      const authored = typeof style === 'function' ? style(state) : style;
      const computed = componentStyle(
        theme,
        'MuiIconButton',
        { ...owner, pressed: state.pressed, focusVisible: state.focusVisible },
        sx,
        {
          ...nativeTextStyleContext(parent, authored, theme),
          width,
          states: [
            ...(inactive ? ['disabled'] : []),
            ...(loading ? ['loading'] : []),
            ...(state.focusVisible ? ['focusVisible'] : []),
            ...(activeHover ? ['hover'] : []),
          ],
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
            backgroundColor: activeHover
              ? alpha(colors.main, theme.palette.action.hoverOpacity)
              : 'transparent',
            color: inactive ? theme.palette.action.disabled : colors.main,
            fontSize: theme.typography.pxToRem(size === 'small' ? 18 : size === 'large' ? 28 : 24),
            lineHeight: 1,
            ...(edge
              ? { [edge === 'start' ? 'marginStart' : 'marginEnd']: size === 'small' ? -3 : -12 }
              : {}),
          },
        },
      );
      const value = mergeNativeStyle(computed, authored);
      cache = { pressed: state.pressed, focusVisible: state.focusVisible, style: value };
      return value;
    };
    return (
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
        onHoverIn={(event) => {
          setHovered(true);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          setHovered(false);
          onHoverOut?.(event);
        }}
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
                <NativeTextScope
                  theme={theme}
                  style={[
                    { display: loading ? 'flex' : 'none', color: theme.palette.action.disabled },
                    slot(theme, 'MuiIconButton', 'loadingIndicator', owner, width),
                  ]}
                  content={loading ? indicator : null}
                >
                  {(native, content) => <View style={native}>{content}</View>}
                </NativeTextScope>
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
    );
  },
) as NativeIconButtonComponent;
