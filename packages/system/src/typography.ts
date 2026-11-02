import type { CSSProperties } from 'react';
import type { Palette } from './theme';
import { merge } from './theme';

// Adapted from @mui/material 9.5.0 createTypography (MIT).
// Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
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
export interface FontStyle {
  fontFamily: string;
  fontSize: number;
  fontWeightLight: CSSProperties['fontWeight'];
  fontWeightRegular: CSSProperties['fontWeight'];
  fontWeightMedium: CSSProperties['fontWeight'];
  fontWeightBold: CSSProperties['fontWeight'];
  htmlFontSize: number;
}
export interface FontStyleOptions extends Partial<FontStyle> {
  allVariants?: CSSProperties;
}
export interface TypographyStyle extends CSSProperties {
  [key: string]: unknown;
}
export interface TypographyStyleOptions extends TypographyStyle {}
export interface TypographyUtils {
  pxToRem: (px: number) => string;
}
export interface TypographyVariants
  extends Record<TypographyVariant, TypographyStyle>,
    FontStyle,
    TypographyUtils {}
export interface TypographyVariantsOptions
  extends Partial<Record<TypographyVariant, TypographyStyleOptions> & FontStyleOptions> {
  pxToRem?: (px: number) => string;
}
export type TypographyOptions =
  | TypographyVariantsOptions
  | ((palette: Palette) => TypographyVariantsOptions);
export const defaultTypographyFontFamily = '"Roboto", "Helvetica", "Arial", sans-serif';

export function createTypography(
  palette: Palette,
  typography: TypographyOptions = {},
): TypographyVariants {
  const {
    fontFamily = defaultTypographyFontFamily,
    fontSize = 14,
    fontWeightLight = 300,
    fontWeightRegular = 400,
    fontWeightMedium = 500,
    fontWeightBold = 700,
    htmlFontSize = 16,
    allVariants,
    pxToRem: customPxToRem,
    ...other
  } = typeof typography === 'function' ? typography(palette) : typography;
  const coef = fontSize / 14;
  const pxToRem = customPxToRem || ((size: number) => `${(size / htmlFontSize) * coef}rem`);
  const variant = (
    fontWeight: CSSProperties['fontWeight'],
    size: number,
    lineHeight: number,
    letterSpacing: number,
    uppercase = false,
  ): TypographyStyle => ({
    fontFamily,
    fontWeight,
    fontSize: pxToRem(size),
    lineHeight,
    ...(fontFamily === defaultTypographyFontFamily
      ? { letterSpacing: `${Math.round((letterSpacing / size) * 1e5) / 1e5}em` }
      : {}),
    ...(uppercase ? { textTransform: 'uppercase' } : {}),
    ...allVariants,
  });
  return merge(
    {
      htmlFontSize,
      pxToRem,
      fontFamily,
      fontSize,
      fontWeightLight,
      fontWeightRegular,
      fontWeightMedium,
      fontWeightBold,
      h1: variant(fontWeightLight, 96, 1.167, -1.5),
      h2: variant(fontWeightLight, 60, 1.2, -0.5),
      h3: variant(fontWeightRegular, 48, 1.167, 0),
      h4: variant(fontWeightRegular, 34, 1.235, 0.25),
      h5: variant(fontWeightRegular, 24, 1.334, 0),
      h6: variant(fontWeightMedium, 20, 1.6, 0.15),
      subtitle1: variant(fontWeightRegular, 16, 1.75, 0.15),
      subtitle2: variant(fontWeightMedium, 14, 1.57, 0.1),
      body1: variant(fontWeightRegular, 16, 1.5, 0.15),
      body2: variant(fontWeightRegular, 14, 1.43, 0.15),
      button: variant(fontWeightMedium, 14, 1.75, 0.4, true),
      caption: variant(fontWeightRegular, 12, 1.66, 0.4),
      overline: variant(fontWeightRegular, 12, 2.66, 1, true),
      inherit: {
        fontFamily: 'inherit',
        fontWeight: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        letterSpacing: 'inherit',
      },
    } as TypographyVariants,
    other,
  );
}
