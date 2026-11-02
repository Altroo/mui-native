import React, { createContext, useContext } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type DefaultPropsConfig = Record<string, unknown>;
export type DefaultPropsMap = Record<string, unknown> & { mergeClassNameAndStyle?: boolean };
const DefaultsContext = createContext<DefaultPropsMap | undefined>(undefined);
const object = (value: unknown): DefaultPropsConfig =>
  value && typeof value === 'object' ? (value as DefaultPropsConfig) : {};
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
      tokens.push(
        ...Object.keys(value).filter((key) => Boolean((value as DefaultPropsConfig)[key])),
      );
  }
  return tokens.filter(Boolean).join(' ');
}
export function mergeNativeStyles(defaultStyle: unknown, externalStyle: unknown): unknown {
  if (typeof defaultStyle === 'function' || typeof externalStyle === 'function')
    return (...args: unknown[]) => [
      typeof defaultStyle === 'function' ? defaultStyle(...args) : defaultStyle,
      typeof externalStyle === 'function' ? externalStyle(...args) : externalStyle,
    ];
  return [defaultStyle, externalStyle] as StyleProp<ViewStyle>;
}

// Default resolution follows the pinned MUI contract. Native styles retain ordered
// style arrays and callbacks rather than spreading numeric array keys into objects.
export function resolveDefaultProps<P extends object>(
  defaults: DefaultPropsConfig,
  props: P,
  mergeStyle = false,
): P {
  const output = { ...props } as DefaultPropsConfig;
  for (const [key, fallback] of Object.entries(defaults)) {
    const supplied = (props as DefaultPropsConfig)[key];
    if (key === 'slots' || key === 'components')
      set(output, key, { ...object(fallback), ...object(supplied) });
    else if (key === 'slotProps' || key === 'componentsProps') {
      if (!supplied) set(output, key, fallback || {});
      else if (!fallback) set(output, key, supplied);
      else {
        const slots = { ...object(supplied) };
        for (const [slot, defaultValue] of Object.entries(object(fallback))) {
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
    } else if (key === 'className' && mergeStyle && supplied !== undefined)
      set(output, key, joinClassNames(fallback, supplied));
    else if (key === 'style' && mergeStyle && supplied)
      set(output, key, mergeNativeStyles(fallback, supplied));
    else if (!Object.hasOwn(output, key) || output[key] === undefined) set(output, key, fallback);
  }
  return output as P;
}
export function getThemeProps<P extends object>({
  props,
  name,
  theme,
}: {
  props: P;
  name: string;
  theme?: { components?: DefaultPropsMap } | null;
}): P {
  const defaults = object(theme?.components?.[name]).defaultProps;
  return defaults ? resolveDefaultProps(object(defaults), props) : props;
}
export function DefaultPropsProvider({
  value,
  children,
}: React.PropsWithChildren<{ value: DefaultPropsMap | undefined }>) {
  return <DefaultsContext.Provider value={value}>{children}</DefaultsContext.Provider>;
}
export function useDefaultProps<P extends object>({ props, name }: { props: P; name: string }): P {
  const values = useContext(DefaultsContext);
  const entry = values?.[name];
  if (!entry || typeof entry !== 'object') return props;
  const config = object(entry);
  const defaults =
    config.defaultProps ?? (!config.styleOverrides && !config.variants ? config : undefined);
  return defaults
    ? resolveDefaultProps(object(defaults), props, values?.mergeClassNameAndStyle)
    : props;
}
export type SlotProps<P, OwnerState> = P | ((ownerState: OwnerState) => P);
export function resolveSlotProps<P, OwnerState>(
  value: SlotProps<P, OwnerState> | undefined,
  ownerState: OwnerState,
): P | undefined {
  return typeof value === 'function' ? (value as (ownerState: OwnerState) => P)(ownerState) : value;
}
