// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Platform, type ViewProps } from 'react-native';

let percentFormatter: Intl.NumberFormat | undefined;
/** Android RangeInfo must not receive impossible bounds or a nonfinite value. */
export function nativeProgressAccessibilityValue(
  props: Record<string, unknown>,
): ViewProps['accessibilityValue'] {
  const supplied = props.accessibilityValue as ViewProps['accessibilityValue'];
  const min = props['aria-valuemin'] ?? supplied?.min;
  const max = props['aria-valuemax'] ?? supplied?.max;
  const now = props['aria-valuenow'] ?? supplied?.now;
  const text = props['aria-valuetext'] ?? supplied?.text;
  const valid =
    typeof min === 'number' &&
    Number.isFinite(min) &&
    typeof max === 'number' &&
    Number.isFinite(max) &&
    min < max &&
    typeof now === 'number' &&
    Number.isFinite(now) &&
    min <= now &&
    now <= max;
  // RN 0.88's iOS Fabric percentage calculation omits the minimum. Supply
  // localized relative text while keeping numeric bounds and authored text.
  let nativeText = text;
  if (valid && typeof text !== 'string' && Platform.OS === 'ios') {
    percentFormatter ??= new Intl.NumberFormat(undefined, {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    const span = max - min;
    const relative = Number.isFinite(span)
      ? (now - min) / span
      : (now / 2 - min / 2) / (max / 2 - min / 2);
    nativeText = percentFormatter.format(relative);
  }
  return valid
    ? { min, max, now, ...(typeof nativeText === 'string' ? { text: nativeText } : {}) }
    : typeof text === 'string'
      ? { text }
      : undefined;
}
