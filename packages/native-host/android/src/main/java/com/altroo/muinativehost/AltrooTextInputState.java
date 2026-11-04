/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost;

import com.facebook.react.views.text.ReactTextUpdate;

/** The pinned RN update has a public JVM ABI and Kotlin-internal metadata.
 * Keep that interop here without reflection or compiler visibility suppression. */
final class AltrooTextInputState {
  private AltrooTextInputState() {}
  static boolean isMetadataCandidate(Object value) {
    return value instanceof ReactTextUpdate && ((ReactTextUpdate)value).getText().length() <= 4096;
  }
  static boolean isCurrentUpdate(Object value, int eventCount, int breakStrategy, CharSequence text) {
    if (!(value instanceof ReactTextUpdate)) return false;
    ReactTextUpdate update = (ReactTextUpdate)value;
    if (update.getJsEventCounter() != eventCount || update.getTextBreakStrategy() != breakStrategy || update.getText().length() != text.length()) return false;
    for (int index = 0; index < text.length(); index++) if (update.getText().charAt(index) != text.charAt(index)) return false;
    return true;
  }
  static boolean isEmptyAcknowledgement(Object value, int eventCount, int breakStrategy) {
    return isCurrentUpdate(value, eventCount, breakStrategy, "");
  }
}
