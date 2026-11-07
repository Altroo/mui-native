// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export { Paper as default, Paper, paperClasses, getPaperUtilityClass } from '../paper';
export type {
  PaperProps,
  PaperOwnProps,
  PaperTypeMap,
  PaperPropsVariantOverrides,
  PaperClasses,
  PaperClassKey,
  NativePaperComponent,
  NativePaperRootProps,
} from '../paper';
// Preserve the existing additive native barrel alongside canonical Paper exports.
export * from '../layout';
