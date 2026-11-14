/* Context/default contracts adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/button-group.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React from 'react';
import type { ButtonGroupOwnProps } from './buttonGroupTypes';
import type { ViewInstance } from 'react-native';
import type { StyleContext, NativeStyleTarget } from '@altroo/mui-native-system';
export interface ButtonGroupContextValue
  extends Pick<
    ButtonGroupOwnProps,
    | 'className'
    | 'color'
    | 'disabled'
    | 'disableElevation'
    | 'disableFocusRipple'
    | 'disableRipple'
    | 'fullWidth'
    | 'size'
    | 'variant'
  > {}
export const ButtonGroupContext = React.createContext<ButtonGroupContextValue>({});
export const ButtonGroupButtonContext = React.createContext<string | undefined>(undefined);
if (process.env.NODE_ENV !== 'production') {
  ButtonGroupContext.displayName = 'ButtonGroupContext';
  ButtonGroupButtonContext.displayName = 'ButtonGroupButtonContext';
}
export type NativeStyleClassIdentity = Readonly<{
  cacheKey: string;
  css: string;
  sourceOwners: readonly string[];
  /** Immutable source occurrences; excluded when comparing emitted class identity. */
  selectorOwners?: readonly string[];
}>;
export interface NativeButtonGroupRule {
  /** Actual participating native root, used only for physical styling ownership. */
  readonly element?: ViewInstance | null;
  /** Committed source classes on this exact host, independent of native paint. */
  readonly sourceClasses?: readonly NativeStyleClassIdentity[];
  readonly scopeDepth?: number;
  readonly selector?: NativeStyleTarget | undefined;
  cascade: (
    classes: readonly string[],
    path?: readonly NativeStyleTarget[],
  ) => NonNullable<StyleContext['ancestors']>[number];
}
// Styling ancestry stays separate from the two source-facing public contexts.
export const NativeButtonGroupRules = React.createContext<readonly NativeButtonGroupRule[]>([]);
export function resolveButtonGroupDefaults<P extends object>(
  context: ButtonGroupContextValue,
  props: P,
): P {
  const output = { ...props } as Record<string, unknown>;
  for (const [key, value] of Object.entries(context))
    if (output[key] === undefined) output[key] = value;
  return output as P;
}
