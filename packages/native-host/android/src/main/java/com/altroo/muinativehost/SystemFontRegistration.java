/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost;

import java.util.Set;
import java.util.function.Supplier;

/** Constructor-only guard for the library's platform-default alias; no owned font registry. */
final class SystemFontRegistration {
  static final String FAMILY = "__AltrooMUIPlatformDefaultSansSerif";
  private SystemFontRegistration() {}

  static void ensure(Object fontManager, Supplier<Set<String>> familyNames, Runnable registerDefault) {
    // RN returns a snapshot. Read it inside the same lock as registration so
    // concurrent library package constructors cannot all observe a missing alias.
    synchronized (fontManager) {
      if (!familyNames.get().contains(FAMILY)) registerDefault.run();
    }
  }
}
