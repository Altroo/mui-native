// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Private opt-in proof module, deliberately absent from package entry exports.
export interface Spec extends TurboModule {
  enable(): void;
  disable(): void;
  getReport(): string;
}
export default TurboModuleRegistry.getEnforcing<Spec>('AltrooPrelayoutProbe');
