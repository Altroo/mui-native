// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Compile the same strict contract against original MUI and fresh native archives.
import { useThemeProps as systemRoot } from '@mui/system';
import systemDeep, { type ThemeWithProps, type ThemedProps } from '@mui/system/useThemeProps';
import { useThemeProps as materialRoot } from '@mui/material';
import { useThemeProps as materialStyles } from '@mui/material/styles';
import materialDeep, {
  type ThemeWithProps as MaterialThemeWithProps,
} from '@mui/material/styles/useThemeProps';

const name = Symbol('component');
type CustomTheme = { components: Record<typeof name, { defaultProps: { fallback: 'source' } }> };
export const defaultType: ThemedProps<CustomTheme, typeof name> = { fallback: 'source' };
export const systemOptional: ThemeWithProps = { components: undefined };
export const materialOptional: MaterialThemeWithProps = { components: undefined };
export function ThemePropsConsumer() {
  const theme: CustomTheme = { components: { [name]: { defaultProps: { fallback: 'source' } } } };
  const explicit = systemDeep<CustomTheme, { own: number }, typeof name>({
    props: { own: 4 },
    name,
    defaultTheme: theme,
    themeId: undefined,
  });
  const inferred = systemRoot({ props: { own: 4 }, name, defaultTheme: theme });
  const explicitDefault: 'source' = explicit.fallback;
  const inferredDefault: 'source' = inferred.fallback;
  const nil: null = systemDeep({
    props: null,
    name: 2,
    defaultTheme: undefined,
    themeId: undefined,
  });
  const scalar: number = systemRoot({ props: 7, name: 'Probe' });
  const material: null = materialDeep<{}, null, typeof name>({ props: null, name });
  const root: { own: number } = materialRoot({ props: { own: 4 }, name: 2 });
  const styles: { own: number } = materialStyles({ props: { own: 4 }, name: 'Probe' });
  const untouched = systemDeep({ props: { own: 1 }, name: 'Probe' });
  // @ts-expect-error An unspecified theme cannot fabricate a known default key.
  const missing: string = untouched.fallback;
  // @ts-expect-error Component names preserve PropertyKey, excluding booleans.
  systemDeep({ props: {}, name: true });
  // @ts-expect-error Material's wrapper does not expose a caller fallback theme.
  materialDeep({ props: {}, name: 'Probe', defaultTheme: {} });
  void [explicitDefault, inferredDefault, nil, scalar, material, root, styles, missing];
  return null;
}
