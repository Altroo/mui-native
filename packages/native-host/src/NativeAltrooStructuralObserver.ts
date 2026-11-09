// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Internal observation prototype. Not exported by the package entry point.
import { TurboModuleRegistry, type TurboModule } from 'react-native';

export type StructuralChange = Readonly<{
  subscriptionId: number;
  lease: string;
  revision: number;
  closed: boolean;
}>;

export type StructuralDiagnostics = Readonly<{
  connected: boolean;
  commitHookRegistered: boolean;
  mountHookRegistered: boolean;
  subscriptions: number;
  observedRoots: number;
  pendingRecords: number;
  notificationPending: boolean;
}>;

export interface Spec extends TurboModule {
  connect(notify: () => void): void;
  observe(tag: number, lease: string, mode: string): number;
  unobserve(subscriptionId: number, lease: string): boolean;
  takeRecords(): ReadonlyArray<StructuralChange>;
  disconnect(): void;
  getDiagnostics(): StructuralDiagnostics;
  // Private controlled prelayout mechanics; owns a separate opt-in hook.
  enablePrelayoutProbe(): void;
  disablePrelayoutProbe(): void;
  getPrelayoutReport(): string;
  // Immutable preparse readiness. No runtime activation or mutable status.
  getStructuralStyleMetadata(): string;
  // Long-lived controlled style selection, separate from private diagnostics.
  enableStructuralStyleRuntime(owner: string, generation: string, notify: () => void): void;
  disableStructuralStyleRuntime(owner: string, generation: string): boolean;
  getStructuralStyleRuntimeStatus(): string;
}

export default TurboModuleRegistry.get<Spec>('AltrooStructuralObserver');
