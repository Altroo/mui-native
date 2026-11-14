// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
export type { OwnedStyleProfile } from './ownedStyleMetadata';
import type { OwnedStyleProfile } from './ownedStyleMetadata';
export interface OwnedStylePair {
  readonly schema: 1;
  readonly profile: OwnedStyleProfile;
  readonly normal: Record<string, unknown>;
  readonly last: Record<string, unknown>;
}

/** Eight finite cases indexed by last-child, first-of-type and last-of-type bits. */
export interface OwnedStructuralProgramme {
  readonly schema: 2;
  readonly basis?: 'parent';
  readonly owner?: string;
  readonly profile: OwnedStyleProfile;
  readonly cases: readonly Record<string, unknown>[];
  readonly peer?: CSSPeerIdentity | null;
}
export type CSSPeerIdentity = Readonly<{
  expanded: boolean;
  classes: readonly Readonly<{ cacheKey: string; css: string; eligible: boolean }>[];
}>;
export type CSSPeerObservation = Readonly<{
  surface: number;
  subject: number;
  parent: number;
  previous: number;
  expanded: boolean;
}>;
export interface OwnedAdjacentProgramme {
  readonly schema: 3;
  readonly profile: OwnedStyleProfile;
  readonly basis: 'parent';
  readonly owner: string;
  readonly cases: readonly Record<string, unknown>[];
  readonly observation: CSSPeerObservation | null;
}
export interface OwnedPeerProgramme {
  readonly schema: 4;
  readonly profile: OwnedStyleProfile;
  readonly peer: CSSPeerIdentity | null;
}
export type OwnedProgramme =
  | OwnedStylePair
  | OwnedStructuralProgramme
  | OwnedAdjacentProgramme
  | OwnedPeerProgramme;
