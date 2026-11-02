import type { TextStyle } from 'react-native';
import type { SxProps, SxObject } from './sx';
import { darken, lighten, getContrastRatio } from './colorManipulator';

// Palette defaults and augmentation adapted from @mui/material 9.5.0 (MIT).
// Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
export type PaletteMode = 'light' | 'dark';
export interface Color {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  A100: string;
  A200: string;
  A400: string;
  A700: string;
}
export type ColorPartial = Partial<Color>;
export interface CommonColors {
  black: string;
  white: string;
}
export interface TypeText {
  primary: string;
  secondary: string;
  disabled: string;
}
export interface TypeBackground {
  default: string;
  paper: string;
}
export type TypeDivider = string;
export interface TypeAction {
  active: string;
  hover: string;
  hoverOpacity: number;
  selected: string;
  selectedOpacity: number;
  disabled: string;
  disabledOpacity: number;
  disabledBackground: string;
  focus: string;
  focusOpacity: number;
  activatedOpacity: number;
}
export interface SimplePaletteColorOptions {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}
export type PaletteColorOptions = SimplePaletteColorOptions | ColorPartial;
export interface PaletteColor {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}
export type PaletteTonalOffset = number | { light: number; dark: number };
export interface PaletteAugmentColorOptions {
  color: PaletteColorOptions;
  name?: number | string;
  mainShade?: number | string;
  lightShade?: number | string;
  darkShade?: number | string;
}
export interface Palette {
  mode: PaletteMode;
  common: CommonColors;
  grey: Color;
  contrastThreshold: number;
  tonalOffset: PaletteTonalOffset;
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;
  text: TypeText;
  background: TypeBackground;
  divider: TypeDivider;
  action: TypeAction;
  getContrastText: (background: string) => string;
  augmentColor: (options: PaletteAugmentColorOptions) => PaletteColor;
}
export interface PaletteOptions {
  mode?: PaletteMode;
  primary?: PaletteColorOptions;
  secondary?: PaletteColorOptions;
  error?: PaletteColorOptions;
  warning?: PaletteColorOptions;
  info?: PaletteColorOptions;
  success?: PaletteColorOptions;
  common?: Partial<CommonColors>;
  grey?: ColorPartial;
  contrastThreshold?: number;
  tonalOffset?: PaletteTonalOffset;
  text?: Partial<TypeText>;
  background?: Partial<TypeBackground>;
  divider?: TypeDivider;
  action?: Partial<TypeAction>;
  getContrastText?: (background: string) => string;
}
export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle1'
  | 'subtitle2'
  | 'body1'
  | 'body2'
  | 'button'
  | 'caption'
  | 'overline';
export interface ComponentConfig {
  defaultProps?: Record<string, unknown>;
  styleOverrides?: Record<
    string,
    SxObject | ((args: { theme: Theme; ownerState: Record<string, unknown> }) => SxProps)
  >;
  variants?: Array<{
    props: Record<string, unknown> | ((props: Record<string, unknown>) => boolean);
    style: SxProps;
  }>;
}
export interface Theme {
  palette: Palette;
  spacing: (...values: number[]) => string;
  shape: { borderRadius: number };
  direction: 'ltr' | 'rtl';
  typography: Record<TypographyVariant, TextStyle> & { fontFamily: string; htmlFontSize: number };
  breakpoints: { values: Record<string, number> };
  components: Record<string, ComponentConfig>;
}
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};
export interface ThemeOptions {
  palette?: PaletteOptions;
  spacing?: number | ((value: number) => number | string);
  shape?: Partial<Theme['shape']>;
  direction?: Theme['direction'];
  typography?: DeepPartial<Theme['typography']>;
  breakpoints?: DeepPartial<Theme['breakpoints']>;
  components?: Theme['components'];
}
export function merge<T>(base: T, value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return (value === undefined ? base : value) as T;
  const out: Record<string, unknown> = { ...(base as object) };
  for (const [key, next] of Object.entries(value))
    if (!['__proto__', 'prototype', 'constructor'].includes(key))
      out[key] =
        next && typeof next === 'object' && !Array.isArray(next)
          ? merge(out[key] ?? {}, next)
          : next;
  return out as T;
}
function createPalette(options: PaletteOptions = {}): Palette {
  const { mode = 'light', contrastThreshold = 3, tonalOffset = 0.2, ...other } = options;
  const dark = mode === 'dark';
  const getContrastText = (background: string) => {
    const contrast =
      getContrastRatio(background, '#fff') >= contrastThreshold ? '#fff' : 'rgba(0, 0, 0, 0.87)';
    const ratio = getContrastRatio(background, contrast);
    if (process.env.NODE_ENV !== 'production' && ratio < 3) {
      console.error(
        `MUI Native: Contrast ratio ${ratio}:1 for ${contrast} on ${background} is below 3:1.`,
      );
    }
    return contrast;
  };
  const augmentColor = ({
    color,
    name,
    mainShade = 500,
    lightShade = 300,
    darkShade = 700,
  }: PaletteAugmentColorOptions): PaletteColor => {
    const output = { ...color } as Record<string, string>;
    if (!output.main && output[mainShade]) output.main = output[mainShade];
    if (!Object.hasOwn(output, 'main') || typeof output.main !== 'string') {
      throw new Error(
        `MUI Native: Color${name ? ` (${name})` : ''} needs a string main or ${mainShade} shade.`,
      );
    }
    const lightOffset = typeof tonalOffset === 'number' ? tonalOffset : tonalOffset.light;
    const darkOffset = typeof tonalOffset === 'number' ? tonalOffset * 1.5 : tonalOffset.dark;
    if (!output.light)
      output.light = Object.hasOwn(output, lightShade)
        ? output[lightShade]
        : lighten(output.main, lightOffset);
    if (!output.dark)
      output.dark = Object.hasOwn(output, darkShade)
        ? output[darkShade]
        : darken(output.main, darkOffset);
    if (!output.contrastText) output.contrastText = getContrastText(output.main);
    return output as unknown as PaletteColor;
  };
  const defaults = dark
    ? {
        primary: ['#90caf9', '#e3f2fd', '#42a5f5'],
        secondary: ['#ce93d8', '#f3e5f5', '#ab47bc'],
        error: ['#f44336', '#e57373', '#d32f2f'],
        warning: ['#ffa726', '#ffb74d', '#f57c00'],
        info: ['#29b6f6', '#4fc3f7', '#0288d1'],
        success: ['#66bb6a', '#81c784', '#388e3c'],
      }
    : {
        primary: ['#1976d2', '#42a5f5', '#1565c0'],
        secondary: ['#9c27b0', '#ba68c8', '#7b1fa2'],
        error: ['#d32f2f', '#ef5350', '#c62828'],
        warning: ['#ed6c02', '#ff9800', '#e65100'],
        info: ['#0288d1', '#03a9f4', '#01579b'],
        success: ['#2e7d32', '#4caf50', '#1b5e20'],
      };
  const colors = Object.fromEntries(
    Object.entries(defaults).map(([name, [main, light, darkShade]]) => [
      name,
      augmentColor({
        name,
        color: options[name as keyof typeof defaults] ?? { main, light, dark: darkShade },
        ...(name === 'secondary'
          ? { mainShade: 'A400', lightShade: 'A200', darkShade: 'A700' }
          : {}),
      }),
    ]),
  ) as Pick<Palette, keyof typeof defaults>;
  const neutral = dark ? '255, 255, 255' : '0, 0, 0';
  const rgba = (opacity: number) => `rgba(${neutral}, ${opacity})`;
  const base: Palette = {
    ...colors,
    mode,
    contrastThreshold,
    tonalOffset,
    getContrastText,
    augmentColor,
    common: { black: '#000', white: '#fff' },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
      A100: '#f5f5f5',
      A200: '#eeeeee',
      A400: '#bdbdbd',
      A700: '#616161',
    },
    text: {
      primary: dark ? '#fff' : rgba(0.87),
      secondary: rgba(dark ? 0.7 : 0.6),
      disabled: rgba(dark ? 0.5 : 0.38),
      ...(dark ? { icon: rgba(0.5) } : {}),
    },
    background: { default: dark ? '#121212' : '#fff', paper: dark ? '#121212' : '#fff' },
    divider: rgba(0.12),
    action: {
      active: dark ? '#fff' : rgba(0.54),
      hover: rgba(dark ? 0.08 : 0.04),
      hoverOpacity: dark ? 0.08 : 0.04,
      selected: rgba(dark ? 0.16 : 0.08),
      selectedOpacity: dark ? 0.16 : 0.08,
      disabled: rgba(dark ? 0.3 : 0.26),
      disabledBackground: rgba(0.12),
      disabledOpacity: 0.38,
      focus: rgba(0.12),
      focusOpacity: 0.12,
      activatedOpacity: dark ? 0.24 : 0.12,
    },
  };
  return merge(base, other);
}
export function createTheme(options: ThemeOptions = {}, ...overrides: ThemeOptions[]): Theme {
  const scale = options.spacing ?? 8;
  const space = typeof scale === 'function' ? scale : (v: number) => v * scale;
  const typography = Object.fromEntries(
    Object.entries({
      h1: [96, 112, 300],
      h2: [60, 72, 300],
      h3: [48, 56, 400],
      h4: [34, 42, 400],
      h5: [24, 32, 400],
      h6: [20, 32, 500],
      subtitle1: [16, 28, 400],
      subtitle2: [14, 22, 500],
      body1: [16, 24, 400],
      body2: [14, 20, 400],
      button: [14, 24, 500],
      caption: [12, 20, 400],
      overline: [12, 32, 400],
    }).map(([k, [fontSize, lineHeight, weight]]) => [
      k,
      { fontSize, lineHeight, fontWeight: String(weight) },
    ]),
  );
  const base: Theme = {
    palette: createPalette(options.palette),
    spacing: (...values) =>
      (values.length ? values : [1])
        .map((v) => {
          const n = space(v);
          return typeof n === 'number' ? `${n}px` : n;
        })
        .join(' '),
    shape: { borderRadius: 4 },
    direction: 'ltr',
    typography: { ...typography, fontFamily: 'System', htmlFontSize: 16 } as Theme['typography'],
    breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
    components: {},
  };
  const { spacing: _spacing, palette: _palette, ...rest } = options;
  return overrides.reduce<Theme>((theme, next) => merge(theme, next), merge(base, rest));
}
