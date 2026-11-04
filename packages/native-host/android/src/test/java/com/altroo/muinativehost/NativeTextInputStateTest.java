/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost;

import android.text.Spanned;
import com.facebook.react.views.text.ReactTextUpdate;

/** The real pinned update type, with a value-only Spanned requiring no Android runtime. */
public final class NativeTextInputStateTest {
  private static int assertions;
  private static void expect(boolean condition) { if (!condition) throw new AssertionError(); assertions++; }
  private static Object update(String text, int counter, int strategy) { return new ReactTextUpdate(new Value(text), counter, 0, strategy, 0); }
  public static void main(String[] args) {
    Object empty = update("", 8, 1);
    expect(AltrooTextInputState.isEmptyAcknowledgement(empty, 8, 1));
    expect(!AltrooTextInputState.isEmptyAcknowledgement(empty, 7, 1));
    expect(!AltrooTextInputState.isEmptyAcknowledgement(empty, 9, 1));
    expect(!AltrooTextInputState.isEmptyAcknowledgement(empty, 8, 2));
    expect(!AltrooTextInputState.isEmptyAcknowledgement(update("x", 8, 1), 8, 1));
    expect(!AltrooTextInputState.isEmptyAcknowledgement(new Object(), 8, 1));
    expect(AltrooTextInputState.isCurrentUpdate(update("ab", 8, 1), 8, 1, new StringBuilder("ab")));
    expect(!AltrooTextInputState.isCurrentUpdate(update("ab", 8, 1), 8, 1, "ac"));
    expect(!AltrooTextInputState.isCurrentUpdate(update("ab", 8, 1), 8, 1, "a"));
    expect(AltrooTextInputState.isMetadataCandidate(update("x".repeat(4096), 8, 1)));
    expect(!AltrooTextInputState.isMetadataCandidate(update("x".repeat(4097), 8, 1)));
    expect(!AltrooTextInputState.isMetadataCandidate(new Object()));
    System.out.println("Native text-input counter JVM policy: " + assertions + " authority/value assertions passed; no UI executed.");
  }
  private static final class Value implements Spanned {
    private final String text;
    Value(String text) { this.text = text; }
    public int length() { return text.length(); }
    public char charAt(int index) { return text.charAt(index); }
    public CharSequence subSequence(int start, int end) { return text.subSequence(start, end); }
    public String toString() { return text; }
    // This fixture has no spans. No caller needs an array to test its text value.
    public <T> T[] getSpans(int start, int end, Class<T> type) { throw new UnsupportedOperationException(); }
    public int getSpanStart(Object tag) { return -1; }
    public int getSpanEnd(Object tag) { return -1; }
    public int getSpanFlags(Object tag) { return 0; }
    // Android Spanned declares this parameter as a raw Class in the pinned ABI.
    public int nextSpanTransition(int start, int limit, Class type) { return limit; }
  }
}
