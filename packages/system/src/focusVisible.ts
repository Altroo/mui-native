/* Opt-in focus defaults adapt MIT Material UI 9.5.0 styles/focusVisible.
 * Copyright (c) MUI contributors. See NOTICE and upstream/reuse.json.
 * Native implementation: Copyright (c) 2026 Altroo and contributors. */
import type { CSSProperties } from 'react';
import type { SxObject } from './sx';

export type FocusVisible = CSSProperties & SxObject;

export function resolveFocusVisible(
  input: boolean | FocusVisible,
  color: string,
): FocusVisible | false {
  if (input === false) return false;
  return {
    outlineStyle: 'solid',
    outlineColor: color,
    outlineWidth: 2,
    outlineOffset: 2,
    // The browser's invisible private-var shadow is unnecessary on native.
    // Authored shadows remain intact and use the guarded native style resolver.
    ...(input === true ? undefined : input),
  };
}
