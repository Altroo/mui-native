// Adapted from @mui/system 9.5.0 colorManipulator (MIT).
// Copyright (c) 2014 Call-Em-All. Full permission notice: root NOTICE.
// Source provenance and adaptations: upstream/reuse.json.
export type ColorFormat = 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'color';
export interface ColorObject {
  type: ColorFormat;
  values: [number, number, number] | [number, number, number, number];
  colorSpace?: 'srgb' | 'display-p3' | 'a98-rgb' | 'prophoto-rgb' | 'rec-2020';
}
function clamp(value: number) {
  if (process.env.NODE_ENV !== 'production' && (value < 0 || value > 1)) {
    console.error(`MUI Native: Color coefficient ${value} is outside [0, 1].`);
  }
  return Math.min(1, Math.max(0, value));
}
export function hexToRgb(color: string): string {
  const hex = color.slice(1);
  const parts = hex.match(new RegExp(`.{1,${hex.length >= 6 ? 2 : 1}}`, 'g'));
  if (!parts) return '';
  const channels = parts.map((part, index) => {
    const value = parseInt(part.length === 1 ? part + part : part, 16);
    return index === 3 ? Math.round((value / 255) * 1000) / 1000 : value;
  });
  return `rgb${parts.length === 4 ? 'a' : ''}(${channels.join(', ')})`;
}
export function decomposeColor(color: string): ColorObject {
  if (color.startsWith('#')) return decomposeColor(hexToRgb(color));
  const marker = color.indexOf('(');
  const type = color.slice(0, marker) as ColorFormat;
  if (!['rgb', 'rgba', 'hsl', 'hsla', 'color'].includes(type)) {
    throw new Error(
      `MUI Native: Unsupported color ${color}. Use hex, rgb(), rgba(), hsl(), hsla() or color().`,
    );
  }
  const body = color.slice(marker + 1, -1);
  const parts = body.split(type === 'color' ? ' ' : ',');
  let colorSpace: ColorObject['colorSpace'];
  if (type === 'color') {
    colorSpace = parts.shift() as ColorObject['colorSpace'];
    if (!['srgb', 'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec-2020'].includes(colorSpace ?? '')) {
      throw new Error(`MUI Native: Unsupported color space ${colorSpace}.`);
    }
    if (parts.length === 4 && parts[3].startsWith('/')) parts[3] = parts[3].slice(1);
  }
  return { type, values: parts.map(parseFloat) as ColorObject['values'], colorSpace };
}
function compose(
  type: ColorFormat,
  values: (number | string)[],
  colorSpace?: ColorObject['colorSpace'],
): string {
  const channels = values.map((value, index) => {
    if (type.includes('rgb') && index < 3) return parseInt(String(value), 10);
    if (type.includes('hsl') && (index === 1 || index === 2)) return `${value}%`;
    return value;
  });
  return type === 'color'
    ? `color(${colorSpace} ${channels.join(' ')})`
    : `${type}(${channels.join(', ')})`;
}
export function recomposeColor(color: ColorObject): string {
  return compose(color.type, color.values, color.colorSpace);
}
export function colorChannel(color: string): string {
  const parsed = decomposeColor(color);
  return parsed.values
    .slice(0, 3)
    .map((value, index) => (parsed.type.includes('hsl') && index !== 0 ? `${value}%` : value))
    .join(' ');
}
export function rgbToHex(color: string): string {
  if (color.startsWith('#')) return color;
  return (
    '#' +
    decomposeColor(color)
      .values.map((value, index) =>
        (index === 3 ? Math.round(255 * value) : value).toString(16).padStart(2, '0'),
      )
      .join('')
  );
}
export function hslToRgb(color: string): string {
  const parsed = decomposeColor(color);
  const [hue, saturation, lightness] = parsed.values;
  const light = lightness / 100;
  const amplitude = (saturation / 100) * Math.min(light, 1 - light);
  const channel = (offset: number) => {
    const phase = (offset + hue / 30) % 12;
    return Math.round((light - amplitude * Math.max(Math.min(phase - 3, 9 - phase, 1), -1)) * 255);
  };
  const values = [channel(0), channel(8), channel(4)];
  if (parsed.type === 'hsla') values.push(parsed.values[3]!);
  return compose(parsed.type === 'hsla' ? 'rgba' : 'rgb', values);
}
export function getLuminance(color: string): number {
  const parsed = decomposeColor(color);
  const values = parsed.type.includes('hsl')
    ? decomposeColor(hslToRgb(color)).values
    : parsed.values;
  const [red, green, blue] = values.map((value) => {
    const normalized = parsed.type === 'color' ? value : value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return Number((0.2126 * red + 0.7152 * green + 0.0722 * blue).toFixed(3));
}
export function getContrastRatio(foreground: string, background: string): number {
  const first = getLuminance(foreground);
  const second = getLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export function alpha(color: string, value: number): string {
  const parsed = decomposeColor(color);
  const opacity = clamp(value);
  const type = parsed.type === 'rgb' ? 'rgba' : parsed.type === 'hsl' ? 'hsla' : parsed.type;
  return compose(
    type,
    [...parsed.values.slice(0, 3), type === 'color' ? `/${opacity}` : opacity],
    parsed.colorSpace,
  );
}
function shift(color: string, coefficient: number, lighter: boolean): string {
  const parsed = decomposeColor(color);
  const amount = clamp(coefficient);
  const values = parsed.values.map((value, index) => {
    if (index === 3 || (parsed.type.includes('hsl') && index !== 2)) return value;
    const ceiling = parsed.type.includes('hsl') ? 100 : parsed.type === 'color' ? 1 : 255;
    return lighter ? value + (ceiling - value) * amount : value * (1 - amount);
  });
  return compose(parsed.type, values, parsed.colorSpace);
}
export function darken(color: string, coefficient: number): string {
  return shift(color, coefficient, false);
}
export function lighten(color: string, coefficient: number): string {
  return shift(color, coefficient, true);
}
export function emphasize(color: string, coefficient = 0.15): string {
  return getLuminance(color) > 0.5 ? darken(color, coefficient) : lighten(color, coefficient);
}
export function blend(background: string, overlay: string, opacity: number, gamma = 1): string {
  const base = decomposeColor(background).values;
  const top = decomposeColor(overlay).values;
  return compose(
    'rgb',
    base
      .slice(0, 3)
      .map((value, index) =>
        Math.round(
          (value ** (1 / gamma) * (1 - opacity) + top[index] ** (1 / gamma) * opacity) ** gamma,
        ),
      ),
  );
}
function safe(color: string, operation: () => string, warning?: string): string {
  try {
    return operation();
  } catch {
    if (warning && process.env.NODE_ENV !== 'production') console.warn(warning);
    return color;
  }
}
export const private_safeColorChannel = (color: string, warning?: string) =>
  safe(color, () => colorChannel(color), warning);
export const private_safeAlpha = (color: string, value: number, warning?: string) =>
  safe(color, () => alpha(color, value), warning);
export const private_safeDarken = (color: string, coefficient: number, warning?: string) =>
  safe(color, () => darken(color, coefficient), warning);
export const private_safeLighten = (color: string, coefficient: number, warning?: string) =>
  safe(color, () => lighten(color, coefficient), warning);
export const private_safeEmphasize = (color: string, coefficient?: number, warning?: string) =>
  safe(color, () => emphasize(color, coefficient), warning);
