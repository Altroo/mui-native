import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme, Breakpoint, ComponentVariant, ComponentVariantArgs } from './theme';
export type ResponsiveStyleValue<T> = T | readonly (T | null)[] | { [key: string]: T | null };
import { diagnostic } from './diagnostics';
import { normalizeTextStyle, textMetricKeys, type NativeTextContext } from './nativeText';
import { nativeBoxShadow, bindShadowColor } from './shadows';
export type SxObject = { [key: string]: unknown };
export type SxProps<T extends Theme = Theme> =
  | null
  | SxObject
  | ((theme: T) => SxObject | null)
  | readonly (false | null | undefined | SxObject | ((theme: T) => SxObject | null))[];
export type NativeStyle = ViewStyle & TextStyle;
export type StyleContext = NativeTextContext & {
  baseStyle?: SxProps;
  overrideKeys?: readonly string[];
  width?: number;
  states?: readonly string[];
  slot?: string;
  rootSlot?: string;
  skipVariants?: boolean;
  /** SVG-backed components bind paint declarations as SVG props, never View styles. */
  svg?: boolean;
  /** Final root props may match a source variant independently of owner state. */
  rootProps?: Record<string, unknown>;
  /** Participating native descendants expose finite class tokens to their owning component. */
  descendantClasses?: readonly string[];
  /** Resolve only descendant branches, leaving root declarations on the actual root. */
  descendantOnly?: boolean;
  /** Class tokens for this styled root; descendants use their participating token list. */
  classes?: readonly string[];
  /** Ancestor component sheets precede this component in the same specificity cascade. */
  ancestors?: readonly {
    theme: Theme;
    name: string;
    props: Record<string, unknown>;
    sx?: SxProps;
    context: Omit<StyleContext, 'ancestors'>;
  }[];
  logicalInsets?: { parentDirection: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl' | 'inherit' };
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
  'alignContent alignItems alignSelf aspectRatio backfaceVisibility backgroundColor borderBottomColor borderBottomLeftRadius borderBottomRightRadius borderBottomWidth borderColor borderLeftColor borderLeftWidth borderRadius borderRightColor borderRightWidth borderStyle borderTopColor borderTopLeftRadius borderTopRightRadius borderTopWidth borderWidth bottom color columnGap direction display elevation flex flexBasis flexDirection flexGrow flexShrink flexWrap fontFamily fontSize fontStyle fontWeight gap height justifyContent left letterSpacing lineHeight margin marginTop marginRight marginBottom marginLeft marginStart marginEnd maxHeight maxWidth minHeight minWidth opacity outlineColor outlineOffset outlineStyle outlineWidth overflow padding paddingTop paddingRight paddingBottom paddingLeft paddingStart paddingEnd position right rowGap shadowColor shadowOffset shadowOpacity shadowRadius start end textAlign textDecorationColor textDecorationLine textDecorationStyle textTransform top transform width zIndex'.split(
    ' ',
  ),
);
const svgProperties = new Set(
  'fill fillOpacity fillRule stroke strokeOpacity strokeWidth strokeDasharray strokeDashoffset strokeLinecap strokeLinejoin strokeMiterlimit clipRule clipPath mask vectorEffect'.split(
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
      Number(literal[1]) * (literal[2]?.toLowerCase() === 'rem' ? (theme.cssRootFontSize ?? 16) : 1)
    );
  const multiplied = value.match(multipliedLength);
  if (multiplied) {
    const result = Number(multiplied[1]) * Number(multiplied[2]);
    return multiplied[3] === '%'
      ? `${result}%`
      : result * (multiplied[3].toLowerCase() === 'rem' ? (theme.cssRootFontSize ?? 16) : 1);
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
      const shadow = nativeBoxShadow(value, theme.shadows, theme.cssRootFontSize ?? 16);
      if (shadow) setStyle(target, 'boxShadow', shadow);
      return;
    }
    if (key === 'border' && typeof value === 'number') {
      setStyle(target, 'border', {
        borderWidth: value,
        borderStyle: 'solid',
        borderColor: 'currentColor',
      });
      return;
    }
    for (const nativeKey of aliases[key] ?? [key]) {
      if (!allowed.has(nativeKey) && !(context.svg && svgProperties.has(nativeKey))) {
        diagnostic('style', `Unsupported native style ${key}`);
        continue;
      }
      let next: unknown = value;
      if (
        mode !== 'css' &&
        typeof next === 'string' &&
        next !== 'inherit' &&
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
        else if (nativeKey === 'borderRadius') {
          const radius = theme.shape.borderRadius;
          next =
            typeof radius === 'string'
              ? radius.startsWith('var(') && next === 0
                ? 0
                : radius.startsWith('var(') && next === 1
                  ? radius
                  : `calc(${next} * ${radius})`
              : next * radius;
        } else if (sizing.test(nativeKey) && next > 0 && next <= 1) next = `${next * 100}%`;
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
      if (
        (nativeKey === 'outlineWidth' || nativeKey === 'outlineOffset') &&
        (typeof next !== 'number' ||
          !Number.isFinite(next) ||
          (nativeKey === 'outlineWidth' && next < 0))
      ) {
        diagnostic('outline', `Unsupported native ${nativeKey}: ${String(next)}`);
        continue;
      }
      if (
        nativeKey === 'outlineStyle' &&
        !['solid', 'dotted', 'dashed', 'none'].includes(String(next))
      ) {
        diagnostic('outline', `Unsupported native outlineStyle: ${String(next)}`);
        continue;
      }
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
  const collect = (nodes: StyleNode[], specificity: number, descendant = false) => {
    for (const node of nodes) {
      if (Object.keys(node.base).length && (!context.descendantOnly || descendant))
        rules.push({ style: node.base, specificity });
      if (!node.conditions) continue;
      for (const [key, branches] of node.conditions) {
        if (!branches) continue;
        if (key.startsWith('@media')) {
          if (matchesMedia(key, context.width ?? 0)) collect(branches, specificity, descendant);
          continue;
        }
        const self = key
          .split(',')
          .map((selector) => selector.trim().match(/^&((?:\.[a-zA-Z_][a-zA-Z0-9_-]*)+)$/));
        const selectors = key
          .split(',')
          .map((selector) => selector.trim().match(/^&\s+((?:\.[a-zA-Z_][a-zA-Z0-9_-]*)+)$/));
        if (self.every(Boolean)) {
          const available = [
            ...(descendant ? (context.descendantClasses ?? []) : (context.classes ?? [])),
            ...(context.states ?? []).map((state) => `Mui-${state}`),
          ];
          const matching = self.flatMap((selector) => {
            const classes = selector![1].slice(1).split('.');
            return classes.every((name) => available.includes(name)) ? [classes.length] : [];
          });
          if (matching.length) collect(branches, specificity + Math.max(...matching), descendant);
          continue;
        }
        if (selectors.every(Boolean)) {
          const available = context.descendantClasses ?? (context.slot ? [context.slot] : []);
          const matching = selectors.flatMap((selector) => {
            const classes = selector![1].slice(1).split('.');
            return classes.every((name) => available.includes(name)) ? [classes.length] : [];
          });
          if (matching.length) collect(branches, specificity + Math.max(...matching), true);
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
  const ordered = rules.sort((a, b) => a.specificity - b.specificity);
  let inheritedDirection = context.logicalInsets?.parentDirection ?? theme.direction;
  let cssDirection: unknown;
  if (context.logicalInsets)
    for (const rule of ordered)
      if (rule.style.direction != null) cssDirection = rule.style.direction;
  const direction = context.logicalInsets?.direction ?? cssDirection;
  const rtl =
    (direction === 'inherit' || direction == null ? inheritedDirection : direction) === 'rtl';
  for (const rule of ordered) {
    for (const [rawKey, value] of Object.entries(rule.style)) {
      let key = rawKey;
      const logical = context.logicalInsets && key.match(/^(margin|padding)(Start|End)$/);
      if (logical) key = logical[1] + ((logical[2] === 'Start') !== rtl ? 'Left' : 'Right');
      if (value == null) continue;
      if (key === 'boxShadow' || key === 'border') {
        if (key === 'border')
          for (const expanded of Object.keys(value as Record<string, unknown>))
            for (const edge of edges) delete result['border' + edge + expanded.slice(6)];
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
      // CSS border shorthands replace previously authored individual edges.
      if (key === 'borderColor' || key === 'borderWidth' || key === 'borderStyle')
        for (const edge of edges) delete result['border' + edge + key.slice(6)];
      if (key === 'borderRadius')
        for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'])
          delete result['border' + corner + 'Radius'];
      if (key === 'gap') {
        delete result.rowGap;
        delete result.columnGap;
      }
      // Reinsert overridden shorthands after old declarations in the computed result.
      delete result[key];
      result[key] = value;
    }
  }
  const normalized = normalizeTextStyle(result, theme, context);
  // CSS border shorthands reset paint to currentColor. Bind after the complete
  // cascade and authored native foreground, never while a parent rule is built.
  const foreground =
    context.nativeStyle?.color ?? normalized.color ?? context.parentTextStyle?.color;
  const borderPaint =
    foreground == null || ['inherit', 'unset', 'currentColor'].includes(String(foreground))
      ? theme.palette.text.primary
      : foreground;
  for (const key of [
    'borderColor',
    'outlineColor',
    ...edges.map((edge) => 'border' + edge + 'Color'),
  ])
    if (normalized[key] === 'currentColor') normalized[key] = borderPaint;
  normalized.boxShadow = bindShadowColor(
    normalized.boxShadow as ViewStyle['boxShadow'],
    borderPaint as NonNullable<TextStyle['color']>,
  );
  if (normalized.boxShadow === undefined) delete normalized.boxShadow;
  if (normalized.outlineStyle === 'none') {
    delete normalized.outlineStyle;
    normalized.outlineWidth = 0;
  }
  // SVG presentation attributes sit below CSS. Preserve an explicit reset so
  // the SVG boundary can inherit color instead of resurrecting an attribute.
  if (context.svg && ['inherit', 'unset', 'currentColor'].includes(String(result.color)))
    normalized.color = result.color;
  return normalized as NativeStyle;
}
export function resolveSx(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext = {},
): NativeStyle {
  return finishRules(resolveRules(input, theme, context), theme, context);
}
function componentRules(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): StyleRule[] {
  const entry = theme.components[name];
  const config = entry && typeof entry === 'object' ? entry : undefined;
  // Source callbacks receive merged props, ownerState and theme. Keep theme
  // fields available directly for the existing native style callback extension.
  const createVariantState = (): ComponentVariantArgs => ({
    ...theme,
    ...context.rootProps,
    ...props,
    theme,
    ownerState: props,
  });
  const variantStyleRules = (input: unknown, callbackProps: ComponentVariantArgs): StyleRule[] => {
    if (typeof input === 'function') return variantStyleRules(input(callbackProps), callbackProps);
    if (Array.isArray(input))
      return input.flatMap((style) => variantStyleRules(style, callbackProps));
    return resolveRules(input as SxProps, theme, { ...context, mode: 'css' });
  };
  const variants = (entries: readonly ComponentVariant[]) => {
    let mergedVariantState: ComponentVariantArgs | undefined;
    const variantState = () => (mergedVariantState ??= createVariantState());
    return entries.flatMap((variant) => {
      const matches =
        typeof variant.props === 'function'
          ? variant.props(variantState())
          : Object.entries(variant.props).every(
              ([key, value]) => props[key] === value || context.rootProps?.[key] === value,
            );
      return matches ? variantStyleRules(variant.style, variantState()) : [];
    });
  };
  // Adapted from MIT System 9.5.0 createStyled processStyle/processStyleVariants.
  // An embedded variant belongs to its style layer, even on a non-root slot;
  // skipVariants applies only to the component-level variants resolver.
  const processStyle = (input: unknown, callbackProps: object): StyleRule[] => {
    const resolved = typeof input === 'function' ? input(callbackProps) : input;
    if (Array.isArray(resolved))
      return resolved.flatMap((style) => processStyle(style, callbackProps));
    if (resolved && typeof resolved === 'object' && Array.isArray(resolved.variants)) {
      const { variants: embedded, ...style } = resolved;
      return [...resolveRules(style, theme, { ...context, mode: 'css' }), ...variants(embedded)];
    }
    return resolveRules(resolved as SxProps, theme, { ...context, mode: 'css' });
  };
  const overrideProps = { ...context.rootProps, theme, ownerState: props };
  const baseRules = processStyle(context.baseStyle, { ...theme, ...overrideProps });
  const bases = [context.rootSlot ?? 'root', ...(context.overrideKeys ?? [])].flatMap((key) =>
    processStyle(config?.styleOverrides?.[key], overrideProps),
  );
  return [
    ...baseRules,
    ...bases,
    ...variants(context.skipVariants ? [] : (config?.variants ?? [])),
    ...resolveRules(sx, theme, context),
  ];
}

export function componentStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): NativeStyle {
  if (!context.ancestors?.length)
    return finishRules(componentRules(theme, name, props, sx, context), theme, context);
  const inherited = context.ancestors.flatMap((sheet) =>
    componentRules(sheet.theme, sheet.name, sheet.props, sheet.sx, sheet.context),
  );
  return finishRules(
    [...inherited, ...componentRules(theme, name, props, sx, context)],
    theme,
    context,
  );
}
