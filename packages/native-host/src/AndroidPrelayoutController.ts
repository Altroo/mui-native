// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import observer, { type Spec } from './NativeAltrooStructuralObserver';

type ProbeModule = Pick<
  Spec,
  'enablePrelayoutProbe' | 'disablePrelayoutProbe' | 'getPrelayoutReport'
>;

// Private fixture adapter. Keep one returned controller per scene lifetime.
// Android autolinks the existing observer; it does not register the iOS module.
export function createAndroidPrelayoutController(
  native: ProbeModule | null | undefined = observer,
) {
  if (
    !native ||
    typeof native.enablePrelayoutProbe !== 'function' ||
    typeof native.disablePrelayoutProbe !== 'function' ||
    typeof native.getPrelayoutReport !== 'function'
  ) {
    throw new Error('The reviewed Android prelayout host is not installed');
  }
  return {
    enable: () => native.enablePrelayoutProbe(),
    disable: () => native.disablePrelayoutProbe(),
    getReport: () => native.getPrelayoutReport(),
  };
}
