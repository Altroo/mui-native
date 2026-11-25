// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Font selection carries owned primitives, never caller arrays or variation records.
export const nativeFontKeys = Object.freeze([
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontVariationSettings',
] as const);
export type NativeFontValues = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];
export type NativeFontState = Readonly<{ values: NativeFontValues; blocked: number }>;
export type NativeFontStep = NativeFontState & Readonly<{ owns: number }>;
export type NativeFontBinding = Readonly<{
  owner: string;
  key: string;
  steps: readonly NativeFontStep[];
}>;
export type NativeFontBank = Readonly<{
  key: string;
  base: NativeFontState;
  cases: readonly NativeFontStep[];
  ordinary: NativeFontStep;
  parent: NativeFontBinding | null;
}>;
export type NativeFontPresentation = Readonly<{
  binding: NativeFontBinding | undefined;
  ordinary: NativeFontState;
}>;
/** Native identities are bounded in UTF-8 bytes; JS code-unit length is insufficient. */
export function nativeFontIdentityFits(value: string, limit: number): boolean {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes > limit) return false;
  }
  return true;
}
const fieldMask = 31;
const mask = (value: number) => Number.isInteger(value) && value >= 0 && value <= fieldMask;
function state(value: NativeFontState): boolean {
  return (
    mask(value.blocked) &&
    value.values.length === 5 &&
    value.values.every(
      (entry, index) =>
        (entry === null || (typeof entry === 'string' && entry.length <= 4096)) &&
        (!(value.blocked & (1 << index)) || entry === null),
    )
  );
}
export function isNativeFontStep(value: NativeFontStep): boolean {
  return state(value) && mask(value.owns) && (value.blocked & ~value.owns) === 0;
}
export function applyNativeFontStep(base: NativeFontState, step: NativeFontStep): NativeFontState {
  return Object.freeze({
    values: Object.freeze(
      base.values.map((value, index) => (step.owns & (1 << index) ? step.values[index] : value)),
    ) as NativeFontValues,
    blocked: (base.blocked & ~step.owns) | step.blocked,
  });
}
export function prepareNativeFontBank(
  cases: readonly NativeFontStep[],
  ordinary: NativeFontStep,
  base: NativeFontState,
  parent?: NativeFontBinding,
): NativeFontBank | undefined {
  if (
    !state(base) ||
    cases.length !== 8 ||
    ![ordinary, ...cases].every(isNativeFontStep) ||
    (parent &&
      (!parent.owner ||
        !nativeFontIdentityFits(parent.owner, 256) ||
        !parent.key ||
        !nativeFontIdentityFits(parent.key, 4096) ||
        parent.steps.length > 128 ||
        !parent.steps.every(isNativeFontStep)))
  )
    return;
  // Parent identity is separate from local rules, preventing recursive key growth.
  const key = JSON.stringify([base, ordinary, cases, parent?.owner ?? null]);
  if (!nativeFontIdentityFits(key, 4096)) return;
  return Object.freeze({
    key,
    base,
    ordinary,
    cases: Object.freeze([...cases]),
    parent: parent ?? null,
  });
}
