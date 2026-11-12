// Static preprocessing adapts MIT MUI System 9.5.0 preprocessStyles/createStyled.
// Copyright (c) MUI contributors. See NOTICE and upstream/reuse.json.
// Native integration: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { serializeStyles } from '@emotion/serialize';
import { snapshotNativeCssValue } from './nativeCssProgram';
import type { SxObject } from './sx';

// Serialized objects belong to this constructor, while the native compiler
// retains the same owned CSS values. Neither path rereads authored CSS getters.
export const nativePreprocessedCss = new WeakMap<object, unknown>();
function serialize(input: unknown) {
  // The original serializer reuses processed variants when a stylesheet is
  // shared by multiple constructors. Keep their original native payload too.
  if (input && typeof input === 'object' && nativePreprocessedCss.has(input))
    return input as ReturnType<typeof serializeStyles>;
  const owned = snapshotNativeCssValue(input);
  const result = serializeStyles([owned as Parameters<typeof serializeStyles>[0][number]]);
  nativePreprocessedCss.set(result, owned);
  return result;
}
function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}
/** Preprocess static styles at constructor creation, as the original does. */
export function preprocessNativeStyledStyle(input: SxObject): SxObject {
  if (input.__emotion_real === input || !isPlainObject(input)) return input;
  const { variants, ...style } = input;
  const result = { variants, style: serialize(style), isProcessed: true };
  // The original replaces each static variant's style with its serialized
  // value. Preserve that observable timing and its two authored getter reads.
  if (variants)
    (variants as { style: unknown }[]).forEach((variant) => {
      if (typeof variant.style !== 'function') variant.style = serialize(variant.style);
    });
  return result;
}
