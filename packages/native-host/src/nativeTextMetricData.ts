// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Compact, immutable numeric operations. CSS strings never reach the commit path.
export type NativeMetricState = readonly [
  font: number | null,
  height: number | null,
  ratio: number | null,
  spacing: number | null,
];
// Height: retain/absolute/parent ratio/own ratio/font factor/clear/natural.
// Internal height -1 denotes natural metrics; emission uses platform semantics.
// Ratio metadata is separate from computed height, as in ordinary text scopes.
export type NativeMetricStep = readonly [
  fontMode: 0 | 1 | 2 | 3,
  fontValue: number,
  heightMode: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  heightValue: number,
  ratioMode: 0 | 1 | 2,
  ratioValue: number,
  spacingMode: 0 | 1 | 2 | 3,
  spacingValue: number,
  rootSize: number,
  fallbackSize: number,
];
export type NativeMetricBinding = Readonly<{
  owner: string;
  key: string;
  steps: readonly NativeMetricStep[];
}>;
export type OwnedMetricBank = Readonly<{
  key: string;
  base: NativeMetricState;
  cases: readonly NativeMetricStep[];
  ordinary: NativeMetricStep;
  parent: NativeMetricBinding | null;
}>;
export type NativeMetricPresentation = Readonly<{
  binding?: NativeMetricBinding | undefined;
  ordinary: readonly [number | null, number | null, number | null];
  resets: number;
}>;

// Use the common Android/iOS finite range so a JS recipe accepted on one
// platform cannot throw during ordinary conversion on the other.
const maxScalar = 3.4028234663852886e38;
export function isNativeMetricScalar(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= maxScalar;
}
export function isNativeMetricStep(step: NativeMetricStep): boolean {
  return (
    step.length === 10 &&
    step.every(isNativeMetricScalar) &&
    ([0, 2, 4, 6] as const).every(
      (index) =>
        Number.isInteger(step[index]) &&
        step[index] >= 0 &&
        step[index] <= (index === 2 ? 6 : index === 4 ? 2 : 3),
    ) &&
    (step[2] !== 6 || step[4] === 2) &&
    step[1] >= 0 &&
    step[3] >= 0 &&
    step[5] >= 0 &&
    step[8] > 0 &&
    step[9] >= 0
  );
}
function isState(state: NativeMetricState): boolean {
  return (
    state.length === 4 &&
    state.every(
      (value, index) =>
        value === null ||
        (isNativeMetricScalar(value) &&
          (index === 3 || value >= 0 || (index === 1 && value === -1))),
    )
  );
}
function isBinding(binding: NativeMetricBinding): boolean {
  return (
    !!binding.owner &&
    binding.owner.length <= 256 &&
    !!binding.key &&
    binding.key.length <= 4096 &&
    binding.steps.length <= 128 &&
    binding.steps.every(isNativeMetricStep)
  );
}

/** Shared preparation model; native evaluation uses the same finite operations. */
export function applyNativeMetricStep(
  state: NativeMetricState,
  step: NativeMetricStep,
): NativeMetricState | undefined {
  const font =
    step[0] === 0
      ? state[0]
      : step[0] === 1
        ? step[1]
        : step[0] === 2
          ? (state[0] ?? step[8]) * step[1]
          : null;
  const effective = font ?? step[9];
  const height =
    step[2] === 0
      ? state[1]
      : step[2] === 1
        ? step[3]
        : step[2] === 2
          ? state[2] === null
            ? state[1]
            : state[2] * effective
          : step[2] === 5
            ? null
            : step[2] === 6
              ? -1
              : step[3] * effective;
  const ratio = step[4] === 0 ? state[2] : step[4] === 1 ? step[5] : null;
  const spacing =
    step[6] === 0 ? state[3] : step[6] === 1 ? step[7] : step[6] === 2 ? step[7] * effective : null;
  if (
    [font, height, ratio, spacing].some(
      (value) => value !== null && !isNativeMetricScalar(value),
    ) ||
    (font !== null && font < 0) ||
    (height !== null && height < 0 && height !== -1) ||
    (ratio !== null && ratio < 0)
  )
    return;
  return Object.freeze([font, height, ratio, spacing]);
}
export function prepareNativeMetricBank(
  cases: readonly NativeMetricStep[],
  ordinary: NativeMetricStep,
  base: NativeMetricState,
  parent?: NativeMetricBinding,
): OwnedMetricBank | undefined {
  if (
    !isState(base) ||
    (parent && !isBinding(parent)) ||
    cases.length !== 8 ||
    [ordinary, ...cases].some(
      (step) => !isNativeMetricStep(step) || !applyNativeMetricStep(base, step),
    )
  )
    return;
  // Local rules/base distinguish same-owner roots. The exact parent binding is
  // separate, preventing recursive/exponential key expansion through ancestors.
  const key = JSON.stringify([base, ordinary, cases, parent?.owner ?? null]);
  if (key.length > 4096) return;
  return Object.freeze({
    key,
    base,
    ordinary,
    cases: Object.freeze([...cases]),
    parent: parent ?? null,
  });
}
