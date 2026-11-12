// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Provider/default resolution adapts MIT MUI System/Utils 9.5.0. See NOTICE and upstream/reuse.json.
import React, { createContext, useContext, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type DefaultPropsConfig = Record<string, unknown>;
export type DefaultPropsMap = Record<string, unknown> & {
  mergeClassNameAndStyle?: boolean | undefined;
};
const DefaultsContext = createContext<Record<string, unknown> | undefined>(undefined);
const object = (value: unknown): DefaultPropsConfig => Object(value) as DefaultPropsConfig;
function set(target: DefaultPropsConfig, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}
export function joinClassNames(...values: unknown[]): string {
  const tokens: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === 'string' || typeof value === 'number') tokens.push(String(value));
    else if (Array.isArray(value)) tokens.push(joinClassNames(...value));
    else if (typeof value === 'object')
      for (const key in value) if ((value as DefaultPropsConfig)[key]) tokens.push(key);
  }
  return tokens.filter(Boolean).join(' ');
}
export function mergeNativeStyles(defaultStyle: unknown, externalStyle: unknown): unknown {
  if (typeof defaultStyle === 'function' || typeof externalStyle === 'function')
    return (...args: unknown[]) => [
      typeof defaultStyle === 'function' ? defaultStyle(...args) : defaultStyle,
      typeof externalStyle === 'function' ? externalStyle(...args) : externalStyle,
    ];
  if (
    Array.isArray(defaultStyle) ||
    Array.isArray(externalStyle) ||
    typeof defaultStyle === 'number' ||
    typeof externalStyle === 'number'
  )
    return [defaultStyle, externalStyle] as StyleProp<ViewStyle>;
  return { ...object(defaultStyle), ...object(externalStyle) };
}

// Default resolution follows the pinned MUI contract. Native styles retain ordered
// style arrays and callbacks rather than spreading numeric array keys into objects.
export function resolveDefaultProps<P>(defaults: unknown, props: P, mergeStyle = false): P {
  const output = { ...object(props) };
  const defaultProps = object(defaults);
  const externalProps = props as DefaultPropsConfig;
  for (const key in defaultProps) {
    if (!Object.hasOwn(defaultProps, key)) continue;
    if (key === 'slots' || key === 'components')
      set(output, key, { ...object(defaultProps[key]), ...object(output[key]) });
    else if (key === 'slotProps' || key === 'componentsProps') {
      const fallback = defaultProps[key];
      const supplied = externalProps[key];
      if (!supplied) set(output, key, fallback || {});
      else if (!fallback) set(output, key, supplied);
      else {
        const slots = { ...object(supplied) };
        for (const slot in object(fallback)) {
          if (!Object.hasOwn(object(fallback), slot)) continue;
          const defaultValue = object(fallback)[slot];
          const externalValue = object(supplied)[slot];
          set(
            slots,
            slot,
            typeof defaultValue === 'function' || typeof externalValue === 'function'
              ? (...args: unknown[]) =>
                  resolveDefaultProps(
                    object(
                      typeof defaultValue === 'function' ? defaultValue(...args) : defaultValue,
                    ),
                    object(
                      typeof externalValue === 'function' ? externalValue(...args) : externalValue,
                    ),
                    mergeStyle,
                  )
              : resolveDefaultProps(object(defaultValue), object(externalValue), mergeStyle),
          );
        }
        set(output, key, slots);
      }
    } else if (key === 'className' && mergeStyle && externalProps.className !== undefined)
      set(output, key, joinClassNames(defaultProps.className, externalProps.className));
    else if (key === 'style' && mergeStyle && externalProps.style)
      set(output, key, mergeNativeStyles(defaultProps.style, externalProps.style));
    // Retain the native adapter's existing treatment of __proto__ as own data.
    else if (output[key] === undefined || (key === '__proto__' && !Object.hasOwn(output, key)))
      set(output, key, defaultProps[key]);
  }
  return output as P;
}
// Match the permissive upstream theme envelope without constraining custom names.
export interface ThemeWithProps {
  components?: any;
}
export type ThemedProps<ThemeInput, Name extends PropertyKey> = ThemeInput extends {
  components: Record<Name, { defaultProps: infer Props }>;
}
  ? Props
  : {};
export function getThemeProps<ThemeInput, Props, Name extends PropertyKey>({
  props,
  name,
  theme,
}: {
  props: Props;
  name: Name;
  theme?: ThemeInput | undefined;
}): Props & ThemedProps<ThemeInput, Name> {
  const selected = theme as { components?: Record<PropertyKey, unknown> } | null | undefined;
  if (
    !selected ||
    !selected.components ||
    !selected.components[name] ||
    !object(selected.components[name]).defaultProps
  )
    return props as Props & ThemedProps<ThemeInput, Name>;
  return resolveDefaultProps(object(selected.components[name]).defaultProps, props) as Props &
    ThemedProps<ThemeInput, Name>;
}
export type DefaultPropsProviderProps = React.PropsWithChildren<{
  // System intentionally accepts arbitrary component names and configuration values.
  value: Record<string, any> | undefined;
}>;
export interface DefaultPropsProviderComponent {
  (props: DefaultPropsProviderProps): React.JSX.Element;
  /** Optional native metadata extension; React 19 does not run propTypes validation. */
  propTypes?: any;
}
export const DefaultPropsProvider: DefaultPropsProviderComponent = function DefaultPropsProvider({
  value,
  children,
}) {
  return <DefaultsContext.Provider value={value}>{children}</DefaultsContext.Provider>;
};
/** @internal Retained source preparation follows genuine provider changes. */
export function useNativeDefaultPropsSource() {
  return useContext(DefaultsContext);
}
function providedProps<P>(props: P, name: string, values: Record<string, unknown> | undefined): P {
  if (!values || !values[name]) return props;
  const config = values[name] as DefaultPropsConfig;
  if (config.defaultProps)
    return resolveDefaultProps(config.defaultProps, props, Boolean(values?.mergeClassNameAndStyle));
  if (!config.styleOverrides && !config.variants)
    return resolveDefaultProps(config, props, Boolean(values?.mergeClassNameAndStyle));
  return props;
}
export function useDefaultProps<P>({ props, name }: { props: P; name: string }): P {
  return providedProps(props, name, useContext(DefaultsContext));
}
/** @internal Native-only presentation updates must not resolve source defaults again. */
export function useNativeSourceDefaultProps<P>({
  props,
  name,
  sourceState,
}: {
  props: P;
  name: string;
  sourceState?: unknown;
}): P {
  const values = useContext(DefaultsContext);
  return useMemo(() => providedProps(props, name, values), [props, name, values, sourceState]);
}
export type SlotProps<P, OwnerState> = P | ((ownerState: OwnerState) => P);
export function resolveSlotProps<P, OwnerState>(
  value: SlotProps<P, OwnerState> | undefined,
  ownerState: OwnerState,
): P | undefined {
  return typeof value === 'function' ? (value as (ownerState: OwnerState) => P)(ownerState) : value;
}
