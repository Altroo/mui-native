/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Rect;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.inputmethod.BaseInputConnection;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.HorizontalScrollView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;
import java.io.File;
import java.io.FileOutputStream;
import com.facebook.react.views.modal.ReactModalHostView;

/** Real native input routing. Injected hardware events do not certify physical keyboards/IMEs. */
public final class KeyboardScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private Activity activity;
  private UiAutomation automation;
  private int testIdKey;
  private final JSONArray stages = new JSONArray();
  private final JSONArray screenshots = new JSONArray();
  private File artifacts;
  private final Instrumentation driver;
  private KeyboardScenario(Instrumentation driver) { this.driver = driver; }
  public static void run(Instrumentation driver) { new KeyboardScenario(driver).run(); }

  private void run() {
    Bundle output = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      require(Build.VERSION.SDK_INT >= 29, "Keyboard checks require API 29+");
      artifacts = new File(driver.getTargetContext().getCacheDir(), "mui-keyboard-" + System.currentTimeMillis());
      require(artifacts.mkdir(), "Preserve existing keyboard artifacts");
      report.put("schemaVersion", 1).put("driver", "Instrumentation.sendKeySync")
        .put("artifactDirectory", "cache/" + artifacts.getName())
        .put("device", new JSONObject().put("model", Build.MODEL).put("sdk", Build.VERSION.SDK_INT).put("os", Build.VERSION.RELEASE));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Catalog launch unavailable");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      testIdKey = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(testIdKey != 0, "Native testID resource unavailable");
      // Cold development-bundle startup has the same bound as the Popper
      // scenario. Interaction assertions below retain their shorter deadline.
      await(() -> onUiValue(() -> find("catalog-tabs") instanceof HorizontalScrollView && view("catalog-tabs").getWidth() > 0), "Catalog did not lay out its tab bar", 35000);
      onUi(() -> {
        HorizontalScrollView tabs = (HorizontalScrollView)view("catalog-tabs");
        require(tabs.getChildCount() == 1, "Native tab content unavailable");
        tabs.scrollTo(tabs.getChildAt(0).getWidth(), 0);
      });
      await(() -> onUiValue(() -> visible("catalog-tab-Keyboard")), "Keyboard tab did not enter the native viewport");
      tap("catalog-tab-Keyboard");
      awaitState(value -> value.optBoolean("enabled") && value.optJSONArray("receipts") != null, "Keyboard scene unavailable");
      stage("scene-ready");

      String[] keys = {"ArrowDown", "ArrowUp", "PageUp", "PageDown", "Home", "End", "Tab", "Escape"};
      int[] codes = {KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_PAGE_UP,
        KeyEvent.KEYCODE_PAGE_DOWN, KeyEvent.KEYCODE_MOVE_HOME, KeyEvent.KEYCODE_MOVE_END, KeyEvent.KEYCODE_TAB, KeyEvent.KEYCODE_ESCAPE};
      for (int i = 0; i < keys.length; i++) {
        reset(); Window.Callback callback = onUiValue(() -> activity.getWindow().getCallback());
        long time = down(codes[i]); awaitReceipts(4);
        require(onUiValue(() -> activity.getWindow().getCallback() != callback), "Held command has no window boundary");
        up(codes[i], time, 0); awaitReceipts(6);
        require(onUiValue(() -> activity.getWindow().getCallback() == callback), "Window callback was not restored");
        assertReceipts(keys[i], new String[] {"capture", "input", "inner", "outer", "input-up", "outer-up"});
        require(onUiValue(() -> editor().hasFocus()), "Navigation moved native editor focus");
        stage("inline-" + keys[i]);
      }
      stage("callback-restoration");
      capture("inline-commands.png");

      reset(); long held = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(4);
      driver.sendStringSync("x");
      await(() -> onUiValue(() -> editor().getText().toString().contains("x")), "Unrelated text was swallowed while a command was held");
      driver.sendKeyDownUpSync(KeyEvent.KEYCODE_DEL);
      await(() -> onUiValue(() -> editor().getText().toString().equals("Rabat")), "Unrelated deletion was swallowed while held");
      require(receipts().length() == 4, "Unrelated held-key editing entered the bridge");
      up(KeyEvent.KEYCODE_DPAD_DOWN, held, 0); awaitReceipts(6);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "outer", "input-up", "outer-up"});
      stage("unrelated-key-held");

      reset(); driver.sendStringSync("x");
      await(() -> onUiValue(() -> editor().getText().toString().contains("x")), "Ordinary character editing failed");
      driver.sendKeyDownUpSync(KeyEvent.KEYCODE_DEL);
      await(() -> onUiValue(() -> editor().getText().toString().equals("Rabat")), "Native deletion failed");
      require(receipts().length() == 0, "Ordinary editing entered the command bridge"); stage("native-editing");

      reset(); long enter = down(KeyEvent.KEYCODE_ENTER);
      awaitState(value -> !value.optBoolean("enabled") && value.optJSONArray("receipts").length() == 4, "Enter did not close declaration");
      up(KeyEvent.KEYCODE_ENTER, enter, 0); SystemClock.sleep(200);
      assertReceipts("Enter", new String[] {"capture", "input", "inner", "outer"});
      require(state().getInt("submissions") == 0, "Claimed Enter also submitted the native editor"); stage("close-during-down");

      outsideRelease(activity.getWindow()); stage("release-stays-outside");

      reset(); long moved = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(4);
      tap("keyboard-other"); tap("keyboard-editor"); up(KeyEvent.KEYCODE_DPAD_DOWN, moved, 0); SystemClock.sleep(200);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "outer"}); stage("focus-departure-return");

      reset(); long canceled = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(4);
      up(KeyEvent.KEYCODE_DPAD_DOWN, canceled, KeyEvent.FLAG_CANCELED); SystemClock.sleep(200);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "outer"}); stage("canceled-release");

      reset(); onUi(() -> BaseInputConnection.setComposingSpans(editor().getText()));
      require(onUiValue(() -> BaseInputConnection.getComposingSpanStart(editor().getText()) >= 0), "Composing span not installed");
      try {
        driver.sendKeyDownUpSync(KeyEvent.KEYCODE_DPAD_DOWN); SystemClock.sleep(200);
        require(receipts().length() == 0, "Active composition entered command handling");
      } finally { onUi(() -> BaseInputConnection.removeComposingSpans(editor().getText())); }
      stage("native-composition-span");

      reset(); tap("keyboard-enabled-toggle"); tap("keyboard-inner-toggle"); tap("keyboard-editor");
      awaitState(value -> !value.optBoolean("enabled") && value.optBoolean("nested"), "Nested declarations not ready");
      long nested = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(3); up(KeyEvent.KEYCODE_DPAD_DOWN, nested, 0); awaitReceipts(5);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "input-up", "outer-up"});
      driver.sendKeyDownUpSync(KeyEvent.KEYCODE_DPAD_UP); SystemClock.sleep(200);
      require(receipts().length() == 5, "Undeclared ancestor key was captured"); stage("closest-owner");
      capture("nested-owner.png");

      tap("keyboard-inner-toggle"); reset(); tap("keyboard-portal-toggle");
      awaitState(value -> value.optBoolean("portal") && !value.optBoolean("nested"), "Portal editor unavailable");
      tap("keyboard-portal-anchor"); tap("keyboard-editor");
      long portal = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(4); up(KeyEvent.KEYCODE_DPAD_DOWN, portal, 0); awaitReceipts(6);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "outer", "input-up", "outer-up"});
      require(onUiValue(() -> editor().hasFocus()), "Portal command moved editor focus"); stage("window-portal");
      capture("portal-editor.png");

      tap("keyboard-portal-toggle"); reset(); tap("keyboard-dialog-open");
      awaitState(value -> value.optBoolean("dialog"), "Dialog editor unavailable"); tap("keyboard-editor");
      Window dialog = onUiValue(() -> dialogWindow(activity.getWindow().getDecorView(), editor().getWindowToken()));
      require(dialog != null && dialog != activity.getWindow(), "Scenario must use a real separate Dialog window");
      Window.Callback dialogCallback = onUiValue(dialog::getCallback);
      long dialogDown = down(KeyEvent.KEYCODE_DPAD_DOWN); awaitReceipts(4);
      require(onUiValue(() -> dialog.getCallback() != dialogCallback), "Dialog command has no matching window boundary");
      up(KeyEvent.KEYCODE_DPAD_DOWN, dialogDown, 0); awaitReceipts(6);
      assertReceipts("ArrowDown", new String[] {"capture", "input", "inner", "outer", "input-up", "outer-up"});
      require(onUiValue(() -> dialog.getCallback() == dialogCallback), "Dialog callback was not restored"); stage("native-dialog");
      outsideRelease(dialog); stage("dialog-release-stays-outside"); capture("dialog-editor.png");
      long escape = down(KeyEvent.KEYCODE_ESCAPE);
      await(() -> onUiValue(() -> dialog.getCallback() != dialogCallback), "Dialog Escape-down did not establish ownership");
      up(KeyEvent.KEYCODE_ESCAPE, escape, 0);
      awaitState(value -> !value.optBoolean("dialog"), "Native Dialog Escape-up request-close was swallowed");
      require(onUiValue(() -> dialog.getCallback() == dialogCallback), "Dialog Escape did not restore its original callback");
      stage("dialog-Escape-close");
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString()); } catch (Exception ignored) { /* Keep original failure. */ }
      try { report.put("lastState", state()); } catch (Throwable ignored) { /* Scene may not be mounted. */ }
      try { report.put("nativeTree", onUiValue(() -> "destroyed=" + activity.isDestroyed() + ",focused=" + activity.hasWindowFocus() + "\n" + describe(activity.getWindow().getDecorView(), 0, new int[] {150}))); } catch (Throwable ignored) { /* Activity may be unavailable. */ }
      try { capture("failure.png"); } catch (Throwable ignored) { /* Screenshot failure cannot replace the assertion. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("stages", stages).put("screenshots", screenshots); output.putString("keyboardReport", report.toString()); }
      catch (Exception error) { output.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, output);
    }
  }

  private void reset() throws Exception { tap("keyboard-reset"); awaitState(value -> value.optBoolean("enabled") && value.optJSONArray("receipts").length() == 0, "Reset did not settle"); tap("keyboard-editor"); }
  private void outsideRelease(Window window) throws Exception {
    reset(); Window.Callback callback = onUiValue(window::getCallback); long outside = down(KeyEvent.KEYCODE_ENTER);
    awaitState(value -> !value.optBoolean("enabled") && value.optJSONArray("receipts").length() == 4, "Enter declaration did not close before focus moved");
    AtomicInteger outsideReleases = new AtomicInteger();
    onUi(() -> view("keyboard-other").setOnKeyListener((view, code, event) -> {
      if (code == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_UP) outsideReleases.incrementAndGet();
      return false;
    }));
    try {
      tap("keyboard-other"); up(KeyEvent.KEYCODE_ENTER, outside, 0); SystemClock.sleep(200);
      require(onUiValue(() -> view("keyboard-other").hasFocus()), "Focus must remain outside the old command owner");
      require(outsideReleases.get() == 0, "Claimed Enter release escaped into the outside native editor");
      require(onUiValue(() -> window.getCallback() == callback), "Outside release did not restore the window callback");
      assertReceipts("Enter", new String[] {"capture", "input", "inner", "outer"});
    } finally { onUi(() -> view("keyboard-other").setOnKeyListener(null)); }
  }
  private Window dialogWindow(View root, IBinder token) {
    if (root instanceof ReactModalHostView) {
      android.app.Dialog dialog = ((ReactModalHostView)root).getDialog();
      if (dialog != null && dialog.getWindow() != null && token.equals(dialog.getWindow().getDecorView().getWindowToken())) return dialog.getWindow();
    }
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) {
      Window found = dialogWindow(((ViewGroup)root).getChildAt(i), token); if (found != null) return found;
    }
    return null;
  }
  private void stage(String name) { stages.put(name); }
  private void capture(String name) throws Exception {
    android.view.accessibility.AccessibilityNodeInfo active = automation.getRootInActiveWindow();
    require(active != null && PACKAGE.equals(String.valueOf(active.getPackageName())), "Catalog must own the screenshot window");
    Bitmap bitmap = automation.takeScreenshot(); require(bitmap != null, "Native screenshot unavailable");
    try (FileOutputStream stream = new FileOutputStream(new File(artifacts, name))) {
      require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream), "Screenshot encoding failed");
    } finally { bitmap.recycle(); }
    screenshots.put(name);
  }
  private JSONObject state() throws Exception { return new JSONObject(onUiValue(() -> ((TextView)view("keyboard-receipt")).getText().toString())); }
  private JSONArray receipts() throws Exception { return state().getJSONArray("receipts"); }
  private void awaitState(Predicate<JSONObject> predicate, String message) throws Exception {
    await(() -> {
      if (!onUiValue(() -> find("keyboard-receipt") instanceof TextView)) return false;
      try { return predicate.test(state()); } catch (Exception ignored) { return false; }
    }, message);
  }
  private void awaitReceipts(int count) throws Exception { awaitState(value -> value.optJSONArray("receipts").length() >= count, "Missing native key receipt: " + count); }
  private void assertReceipts(String key, String[] expected) throws Exception {
    JSONArray actual = receipts(); require(actual.length() == expected.length, "Unexpected receipt count: " + actual);
    for (int i = 0; i < expected.length; i++) {
      JSONObject item = actual.getJSONObject(i);
      require(expected[i].equals(item.getString("stage")) && key.equals(item.getString("key")) &&
        "hardware".equals(item.getString("source")) && item.getBoolean("inputTarget") && item.getBoolean("editable"),
        "Wrong phase, input target or metadata: " + actual);
    }
  }
  private long down(int code) { long time = SystemClock.uptimeMillis(); driver.sendKeySync(key(KeyEvent.ACTION_DOWN, code, time, 0)); return time; }
  private void up(int code, long time, int flags) { driver.sendKeySync(key(KeyEvent.ACTION_UP, code, time, flags)); }
  private KeyEvent key(int action, int code, long time, int flags) {
    return new KeyEvent(time, SystemClock.uptimeMillis(), action, code, 0, 0, KeyCharacterMap.VIRTUAL_KEYBOARD, 0, flags, InputDevice.SOURCE_KEYBOARD);
  }
  private EditText editor() { return (EditText)view("keyboard-editor"); }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View value = find(id); require(value != null, "Missing native view: " + id); return value; }
  private View search(View root, String id) {
    if (id.equals(root.getTag(testIdKey))) return root;
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) {
      View found = search(((ViewGroup)root).getChildAt(i), id); if (found != null) return found;
    }
    return null;
  }
  private String describe(View root, int depth, int[] budget) {
    if (budget[0]-- <= 0) return "";
    StringBuilder result = new StringBuilder();
    for (int i = 0; i < Math.min(depth, 12); i++) result.append(' ');
    result.append(root.getClass().getSimpleName()).append(" id=").append(root.getId())
      .append(" testID=").append(root.getTag(testIdKey)).append(" tag=").append(root.getTag()).append('\n');
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount() && budget[0] > 0; i++) result.append(describe(((ViewGroup)root).getChildAt(i), depth+1, budget));
    return result.toString();
  }
  private void tap(String id) throws Exception {
    await(() -> onUiValue(() -> find(id) != null && view(id).getWidth() > 0 && view(id).getHeight() > 0), "Target did not lay out: " + id);
    onUi(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); });
    await(() -> onUiValue(() -> visible(id)), "Target did not become visible: " + id);
    float[] point = onUiValue(() -> {
      View target = view(id);
      Rect bounds = new Rect(); require(target.getGlobalVisibleRect(bounds) && !bounds.isEmpty(), "Target is not visible: " + id);
      return new float[] {bounds.exactCenterX(), bounds.exactCenterY()};
    });
    long time = SystemClock.uptimeMillis();
    for (int action : new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      MotionEvent event = MotionEvent.obtain(time, SystemClock.uptimeMillis(), action, point[0], point[1], 0);
      event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event, true), "Touch injection failed"); } finally { event.recycle(); }
      SystemClock.sleep(40);
    }
  }
  private boolean visible(String id) {
    View target = find(id); Rect bounds = new Rect();
    if (target == null || !target.isShown() || target.getWidth() <= 0 || target.getHeight() <= 0 || !target.hasWindowFocus()) return false;
    for (View value = target; value != null; value = value.getParent() instanceof View ? (View)value.getParent() : null) if (value.getAlpha() <= 0) return false;
    return target.getGlobalVisibleRect(bounds) && !bounds.isEmpty();
  }
  private void await(java.util.function.BooleanSupplier condition, String message) throws Exception {
    await(condition, message, 10000);
  }
  private void await(java.util.function.BooleanSupplier condition, String message, long timeout) throws Exception {
    long until = SystemClock.uptimeMillis() + timeout;
    while (SystemClock.uptimeMillis() < until) { if (condition.getAsBoolean()) return; SystemClock.sleep(40); }
    throw new AssertionError(message);
  }
  private void onUi(Runnable action) { onUiValue(() -> { action.run(); return null; }); }
  private <T> T onUiValue(java.util.concurrent.Callable<T> action) {
    AtomicReference<T> result = new AtomicReference<>(); AtomicReference<Throwable> error = new AtomicReference<>();
    driver.runOnMainSync(() -> { try { result.set(action.call()); } catch (Throwable failure) { error.set(failure); } });
    if (error.get() != null) throw new AssertionError("Native UI assertion: " + error.get(), error.get());
    return result.get();
  }
  private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
