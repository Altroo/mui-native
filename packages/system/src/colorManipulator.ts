'use strict';

// Adapted from @mui/system 9.5.0 colorManipulator (MIT).
// Copyright (c) 2014 Call-Em-All. Full permission notice: root NOTICE.
// Source provenance and adaptations: upstream/reuse.json.
// Native implementation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export type ColorFormat = 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'color';
export interface ColorObject {
  type: ColorFormat;
  values: [number, number, number] | [number, number, number, number];
  colorSpace?: 'srgb' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec-2020' | undefined;
}
function clamp(value: number) {
  if (process.env.NODE_ENV !== 'production' && (value < 0 || value > 1))
    console.error(`MUI Native: The value provided ${value} is out of range [0, 1].`);
  return Math.max(0, Math.min(value, 1));
}
export function hexToRgb(color: string): string {
  color = color.slice(1);
  let parts: string[] | null = color.match(new RegExp(`.{1,${color.length >= 6 ? 2 : 1}}`, 'g'));
  // Expand the complete short form, rather than a trailing odd-length group.
  if (parts && parts[0].length === 1) parts = parts.map((part) => part + part);
  if (process.env.NODE_ENV !== 'production' && color.length !== color.trim().length)
    console.error(
      `MUI Native: The color: "${color}" is invalid. Make sure the color input doesn't contain leading/trailing space.`,
    );
  return parts
    ? `rgb${parts.length === 4 ? 'a' : ''}(${parts
        .map((part, i) =>
          i < 3 ? parseInt(part, 16) : Math.round((parseInt(part, 16) / 255) * 1000) / 1000,
        )
        .join(', ')})`
    : '';
}
function intToHex(value: number) {
  const hex = value.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}
export function decomposeColor(color: string): ColorObject {
  // MUI's implementation also reuses parsed objects internally. Preserve that
  // runtime path without widening its original string-only declarations.
  const existing = color as unknown as ColorObject;
  if (existing.type) return existing;
  if (color.charAt(0) === '#') return decomposeColor(hexToRgb(color));
  const marker = color.indexOf('(');
  const type = color.substring(0, marker) as ColorFormat;
  if (!['rgb', 'rgba', 'hsl', 'hsla', 'color'].includes(type))
    throw new Error(
      `MUI Native: Unsupported \`${color}\` color.\nThe following formats are supported: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla(), color().`,
    );
  const body = color.substring(marker + 1, color.length - 1);
  const parts = body.split(type === 'color' ? ' ' : ',');
  let colorSpace: ColorObject['colorSpace'];
  if (type === 'color') {
    colorSpace = parts.shift() as ColorObject['colorSpace'];
    if (parts.length === 4 && parts[3].charAt(0) === '/') parts[3] = parts[3].slice(1);
    if (
      !(
        ['srgb', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec-2020'] as Array<string | undefined>
      ).includes(colorSpace)
    )
      throw new Error(
        `MUI Native: unsupported \`${colorSpace}\` color space.\nThe following color spaces are supported: srgb, display-p3, a98-rgb, prophoto-rgb, rec-2020.`,
      );
  }
  return {
    type,
    values: parts.map((part) => parseFloat(part)) as ColorObject['values'],
    colorSpace,
  };
}
export const colorChannel = (color: string): string => {
  const parsed = decomposeColor(color);
  return parsed.values
    .slice(0, 3)
    .map((value, i) => (parsed.type.includes('hsl') && i !== 0 ? `${value}%` : value))
    .join(' ');
};
export function recomposeColor(color: ColorObject): string {
  // Preserve source getter order: colorSpace can update the channels before
  // values is read. RGB mapping is local; HSL percentage writes are observable.
  const { type, colorSpace } = color;
  let values = color.values as Array<number | string>;
  if (type.includes('rgb'))
    values = values.map((value, i) => (i < 3 ? parseInt(value as unknown as string, 10) : value));
  else if (type.includes('hsl')) {
    values[1] = `${values[1]}%`;
    values[2] = `${values[2]}%`;
  }
  return type.includes('color')
    ? `${type}(${colorSpace} ${values.join(' ')})`
    : `${type}(${values.join(', ')})`;
}
export function rgbToHex(color: string): string {
  if (color.startsWith('#')) return color;
  const { values } = decomposeColor(color);
  return `#${values.map((value, i) => intToHex(i === 3 ? Math.round(255 * value) : value)).join('')}`;
}
export function hslToRgb(color: string): string {
  const parsed = decomposeColor(color);
  const { values } = parsed;
  const hue = values[0],
    saturation = values[1] / 100,
    lightness = values[2] / 100;
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number, phase = (offset + hue / 30) % 12) =>
    lightness - amplitude * Math.max(Math.min(phase - 3, 9 - phase, 1), -1);
  let type: ColorFormat = 'rgb';
  const rgb = [
    Math.round(channel(0) * 255),
    Math.round(channel(8) * 255),
    Math.round(channel(4) * 255),
  ];
  if (parsed.type === 'hsla') {
    type = 'rgba';
    rgb.push(values[3]!);
  }
  return recomposeColor({ type, values: rgb as ColorObject['values'] });
}
export function getLuminance(color: string): number {
  const parsed = decomposeColor(color);
  const rgb =
    parsed.type === 'hsl' || parsed.type === 'hsla'
      ? decomposeColor(hslToRgb(parsed as unknown as string)).values
      : parsed.values;
  const linear = rgb.map((value) => {
    if (parsed.type !== 'color') value /= 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return Number((0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]).toFixed(3));
}
export function getContrastRatio(foreground: string, background: string): number {
  const first = getLuminance(foreground),
    second = getLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export function alpha(color: string, value: number): string {
  const parsed = decomposeColor(color);
  value = clamp(value);
  if (parsed.type === 'rgb' || parsed.type === 'hsl')
    parsed.type = `${parsed.type}a` as ColorFormat;
  if (parsed.type === 'color') (parsed.values as Array<number | string>)[3] = `/${value}`;
  else parsed.values[3] = value;
  return recomposeColor(parsed);
}
export function darken(color: string, coefficient: number): string {
  const parsed = decomposeColor(color);
  coefficient = clamp(coefficient);
  if (parsed.type.includes('hsl')) parsed.values[2] *= 1 - coefficient;
  else if (parsed.type.includes('rgb') || parsed.type.includes('color'))
    for (let i = 0; i < 3; i++) parsed.values[i]! *= 1 - coefficient;
  return recomposeColor(parsed);
}
export function lighten(color: string, coefficient: number): string {
  const parsed = decomposeColor(color);
  coefficient = clamp(coefficient);
  if (parsed.type.includes('hsl')) parsed.values[2] += (100 - parsed.values[2]) * coefficient;
  else if (parsed.type.includes('rgb'))
    for (let i = 0; i < 3; i++) parsed.values[i]! += (255 - parsed.values[i]!) * coefficient;
  else if (parsed.type.includes('color'))
    for (let i = 0; i < 3; i++) parsed.values[i]! += (1 - parsed.values[i]!) * coefficient;
  return recomposeColor(parsed);
}
export function emphasize(color: string, coefficient = 0.15): string {
  return getLuminance(color) > 0.5 ? darken(color, coefficient) : lighten(color, coefficient);
}
export function blend(background: string, overlay: string, opacity: number, gamma = 1): string {
  const channel = (base: number, top: number) =>
    Math.round((base ** (1 / gamma) * (1 - opacity) + top ** (1 / gamma) * opacity) ** gamma);
  const base = decomposeColor(background),
    top = decomposeColor(overlay);
  return recomposeColor({
    type: 'rgb',
    values: [
      channel(base.values[0], top.values[0]),
      channel(base.values[1], top.values[1]),
      channel(base.values[2], top.values[2]),
    ],
  });
}
function safe(color: string, operation: () => string, warning?: string): string {
  try {
    return operation();
  } catch {
    if (warning && process.env.NODE_ENV !== 'production') console.warn(warning);
    return color;
  }
}
export const private_safeColorChannel = (color: string, warning?: string): string =>
  safe(color, () => colorChannel(color), warning);
export function private_safeAlpha(color: string, value: number, warning?: string): string {
  return safe(color, () => alpha(color, value), warning);
}
export function private_safeDarken(color: string, coefficient: number, warning?: string): string {
  return safe(color, () => darken(color, coefficient), warning);
}
export function private_safeLighten(color: string, coefficient: number, warning?: string): string {
  return safe(color, () => lighten(color, coefficient), warning);
}
export function private_safeEmphasize(
  color: string,
  coefficient?: number,
  warning?: string,
): string {
  return safe(color, () => emphasize(color, coefficient), warning);
}
