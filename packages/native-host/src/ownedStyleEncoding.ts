/// <reference path="./ownedStyleRNTypes.d.ts" />
// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import attributes, {
  colorAttribute,
} from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes';
import { create } from 'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload';
import { Platform, ReactNativeVersion } from 'react-native';
import { ownedStyleVocabulary as vocabulary } from './ownedStyleVocabulary';
import type { OwnedStyleProfile } from './ownedStyleMetadata';

// Cache the public bundled-JS version once; no deprecated package import or native version lookup.
const version = ReactNativeVersion?.getVersionString?.();

// RN exports the color descriptor from the same captured mode as its View map.
// Read that descriptor instead of an unsupported private feature-flag import.
const nativeCSSParsing = colorAttribute === true;
const parserModeKnown =
  nativeCSSParsing ||
  (colorAttribute !== null &&
    typeof colorAttribute === 'object' &&
    typeof (colorAttribute as Record<string, unknown>).process === 'function');
const allowed = new Set<string>(vocabulary.keys);
// Materialize nested data before another branch can observe or mutate it.
// Opaque/animated host values are outside this finite normalized programme.
function snapshotValue(value: unknown, active = new Set<object>()): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  )
    return value;
  if (typeof value !== 'object') throw new TypeError('Owned style requires data values');
  if (active.has(value)) throw new TypeError('Owned style cannot contain a cycle');
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!array && prototype !== Object.prototype && prototype !== null)
    throw new TypeError('Owned style requires plain records or arrays');
  active.add(value);
  const result = array ? new Array(value.length) : {};
  for (const key of Object.keys(value)) {
    // Define own data, including names such as __proto__, without setters.
    Object.defineProperty(result, key, {
      value: snapshotValue((value as Record<string, unknown>)[key], active),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  active.delete(value);
  return result;
}
function snapshot(style: unknown): Record<string, unknown> {
  if (!style || typeof style !== 'object' || Array.isArray(style))
    throw new TypeError('An owned style candidate must be a resolved style map');
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(style)) {
    if (!allowed.has(key) || !Object.hasOwn(attributes, key))
      throw new TypeError('Unsupported owned View style key: ' + key);
    result[key] = snapshotValue((style as Record<string, unknown>)[key]);
  }
  return result;
}

function encodeCandidates(
  profile: OwnedStyleProfile,
  styles: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  if (
    typeof version !== 'string' ||
    !parserModeKnown ||
    !profile ||
    profile.rn !== version ||
    profile.platform !== Platform.OS ||
    profile.styleKeys !== vocabulary.sha256 ||
    profile.nativeCSSParsing !== nativeCSSParsing
  )
    throw new Error('Owned style encoder parsing profile mismatch');
  // Snapshot every branch before any processor can observe caller-owned data.
  const raw = styles.map((style) => snapshot(style));
  const values = raw.map((style) => create({ style }, { style: attributes }) ?? {});
  const keys = new Set(values.flatMap((value) => Object.keys(value)));
  // Removal tokens belong after processing: raw null transforms are invalid.
  for (const value of values)
    for (const key of keys) if (!Object.hasOwn(value, key)) value[key] = null;
  return values;
}

/** Encode raw resolved maps once with the exact React Native View processors. */
export function encodeStylePair(
  profile: OwnedStyleProfile,
  normalStyle: Record<string, unknown>,
  lastStyle: Record<string, unknown>,
): { normal: Record<string, unknown>; last: Record<string, unknown> } {
  const [normal, last] = encodeCandidates(profile, [normalStyle, lastStyle]);
  return { normal, last };
}

/** A bounded selector truth table, including singleton first-and-last hosts. */
export function encodeStructuralCases(
  profile: OwnedStyleProfile,
  styles: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!Array.isArray(styles) || styles.length !== 8)
    throw new TypeError('Owned structural style requires eight cases');
  return encodeCandidates(profile, styles);
}

/** Positional bits plus source-class adjacency, supported only by the v2 binary. */
export function encodeAdjacentCases(
  profile: OwnedStyleProfile,
  styles: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!Array.isArray(styles) || styles.length !== 16)
    throw new TypeError('Owned adjacent style requires sixteen cases');
  return encodeCandidates(profile, styles);
}
