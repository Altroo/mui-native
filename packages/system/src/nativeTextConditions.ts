// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Finite selector/media processing adapts MIT MUI System 9.5.0. See NOTICE.
// Private same-instance services. No caller data, runtime or native discovery.
import { diagnostic } from './diagnostics';
const allowed = new Set(
  'alignContent alignItems alignSelf aspectRatio backfaceVisibility backgroundColor borderBottomColor borderBottomLeftRadius borderBottomRightRadius borderBottomWidth borderColor borderLeftColor borderLeftWidth borderRadius borderRightColor borderRightWidth borderStyle borderTopColor borderTopLeftRadius borderTopRightRadius borderTopWidth borderWidth bottom color columnGap direction display elevation flex flexBasis flexDirection flexGrow flexShrink flexWrap fontFamily fontSize fontStyle fontWeight gap height justifyContent left letterSpacing lineHeight margin marginTop marginRight marginBottom marginLeft marginStart marginEnd maxHeight maxWidth minHeight minWidth opacity outlineColor outlineOffset outlineStyle outlineWidth overflow padding paddingTop paddingRight paddingBottom paddingLeft paddingStart paddingEnd position right rowGap shadowColor shadowOffset shadowOpacity shadowRadius start end textAlign textDecorationColor textDecorationLine textDecorationStyle textTransform top transform width zIndex'.split(
    ' ',
  ),
);
export const numberPattern = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';
const widthCondition = new RegExp(
  `^\\((min|max)-width\\s*:\\s*(${numberPattern})(px|em|rem)\\)$`,
  'i',
);
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
const relativeLengths = new WeakSet<object>();
/** Brand only the existing System-created nonmetric em node; preserve its DATA shape. */
export function nativeRelativeLength(value: number): { emLength: number } {
  const result = { emLength: value };
  relativeLengths.add(result);
  return result;
}
export const nativeTextIntentStyleServices = Object.freeze({
  parseSelectors,
  matchesMedia,
  allowedCSS: Object.freeze({ has: (key: string) => allowed.has(key) }),
  isDeferredNonmetric: (value: unknown) =>
    typeof value === 'object' && value !== null && relativeLengths.has(value),
});
