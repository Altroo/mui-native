// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Style/variant processing adapts MIT MUI System 9.5.0. See NOTICE and upstream/reuse.json.
import {
  I18nManager,
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type {
  Theme,
  Breakpoint,
  ComponentStyleArgs,
  ComponentVariant,
  ComponentVariantArgs,
} from './theme';
export type ResponsiveStyleValue<T> = T | readonly (T | null)[] | { [key: string]: T | null };
import { diagnostic } from './diagnostics';
import { cssBorder, finishCssBorderStyle } from './borders';
import {
  normalizeTextStyle,
  textMetricKeys,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
  type NativeTextContext,
} from './nativeText';
import { nativeBoxShadow, bindShadowColor } from './shadows';
import {
  nativeStyledStyles,
  type NativePreparedNode as PreparedNode,
  type NativeSelectorContext as SelectorContext,
  type NativePreparedSheet as PreparedSheet,
} from './nativeStyledMetadata';
export type SxObject = { [key: string]: unknown };
export type SxProps<T extends Theme = Theme> =
  | null
  | SxObject
  | ((theme: T) => SxObject | null)
  | readonly (false | null | undefined | SxObject | ((theme: T) => SxObject | null))[];
export type NativeStyle = ViewStyle & TextStyle;
export interface NativeStyleTarget {
  readonly classes: readonly string[];
  readonly tag?: string | undefined;
  /** @internal A verified structural fact for this physical target. */
  readonly lastChild?: boolean | undefined;
}
export type { NativePreparedStyle } from './nativeStyledMetadata';
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
  /** @internal Participating physical roots between the owning sheet and its target. */
  descendantPath?: readonly NativeStyleTarget[];
  /** Resolve only descendant branches, leaving root declarations on the actual root. */
  descendantOnly?: boolean;
  /** Internal: keep participating physical joins stable under RN's RTL layout/paint swaps. */
  protectPhysicalGeometry?: boolean | undefined;
  /** Class tokens for this styled root; descendants use their participating token list. */
  classes?: readonly string[];
  /** @internal Unknown is unmatched; native structure must supply this fact. */
  lastChild?: boolean | undefined;
  /** Ancestor component sheets precede this component in the same specificity cascade. */
  ancestors?: readonly {
    theme: Theme;
    name: string;
    props: Record<string, unknown>;
    sx?: SxProps;
    context: Omit<StyleContext, 'ancestors'>;
    /** @internal Recollect retained CSS without rerunning owning callbacks. */
    prepared?: import('./nativeStyledMetadata').NativePreparedStyle;
    /** @internal A composed implementation sheet shares this physical root. */
    sameRoot?: boolean;
  }[];
  logicalInsets?: {
    parentDirection: 'ltr' | 'rtl';
    direction?: 'ltr' | 'rtl' | 'inherit';
  };
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
type StyleRule = {
  style: Readonly<Record<string, unknown>>;
  specificity: number;
  typeSpecificity?: number;
  protectPhysicalGeometry?: boolean;
};
type StyleNode = {
  base: Record<string, unknown>;
  conditions?: Map<string, StyleNode[] | undefined>;
};
function prepareStyle(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext,
): StyleNode[] {
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
      // CSS literals do not use the theme token table. Keep default/SX reads
      // and the existing numeric CSS extension, including numeric strings.
      const shadows =
        mode !== 'css' ||
        typeof value === 'number' ||
        (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value))
          ? theme.shadows
          : undefined;
      const shadow = nativeBoxShadow(value, shadows, theme.cssRootFontSize ?? 16);
      if (shadow) setStyle(target, 'boxShadow', shadow);
      return;
    }
    if (key === 'border') {
      const declaration = cssBorder(value);
      if (!declaration) diagnostic('border', `Unsupported CSS border: ${String(value)}`);
      else {
        const border: StyleNode = { base: {} };
        assign(border, 'borderWidth', declaration.borderWidth, 'css');
        assign(border, 'borderStyle', declaration.borderStyle, 'css');
        // A shorthand color is literal CSS, not a palette token. In particular,
        // keep currentColor deferred even if a custom palette shares its name.
        border.base.borderColor = declaration.borderColor;
        setStyle(target, 'border', border.base);
      }
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
        // rem belongs to the sheet's theme calibration. Keep em, percentages and
        // unitless line height deferred until the complete root font cascade.
        if (typeof next === 'string' && /rem\s*\)?$/i.test(next)) {
          const absolute = length(next.trim(), theme);
          if (typeof absolute === 'number') next = `${absolute}px`;
        }
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
        const branches = build(original, mode);
        // Validate once while preparing the sheet. Rebinding a supported root
        // selector later must not evaluate callbacks or duplicate diagnostics.
        if (key.startsWith('&') && !parseSelectors(key)) {
          diagnostic(
            'selector',
            `Unsupported selector ${key}; use native slots or supported Mui state selectors.`,
          );
        } else if (!key.startsWith('@media') || matchesMedia(key, context.width ?? 0)) {
          conditions(node).set(key, branches);
        }
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
  return build(input);
}
// Owned cells expose only cache DATA to prepared-style equality. A shared getter
// avoids callback-identity churn; its source/reader stays private in the WeakMap.
type LastChildCell = { resolved: boolean; value: boolean | undefined };
type LastChildReader = (() => boolean | undefined) & {
  readonly cell: LastChildCell;
  captureCopied(copy: Pick<StyleContext, 'lastChild'>): void;
  release(): void;
};
const lastChildCell = Symbol('nativeLastChildCell');
const lastChildReaders = new WeakMap<object, LastChildReader>();
function readBoundLastChild(this: SelectorContext) {
  return lastChildReaders.get(this)?.();
}
// Snapshot only when a matching predicate needs the fact, or an existing
// context spread has already copied it. Never force an unused caller getter.
function deferredLastChild(source: Pick<StyleContext, 'lastChild'> | undefined): LastChildReader {
  const cell: LastChildCell = { resolved: false, value: undefined };
  const read = () => {
    if (!cell.resolved && source !== undefined) {
      cell.value = source.lastChild;
      cell.resolved = true;
      source = undefined;
    }
    return cell.value;
  };
  return Object.assign(read, {
    cell,
    // A retained sheet needs the snapshot, never its caller's obsolete props.
    release() {
      source = undefined;
    },
    // Inspect only library-owned copies, preserving their first observed value.
    captureCopied(copy: Pick<StyleContext, 'lastChild'>) {
      const descriptor = Object.getOwnPropertyDescriptor(copy, 'lastChild');
      if (!cell.resolved && descriptor && 'value' in descriptor) {
        cell.value = descriptor.value;
        cell.resolved = true;
        source = undefined;
      }
    },
  });
}
function bindLastChild<T extends SelectorContext>(context: T, read: LastChildReader): T {
  lastChildReaders.set(context, read);
  Object.defineProperties(context, {
    lastChild: { get: readBoundLastChild, enumerable: false },
    [lastChildCell]: { value: read.cell, enumerable: false },
  });
  return context;
}
type SelectorAtom = { classes: string[]; tag?: string };
function parseSelectors(key: string) {
  const selectors = key.split(',').map((selector) => selector.trim());
  const parsed = selectors.map((selector) => {
    const [head, ...parts] = selector.split(/\s+/);
    const match = head.match(/^&((?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)(:last-child)?$/);
    if (!match) return undefined;
    const atoms: SelectorAtom[] = [];
    for (const part of parts) {
      const descendant = part.match(/^(svg)?((?:\.[a-zA-Z_][a-zA-Z0-9_-]*)*)$/);
      if (!descendant || (!descendant[1] && !descendant[2])) return undefined;
      atoms.push({
        classes: descendant[2].split('.').slice(1),
        ...(descendant[1] ? { tag: descendant[1] } : {}),
      });
    }
    return {
      self: match[1].split('.').slice(1),
      lastChild: Boolean(match[2]),
      atoms,
    };
  });
  return parsed.every(Boolean)
    ? (parsed as {
        self: string[];
        lastChild: boolean;
        atoms: SelectorAtom[];
      }[])
    : undefined;
}
function collectRules(nodes: readonly PreparedNode[], context: SelectorContext): StyleRule[] {
  const rules: StyleRule[] = [];
  const path = context.descendantPath;
  const root = [
    ...(context.classes ?? []),
    ...(context.states ?? []).map((state) => `Mui-${state}`),
  ];
  const collect = (
    nodes: readonly PreparedNode[],
    specificity: number,
    typeSpecificity: number,
    position = -1,
    descendant = false,
  ) => {
    for (const node of nodes) {
      const targetMatched = path
        ? path.length > 0 && position === path.length - 1
        : !context.descendantOnly || descendant;
      if (Object.keys(node.base).length && targetMatched)
        rules.push({
          style: node.base,
          specificity,
          typeSpecificity,
          protectPhysicalGeometry: context.protectPhysicalGeometry,
        });
      for (const [key, branches] of node.conditions ?? []) {
        if (!branches) continue;
        if (key.startsWith('@media')) {
          if (matchesMedia(key, context.width ?? 0))
            collect(branches, specificity, typeSpecificity, position, descendant);
          continue;
        }
        const selectors = parseSelectors(key);
        if (!selectors) continue;
        // One declaration can match several selector-list branches or physical
        // paths. Its greatest matching specificity applies exactly once.
        const matches = new Map<number, { classes: number; tags: number }>();
        for (const selector of selectors) {
          const available = path
            ? position < 0
              ? root
              : path[position].classes
            : [
                ...(descendant ? (context.descendantClasses ?? []) : (context.classes ?? [])),
                ...(context.states ?? []).map((state) => `Mui-${state}`),
              ];
          if (!selector.self.every((name) => available.includes(name))) continue;
          // A pseudo-class contributes class specificity. Never infer an absent
          // structural fact from authored React children or a default boolean.
          if (selector.lastChild) {
            const lastChild = path
              ? position >= 0
                ? path[position].lastChild
                : context.lastChild
              : descendant
                ? undefined
                : context.lastChild;
            if (lastChild !== true) continue;
          }
          const selfSpecificity = selector.self.length + Number(selector.lastChild);
          if (path) {
            let positions = [position];
            for (const atom of selector.atoms) {
              positions = positions.flatMap((previous) =>
                path.flatMap((target, index) =>
                  index > previous &&
                  (!atom.tag || atom.tag === target.tag) &&
                  atom.classes.every((name) => target.classes.includes(name))
                    ? [index]
                    : [],
                ),
              );
            }
            for (const index of positions) {
              const value = {
                classes:
                  selfSpecificity +
                  selector.atoms.reduce((sum, atom) => sum + atom.classes.length, 0),
                tags: selector.atoms.filter((atom) => atom.tag).length,
              };
              const old = matches.get(index);
              if (
                !old ||
                value.classes > old.classes ||
                (value.classes === old.classes && value.tags > old.tags)
              )
                matches.set(index, value);
            }
          } else {
            // Preserve the existing slot/single-class descendant contract for
            // nonparticipating components. Physical chains opt in explicitly.
            if (selector.atoms.length > 1 || selector.atoms.some((atom) => atom.tag)) continue;
            const atom = selector.atoms[0];
            if (
              atom &&
              !atom.classes.every((name) =>
                (context.descendantClasses ?? (context.slot ? [context.slot] : [])).includes(name),
              )
            )
              continue;
            const index = atom ? 0 : position;
            const value = {
              classes: selfSpecificity + (atom?.classes.length ?? 0),
              tags: 0,
            };
            const old = matches.get(index);
            if (!old || value.classes > old.classes) matches.set(index, value);
          }
        }
        for (const [index, match] of matches)
          collect(
            branches,
            specificity + match.classes,
            typeSpecificity + match.tags,
            index,
            descendant || index >= 0,
          );
      }
    }
  };
  collect(nodes, 0, 0);
  return rules;
}
function resolveRules(input: SxProps | undefined, theme: Theme, context: StyleContext) {
  return collectRules(prepareStyle(input, theme, context), context);
}
// Warning history belongs only to our retained prepared declaration records,
// never a global message or caller style. New root-owned sheets remain untracked.
const preparedTextDiagnostics = new WeakMap<object, Set<string>>();
function finishRules(rules: StyleRule[], theme: Theme, context: StyleContext = {}): NativeStyle {
  const result: Record<string, unknown> = {};
  const textOwners: Record<string, Readonly<Record<string, unknown>>> = {};
  // Stable sorting preserves upstream rule order within equal specificity.
  const ordered = rules.sort(
    (a, b) => a.specificity - b.specificity || (a.typeSpecificity ?? 0) - (b.typeSpecificity ?? 0),
  );
  const protectGeometry =
    context.protectPhysicalGeometry || ordered.some((rule) => rule.protectPhysicalGeometry);
  const inheritedDirection =
    context.logicalInsets?.parentDirection ?? context.parentDirection ?? theme.direction;
  let cssDirection: unknown;
  if (context.logicalInsets || protectGeometry)
    for (const rule of ordered)
      if (rule.style.direction != null) cssDirection = rule.style.direction;
  // An authored nullish direction resets Yoga to its inherited direction.
  // Absence keeps the computed CSS direction; optional logicalInsets hints
  // retain their established non-nullish caller priority.
  const nativeDirection =
    protectGeometry && Object.hasOwn(context.nativeStyle ?? {}, 'direction')
      ? (context.nativeStyle?.direction ?? 'inherit')
      : undefined;
  const direction = context.logicalInsets?.direction ?? nativeDirection ?? cssDirection;
  const rtl =
    (direction === 'inherit' || direction == null ? inheritedDirection : direction) === 'rtl';
  for (const rule of ordered) {
    for (const [rawKey, value] of Object.entries(rule.style)) {
      let key = rawKey;
      const logical =
        context.logicalInsets || protectGeometry
          ? key.match(/^(margin|padding)(Start|End)$/)
          : null;
      if (logical) key = logical[1] + ((logical[2] === 'Start') !== rtl ? 'Left' : 'Right');
      if (protectGeometry && (key === 'start' || key === 'end'))
        key = (key === 'start') !== rtl ? 'left' : 'right';
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
      if (textMetricKeys.has(key)) textOwners[key] = rule.style;
    }
  }
  const normalized = normalizeTextStyle(result, theme, context, (code, message, property) => {
    // Native metric overrides do not belong to a prepared CSS declaration.
    const owner = Object.hasOwn(context.nativeTextMetrics ?? {}, property)
      ? undefined
      : textOwners[property];
    const previous = owner && preparedTextDiagnostics.get(owner);
    if (previous) {
      const key = JSON.stringify([code, property, message]);
      if (previous.has(key)) return;
      previous.add(key);
    }
    diagnostic(code, message);
  });
  // CSS border shorthands reset paint to currentColor. Bind after the complete
  // cascade and authored native foreground, never while a parent rule is built.
  // An owned native reset clears CSS foreground and inherits the text scope's
  // parent/default color. An absent native color keeps the computed CSS color.
  const foreground =
    context.nativeStyle && Object.hasOwn(context.nativeStyle, 'color')
      ? (context.nativeStyle.color ?? context.parentTextStyle?.color)
      : (normalized.color ?? context.parentTextStyle?.color);
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
  if (protectGeometry) normalized.direction = rtl ? 'rtl' : 'ltr';
  const globalSwap = I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL;
  const paintSwap =
    globalSwap || (Platform.OS === 'android' && rtl && I18nManager.doLeftAndRightSwapInRTL);
  if (protectGeometry && paintSwap) {
    // Fabric logicalizes physical paint for a globally RTL app. Android also
    // mirrors physical border fallbacks for a locally RTL view, independently
    // of the app direction. Resolve protected CSS after its complete cascade,
    // using the final child direction; native inline styles retain RN semantics.
    const start = rtl ? 'Right' : 'Left';
    const end = rtl ? 'Left' : 'Right';
    for (const [physical, logical] of [
      [start, 'Start'],
      [end, 'End'],
    ] as const) {
      for (const row of ['Top', 'Bottom'] as const) {
        const key = `border${row}${physical}Radius`;
        if (Object.hasOwn(normalized, key)) {
          normalized[`border${row}${logical}Radius`] = normalized[key];
          delete normalized[key];
        }
      }
      for (const channel of ['Color', 'Width'] as const) {
        const key = `border${physical}${channel}`;
        if (Object.hasOwn(normalized, key)) {
          normalized[`border${logical}${channel}`] = normalized[key];
          delete normalized[key];
        }
      }
      // Yoga logicalizes physical layout fields only for the global Fabric
      // swap. A locally RTL Android border-paint swap must not affect them.
      // See the pinned YogaLayoutableShadowNode.cpp swapStyleLeftAndRight.
      if (globalSwap) {
        for (const kind of ['margin', 'padding']) {
          const key = `${kind}${physical}`;
          if (Object.hasOwn(normalized, key)) {
            normalized[`${kind}${logical}`] = normalized[key];
            delete normalized[key];
          }
        }
        const position = physical.toLowerCase();
        if (Object.hasOwn(normalized, position)) {
          normalized[logical.toLowerCase()] = normalized[position];
          delete normalized[position];
        }
      }
    }
  }
  return finishCssBorderStyle(normalized as NativeStyle);
}
export function resolveSx(
  input: SxProps | undefined,
  theme: Theme,
  context: StyleContext = {},
): NativeStyle {
  return finishRules(resolveRules(input, theme, context), theme, context);
}
function componentSheets(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): PreparedSheet[] {
  const readLastChild = deferredLastChild(context);
  const prepare = (input: SxProps | undefined, context: StyleContext): PreparedSheet[] => [
    {
      nodes: prepareStyle(input, theme, context),
      context: bindLastChild(
        {
          classes: context.classes?.slice(),
          states: context.states?.slice(),
          descendantClasses: context.descendantClasses?.slice(),
          descendantPath: context.descendantPath,
          descendantOnly: context.descendantOnly,
          slot: context.slot,
          width: context.width,
          protectPhysicalGeometry: context.protectPhysicalGeometry,
        },
        readLastChild,
      ),
    },
  ];
  const prepareCss = (input: SxProps) => {
    const copy = { ...context, mode: 'css' as const };
    readLastChild.captureCopied(copy);
    return prepare(input, copy);
  };
  type ResolvedLayer = {
    input: unknown;
    // Native callback members of variant arrays are an existing extension.
    // Keep them deferred until selected, with their original merged arguments.
    variantState?: () => ComponentVariantArgs;
  };
  const variantStyleRules = (
    input: unknown,
    variantState: () => ComponentVariantArgs,
  ): PreparedSheet[] => {
    if (typeof input === 'function') return variantStyleRules(input(variantState()), variantState);
    if (Array.isArray(input))
      return input.flatMap((style) => variantStyleRules(style, variantState));
    return prepareCss(input as SxProps);
  };
  const prepareLayers = (layers: readonly ResolvedLayer[]): PreparedSheet[] =>
    layers.flatMap(({ input, variantState }) =>
      variantState ? variantStyleRules(input, variantState) : prepareCss(input as SxProps),
    );
  // Adapted from MIT System 9.5.0 processStyleVariants. Resolution must finish
  // for every override slot before the selected output is prepared as CSS.
  const variants = (
    entries: readonly ComponentVariant[],
    callbackProps: ComponentStyleArgs,
    results: ResolvedLayer[] = [],
  ): ResolvedLayer[] => {
    let mergedVariantState: ComponentVariantArgs | undefined;
    const variantState = () =>
      (mergedVariantState ??= {
        // Retain direct theme fields for the existing native callback extension.
        ...theme,
        ...callbackProps,
        ...callbackProps.ownerState,
        ownerState: callbackProps.ownerState,
      });
    variantLoop: for (let i = 0; i < entries.length; i += 1) {
      const variant = entries[i];
      if (typeof variant.props === 'function') {
        if (!variant.props(variantState())) continue;
      } else {
        for (const key in variant.props)
          if (
            callbackProps[key] !== variant.props[key] &&
            callbackProps.ownerState?.[key] !== variant.props[key]
          )
            continue variantLoop;
      }
      // Preserve the source getter reads and variant method receiver. Do not
      // recursively process an array returned by a variant before selection.
      results.push({
        input: typeof variant.style === 'function' ? variant.style(variantState()) : variant.style,
        variantState,
      });
    }
    return results;
  };
  // Source processStyle resolves functions/arrays and embedded variants. It
  // does not traverse ordinary CSS objects until its resolver selects them.
  const processStyle = (
    input: unknown,
    callbackProps: ComponentStyleArgs,
    baseCallbackProps?: () => ComponentStyleArgs,
  ): ResolvedLayer[] => {
    const resolved =
      typeof input === 'function' ? input(baseCallbackProps?.() ?? callbackProps) : input;
    if (Array.isArray(resolved))
      return resolved.flatMap((style) => processStyle(style, callbackProps, baseCallbackProps));
    if (Array.isArray(resolved?.variants)) {
      const variantProps = baseCallbackProps?.() ?? callbackProps;
      let rootStyle;
      if (resolved.isProcessed) rootStyle = resolved.style;
      else {
        const { variants: _variants, ...otherStyles } = resolved;
        rootStyle = otherStyles;
      }
      return variants(resolved.variants, variantProps, [{ input: rootStyle }]);
    }
    return [{ input: resolved?.isProcessed ? resolved.style : resolved }];
  };
  const overrideProps = { ...context.rootProps, theme, ownerState: props };
  const baseStyle = context.baseStyle;
  // Preserve the native direct-theme snapshot for function/array bases. Static
  // bases only need arguments after processStyle's existing variants read has
  // selected that path; do not add observable Proxy presence/descriptor traps.
  let baseCallbackProps: ComponentStyleArgs | undefined;
  const resolveBaseCallbackProps = () => (baseCallbackProps ??= { ...theme, ...overrideProps });
  const eagerBase = typeof baseStyle === 'function' || Array.isArray(baseStyle);
  const baseRules = prepareLayers(
    processStyle(
      baseStyle,
      eagerBase ? resolveBaseCallbackProps() : overrideProps,
      eagerBase ? undefined : resolveBaseCallbackProps,
    ),
  );
  const componentConfig = () => {
    // Anonymous styled roots (including Box) have no component theme contract.
    if (!name) return undefined;
    const entry = theme.components[name];
    return entry && typeof entry === 'object' ? entry : undefined;
  };
  const styleOverrides = componentConfig()?.styleOverrides;
  const resolvedOverrides = new Map<string, ResolvedLayer[]>();
  if (styleOverrides) {
    // for-in is intentional: the original includes inherited enumerable slots
    // and interleaves each slot getter with its callback/variant resolution.
    for (const key in styleOverrides)
      resolvedOverrides.set(key, processStyle(styleOverrides[key], overrideProps));
  }
  const bases = [context.rootSlot ?? 'root', ...(context.overrideKeys ?? [])].flatMap((key) =>
    prepareLayers(resolvedOverrides.get(key) ?? []),
  );
  const componentVariants = context.skipVariants ? [] : (componentConfig()?.variants ?? []);
  return [
    ...baseRules,
    ...bases,
    ...prepareLayers(variants(componentVariants, overrideProps)),
    ...prepare(sx, context),
  ];
}

function prepareComponent(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx: SxProps | undefined,
  context: StyleContext,
): PreparedSheet[] {
  return [
    ...(context.ancestors ?? []).flatMap((sheet) => {
      const readLastChild = deferredLastChild(sheet.context);
      return (
        sheet.prepared
          ? sheet.prepared.sheets.map((prepared) => ({
              ...prepared,
              context: bindLastChild(
                {
                  ...prepared.context,
                  descendantOnly: true,
                  descendantPath: sheet.context.descendantPath,
                  descendantClasses: sheet.context.descendantClasses,
                },
                readLastChild,
              ),
            }))
          : componentSheets(sheet.theme, sheet.name, sheet.props, sheet.sx, sheet.context)
      ).map((prepared) => ({ ...prepared, ancestor: !sheet.sameRoot }));
    }),
    ...componentSheets(theme, name, props, sx, context),
  ];
}
function collectSheets(sheets: readonly PreparedSheet[]): StyleRule[] {
  try {
    return sheets.flatMap((sheet) => collectRules(sheet.nodes, sheet.context));
  } finally {
    // Retained wrappers/ancestors rebind to their current owner before reuse.
    // Unused predicates must not retain the original caller subtree either.
    for (const sheet of sheets) lastChildReaders.get(sheet.context)?.release();
  }
}

export function componentStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx?: SxProps,
  context: StyleContext = {},
): NativeStyle {
  return finishRules(
    collectSheets(prepareComponent(theme, name, props, sx, context)),
    theme,
    context,
  );
}
function retainPreparedNodes(nodes: readonly PreparedNode[]) {
  for (const node of nodes) {
    if (!preparedTextDiagnostics.has(node.base)) preparedTextDiagnostics.set(node.base, new Set());
    for (const branches of node.conditions?.values() ?? [])
      if (branches) retainPreparedNodes(branches);
    // These records/arrays belong to preparation. Do not freeze nested values
    // supplied by callers (for example an authored transform array).
    Object.freeze(node.base);
    Object.freeze(node);
  }
  Object.freeze(nodes);
}
/** @internal Eager native fallback plus prepared CSS for participating library roots. */
export function createNativeStyledStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx: SxProps | undefined,
  context: StyleContext,
  authored: StyleProp<NativeStyle>,
  // A selected owner state may differ from the original prop style presence.
  suppliedStyle?: boolean,
  // First-party construction recipes and prepared CSS only. Ordinary calls keep
  // their original preparation path and one metadata registration.
  composition?: Readonly<{
    layers?: readonly (() => Readonly<{
      theme: Theme;
      name: string;
      props: Record<string, unknown>;
      sx: SxProps | undefined;
      context: StyleContext;
    }>)[];
    forwarded?: StyleProp<NativeStyle>;
  }>,
): StyleProp<NativeStyle> {
  const sheets = composition?.layers
    ? composition.layers.flatMap((prepare) => {
        const layer = prepare();
        return prepareComponent(layer.theme, layer.name, layer.props, layer.sx, layer.context);
      })
    : prepareComponent(theme, name, props, sx, context);
  if (composition?.forwarded) {
    const forwarded = nativeStyledStyles.get(composition.forwarded as object);
    if (!forwarded) throw Error('Expected first-party prepared root CSS');
    sheets.push(...forwarded.sheets);
  }
  for (const sheet of sheets) {
    retainPreparedNodes(sheet.nodes);
    Object.freeze(sheet.context.classes);
    Object.freeze(sheet.context.states);
    Object.freeze(sheet.context.descendantClasses);
    Object.freeze(sheet.context);
    Object.freeze(sheet);
  }
  const computed = finishRules(collectSheets(sheets), theme, context);
  const native = StyleSheet.flatten(authored) ?? undefined;
  const finalStyle = [
    computed,
    applyNativeTextMetrics(native, computed, nativeStyleTextMetrics(authored)),
  ];
  nativeStyledStyles.set(
    finalStyle,
    Object.freeze({
      sheets: Object.freeze(sheets),
      authored,
      hasAuthoredStyle: suppliedStyle ?? (Object.hasOwn(props, 'style') || authored !== undefined),
    }),
  );
  return finalStyle;
}
/** @internal The genuine native layers remain separate from the complete CSS cascade. */
export interface NativeRootStyleResult {
  /** @internal Retained full programme from this single resolution. */
  programme?: StyleProp<NativeStyle>;
  computed: NativeStyle;
  authored: StyleProp<NativeStyle>;
  /** @internal Only this physical root's CSS, without inherited sheets. */
  prepared: import('./nativeStyledMetadata').NativePreparedStyle;
}
/**
 * @internal Resolve styles once the participating component knows its final root
 * classes. Outer callbacks keep their original arguments; only selectors bind
 * to this root. Native inline declarations keep RN semantics and apply last.
 */
export function componentRootStyle(
  theme: Theme,
  name: string,
  props: Record<string, unknown>,
  sx: SxProps | undefined,
  authored: StyleProp<NativeStyle>,
  context: StyleContext = {},
  retainProgramme = false,
): NativeRootStyleResult {
  const wrappers: PreparedSheet[] = [];
  const native: StyleProp<NativeStyle>[] = [];
  const readLastChild = deferredLastChild(context);
  const visit = (style: StyleProp<NativeStyle>) => {
    const descriptor =
      style && typeof style === 'object' ? nativeStyledStyles.get(style) : undefined;
    if (descriptor) {
      wrappers.push(
        ...descriptor.sheets.map((sheet) =>
          sheet.ancestor
            ? sheet
            : {
                ...sheet,
                context: bindLastChild(
                  {
                    ...sheet.context,
                    classes: context.classes,
                    states: context.states,
                  },
                  readLastChild,
                ),
              },
        ),
      );
      visit(descriptor.authored);
    } else if (Array.isArray(style)) {
      for (const layer of style) visit(layer);
    } else if (style) native.push(style);
  };
  visit(authored);
  const copiedContext = {
    ...context,
    nativeStyle: StyleSheet.flatten(native) ?? undefined,
    nativeTextMetrics: nativeStyleTextMetrics(native),
  };
  readLastChild.captureCopied(copiedContext);
  const finalContext = bindLastChild(copiedContext, readLastChild);
  const sheets = [...prepareComponent(theme, name, props, sx, finalContext), ...wrappers];
  const ownSheets = sheets.filter((sheet) => !sheet.ancestor);
  for (const sheet of ownSheets) retainPreparedNodes(sheet.nodes);
  const result: NativeRootStyleResult = {
    computed: finishRules(collectSheets(sheets), theme, finalContext),
    authored: native,
    prepared: Object.freeze({ sheets: Object.freeze(ownSheets) }),
  };
  if (!retainProgramme) return result;
  const programme = [result.computed, ...native];
  nativeStyledStyles.set(
    programme,
    Object.freeze({
      sheets: Object.freeze([...sheets]),
      authored: native,
      hasAuthoredStyle: native.length > 0,
    }),
  );
  return { ...result, programme };
}
