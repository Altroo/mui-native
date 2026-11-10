// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// An isolated installed consumer prevents augmentation from leaking between fixtures.
import { useTheme as materialRootTheme } from '@mui/material';
import { useTheme as materialStylesTheme, type Theme } from '@mui/material/styles';
import materialDeepTheme from '@mui/material/styles/useTheme';
import {
  useTheme as systemRootTheme,
  useThemeWithoutDefault,
  systemDefaultTheme,
} from '@mui/system';
import systemDeepTheme, { systemDefaultTheme as deepDefault } from '@mui/system/useTheme';
import withoutDefaultDeep from '@mui/system/useThemeWithoutDefault';

declare module '@mui/material/styles' {
  interface Theme {
    readingToken: string;
  }
}

export function ThemeReadingConsumer() {
  const root: Theme = materialRootTheme();
  const styles: Theme = materialStylesTheme();
  const deep: Theme = materialDeepTheme();
  const custom: { token: number } = materialDeepTheme<{ token: number }>();
  const augmented: string = styles.readingToken;
  const nullable: null = useThemeWithoutDefault();
  const nullableDeep: null = withoutDefaultDeep();
  const fallback = { token: 1 as const };
  const exact: 1 = systemRootTheme(fallback).token;
  const exactDeep: 1 = systemDeepTheme(fallback).token;
  const retained: typeof fallback = withoutDefaultDeep(fallback);
  const flag: boolean = useThemeWithoutDefault(false);
  const explicitNull: null = systemDeepTheme(null);
  const defaultRoot: typeof systemDefaultTheme = deepDefault;
  // @ts-expect-error Material's hook has no fallback argument.
  materialStylesTheme({});
  // @ts-expect-error An explicit generic constrains the supplied System fallback.
  systemDeepTheme<{ token: number }>({ token: 'wrong' });
  void [
    root,
    styles,
    deep,
    custom,
    augmented,
    nullable,
    nullableDeep,
    exact,
    exactDeep,
    retained,
    flag,
    explicitNull,
    defaultRoot,
  ];
  return null;
}
