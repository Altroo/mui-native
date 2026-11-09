// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// First-party controlled backend only. The public CardContent entry stays separate.
export { createCardContentRuntime } from '../../cardContentRuntime';
export type { CardContentBackendInput } from '../../cardContentRuntime';
export { compileCandidates } from '../../cardContentCandidates';
export { prepareRuntimeCardContent } from '../../cardContentRuntimeBackend';
export type {
  StructuralRuntimeNative,
  RuntimeStatus,
  PreparedRuntimeCardContent,
} from '../../cardContentRuntimeBackend';
