/* Group composition, context priority and styles adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import React, {
  forwardRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
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
  type ComponentStyleArgs,
  type ComponentStyleObject,
  type ComponentStyleValue,
  type ComponentVariantArgs,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { nativeStyleTree } from './nativeStyleAncestry';
import {
  ButtonGroupContext,
  ButtonGroupButtonContext,
  NativeButtonGroupRules,
  type ButtonGroupContextValue,
  type NativeButtonGroupRule,
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
function useShallowStable<T extends object>(value: T): T {
  const stable = useRef(value);
  const keys = Object.keys(value) as (keyof T)[];
  if (
    keys.length !== Object.keys(stable.current).length ||
    keys.some(
      (key) => !Object.hasOwn(stable.current, key) || !Object.is(stable.current[key], value[key]),
    )
  )
    stable.current = value;
  return stable.current;
}
function baseRules(theme: Theme, owner: ButtonGroupOwnerState): SxProps {
  const vertical = owner.orientation === 'vertical',
    first = select('firstButton', 'middleButton'),
    after = select('lastButton', 'middleButton'),
    focused = `${select('grouped')}.Mui-focusVisible`;
  const result: SxObject = {
    display: 'flex',
    flexDirection: vertical ? 'column' : 'row',
    alignSelf: owner.fullWidth ? 'stretch' : 'flex-start',
    borderRadius: theme.shape.borderRadius,
    ...(owner.variant === 'contained' ? { boxShadow: 2 } : {}),
    ...(owner.disableElevation ? { boxShadow: 'none' } : {}),
    ...(owner.fullWidth ? { width: '100%' } : {}),
    [select('grouped')]: {
      minWidth: 40,
      ...(owner.variant === 'contained'
        ? { boxShadow: 'none', elevation: 0, '&.Mui-hover': { boxShadow: 'none' } }
        : {}),
    },
    ...(theme.focusVisible
      ? {
          [focused]: {
            zIndex: 1,
            ...(owner.variant === 'contained'
              ? { boxShadow: theme.focusVisible.boxShadow ?? 'none' }
              : {}),
          },
        }
      : {}),
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
function scopedVariantStyle(
  slot: string,
  input: unknown,
  args: ComponentVariantArgs,
): ComponentStyleValue {
  if (typeof input === 'function') return scopedVariantStyle(slot, input(args), args);
  const resolved = input;
  if (Array.isArray(resolved))
    return resolved.map((entry) => scopedVariantStyle(slot, entry, args));
  return resolved && typeof resolved === 'object' ? { [select(slot)]: resolved } : null;
}
function scopedSlotStyle(
  slot: string,
  input: unknown,
  args: ComponentStyleArgs,
): ComponentStyleValue {
  if (typeof input === 'function') return scopedSlotStyle(slot, input(args), args);
  const resolved = input;
  if (Array.isArray(resolved)) return resolved.map((entry) => scopedSlotStyle(slot, entry, args));
  if (!resolved || typeof resolved !== 'object') return null;
  const { variants, ...style } = resolved as ComponentStyleObject;
  // Original styled processing resolves each slot's variants before its
  // overrides resolver adds the descendant selector. Keep matching and merged
  // callback arguments in System, then scope the selected variant's styles.
  return [
    { [select(slot)]: style },
    ...(Array.isArray(variants)
      ? [
          {
            variants: variants.map((variant) => ({
              ...variant,
              style: (state: ComponentVariantArgs) =>
                scopedVariantStyle(slot, variant.style, state),
            })),
          },
        ]
      : []),
  ];
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
          root: (args) => [
            ...['grouped', 'firstButton', 'lastButton', 'middleButton'].map((key) =>
              scopedSlotStyle(key, overrides[key], args),
            ),
            typeof overrides.root === 'function' ? overrides.root(args) : overrides.root,
          ],
        },
      },
    },
  };
}
export const ButtonGroup = forwardRef<ViewInstance, ButtonGroupProps>(
  function ButtonGroup(inProps, ref) {
    const groupRoot = useRef<ViewInstance | null>(null);
    const assignRoot = useCallback((node: ViewInstance | null) => {
      if (groupRoot.current !== node) {
        groupRoot.current = node;
        nativeStyleTree.changed();
      }
    }, []);
    const handleRef = useForkRef(assignRoot, ref);
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
    const owner = useShallowStable<ButtonGroupOwnerState>({
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
    });
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
      rawAncestry = useContext(NativeButtonGroupRules),
      { width } = useWindowDimensions();
    const ancestryInputs = useShallowStable(rawAncestry.flatMap((rule) => [rule, rule.cascade]));
    const ancestry = useMemo(() => rawAncestry, [ancestryInputs]);
    const scopedTheme = useMemo(() => styledTheme(theme), [theme]);
    const rootProps = useMemo(
      () => ({
        as: component,
        role: 'group',
        className: rootClass,
        ...other,
        id,
        children,
        sx,
        style,
      }),
      [owner, rootClass],
    );
    const common = useMemo(
      () => ({
        ...nativeTextStyleContext(parent, style, theme),
        width,
        classes: rootClass.split(/\s+/),
        overrideKeys: [
          variant,
          ...(disableElevation ? ['disableElevation'] : []),
          ...(fullWidth ? ['fullWidth'] : []),
          ...(orientation === 'vertical' ? ['vertical'] : []),
        ],
        baseStyle: baseRules(theme, owner),
        rootProps,
        ancestors: ancestry.map((rule) => rule.cascade(rootClass.split(/\s+/))),
      }),
      [theme, parent, width, owner, rootProps, ancestry],
    );
    const computed = useMemo(
      () => componentStyle(scopedTheme, 'MuiButtonGroup', { ...owner }, sx, common),
      [scopedTheme, owner, sx, common],
    );
    const scopeStyle = useMemo(() => [computed, style], [computed, style]);
    const ownRule = useMemo<NativeButtonGroupRule>(
      () => ({
        get element() {
          return groupRoot.current;
        },
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
      }),
      [scopedTheme, owner, sx, common],
    );
    const committedRule = useRef(ownRule);
    const registryRule = useMemo<NativeButtonGroupRule>(
      () => ({
        get element() {
          return groupRoot.current;
        },
        get cascade() {
          return committedRule.current.cascade;
        },
      }),
      [],
    );
    useLayoutEffect(() => {
      if (committedRule.current === ownRule) return;
      committedRule.current = ownRule;
      nativeStyleTree.changed();
    }, [ownRule]);
    useLayoutEffect(() => nativeStyleTree.registerGroup(registryRule), [registryRule]);
    const rules = useMemo(() => [...ancestry, ownRule], [ancestry, ownRule]);
    const valid = React.Children.toArray(children).filter(React.isValidElement),
      Root = component === 'div' ? View : component;
    return (
      <NativeTextScope theme={theme} style={scopeStyle} rootRef={groupRoot} content={valid}>
        {(native, content) => (
          <Root
            role="group"
            {...other}
            nativeID={id ?? other.nativeID}
            testID={other.testID ?? dataID}
            ref={handleRef}
            {...(Root === View ? {} : { className: rootClass })}
            style={native}
          >
            <ButtonGroupContext.Provider value={context}>
              <NativeButtonGroupRules.Provider value={rules}>
                {React.Children.toArray(content)
                  .filter(React.isValidElement)
                  .map((child, index) => (
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
