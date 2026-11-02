import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme, Breakpoint } from './theme';
export type ResponsiveStyleValue<T> = T | readonly (T | null)[] | { [key: string]: T | null };
import { diagnostic } from './diagnostics';
import { normalizeTextStyle, textMetricKeys, type NativeTextContext } from './nativeText';
export type SxObject = { [key: string]: unknown };
export type SxProps<T extends Theme = Theme> =
  | SxObject
  | ((theme: T) => SxObject)
  | readonly (false | null | undefined | SxObject | ((theme: T) => SxObject))[];
export type NativeStyle = ViewStyle & TextStyle;
export type StyleContext = NativeTextContext & {
  baseStyle?: SxProps;
  overrideKeys?: readonly string[];
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
const numberPattern = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';
const literalLength = new RegExp(`^(${numberPattern})(px|rem)?$`, 'i');
const multipliedLength = new RegExp(
  `^calc\\(\\s*(${numberPattern})\\s*\\*\\s*(${numberPattern})(px|rem|%)\\s*\\)$`,
  'i',
);
const widthCondition = new RegExp(
  `^\\((min|max)-width\\s*:\\s*(${numberPattern})(px|em|rem)\\)$`,
  'i',
);
function length(value: unknown, theme: Theme): unknown {
  if (typeof value !== 'string') return value;
  const literal = value.match(literalLength);
  if (literal)
    return (
      Number(literal[1]) * (literal[2]?.toLowerCase() === 'rem' ? theme.typography.htmlFontSize : 1)
    );
  const multiplied = value.match(multipliedLength);
  if (multiplied) {
    const result = Number(multiplied[1]) * Number(multiplied[2]);
    return multiplied[3] === '%'
      ? `${result}%`
      : result * (multiplied[3].toLowerCase() === 'rem' ? theme.typography.htmlFontSize : 1);
  }
  if (/\b(calc|var)\(|\d(em|vh|vw|pt)\b/.test(value)) {
    diagnostic('css-unit', `Unsupported native length: ${value}`);
    return undefined;
  }
  return value;
}
function matchesMedia(query: string, width: number): boolean {
  const prefix = query.match(/^@media\s+(not all and\s+)?(.+)$/);
  const parts = prefix?.[2].split(/\s+and\s+/);
  if (!parts || !parts.length) {
    diagnostic('media-query', `Unsupported native media query: ${query}`);
    return false;
  }
  let matches = true;
  for (const part of parts) {
    const condition = part.trim().match(widthCondition);
    if (!condition) {
      diagnostic('media-query', `Unsupported native media query: ${query}`);
      return false;
    }
    // CSS media em/rem units use the initial font size, not an element's authored font size.
    const boundary = Number(condition[2]) * (condition[3].toLowerCase() === 'px' ? 1 : 16);
    matches =
      matches && (condition[1].toLowerCase() === 'min' ? width >= boundary : width <= boundary);
  }
  return prefix?.[1] ? !matches : matches;
}
const edges = ['Top', 'Right', 'Bottom', 'Left'] as const;
function setStyle(target: Record<string, unknown>, key: string, value: unknown) {
  // Replacing a transformed CSS key retains its insertion order, as upstream does.
  target[key] = value;
}
function mergeStyles(target: Record<string, unknown>, ...sources: object[]) {
  for (const source of sources)
    for (const [key, value] of Object.entries(source)) setStyle(target, key, value);
  return target;
}
function isSpacingLength(value: unknown, property: string): boolean {
  return (
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' &&
      (/^[+-]?(?:\d+\.?\d*|\.\d+)%$/.test(value) ||
        (property.startsWith('margin') && value === 'auto')))
  );
}
type StyleRule = { style: Record<string, unknown>; specificity: number };
type StyleNode = {
  base: Record<string, unknown>;
  conditions?: Map<string, StyleNode[] | undefined>;
};
function resolveRules(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext,
): StyleRule[] {
  const assign = (node: StyleNode, key: string, value: unknown, mode = context.mode) => {
    const target = node.base;
    if (value == null) {
      // A responsive hole replaces declarations in this media branch only.
      // Retain its key position, then omit it when applying native rules.
      for (const nativeKey of aliases[key] ?? [key]) setStyle(target, nativeKey, value);
      return;
    }
    if (key === 'typography') {
      const style = theme.typography[value as keyof Theme['typography']];
      if (style && typeof style === 'object')
        for (const expanded of build(style, 'css')) mergeNode(node, expanded);
      else diagnostic('typography', `Unknown typography ${String(value)}`);
      return;
    }
    if (key === 'boxShadow') {
      if (typeof value === 'number' && value >= 0)
        setStyle(
          target,
          'boxShadow',
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
      else diagnostic('box-shadow', 'Only numeric theme shadow indices are supported.');
      return;
    }
    if (key === 'border' && typeof value === 'number') {
      setStyle(target, 'border', { borderWidth: value, borderStyle: 'solid' });
      return;
    }
    for (const nativeKey of aliases[key] ?? [key]) {
      if (!allowed.has(nativeKey)) {
        diagnostic('style', `Unsupported native style ${key}`);
        continue;
      }
      let next: unknown = value;
      if (
        mode !== 'css' &&
        typeof next === 'string' &&
        ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle'].includes(nativeKey)
      ) {
        const parts = next.split('.');
        const last = parts.pop()!;
        const alternate = [
          ...parts,
          nativeKey + (last === 'default' ? '' : last[0]?.toUpperCase() + last.slice(1)),
        ].join('.');
        next = path(theme.typography, next) || path(theme.typography, alternate) || next;
      }
      if (typeof next === 'string' && /color$/i.test(nativeKey))
        next = path(theme.palette, next) ?? next;
      if (mode !== 'css' && typeof next === 'number') {
        if (spacing.test(nativeKey)) next = theme.spacing(next);
        else if (nativeKey === 'borderRadius') next *= theme.shape.borderRadius;
        else if (sizing.test(nativeKey) && next > 0 && next <= 1) next = `${next * 100}%`;
      }
      if (typeof next === 'string' && (nativeKey === 'margin' || nativeKey === 'padding')) {
        const tokens = next.trim().match(/calc\([^)]*\)|[^\s]+/g) ?? [];
        if (tokens.length > 1 && tokens.length <= 4) {
          const values = tokens.map((token) => length(token, theme));
          if (values.every((item) => isSpacingLength(item, nativeKey))) {
            const [top, right = top, bottom = top, left = right] = values;
            target[nativeKey] = [top, right, bottom, left];
          } else diagnostic('spacing-value', `Unsupported native ${nativeKey}: ${next}`);
          continue;
        }
      }
      if (textMetricKeys.has(nativeKey)) {
        setStyle(target, nativeKey, next);
        continue;
      }
      const em =
        typeof next === 'string' ? next.match(new RegExp(`^(${numberPattern})em$`, 'i')) : null;
      if (em) {
        setStyle(target, nativeKey, { emLength: Number(em[1]) });
        continue;
      }
      next = length(next, theme);
      if (next === undefined) continue;
      if (spacing.test(nativeKey) && !isSpacingLength(next, nativeKey)) {
        diagnostic('spacing-value', `Unsupported native ${nativeKey}: ${String(next)}`);
        continue;
      }
      setStyle(target, nativeKey, next);
    }
  };
  const conditions = (node: StyleNode) =>
    (node.conditions ??= new Map(
      theme.breakpoints.internal_mediaKeys.map((query) => [query, undefined]),
    ));
  const mergeNode = (target: StyleNode, source: StyleNode) => {
    mergeStyles(target.base, source.base);
    for (const [query, branches] of source.conditions ?? []) {
      if (branches === undefined) continue;
      const previous = conditions(target).get(query);
      if (!branches.length || !previous?.length) conditions(target).set(query, branches);
      else for (const branch of branches) mergeNode(previous[previous.length - 1], branch);
    }
  };
  const build = (raw: unknown, mode = context.mode): StyleNode[] => {
    if (!raw) return [];
    if (typeof raw === 'function') return build(raw(theme), mode);
    if (Array.isArray(raw)) return raw.flatMap((item) => build(item, mode));
    const node: StyleNode = { base: {} };
    for (const [key, entry] of Object.entries(raw as SxObject)) {
      const original = typeof entry === 'function' ? entry(theme) : entry;
      if (original == null) continue;
      if (key.startsWith('@media') || key.startsWith('&')) {
        conditions(node).set(key, build(original, mode));
        continue;
      }
      const responsive =
        key !== 'transform' &&
        key !== 'shadowOffset' &&
        (Array.isArray(original) ||
          (typeof original === 'object' &&
            Object.keys(original).some((name) => Object.hasOwn(theme.breakpoints.values, name))));
      if (!responsive) {
        assign(node, key, original, mode);
        continue;
      }
      const pairs = Array.isArray(original)
        ? Array.from(original, (value, index) => [theme.breakpoints.keys[index], value] as const)
        : Object.entries(original as SxObject);
      for (const [name, value] of pairs) {
        if (!name || !Object.hasOwn(theme.breakpoints.values, name)) {
          diagnostic('breakpoint', `Unknown responsive breakpoint ${String(name)}`);
          continue;
        }
        const query = theme.breakpoints.up(name as Breakpoint);
        const branches = conditions(node).get(query) ?? [];
        if (!branches.length) branches.push({ base: {} });
        assign(branches[branches.length - 1], key, value, mode);
        conditions(node).set(query, branches);
      }
    }
    return [node];
  };
  const rules: StyleRule[] = [];
  const collect = (nodes: StyleNode[], specificity: number) => {
    for (const node of nodes) {
      if (Object.keys(node.base).length) rules.push({ style: node.base, specificity });
      if (!node.conditions) continue;
      for (const [key, branches] of node.conditions) {
        if (!branches) continue;
        if (key.startsWith('@media')) {
          if (matchesMedia(key, context.width ?? 0)) collect(branches, specificity);
          continue;
        }
        const state = key.match(/^&\.Mui-([a-zA-Z]+)$/);
        const slot = key.match(/^& \.(Mui[A-Za-z]+-[a-zA-Z]+)$/);
        if (state) {
          if (context.states?.includes(state[1])) collect(branches, specificity + 1);
          continue;
        }
        if (slot) {
          if (context.slot === slot[1]) collect(branches, specificity + 1);
          continue;
        }
        diagnostic(
          'selector',
          `Unsupported selector ${key}; use native slots or supported Mui state selectors.`,
        );
      }
    }
  };
  collect(build(input), 0);
  return rules;
}
function finishRules(rules: StyleRule[], theme: Theme, context: StyleContext = {}): NativeStyle {
  const result: Record<string, unknown> = {};
  // Stable sorting preserves upstream rule order within equal specificity.
  for (const rule of rules.sort((a, b) => a.specificity - b.specificity)) {
    for (const [key, value] of Object.entries(rule.style)) {
      if (value == null) continue;
      if (key === 'boxShadow' || key === 'border') {
        mergeStyles(result, value as Record<string, unknown>);
        continue;
      }
      if (key === 'margin' || key === 'padding') {
        for (const edge of edges) delete result[key + edge];
        if (Array.isArray(value)) {
          delete result[key];
          for (const [index, edge] of edges.entries()) result[key + edge] = value[index];
          continue;
        }
      }
      if (key === 'gap') {
        delete result.rowGap;
        delete result.columnGap;
      }
      // Reinsert overridden shorthands after old declarations in the computed result.
      delete result[key];
      result[key] = value;
    }
  }
  return normalizeTextStyle(result, theme, context) as NativeStyle;
}
export function resolveSx(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext = {},
): NativeStyle {
  return finishRules(resolveRules(input, theme, context), theme, context);
}
export function componentStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): NativeStyle {
  const config = theme.components[name];
  const bases = ['root', ...(context.overrideKeys ?? [])].flatMap((key) => {
    const override = config?.styleOverrides?.[key];
    const style =
      typeof override === 'function' ? override({ theme, ownerState: props }) : override;
    return resolveRules(style, theme, { ...context, mode: 'css' });
  });
  const variants = (config?.variants ?? []).filter((v) =>
    typeof v.props === 'function'
      ? v.props(props)
      : Object.entries(v.props).every(([k, value]) => props[k] === value),
  );
  return finishRules(
    [
      ...resolveRules(context.baseStyle, theme, { ...context, mode: 'css' }),
      ...bases,
      ...variants.flatMap((v) => resolveRules(v.style, theme, { ...context, mode: 'css' })),
      ...resolveRules(sx, theme, context),
    ],
    theme,
    context,
  );
}
