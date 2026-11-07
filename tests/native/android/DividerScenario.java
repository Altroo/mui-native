/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.text.Layout;
import android.text.TextPaint;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.TextView;
import com.facebook.react.uimanager.BackgroundStyleApplicator;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.style.LogicalEdge;
import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/** Finite real-touch and retained-raster checks. Does not change OS/font/RTL settings. */
public final class DividerScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private static final String[] KEYS = {"plain", "label", "paint", "custom"};
  private static final String[] STATES = {"default", "inset", "middle", "vertical", "vertical-flex", "left", "right", "dark", "rtl-left", "rtl-right", "native-reset", "restored"};
  private final Instrumentation driver;
  private final String fontProfile;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray states = new JSONArray(), stages = new JSONArray(), pictures = new JSONArray(), navigation = new JSONArray();
  private final Map<String, View> retained = new HashMap<>();
  private DividerScenario(Instrumentation driver, String fontProfile) { this.driver = driver; this.fontProfile = fontProfile; }
  public static void run(Instrumentation driver, String profile) { new DividerScenario(driver, profile).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      float fontScale = driver.getTargetContext().getResources().getConfiguration().fontScale;
      require(Build.VERSION.SDK_INT >= 29, "Frame-commit capture requires Android 29+");
      require("normal".equals(fontProfile) ? Math.abs(fontScale - 1) <= .01 : "enlarged".equals(fontProfile) && fontScale >= 1.3 && fontScale <= 5, "Select and verify the requested normal/enlarged OS font profile before this run");
      directory = new File(driver.getTargetContext().getCacheDir(), "mui-divider-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing Divider evidence");
      report.put("schemaVersion", 1).put("scenario", "divider-v1").put("driver", "native Instrumentation and UiAutomation")
        .put("artifactDirectory", "cache/" + directory.getName()).put("fontProfile", fontProfile)
        .put("paintMethod", "retained-view-draw-excluding-native-text")
        .put("device", new JSONObject().put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL).put("fontScale", fontScale).put("density", driver.getTargetContext().getResources().getDisplayMetrics().density));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Existing catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test-id resource missing");
      navigate("catalog-tab-Wrappers", "root-layout-divider", false);
      navigate("root-layout-divider", "divider-contract-receipt", true);
      await(() -> ui(() -> metadata().getInt("state") == 0 && metadata().getInt("count") == 0), "Initial Divider state");
      await(() -> ui(() -> { View counter = firstText(view("divider-contract-counter")); if (counter == null) return false; Layout initial = layout(counter); return initial != null && "0".equals(initial.getText().toString()) && "0".equals(text(counter).toString()); }), "Initial native counter must draw zero");
      report.put("initialCount", 0).put("initialCounterText", "0");
      tap("divider-contract-counter");
      await(() -> ui(() -> metadata().getInt("count") == 1), "Native child touch must activate once");
      tap("divider-contract-custom");
      await(() -> ui(() -> metadata().getJSONObject("touch").getInt("count") == 1), "Custom root must deliver one real native touch");
      long lastRequest = 0;
      for (int index = 0; index < STATES.length; index++) {
        final int state = index;
        await(() -> ui(() -> metadata().getInt("state") == state), "Finite state must commit");
        final long previous = lastRequest;
        tap("divider-contract-measure");
        await(() -> ui(() -> fresh(metadata(), state, previous)), "A fresh explicit measure request must complete for all roots");
        JSONObject sample = ui(() -> sample(state));
        lastRequest = sample.getJSONObject("metadata").getLong("request");
        states.put(sample); stages.put(STATES[index]);
        Bundle update = new Bundle(); update.putString("dividerStage", STATES[index]); driver.sendStatus(1, update);
        if (index == 0 || index == 4 || index == 8 || index == 10 || index == 11) capture(STATES[index] + ".png");
        if (index + 1 < STATES.length) tap("divider-contract-next");
      }
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString() + (error.getCause() == null ? "" : " <- " + error.getCause())); if (directory != null && activity != null && automation != null) capture("failure.png"); }
      catch (Throwable ignored) { /* Keep the original assertion. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("states", states).put("stages", stages).put("screenshots", pictures).put("navigation", navigation); result.putString("dividerReport", report.toString()); }
      catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }
  private boolean fresh(JSONObject metadata, int state, long previous) throws Exception {
    if (metadata.getInt("state") != state || metadata.getLong("request") <= previous) return false;
    JSONObject receipts = metadata.getJSONObject("receipts");
    for (String key : KEYS) {
      JSONObject receipt = receipts.optJSONObject(key);
      if (receipt == null || receipt.getLong("request") != metadata.getLong("request") || receipt.getInt("state") != state || receipt.getInt("generation") != 1) return false;
    }
    return true;
  }
  private JSONObject sample(int state) throws Exception {
    JSONObject metadata = metadata();
    require(metadata.getInt("state") == state && metadata.getInt("count") == 1, "State and retained counter must agree");
    float fontScale = driver.getTargetContext().getResources().getConfiguration().fontScale;
    require(Math.abs(metadata.getDouble("fontScale") - fontScale) <= .01, "Actual OS font scale differs from receipt");
    JSONObject touch = metadata.getJSONObject("touch");
    require(touch.getInt("count") == 1 && touch.getInt("target") > 0 && Double.isFinite(touch.getDouble("pageX")) && Double.isFinite(touch.getDouble("pageY")) && Double.isFinite(touch.getDouble("timestamp")), "Original native event fields must survive");
    JSONArray roots = new JSONArray();
    for (String key : KEYS) {
      View root = view("divider-contract-" + key), frame = view("divider-contract-frame-" + key);
      View old = retained.get(key); require(old == null || old == root, "Actual native root was replaced: " + key); retained.put(key, root);
      JSONObject refs = metadata.getJSONObject("refs").getJSONObject(key);
      require(refs.getInt("attached") == 1 && refs.getInt("cleaned") == 0 && refs.getInt("generation") == 1 && refs.getBoolean("sameRoot"), "Ref lifetime changed: " + key);
      JSONObject actual = bounds(root), receipt = metadata.getJSONObject("receipts").getJSONObject(key);
      for (String axis : new String[]{"x", "y", "width", "height"}) require(Math.abs(actual.getDouble(axis) - receipt.getJSONObject("window").getDouble(axis)) <= 1.5, "Fresh ref differs from independent native bounds: " + key);
      require(root.getLayoutDirection() == (state == 8 || state == 9 ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual host direction differs");
      JSONObject paint = paint(root);
      require(key.equals("paint") && state != 10 ? paint.getInt("inkPixels") == 0 : paint.getInt("inkPixels") > 0, "Actual retained native line paint differs: " + key);
      JSONObject observation = new JSONObject().put("key", key).put("nativeId", root.getId()).put("bounds", actual).put("frame", bounds(frame)).put("paint", paint).put("direction", root.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr");
      if (key.equals("plain")) {
        Integer color = BackgroundStyleApplicator.getBorderColor(root, LogicalEdge.ALL);
        require(color != null, "Actual native divider palette border missing"); observation.put("borderColor", color & 0xffffffffL);
      }
      if (key.equals("label")) observation.put("label", bounds(view("divider-contract-counter")));
      roots.put(observation);
    }
    View counter = firstText(view("divider-contract-counter")); require(counter != null, "Native counter glyph root missing");
    Object content = text(counter); Layout layout = layout(counter);
    require("1".contentEquals((CharSequence)content) && layout != null && layout.getLineCount() > 0 && layout.getText().toString().equals(content.toString()), "Native counter glyph layout must survive updates");
    TextPaint glyph = new TextPaint(layout.getPaint());
    if (content instanceof android.text.Spanned) for (android.text.style.CharacterStyle span : ((android.text.Spanned)content).getSpans(0, 1, android.text.style.CharacterStyle.class)) span.updateDrawState(glyph);
    float expected = (float)Math.ceil(PixelUtil.toPixelFromSP(14));
    require(Math.abs(glyph.getTextSize() - expected) <= 1.1, "Actual OS-scaled glyph size differs");
    int expectedColor = metadata.getJSONObject("input").getBoolean("dark") ? Color.WHITE : 0xde000000;
    require(glyph.getColor() == expectedColor, "Counter glyph must remain readable after theme updates");
    return new JSONObject().put("name", STATES[state]).put("metadata", metadata).put("roots", roots).put("counterText", content.toString()).put("counterTextClass", counter.getClass().getName()).put("counterColor", glyph.getColor() & 0xffffffffL).put("counterFontPx", glyph.getTextSize()).put("expectedCounterFontPx", expected);
  }
  /** Rasterize the actual retained View, not reconstructed border inputs. Ignore
   * only rectangles of actual native text hosts, so glyph ink cannot fake lines. */
  private JSONObject paint(View root) throws Exception {
    require(root.getWidth() > 0 && root.getHeight() > 0, "Raster needs mounted nonempty bounds");
    ArrayList<Rect> excluded = new ArrayList<>(); textRects(root, root, excluded);
    Bitmap raster = Bitmap.createBitmap(root.getWidth(), root.getHeight(), Bitmap.Config.ARGB_8888);
    int ink = 0, sampled = 0, alpha = 0;
    try {
      root.draw(new Canvas(raster));
      for (int y = 0; y < raster.getHeight(); y++) for (int x = 0; x < raster.getWidth(); x++) {
        boolean glyph = false; for (Rect rect : excluded) if (rect.contains(x, y)) { glyph = true; break; }
        if (glyph) continue;
        sampled++; int current = Color.alpha(raster.getPixel(x, y)); if (current > 0) ink++; alpha = Math.max(alpha, current);
      }
    } finally { raster.recycle(); }
    require(sampled > 0, "Native text must not exclude the whole paint sample");
    return new JSONObject().put("inkPixels", ink).put("sampledPixels", sampled).put("maxAlpha", alpha);
  }
  private void textRects(View root, View child, ArrayList<Rect> result) {
    if (isText(child)) { int[] a = new int[2], b = new int[2]; root.getLocationInWindow(a); child.getLocationInWindow(b); result.add(new Rect(b[0] - a[0], b[1] - a[1], b[0] - a[0] + child.getWidth(), b[1] - a[1] + child.getHeight())); }
    if (child instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)child).getChildCount(); i++) textRects(root, ((ViewGroup)child).getChildAt(i), result);
  }
  private static boolean isText(View view) { return view instanceof TextView || view.getClass().getName().equals("com.facebook.react.views.text.PreparedLayoutTextView"); }
  private View firstText(View root) { if (isText(root)) return root; if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View found = firstText(((ViewGroup)root).getChildAt(i)); if (found != null) return found; } return null; }
  private Object text(View target) throws Exception { return target instanceof TextView ? ((TextView)target).getText() : target.getClass().getMethod("getText").invoke(target); }
  private Layout layout(View target) throws Exception { if (target instanceof TextView) return ((TextView)target).getLayout(); Object prepared = target.getClass().getMethod("getPreparedLayout").invoke(target); return prepared == null ? null : (Layout)prepared.getClass().getMethod("getLayout").invoke(prepared); }
  private JSONObject bounds(View target) throws Exception { int[] origin = new int[2]; target.getLocationInWindow(origin); float density = target.getResources().getDisplayMetrics().density; require(target.getWidth() > 0 && target.getHeight() > 0, "Actual native bounds must be nonempty"); return new JSONObject().put("x", origin[0] / density).put("y", origin[1] / density).put("width", target.getWidth() / density).put("height", target.getHeight() / density); }
  private JSONObject metadata() throws Exception { View receipt = find("divider-contract-receipt"); return receipt == null || receipt.getContentDescription() == null ? new JSONObject() : new JSONObject(receipt.getContentDescription().toString()); }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View found = find(id); require(found != null, "Missing native view: " + id); return found; }
  private View search(View root, String id) { if (id.equals(root.getTag(tagId))) return root; if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View found = search(((ViewGroup)root).getChildAt(i), id); if (found != null) return found; } return null; }
  /** Only catalog navigation is idempotent. Never retry counted component touches. */
  private void navigate(String control, String destination, boolean initialReceipt) throws Exception {
    JSONObject step = new JSONObject().put("control", control).put("destination", destination).put("attempts", 0).put("success", false);
    navigation.put(step);
    for (int attempt = 0; attempt <= 3; attempt++) {
      if (ui(() -> destinationReady(destination, initialReceipt))) { step.put("success", true); return; }
      if (attempt == 3) break;
      step.put("attempts", attempt + 1);
      tap(control, true);
      long deadline = SystemClock.uptimeMillis() + 3000;
      do {
        if (ui(() -> destinationReady(destination, initialReceipt))) { step.put("success", true); return; }
        SystemClock.sleep(16);
      } while (SystemClock.uptimeMillis() < deadline);
    }
    throw new AssertionError("Catalog navigation did not commit: " + control);
  }
  private boolean destinationReady(String id, boolean initialReceipt) throws Exception {
    View target = find(id);
    if (target == null || target.getWidth() <= 0 || target.getHeight() <= 0) return false;
    if (!initialReceipt) return true;
    JSONObject receipt = metadata();
    return receipt.optInt("state", -1) == 0 && receipt.optInt("count", -1) == 0;
  }
  private void tap(String id) throws Exception { tap(id, false); }
  private void tap(String id, boolean navigationTouch) throws Exception {
    await(() -> ui(() -> find(id) != null && view(id).getWidth() > 0 && view(id).getHeight() > 0), "Touch target must mount: " + id);
    ui(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); return null; });
    await(() -> ui(() -> { Rect visible = new Rect(); return view(id).getGlobalVisibleRect(visible) && visible.width() > 0 && visible.height() > 0; }), "Touch target must be visible");
    if (navigationTouch) commitFrame();
    float[] point = ui(() -> { Rect visible = new Rect(); require(view(id).getGlobalVisibleRect(visible), "Touch target clipped"); return new float[]{visible.exactCenterX(), visible.exactCenterY()}; });
    long down = SystemClock.uptimeMillis();
    for (int action : new int[]{MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) { MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, point[0], point[1], 0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN); try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); } finally { event.recycle(); } SystemClock.sleep(30); }
  }
  private void commitFrame() throws Exception {
    CountDownLatch committed = new CountDownLatch(1);
    ui(() -> { View root = activity.getWindow().getDecorView(); root.getViewTreeObserver().registerFrameCommitCallback(committed::countDown); root.invalidate(); return null; });
    require(committed.await(5, TimeUnit.SECONDS), "Catalog frame must commit");
  }
  private void capture(String name) throws Exception {
    commitFrame();
    AccessibilityNodeInfo owner = automation.getRootInActiveWindow(); require(owner != null && PACKAGE.contentEquals(owner.getPackageName()), "Catalog must own screenshot window");
    Bitmap bitmap = automation.takeScreenshot(); require(bitmap != null, "Screenshot missing");
    try (FileOutputStream output = new FileOutputStream(new File(directory, name))) { require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output), "Screenshot encoding failed"); } finally { bitmap.recycle(); }
    pictures.put(name);
  }
  private void await(java.util.function.BooleanSupplier condition, String message) throws Exception { long deadline = SystemClock.uptimeMillis() + 25000; AssertionError last = null; do { try { if (condition.getAsBoolean()) return; } catch (AssertionError pending) { last = pending; } SystemClock.sleep(16); } while (SystemClock.uptimeMillis() < deadline); throw new AssertionError(message, last); }
  private <T> T ui(java.util.concurrent.Callable<T> action) { AtomicReference<T> value = new AtomicReference<>(); AtomicReference<Throwable> error = new AtomicReference<>(); driver.runOnMainSync(() -> { try { value.set(action.call()); } catch (Throwable failure) { error.set(failure); } }); if (error.get() != null) throw new AssertionError(error.get()); return value.get(); }
  private static void require(boolean value, String message) { if (!value) throw new AssertionError(message); }
}
