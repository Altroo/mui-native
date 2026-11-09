// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import attributes, {
  colorAttribute,
} from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes';
import { create } from 'react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload';
import { Platform, ReactNativeVersion } from 'react-native';
import vocabulary from './style-vocabulary.json';

// Cache the public bundled-JS version once; no deprecated package import or native version lookup.
const version = ReactNativeVersion?.getVersionString?.();

// RN exports the color descriptor from the same captured mode as its View map.
// Read that descriptor instead of an unsupported private feature-flag import.
const nativeCSSParsing = colorAttribute === true;
const parserModeKnown =
  nativeCSSParsing ||
  (colorAttribute !== null &&
    typeof colorAttribute === 'object' &&
    typeof colorAttribute.process === 'function');
const allowed = new Set(vocabulary.keys);
// Materialize nested data before another branch can observe or mutate it.
// Opaque/animated host values are outside this finite normalized programme.
function snapshotValue(value, active = new Set()) {
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
      value: snapshotValue(value[key], active),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  active.delete(value);
  return result;
}
function snapshot(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style))
    throw new TypeError('An owned style candidate must be a resolved style map');
  const result = {};
  for (const key of Object.keys(style)) {
    if (!allowed.has(key) || !Object.hasOwn(attributes, key))
      throw new TypeError('Unsupported owned View style key: ' + key);
    result[key] = snapshotValue(style[key]);
  }
  return result;
}

/** Encode raw resolved maps once with the exact React Native View processors. */
export function encodeStylePair(profile, normalStyle, lastStyle) {
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
  const normalRaw = snapshot(normalStyle),
    lastRaw = snapshot(lastStyle);
  const normal = create({ style: normalRaw }, { style: attributes }) ?? {};
  const last = create({ style: lastRaw }, { style: attributes }) ?? {};
  // Reset absent counterpart fields after processing. In particular, a raw null
  // transform is invalid input to the JS processor, while a processed null is
  // the renderer's ordinary removal token. Never process that token again.
  for (const key of new Set([...Object.keys(normal), ...Object.keys(last)])) {
    if (!Object.hasOwn(normal, key)) normal[key] = null;
    if (!Object.hasOwn(last, key)) last[key] = null;
  }
  return { normal, last };
}
