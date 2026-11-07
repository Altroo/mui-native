// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  createTheme as systemCreateTheme,
  type ComponentConfig,
  type Components as SystemComponents,
  type Theme as SystemTheme,
  type ThemeOptions as SystemThemeOptions,
} from '@altroo/mui-native-system';
import type { DividerProps } from '../dividerTypes';
import type { PaperProps } from '../paperTypes';

// Material checks its native root defaults without coupling System's standalone
// theme engine to Material components or changing custom component definitions.
// Source component options allow explicit undefined even with exact optional
// properties. Typed component-props interfaces remain valid default objects.
type ComponentOptions = {
  [Key in keyof ComponentConfig]: Key extends 'defaultProps'
    ? object | undefined
    : ComponentConfig[Key] | undefined;
};
export interface Components
  extends Record<keyof SystemComponents, ComponentOptions | boolean | undefined> {
  // Component props interfaces need not carry an open string index signature.
  // Keep custom defaults object-shaped and validate known native roots below.
  mergeClassNameAndStyle?: boolean | undefined;
  MuiPaper?:
    | (Omit<ComponentOptions, 'defaultProps'> & { defaultProps?: Partial<PaperProps> | undefined })
    | boolean
    | undefined;
  MuiDivider?:
    | (Omit<ComponentOptions, 'defaultProps'> & {
        defaultProps?: Partial<DividerProps> | undefined;
      })
    | boolean
    | undefined;
}
export interface ThemeOptions extends Omit<SystemThemeOptions, 'components'> {
  components?: Components | undefined;
}
// Keep the original runtime function and its identity across public entry points.
export const createTheme = systemCreateTheme as (
  options?: ThemeOptions,
  ...overrides: ThemeOptions[]
) => SystemTheme;
