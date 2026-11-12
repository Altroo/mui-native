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
import { View, StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  useDefaultProps,
  NativeTextScope,
  useNativeTextContext,
  nativeTextStyleContext,
  componentRootStyle,
  alpha,
  joinClassNames,
  useRtl,
  type Theme,
  type SxProps,
  type SxObject,
} from '@altroo/mui-native-system';
import { buttonGroupConstructorCss, buttonGroupOverrideCss } from './nativeButtonCss';
import {
  rebaseNativeComponentStyle,
  refreshNativeStyle,
  NativeCssInsertionScope,
  useNativeStyleCache,
  useNativeStyleCacheRevision,
} from '@altroo/mui-native-system/internal/prepared-style';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { nativeStyleTree } from './nativeStyleAncestry';
import { directionOf } from './nativeControlStyles';
import { mergeNativeButtonStyle } from './buttonBase';
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
function baseRules(theme: Theme, owner: ButtonGroupOwnerState, direction: 'ltr' | 'rtl'): SxProps {
  const vertical = owner.orientation === 'vertical',
    rtl = direction === 'rtl',
    joinedSide = rtl ? 'Left' : 'Right',
    leadingSide = rtl ? 'Right' : 'Left',
    first = select('firstButton', 'middleButton'),
    after = select('lastButton', 'middleButton'),
    focused = `${select('grouped')}.Mui-focusVisible`;
  const result: SxObject = {
    display: 'flex',
    flexDirection: vertical ? 'column' : 'row',
    direction,
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
      : { [`borderTop${joinedSide}Radius`]: 0, [`borderBottom${joinedSide}Radius`]: 0 },
    [after]: vertical
      ? { borderTopRightRadius: 0, borderTopLeftRadius: 0 }
      : { [`borderTop${leadingSide}Radius`]: 0, [`borderBottom${leadingSide}Radius`]: 0 },
  };
  const palette = theme.palette as unknown as Record<string, { main?: string; dark?: string }>;
  if (owner.variant === 'outlined') {
    result[first] = {
      ...(result[first] as object),
      [vertical ? 'borderBottomColor' : `border${joinedSide}Color`]: 'transparent',
      '&.Mui-hover': {
        [vertical ? 'borderBottomColor' : `border${joinedSide}Color`]: 'currentColor',
      },
    };
    result[after] = {
      ...(result[after] as object),
      [vertical ? 'marginTop' : `margin${leadingSide}`]: -1,
    };
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
      [vertical ? 'borderBottomWidth' : `border${joinedSide}Width`]: 1,
      [vertical ? 'borderBottomColor' : `border${joinedSide}Color`]: fallback,
      '&.Mui-disabled': {
        [vertical ? 'borderBottomColor' : `border${joinedSide}Color`]:
          theme.palette.action.disabled,
      },
      ...(named ? { borderColor: named } : {}),
    };
  }
  return result;
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
      rtl = useRtl(),
      parent = useNativeTextContext(),
      rawAncestry = useContext(NativeButtonGroupRules),
      { width } = useWindowDimensions();
    const styleCache = useNativeStyleCache();
    useNativeStyleCacheRevision();
    const providerDirection = rtl ? 'rtl' : 'ltr';
    const ancestryInputs = useShallowStable(rawAncestry.flatMap((rule) => [rule, rule.cascade]));
    const ancestry = useMemo(() => rawAncestry, [ancestryInputs]);
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
        baseStyle: baseRules(theme, owner, providerDirection),
        baseProgramme: buttonGroupConstructorCss(theme, owner),
        styleCache,
        overrideProgramme: buttonGroupOverrideCss,
        overrideSelectors: {
          grouped: select('grouped'),
          firstButton: select('firstButton'),
          lastButton: select('lastButton'),
          middleButton: select('middleButton'),
        },
        protectPhysicalGeometry: true,
        rootProps,
        ancestors: ancestry.map((rule) => rule.cascade(rootClass.split(/\s+/))),
      }),
      [theme, parent, width, owner, rootProps, ancestry, providerDirection, styleCache],
    );
    const resolved = useMemo(
      () => componentRootStyle(theme, 'MuiButtonGroup', { ...owner }, sx, style, common),
      [theme, owner, sx, style, common],
    );
    const computed = refreshNativeStyle(resolved.computed);
    const direction = directionOf(
      StyleSheet.flatten(resolved.authored)?.direction,
      computed.direction,
      parent?.direction ?? providerDirection,
    );
    const scopeStyle = useMemo(
      () => [mergeNativeButtonStyle(computed, resolved.authored), { direction }],
      [computed, resolved.authored, direction],
    );
    // Direction may replace native joining geometry; theme/SX callbacks belong
    // to this root's single preparation and remain shared by every descendant.
    const cascadeBase = useMemo(
      () =>
        direction === providerDirection ? common.baseStyle : baseRules(theme, owner, direction),
      [common.baseStyle, direction, providerDirection, theme, owner],
    );
    const prepared = useMemo(
      () =>
        cascadeBase === common.baseStyle
          ? resolved.prepared
          : rebaseNativeComponentStyle(
              resolved.prepared,
              componentRootStyle(theme, '', {}, undefined, undefined, {
                ...common,
                ancestors: [],
                overrideSelectors: {},
                baseStyle: cascadeBase,
              }).prepared,
            ),
      [cascadeBase, common, resolved.prepared, theme],
    );
    const ownRule = useMemo<NativeButtonGroupRule>(
      () => ({
        get element() {
          return groupRoot.current;
        },
        selector: { classes: rootClass.split(/\s+/).filter(Boolean) },
        cascade: (classes, path) => ({
          theme,
          name: 'MuiButtonGroup',
          props: { ...owner },
          sx,
          prepared,
          context: {
            ...common,
            baseStyle: cascadeBase,
            descendantClasses: classes,
            descendantPath: path,
            descendantOnly: true,
          },
        }),
      }),
      [theme, owner, sx, common, cascadeBase, prepared],
    );
    const committedRule = useRef(ownRule);
    const registryRule = useMemo<NativeButtonGroupRule>(
      () => ({
        get element() {
          return groupRoot.current;
        },
        get selector() {
          return committedRule.current.selector;
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
      <NativeCssInsertionScope style={resolved.computed} registerClass={Root !== View}>
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
      </NativeCssInsertionScope>
    );
  },
) as NativeButtonGroupComponent;
