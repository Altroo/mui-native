import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme } from './theme';
import { diagnostic } from './diagnostics';
export type SxObject = { [key: string]: unknown };
export type SxProps<T extends Theme = Theme> =
  | SxObject
  | ((theme: T) => SxObject)
  | readonly (false | null | undefined | SxObject | ((theme: T) => SxObject))[];
export type NativeStyle = ViewStyle & TextStyle;
export type StyleContext = {
  width?: number;
  states?: readonly string[];
  slot?: string;
  mode?: 'sx' | 'css';
};
const aliases: Record<string, string[]> = {
  m: ['margin'],
  mt: ['marginTop'],
  mr: ['marginRight'],
  mb: ['marginBottom'],
  ml: ['marginLeft'],
  mx: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  p: ['padding'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],
  px: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  bgcolor: ['backgroundColor'],
};
const allowed = new Set(
  'alignContent alignItems alignSelf aspectRatio backfaceVisibility backgroundColor borderBottomColor borderBottomLeftRadius borderBottomRightRadius borderBottomWidth borderColor borderLeftColor borderLeftWidth borderRadius borderRightColor borderRightWidth borderStyle borderTopColor borderTopLeftRadius borderTopRightRadius borderTopWidth borderWidth bottom color columnGap direction display elevation flex flexBasis flexDirection flexGrow flexShrink flexWrap fontFamily fontSize fontStyle fontWeight gap height justifyContent left letterSpacing lineHeight margin marginTop marginRight marginBottom marginLeft marginStart marginEnd maxHeight maxWidth minHeight minWidth opacity overflow padding paddingTop paddingRight paddingBottom paddingLeft paddingStart paddingEnd position right rowGap shadowColor shadowOffset shadowOpacity shadowRadius start end textAlign textDecorationColor textDecorationLine textDecorationStyle textTransform top transform width zIndex'.split(
    ' ',
  ),
);
const spacing = /^(margin|padding)|^(gap|rowGap|columnGap)$/;
const sizing = /^(width|height|minWidth|maxWidth|minHeight|maxHeight)$/;
function path(object: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (value, k) =>
        value && typeof value === 'object' && !['__proto__', 'constructor', 'prototype'].includes(k)
          ? (value as Record<string, unknown>)[k]
          : undefined,
      object,
    );
}
function responsive(value: unknown, theme: Theme, width: number): unknown {
  const entries = Object.entries(theme.breakpoints.values).sort((a, b) => a[1] - b[1]);
  if (Array.isArray(value)) {
    let result: unknown;
    entries.forEach(([, min], index) => {
      if (width >= min && value[index] != null) result = value[index];
    });
    return result;
  }
  if (
    value &&
    typeof value === 'object' &&
    Object.keys(value).every((k) => k in theme.breakpoints.values)
  ) {
    let result: unknown;
    for (const [k, min] of entries)
      if (width >= min && (value as SxObject)[k] != null) result = (value as SxObject)[k];
    return result;
  }
  return value;
}
function length(value: unknown, theme: Theme): unknown {
  if (typeof value !== 'string') return value;
  if (/^-?\d*\.?\d+px$/.test(value)) return parseFloat(value);
  if (/^-?\d*\.?\d+rem$/.test(value)) return parseFloat(value) * theme.typography.htmlFontSize;
  if (/\b(calc|var)\(|\d(em|vh|vw|pt)\b/.test(value)) {
    diagnostic('css-unit', `Unsupported native length: ${value}`);
    return undefined;
  }
  return value;
}
export function resolveSx(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext = {},
): NativeStyle {
  const result: Record<string, unknown> = {};
  const visit = (raw: unknown) => {
    if (!raw) return;
    if (typeof raw === 'function') {
      visit(raw(theme));
      return;
    }
    if (Array.isArray(raw)) {
      raw.forEach(visit);
      return;
    }
    for (const [key, original] of Object.entries(raw as SxObject)) {
      if (key.startsWith('&')) {
        const state = key.match(/^&\.Mui-([a-zA-Z]+)$/);
        const slot = key.match(/^& \.(Mui[A-Za-z]+-[a-zA-Z]+)$/);
        if (state) {
          if (context.states?.includes(state[1])) visit(original);
          continue;
        }
        if (slot) {
          if (context.slot === slot[1]) visit(original);
          continue;
        }
        diagnostic(
          'selector',
          `Unsupported selector ${key}; use native slots or supported Mui state selectors.`,
        );
        continue;
      }
      let value =
        key === 'transform' || key === 'shadowOffset'
          ? original
          : responsive(original, theme, context.width ?? 0);
      if (value == null) continue;
      if (key === 'typography') {
        const style = theme.typography[value as keyof Theme['typography']];
        if (typeof style === 'object') Object.assign(result, style);
        else diagnostic('typography', `Unknown typography ${String(value)}`);
        continue;
      }
      if (key === 'boxShadow') {
        if (typeof value === 'number' && value >= 0) {
          Object.assign(
            result,
            value === 0
              ? { elevation: 0, shadowOpacity: 0 }
              : {
                  elevation: value,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: value,
                  shadowOffset: { width: 0, height: value / 2 },
                },
          );
        } else diagnostic('box-shadow', 'Only numeric theme shadow indices are supported.');
        continue;
      }
      if (key === 'border' && typeof value === 'number') {
        result.borderWidth = value;
        result.borderStyle = 'solid';
        continue;
      }
      const keys = aliases[key] ?? [key];
      for (const nativeKey of keys) {
        if (!allowed.has(nativeKey)) {
          diagnostic('style', `Unsupported native style ${key}`);
          continue;
        }
        let next: unknown = value;
        if (typeof next === 'string' && /color$/i.test(nativeKey))
          next = path(theme.palette, next) ?? next;
        if (context.mode !== 'css' && typeof next === 'number') {
          if (spacing.test(nativeKey)) next = theme.spacing(next);
          else if (nativeKey === 'borderRadius') next *= theme.shape.borderRadius;
          else if (sizing.test(nativeKey) && next > 0 && next <= 1) next = `${next * 100}%`;
        }
        next = length(next, theme);
        if (next !== undefined) result[nativeKey] = next;
      }
    }
  };
  visit(input);
  if (typeof result.lineHeight === 'number' && result.lineHeight > 0 && result.lineHeight < 4)
    result.lineHeight *= Number(result.fontSize ?? theme.typography.body1.fontSize);
  return result as NativeStyle;
}
export function componentStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): NativeStyle {
  const config = theme.components[name];
  const override = config?.styleOverrides?.root;
  const base = typeof override === 'function' ? override({ theme, ownerState: props }) : override;
  const variants = (config?.variants ?? []).filter((v) =>
    typeof v.props === 'function'
      ? v.props(props)
      : Object.entries(v.props).every(([k, value]) => props[k] === value),
  );
  return Object.assign(
    {},
    resolveSx(base, theme, { ...context, mode: 'css' }),
    ...variants.map((v) => resolveSx(v.style, theme, { ...context, mode: 'css' })),
    resolveSx(sx, theme, context),
  );
}
