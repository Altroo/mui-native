// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export type { OwnedStyleProfile } from './ownedStyleMetadata';
import type { OwnedStyleProfile } from './ownedStyleMetadata';
export interface OwnedProgramme {
  readonly schema: 1;
  readonly profile: OwnedStyleProfile;
  readonly normal: Record<string, unknown>;
  readonly last: Record<string, unknown>;
}
