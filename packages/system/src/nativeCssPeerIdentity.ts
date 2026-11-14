// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Class identity belongs to accepted CSS, independent of current native paint.
import type { CSSPeerIdentity } from '@altroo/mui-native-host/internal/css-peer';
import type { NativePreparedStyle } from './nativeStyledMetadata';
export type NativeStyleClassIdentity = Readonly<{
  cacheKey: string;
  css: string;
  sourceOwners: readonly string[];
  selectorOwners?: readonly string[];
}>;
// Decode only owned immutable programme data during preparation. Physical
// peer refreshes consume these snapshots without evaluating CSS callbacks.
export function nativeCssClassIdentities(
  prepared: NativePreparedStyle,
): readonly NativeStyleClassIdentity[] {
  const own = prepared.sheets.find(
    (sheet) => !sheet.ancestor && !sheet.emissionForeign,
  )?.emissionProgramme;
  const tokens = prepared.classTokens ?? (own ? [own] : []);
  return Object.freeze(
    tokens.map((token) => {
      const sourceOwners: string[] = [];
      const selectorOwners: string[] = [];
      const visit = (programme: typeof token.programme) => {
        if (programme.kind === 'owner') {
          sourceOwners.push(programme.owner.css);
          if (programme.owner.selectorOwner) selectorOwners.push(programme.owner.selectorOwner);
        } else if (programme.kind === 'sequence') programme.parts.forEach(visit);
        else {
          visit(programme.own);
          programme.classes.forEach(visit);
        }
      };
      visit(token.programme);
      return Object.freeze({
        cacheKey: token.insertion.cache.key,
        css: token.insertion.css,
        sourceOwners: Object.freeze(sourceOwners),
        ...(selectorOwners.length ? { selectorOwners: Object.freeze(selectorOwners) } : {}),
      });
    }),
  );
}

// Match UTF-8 native byte bounds without allocating an encoded CSS copy.
function utf8Size(value: string): number {
  let size = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) size++;
    else if (code < 0x800) size += 2;
    else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      i + 1 < value.length &&
      value.charCodeAt(i + 1) >= 0xdc00 &&
      value.charCodeAt(i + 1) <= 0xdfff
    ) {
      size += 4;
      i++;
    } else size += 3;
  }
  return size;
}
/** Over-budget metadata is unknown, preserving the same ordinary native host.
 * Empty known classes and unavailable identity must never be conflated.
 */
export function nativeCssPeerIdentity(
  prepared: NativePreparedStyle,
  expanded: boolean,
  owner?: string,
): CSSPeerIdentity | null {
  const tokens = nativeCssClassIdentities(prepared);
  if (tokens.length > 64) return null;
  let bytes = 0;
  const classes = [];
  for (const token of tokens) {
    bytes += utf8Size(token.cacheKey) + utf8Size(token.css);
    if (bytes > 1024 * 1024) return null;
    classes.push(
      Object.freeze({
        cacheKey: token.cacheKey,
        css: token.css,
        eligible: !!owner && token.selectorOwners?.includes(owner) === true,
      }),
    );
  }
  return Object.freeze({ expanded, classes: Object.freeze(classes) });
}
