/* Numeric border transformation follows MIT MUI System 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/css-borders.json.
 * Native parsing/paint: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import { StyleSheet, processColor, type StyleProp } from 'react-native';
import type { NativeStyle } from './sx';

// Composition results are library-owned and mutable; authored RN styles stay readonly.
type OwnedNativeStyle = { -readonly [Property in keyof NativeStyle]: NativeStyle[Property] };

type BorderStyle = 'solid' | 'dotted' | 'dashed' | 'none';
interface BorderDeclaration {
  borderWidth: number | string;
  borderStyle: BorderStyle;
  borderColor: string;
}
const styles = new Set<BorderStyle>(['solid', 'dotted', 'dashed', 'none']);
const keywords: Record<string, number> = { thin: 1, medium: 3, thick: 5 };
/** Only the all-edge shorthand and RN-supported paint styles are translated. */
export function cssBorder(value: unknown): BorderDeclaration | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0
      ? { borderWidth: value, borderStyle: 'solid', borderColor: 'currentColor' }
      : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const tokens = value.trim().split(/\s+(?![^()]*\))/);
  if (tokens.length > 3) return undefined;
  let width: number | string | undefined, style: BorderStyle | undefined, color: string | undefined;
  for (const source of tokens) {
    const token = source.toLowerCase();
    if (styles.has(token as BorderStyle)) {
      if (style !== undefined) return undefined;
      style = token as BorderStyle;
    } else {
      const length = token.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em)?$/);
      if (Object.hasOwn(keywords, token) || length) {
        if (width !== undefined) return undefined;
        if (length) {
          const number = Number(length[1]);
          if (!Number.isFinite(number) || number < 0 || (!length[2] && number !== 0))
            return undefined;
          width = length[2] ? token : 0;
        } else width = keywords[token];
      } else if (token === 'currentcolor' || processColor(token) != null) {
        if (color !== undefined) return undefined;
        color = token === 'currentcolor' ? 'currentColor' : token;
      } else return undefined;
    }
  }
  return {
    borderWidth: width ?? 3,
    borderStyle: style ?? 'none',
    borderColor: color ?? 'currentColor',
  };
}

const widthKey =
  /^border(?:Top|Right|Bottom|Left|Start|End|Block|BlockStart|BlockEnd|Inline|InlineStart|InlineEnd)?Width$/;
interface CssNone {
  /** Present only on a native payload whose used widths were replaced by zero. */
  readonly widths?: Readonly<Record<string, unknown>>;
}
// Only library-owned resolved objects are keys. Native payloads and authored
// objects never carry metadata properties. A genuine native borderStyle clears
// CSS none provenance; width-only layers keep it.
const cssNone = new WeakMap<object, CssNone>();
/** @internal Preserve declaration provenance through an existing owned style clone. */
export function copyNativeBorderStyle<Style extends object>(source: object, target: Style): Style {
  const declaration = cssNone.get(source);
  if (declaration) cssNone.set(target, declaration);
  return target;
}
/** @internal Restore declared widths while composing CSS and genuine native layers. */
export function nativeStyleBorderDeclarations(style: StyleProp<NativeStyle>): OwnedNativeStyle {
  const result: Record<string, unknown> = {};
  let none = false;
  const visit = (entry: StyleProp<NativeStyle>) => {
    if (Array.isArray(entry)) {
      for (const layer of entry) visit(layer);
      return;
    }
    const flat = StyleSheet.flatten(entry);
    if (!flat) return;
    const declaration = cssNone.get(flat);
    const source: Record<string, unknown> = { ...flat };
    if (declaration?.widths) {
      for (const key of Object.keys(source)) if (widthKey.test(key)) delete source[key];
      Object.assign(source, declaration.widths);
    }
    if (declaration) none = true;
    else if (Object.hasOwn(source, 'borderStyle')) none = false;
    Object.assign(result, source);
  };
  visit(style);
  if (none) cssNone.set(result, {});
  return result as OwnedNativeStyle;
}
/** @internal CSS none affects used paint, after every declaration/inline layer. */
export function applyNativeBorderStyle<Style extends NativeStyle>(style: Style): Style {
  const declaration = cssNone.get(style);
  if (!declaration || declaration.widths) return style;
  const widths = Object.fromEntries(Object.entries(style).filter(([key]) => widthKey.test(key)));
  // Marked inputs are owned composition results. Keep their identity so other
  // existing weak metadata (for example CSS text metrics) survives final paint.
  const native: OwnedNativeStyle = style;
  native.borderStyle = 'solid';
  native.borderWidth = 0;
  for (const key of Object.keys(widths)) (native as Record<string, unknown>)[key] = 0;
  cssNone.set(native, Object.freeze({ widths: Object.freeze(widths) }));
  return style;
}
/** @internal Mark CSS provenance before replacing unsupported native paint values. */
export function finishCssBorderStyle<Style extends NativeStyle>(style: Style): Style {
  if (String(style.borderStyle) !== 'none') return style;
  const native: OwnedNativeStyle = style;
  native.borderStyle = 'solid';
  cssNone.set(style, {});
  return applyNativeBorderStyle(style);
}
/** @internal Decorative native slots inherit the CSS value, not its used-paint encoding. */
export function nativeStyleBorderStyle(style: NativeStyle): NativeStyle['borderStyle'] | 'none' {
  return cssNone.has(style) ? 'none' : style.borderStyle;
}
