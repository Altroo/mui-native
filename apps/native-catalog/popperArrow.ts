/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import type { NativePopperModifier } from '@mui/material';

// Core owns the arrow's alignment axis. This example supplies its facing edge.
export const catalogArrowEdge: NativePopperModifier = {
  name: 'catalogArrowEdge',
  enabled: true,
  phase: 'beforeWrite',
  requires: ['computeStyles'],
  fn: ({ state }) => {
    if (!state.elements.arrow) return;
    const side = state.placement.split('-')[0];
    const vertical = side === 'top' || side === 'bottom';
    const edge = side === 'top' ? 'bottom' : side === 'left' ? 'right' : vertical ? 'top' : 'left';
    state.styles.arrow = {
      ...state.styles.arrow,
      ...(vertical ? { top: undefined, bottom: undefined } : { left: undefined, right: undefined }),
      [edge]: -5,
    };
  },
};
