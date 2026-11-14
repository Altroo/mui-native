// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { nativeCssPeerIdentity } from '../packages/system/src/nativeCssPeerIdentity';
import { createNativeCssOwner } from '../packages/system/src/nativeCssProgram';
import { createNativeStyleCache, type NativePreparedStyle } from '@altroo/mui-native-system';
const cache = createNativeStyleCache({ key: 'peer-budget' });
afterAll(() => cache.dispose());
function prepared(css: string, count = 1): NativePreparedStyle {
  return {
    sheets: [],
    classTokens: Array.from({ length: count }, (_, i) => {
      const value = count === 1 ? css : css + String(i);
      const owner = Object.freeze({ ...createNativeCssOwner('', {}, [], 'selected'), css: value });
      return {
        programme: { kind: 'owner' as const, owner },
        insertion: { cache, css: value, hasRules: true },
      };
    }),
  };
}
test('known empty classes and unavailable classes remain distinct', () => {
  expect(nativeCssPeerIdentity({ sheets: [], classTokens: [] }, false)).toEqual({
    expanded: false,
    classes: [],
  });
  expect(nativeCssPeerIdentity(prepared('height:4px;', 64), true)?.classes).toHaveLength(64);
  expect(nativeCssPeerIdentity(prepared('height:4px;', 65), true)).toBeNull();
});
test('source eligibility is occurrence-specific while emitted class strings stay intact', () => {
  const input = prepared('height:4px;');
  const own = nativeCssPeerIdentity(input, true, 'selected')!;
  const other = nativeCssPeerIdentity(input, true, 'other')!;
  expect(own.classes[0]).toEqual({ cacheKey: cache.key, css: 'height:4px;', eligible: true });
  expect(other.classes[0]).toEqual({ ...own.classes[0], eligible: false });
  expect(Object.isFrozen(own)).toBe(true);
  expect(Object.isFrozen(own.classes)).toBe(true);
  expect(Object.isFrozen(own.classes[0])).toBe(true);
});
test.each(['a', 'é', '😀', '\ud800'])('UTF-8 budget matches native bytes for %s', (glyph) => {
  const budget = 1024 * 1024 - Buffer.byteLength(cache.key, 'utf8');
  const bytes = Buffer.byteLength(glyph, 'utf8');
  const css = glyph.repeat(Math.floor(budget / bytes));
  expect(nativeCssPeerIdentity(prepared(css), true)).not.toBeNull();
  expect(nativeCssPeerIdentity(prepared(css + glyph), true)).toBeNull();
});
