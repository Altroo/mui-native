/* Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.TextView;
import com.facebook.react.views.modal.ReactModalHostView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Native touches, editor changes and key dispatch; physical IMEs remain separate. */
public final class AutocompleteScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int testId;
  private File artifacts;
  private final JSONArray stages = new JSONArray(), screenshots = new JSONArray(), touches = new JSONArray();
  private AutocompleteScenario(Instrumentation driver) { this.driver = driver; }
  public static void run(Instrumentation driver) { new AutocompleteScenario(driver).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      artifacts = new File(driver.getTargetContext().getCacheDir(), "mui-autocomplete-" + System.currentTimeMillis());
      require(artifacts.mkdir(), "Preserve existing test artifacts");
      report.put("schemaVersion", 1).put("driver", "native Instrumentation and UiAutomation")
        .put("device", new JSONObject().put("model", Build.MODEL).put("sdk", Build.VERSION.SDK_INT).put("os", Build.VERSION.RELEASE))
        .put("artifactDirectory", "cache/" + artifacts.getName());
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Catalog launch activity unavailable");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      testId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(testId != 0, "React Native testID resource missing");
      await(() -> ui(() -> find("catalog-tabs") instanceof HorizontalScrollView), "Catalog did not start", 35000);
      ui(() -> { HorizontalScrollView tabs = (HorizontalScrollView)view("catalog-tabs"); tabs.scrollTo(tabs.getChildAt(0).getWidth(), 0); return null; });
      tap("catalog-tab-Autocomplete"); await(() -> ui(() -> find("autocomplete-editor") instanceof EditText), "Autocomplete scene missing");
      stage("scene-ready");
      tap("autocomplete-editor"); driver.sendStringSync("Casa");
      await(() -> ui(() -> find("autocomplete-option-2") != null && find("autocomplete-option-1") == null), "Native input did not filter options");
      capture("filtered.png"); stage("search-filter");
      tap("autocomplete-option-2");
      selection("selectOption: 2"); await(() -> ui(() -> editor().getText().toString().equals("Casablanca")), "Selected label not displayed");
      require(ui(() -> editor().hasFocus()), "Touch selection lost native editor focus"); stage("touch-select");
      tap("autocomplete-clear");
      await(() -> ui(() -> editor().getText().length() == 0 && editor().hasFocus()), "Clear must reset and restore native editor focus before keyboard commands");
      selection("clear: null"); stage("clear");
      key(KeyEvent.KEYCODE_DPAD_DOWN);
      await(() -> ui(() -> find("autocomplete-option-1") != null), "ArrowDown did not open suggestions");
      key(KeyEvent.KEYCODE_DPAD_DOWN);
      await(() -> ui(() -> text("autocomplete-highlight").contains("Casablanca (keyboard)")), "ArrowDown did not change the native virtual highlight");
      require(ui(() -> editor().hasFocus()), "Highlight moved native focus out of editor"); stage("keyboard-highlight");
      key(KeyEvent.KEYCODE_ENTER); selection("selectOption: 2"); stage("keyboard-select");
      tap("autocomplete-mode-Multiple");
      await(() -> ui(() -> text("autocomplete-selection").equals("No selection yet")), "Multiple mode did not reset");
      tap("autocomplete-chip-Rabat-delete"); selection("removeOption: 2"); stage("multiple-remove");
      tap("autocomplete-toggle"); await(() -> ui(() -> find("autocomplete-option-1") != null && find("autocomplete-option-2") == null), "Selected options were not excluded");
      tap("autocomplete-option-3"); selection("selectOption: 2, 3");
      await(() -> ui(() -> find("autocomplete-chip-Marrakesh") != null && fullyVisible(view("autocomplete-chip-Marrakesh")) && find("autocomplete-option-3") == null && find("autocomplete-option-1") != null), "Multiple Chip/filtered rows did not settle after selection"); stage("multiple-select");
      capture("multiple.png");
      key(KeyEvent.KEYCODE_ESCAPE);
      tap("autocomplete-mode-Grouped"); tap("autocomplete-toggle");
      await(() -> ui(() -> find("autocomplete-option-6") != null), "Grouped options missing");
      capture("grouped.png"); stage("grouped-options"); key(KeyEvent.KEYCODE_ESCAPE);
      tap("autocomplete-mode-Free solo");
      await(() -> ui(() -> "Search or enter a city".contentEquals(editor().getHint())), "Free-solo editor must replace the previous mode");
      tap("autocomplete-editor");
      await(() -> ui(() -> editor().hasFocus()), "Free-solo editor did not receive native focus");
      JSONArray bursts = new JSONArray();
      report.put("freeSoloBursts", bursts);
      report.put("freeSoloTraceFields", new JSONArray().put("phase").put("text").put("start").put("before/count").put("after/count").put("selectionStart").put("selectionEnd"));
      for (int burst = 0; burst < 8; burst++) {
        if (burst > 0) {
          tap("autocomplete-clear");
          await(() -> ui(() -> editor().getText().length() == 0 && editor().hasFocus()), "Clear must settle before the next typing burst");
          selection("clear: null");
        }
        // Native-only observation distinguishes a missing key, selection-based
        // replacement and programmatic text updates without rerendering JS.
        JSONArray edits = new JSONArray();
        JSONObject trial = new JSONObject().put("index", burst).put("changes", edits);
        bursts.put(trial);
        EditText typingEditor = ui(this::editor);
        boolean[] traceTruncated = {false};
        TextWatcher trace = new TextWatcher() {
          private void record(String phase, CharSequence text, int start, int removed, int inserted) {
            if (edits.length() >= 256) { traceTruncated[0] = true; return; }
            edits.put(new JSONArray().put(phase).put(text.toString()).put(start).put(removed).put(inserted).put(typingEditor.getSelectionStart()).put(typingEditor.getSelectionEnd()));
          }
          public void beforeTextChanged(CharSequence text, int start, int count, int after) {
            record("before", text, start, count, after);
          }
          public void onTextChanged(CharSequence text, int start, int before, int count) {
            record("change", text, start, before, count);
          }
          public void afterTextChanged(Editable text) {}
        };
        ui(() -> { typingEditor.addTextChangedListener(trace); return null; });
        try {
          driver.sendStringSync("New city");
          await(() -> ui(() -> editor().getText().toString().equals("New city")), "Typed free-solo text did not settle");
        } finally {
          ui(() -> { typingEditor.removeTextChangedListener(trace); return null; });
          trial.put("editorStable", ui(() -> find("autocomplete-editor") == typingEditor));
          trial.put("nativeText", ui(() -> typingEditor.getText().toString()));
          trial.put("traceTruncated", traceTruncated[0]);
        }
        key(KeyEvent.KEYCODE_ENTER);
        selection("createOption: New city");
        trial.put("status", "passed");
      }
      stage("free-solo");
      tap("autocomplete-mode-States"); tap("autocomplete-editor");
      await(() -> ui(() -> editor().getText().toString().equals("Rabat")), "Prefilled label missing");
      driver.sendStringSync("Casa");
      await(() -> ui(() -> editor().getText().toString().equals("Casa")), "selectOnFocus did not replace the prefilled label"); stage("select-on-focus");
      tap("autocomplete-clear");
      await(() -> ui(() -> editor().getText().toString().isEmpty()), "Clear must settle before closing suggestions");
      key(KeyEvent.KEYCODE_ESCAPE);
      await(() -> ui(() -> find("autocomplete-popup") == null), "Escape must close suggestions before toggling them open");
      tap("autocomplete-toggle");
      await(() -> ui(() -> find("autocomplete-option-3") != null), "State options unavailable");
      require(ui(() -> !view("autocomplete-option-3").isEnabled()), "Disabled option remains enabled"); stage("disabled-option");
      key(KeyEvent.KEYCODE_ESCAPE);
      tap("autocomplete-disabled");
      // Pinned React Native maps editable=false to View.enabled, retaining its key listener.
      await(() -> ui(() -> !editor().isEnabled() && !view("autocomplete-toggle").createAccessibilityNodeInfo().isEnabled()), "Disabled control remained editable/enabled"); stage("disabled-control");
      tap("autocomplete-disabled");
      await(() -> ui(() -> editor().isEnabled()), "Editable state did not restore");
      tap("autocomplete-readonly");
      await(() -> ui(() -> !editor().isEnabled() && !view("autocomplete-toggle").createAccessibilityNodeInfo().isEnabled()), "Read-only indicator remained enabled"); stage("readonly-control");
      tap("autocomplete-readonly");
      await(() -> ui(() -> editor().isEnabled()), "Read-only state did not restore");
      tap("autocomplete-loading"); tap("autocomplete-toggle");
      await(() -> ui(() -> containsText(activity.getWindow().getDecorView(), "Loading")), "Loading status missing"); stage("loading"); key(KeyEvent.KEYCODE_ESCAPE);
      tap("autocomplete-mode-Dialog"); tap("autocomplete-dialog-open"); tap("autocomplete-editor"); driver.sendStringSync("Casa");
      await(() -> ui(() -> find("autocomplete-option-2") != null), "Dialog suggestions missing");
      tap("autocomplete-option-2"); selection("selectOption: 2"); stage("dialog-selection"); capture("dialog.png");
      tap("autocomplete-dialog-done");
      await(() -> ui(() -> find("autocomplete-editor") == null), "Previous native Dialog did not close");
      tap("autocomplete-dialog-fullscreen");
      await(() -> ui(() -> view("autocomplete-dialog-fullscreen").createAccessibilityNodeInfo().isChecked()), "Full-screen switch did not become checked");
      tap("autocomplete-dialog-open");
      await(() -> ui(() -> find("autocomplete-dialog-paper") != null && Math.abs(view("autocomplete-dialog-paper").getWidth() - activity.getWindow().getDecorView().getWidth()) < 3), "Full-screen Dialog did not fill the native window width");
      tap("autocomplete-editor"); driver.sendStringSync("Casa");
      await(() -> ui(() -> find("autocomplete-option-2") != null), "Full-screen Dialog suggestions missing");
      tap("autocomplete-option-2"); selection("selectOption: 2"); stage("fullscreen-dialog-selection"); capture("fullscreen-dialog.png");
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString()); capture("failure.png"); } catch (Throwable ignored) { /* Keep the original assertion. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("stages", stages).put("screenshots", screenshots).put("touches", touches); result.putString("autocompleteReport", report.toString()); }
      catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }
  private void stage(String name) { stages.put(name); }
  private EditText editor() { return (EditText)view("autocomplete-editor"); }
  private String text(String id) { return ((TextView)view(id)).getText().toString(); }
  private void selection(String expected) throws Exception { await(() -> ui(() -> find("autocomplete-selection") instanceof TextView && text("autocomplete-selection").equals(expected)), "Missing selection: " + expected); }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View found = find(id); require(found != null, "Missing native view " + id); return found; }
  private View search(View root, String id) {
    if (id.equals(root.getTag(testId))) return root;
    if (root instanceof ReactModalHostView) {
      android.app.Dialog dialog = ((ReactModalHostView)root).getDialog();
      if (dialog != null && dialog.getWindow() != null) {
        View found = search(dialog.getWindow().getDecorView(), id); if (found != null) return found;
      }
    }
    if (root instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)root).getChildCount(); index++) {
      View found = search(((ViewGroup)root).getChildAt(index), id); if (found != null) return found;
    }
    return null;
  }
  private boolean containsText(View root, String text) {
    if (root instanceof TextView && ((TextView)root).getText().toString().contains(text)) return true;
    if (root instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)root).getChildCount(); index++) if (containsText(((ViewGroup)root).getChildAt(index), text)) return true;
    return false;
  }
  private boolean opaque(View target) {
    if (!target.isShown()) return false;
    for (View view = target; view != null; view = view.getParent() instanceof View ? (View)view.getParent() : null)
      if (view.getAlpha() <= 0) return false;
    return true;
  }
  private void key(int code) {
    long time = SystemClock.uptimeMillis();
    for (int action : new int[] {KeyEvent.ACTION_DOWN, KeyEvent.ACTION_UP}) driver.sendKeySync(new KeyEvent(time, SystemClock.uptimeMillis(), action, code, 0, 0, KeyCharacterMap.VIRTUAL_KEYBOARD, 0, 0, InputDevice.SOURCE_KEYBOARD));
  }
  private void tap(String id) throws Exception {
    await(() -> ui(() -> find(id) != null && view(id).getWidth() > 0 && opaque(view(id))), "Target did not lay out visibly: " + id);
    ui(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); return null; });
    await(() -> ui(() -> { Rect rect = new Rect(); return opaque(view(id)) && view(id).getGlobalVisibleRect(rect) && !rect.isEmpty(); }), "Target not visible: " + id);
    float[] point = ui(() -> { View target = view(id); Rect rect = new Rect(); int[] origin = new int[2];
      require(target.getLocalVisibleRect(rect) && !rect.isEmpty(), "Target has no local visible bounds");
      target.getLocationOnScreen(origin);
      return new float[] {origin[0] + rect.exactCenterX(), origin[1] + rect.exactCenterY()}; });
    touches.put(new JSONObject().put("id", id).put("x", point[0]).put("y", point[1]));
    long time = SystemClock.uptimeMillis();
    for (int action : new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      MotionEvent event = MotionEvent.obtain(time, SystemClock.uptimeMillis(), action, point[0], point[1], 0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); } finally { event.recycle(); }
      SystemClock.sleep(40);
    }
    if (id.startsWith("autocomplete-mode-")) {
      String mode = id.substring("autocomplete-mode-".length());
      String scene = mode.equals("Dialog") ? "autocomplete-dialog-open" : "autocomplete-scene-" + mode;
      await(() -> ui(() -> find(scene) != null), "New mode must replace the previous scene before another action");
    }
  }
  private boolean fullyVisible(View target) {
    Rect bounds = new Rect();
    return opaque(target) && target.getGlobalVisibleRect(bounds) && bounds.width() >= target.getWidth() && bounds.height() >= target.getHeight();
  }
  private void capture(String name) throws Exception {
    // Grouped options start with France; later groups may be outside the viewport.
    String visibleOption = name.equals("filtered.png") ? "autocomplete-option-2"
      : name.equals("grouped.png") ? "autocomplete-option-6"
      : name.equals("multiple.png") ? "autocomplete-option-1" : null;
    if (visibleOption != null)
      await(() -> ui(() -> find(visibleOption) != null && fullyVisible(view(visibleOption))), "Screenshot suggestions must be positioned and visible");
    // Native hierarchy changes can precede the submitted frame. Wait for the
    // current editor window to commit a fresh frame before copying its pixels.
    CountDownLatch committed = new CountDownLatch(1);
    ui(() -> {
      View root = editor().getRootView();
      require(root.isHardwareAccelerated(), "Frame-commit capture requires hardware rendering");
      root.getViewTreeObserver().registerFrameCommitCallback(committed::countDown);
      root.invalidate();
      return null;
    });
    require(committed.await(5, TimeUnit.SECONDS), "Screenshot frame was not committed");
    AccessibilityNodeInfo root = automation.getRootInActiveWindow(); require(root != null && PACKAGE.contentEquals(root.getPackageName()), "Catalog must own screenshot window");
    Bitmap bitmap = automation.takeScreenshot(); require(bitmap != null, "Native screenshot missing");
    try (FileOutputStream stream = new FileOutputStream(new File(artifacts, name))) { require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream), "Screenshot encoding failed"); }
    finally { bitmap.recycle(); }
    screenshots.put(name);
  }
  private void await(java.util.function.BooleanSupplier condition, String message) throws Exception { await(condition, message, 10000); }
  private void await(java.util.function.BooleanSupplier condition, String message, long timeout) throws Exception {
    long deadline = SystemClock.uptimeMillis() + timeout;
    while (SystemClock.uptimeMillis() < deadline) { if (condition.getAsBoolean()) return; SystemClock.sleep(40); }
    throw new AssertionError(message);
  }
  private <T> T ui(java.util.concurrent.Callable<T> callback) {
    AtomicReference<T> result = new AtomicReference<>(); AtomicReference<Throwable> error = new AtomicReference<>();
    driver.runOnMainSync(() -> { try { result.set(callback.call()); } catch (Throwable failure) { error.set(failure); } });
    if (error.get() != null) throw new AssertionError(error.get()); return result.get();
  }
  private static void require(boolean value, String message) { if (!value) throw new AssertionError(message); }
}
