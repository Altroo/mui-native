import type { TextStyle } from 'react-native';
import type { SxProps, SxObject } from './sx';
export type PaletteMode = 'light' | 'dark';
export interface PaletteColor {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}
export interface Palette {
  mode: PaletteMode;
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;
  text: { primary: string; secondary: string; disabled: string };
  background: { default: string; paper: string };
  divider: string;
  action: { disabled: string; disabledBackground: string; selected: string; hover: string };
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
  palette?: DeepPartial<Palette>;
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
const color = (main: string, light: string, dark: string, contrastText = '#fff'): PaletteColor => ({
  main,
  light,
  dark,
  contrastText,
});
export function createTheme(options: ThemeOptions = {}, ...overrides: ThemeOptions[]): Theme {
  const dark = options.palette?.mode === 'dark';
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
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: dark
        ? color('#90caf9', '#e3f2fd', '#42a5f5', '#000')
        : color('#1976d2', '#42a5f5', '#1565c0'),
      secondary: color('#9c27b0', '#ba68c8', '#7b1fa2'),
      error: color('#d32f2f', '#ef5350', '#c62828'),
      warning: color('#ed6c02', '#ff9800', '#e65100'),
      info: color('#0288d1', '#03a9f4', '#01579b'),
      success: color('#2e7d32', '#4caf50', '#1b5e20'),
      text: {
        primary: dark ? '#fff' : 'rgba(0,0,0,0.87)',
        secondary: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
        disabled: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.38)',
      },
      background: { default: dark ? '#121212' : '#fff', paper: dark ? '#121212' : '#fff' },
      divider: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      action: {
        disabled: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)',
        disabledBackground: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        selected: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)',
        hover: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      },
    },
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
  const { spacing: _spacing, ...rest } = options;
  return overrides.reduce<Theme>((theme, next) => merge(theme, next), merge(base, rest));
}
