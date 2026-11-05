/* Group composition, context priority and styles adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import React, { forwardRef, useContext, useMemo } from 'react';
import { View, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  componentStyle,
  alpha,
  joinClassNames,
  type Theme,
  type SxProps,
  type SxObject,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import {
  ButtonGroupContext,
  ButtonGroupButtonContext,
  NativeButtonGroupRules,
  type ButtonGroupContextValue,
} from './buttonGroupContext';
import { getButtonGroupUtilityClass } from './buttonGroupClasses';
import type {
  ButtonGroupProps,
  ButtonGroupOwnerState,
  NativeButtonGroupComponent,
} from './buttonGroupTypes';
export * from './buttonGroupTypes';
export * from './buttonGroupClasses';
export { ButtonGroupContext, ButtonGroupButtonContext } from './buttonGroupContext';
const cap = (value: string) => value[0].toUpperCase() + value.slice(1);
const select = (...slots: string[]) =>
  slots.map((slot) => `& .${getButtonGroupUtilityClass(slot)}`).join(',');
function baseRules(theme: Theme, owner: ButtonGroupOwnerState): SxProps {
  const vertical = owner.orientation === 'vertical',
    first = select('firstButton', 'middleButton'),
    after = select('lastButton', 'middleButton');
  const result: SxObject = {
    display: 'flex',
    flexDirection: vertical ? 'column' : 'row',
    alignSelf: owner.fullWidth ? 'stretch' : 'flex-start',
    borderRadius: theme.shape.borderRadius,
    boxShadow: owner.variant === 'contained' && !owner.disableElevation ? 2 : 0,
    ...(owner.fullWidth ? { width: '100%' } : {}),
    [select('grouped')]: {
      minWidth: 40,
      ...(owner.variant === 'contained' ? { boxShadow: 0 } : {}),
    },
    [first]: vertical
      ? { borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }
      : { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
    [after]: vertical
      ? { borderTopRightRadius: 0, borderTopLeftRadius: 0 }
      : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  };
  const palette = theme.palette as unknown as Record<string, { main?: string; dark?: string }>;
  if (owner.variant === 'outlined') {
    result[first] = {
      ...(result[first] as object),
      [vertical ? 'borderBottomColor' : 'borderRightColor']: 'transparent',
      '&.Mui-hover': { [vertical ? 'borderBottomColor' : 'borderRightColor']: 'currentColor' },
    };
    result[after] = { ...(result[after] as object), [vertical ? 'marginTop' : 'marginLeft']: -1 };
  } else if (owner.variant === 'text' || owner.variant === 'contained') {
    const tone = palette[owner.color];
    const fallback =
      owner.variant === 'contained'
        ? theme.palette.grey[400]
        : theme.palette.mode === 'light'
          ? 'rgba(0, 0, 0, 0.23)'
          : 'rgba(255, 255, 255, 0.23)';
    const named =
      owner.variant === 'contained'
        ? tone?.dark
        : typeof tone?.main === 'string'
          ? alpha(tone.main, 0.5)
          : undefined;
    result[first] = {
      ...(result[first] as object),
      [vertical ? 'borderBottomWidth' : 'borderRightWidth']: 1,
      [vertical ? 'borderBottomColor' : 'borderRightColor']: fallback,
      '&.Mui-disabled': {
        [vertical ? 'borderBottomColor' : 'borderRightColor']: theme.palette.action.disabled,
      },
      ...(named ? { borderColor: named } : {}),
    };
  }
  return result;
}
function styledTheme(theme: Theme): Theme {
  const entry = theme.components.MuiButtonGroup;
  const config = entry && typeof entry === 'object' ? entry : undefined;
  const overrides = config?.styleOverrides ?? {};
  return {
    ...theme,
    components: {
      ...theme.components,
      MuiButtonGroup: {
        ...config,
        styleOverrides: {
          ...overrides,
          root: (args) =>
            [
              ...['grouped', 'firstButton', 'lastButton', 'middleButton'].map((key) => ({
                [select(key)]:
                  typeof overrides[key] === 'function' ? overrides[key](args) : overrides[key],
              })),
              typeof overrides.root === 'function' ? overrides.root(args) : overrides.root,
            ] as SxProps,
        },
      },
    },
  };
}
export const ButtonGroup = forwardRef<ViewInstance, ButtonGroupProps>(
  function ButtonGroup(inProps, ref) {
    const props = useDefaultProps({ props: inProps, name: 'MuiButtonGroup' });
    const {
      children,
      classes,
      className,
      color = 'primary',
      component = 'div',
      disabled = false,
      disableElevation = false,
      disableFocusRipple = false,
      disableRipple = false,
      fullWidth = false,
      orientation = 'horizontal',
      size = 'medium',
      variant = 'outlined',
      sx,
      style,
      id,
      'data-testid': dataID,
      ...other
    } = props;
    const owner: ButtonGroupOwnerState = {
      ...props,
      color,
      component,
      disabled,
      disableElevation,
      disableFocusRipple,
      disableRipple,
      fullWidth,
      orientation,
      size,
      variant,
    };
    const token = (key: string) =>
      joinClassNames(getButtonGroupUtilityClass(key), classes?.[key as keyof typeof classes]);
    const grouped = joinClassNames(token('grouped'), disabled && token('disabled'));
    const rootClass = joinClassNames(
      token('root'),
      token(variant),
      token(orientation),
      fullWidth && token('fullWidth'),
      disableElevation && token('disableElevation'),
      token('color' + cap(color)),
      className,
    );
    const context = useMemo<ButtonGroupContextValue>(
      () => ({
        className: grouped,
        color,
        disabled,
        disableElevation,
        disableFocusRipple: props.disableFocusRipple,
        disableRipple: props.disableRipple,
        fullWidth,
        size,
        variant,
      }),
      [
        grouped,
        color,
        disabled,
        disableElevation,
        props.disableFocusRipple,
        props.disableRipple,
        fullWidth,
        size,
        variant,
      ],
    );
    const theme = useTheme(),
      parent = useNativeTextContext(),
      ancestry = useContext(NativeButtonGroupRules),
      { width } = useWindowDimensions();
    const scopedTheme = useMemo(() => styledTheme(theme), [theme]);
    const base = baseRules(theme, owner),
      keys = [
        variant,
        ...(disableElevation ? ['disableElevation'] : []),
        ...(fullWidth ? ['fullWidth'] : []),
        ...(orientation === 'vertical' ? ['vertical'] : []),
      ];
    const rootProps = {
      as: component,
      role: 'group',
      className: rootClass,
      ...other,
      id,
      children,
      sx,
      style,
    };
    const common = {
      ...nativeTextStyleContext(parent, style, theme),
      width,
      classes: rootClass.split(/\s+/),
      overrideKeys: keys,
      baseStyle: base,
      rootProps,
    };
    const computed = componentStyle(scopedTheme, 'MuiButtonGroup', { ...owner }, sx, common);
    const rules = [
      ...ancestry,
      {
        cascade: (classes: readonly string[]) => ({
          theme: scopedTheme,
          name: 'MuiButtonGroup',
          props: { ...owner },
          sx,
          context: {
            ...common,
            descendantClasses: classes,
            descendantOnly: true,
          },
        }),
      },
    ];
    const valid = React.Children.toArray(children).filter(React.isValidElement),
      Root = component === 'div' ? View : component;
    return (
      <NativeTextScope theme={theme} style={[computed, style]} content={children}>
        {(native) => (
          <Root
            role="group"
            {...other}
            nativeID={id ?? other.nativeID}
            testID={other.testID ?? dataID}
            ref={ref}
            {...(Root === View ? {} : { ownerState: owner, className: rootClass })}
            style={native}
          >
            <ButtonGroupContext.Provider value={context}>
              <NativeButtonGroupRules.Provider value={rules}>
                {valid.map((child, index) => (
                  <ButtonGroupButtonContext.Provider
                    key={index}
                    value={
                      valid.length === 1
                        ? ''
                        : index === 0
                          ? token('firstButton')
                          : index === valid.length - 1
                            ? token('lastButton')
                            : token('middleButton')
                    }
                  >
                    {child}
                  </ButtonGroupButtonContext.Provider>
                ))}
              </NativeButtonGroupRules.Provider>
            </ButtonGroupContext.Provider>
          </Root>
        )}
      </NativeTextScope>
    );
  },
) as NativeButtonGroupComponent;
