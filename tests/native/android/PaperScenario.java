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
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.style.BorderRadiusProp;
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
public final class PaperScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private static final String[] KEYS = {"stock", "custom"};
  private static final String[] STATES = stateNames();
  private static String[] stateNames() {
    String[] names = new String[33];
    names[0] = "default"; names[1] = "outlined"; names[2] = "square"; names[3] = "light-zero";
    for (int elevation = 0; elevation < 25; elevation++) names[4 + elevation] = "dark-" + elevation;
    names[29] = "dark-square"; names[30] = "rtl-dark"; names[31] = "native-reset"; names[32] = "restored";
    return names;
  }
  private JSONObject reference;
  private int initialCounterId, initialCustomId;
  private final Instrumentation driver;
  private final String fontProfile;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray states = new JSONArray(), stages = new JSONArray(), pictures = new JSONArray(), navigation = new JSONArray();
  private final Map<String, View> retained = new HashMap<>();
  private PaperScenario(Instrumentation driver, String fontProfile) { this.driver = driver; this.fontProfile = fontProfile; }
  public static void run(Instrumentation driver, String profile) { new PaperScenario(driver, profile).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      float fontScale = driver.getTargetContext().getResources().getConfiguration().fontScale;
      require(Build.VERSION.SDK_INT >= 29, "Frame-commit capture requires Android 29+");
      require("normal".equals(fontProfile) ? Math.abs(fontScale - 1) <= .01 : "enlarged".equals(fontProfile) && fontScale >= 1.3 && fontScale <= 5, "Select and verify the requested normal/enlarged OS font profile before this run");
      directory = new File(driver.getTargetContext().getCacheDir(), "mui-paper-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing Paper evidence");
      try (java.io.InputStreamReader input = new java.io.InputStreamReader(driver.getContext().getAssets().open("mui-paper-reference.json"), java.nio.charset.StandardCharsets.UTF_8)) {
        StringBuilder data = new StringBuilder(); char[] buffer = new char[2048]; int read;
        while ((read = input.read(buffer)) != -1) data.append(buffer, 0, read);
        reference = new JSONObject(data.toString());
      }
      require(reference.getInt("schemaVersion") == 1 && "9.5.0".equals(reference.getString("materialVersion")) && reference.getString("fixtureSha256").matches("[a-f0-9]{64}") && reference.getJSONArray("overlayAlphas").length() == 25, "Pinned Paper raster reference missing");
      report.put("reference", new JSONObject().put("materialVersion", reference.getString("materialVersion")).put("fixtureSha256", reference.getString("fixtureSha256")).put("overlayCases", 25));
      report.put("schemaVersion", 1).put("scenario", "paper-v1").put("driver", "native Instrumentation and UiAutomation")
        .put("artifactDirectory", "cache/" + directory.getName()).put("fontProfile", fontProfile)
        .put("paintMethod", "retained-view-draw-interior-samples")
        .put("device", new JSONObject().put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL).put("fontScale", fontScale).put("density", driver.getTargetContext().getResources().getDisplayMetrics().density));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Existing catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test-id resource missing");
      navigate("catalog-tab-Wrappers", "root-layout-paper", false);
      navigate("root-layout-paper", "paper-contract-receipt", true);
      await(() -> ui(() -> metadata().getInt("state") == 0 && metadata().getInt("count") == 0), "Initial Paper state");
      await(() -> ui(() -> { View counter = firstText(view("paper-contract-counter")); if (counter == null) return false; Layout initial = layout(counter); return initial != null && "0".equals(initial.getText().toString()) && "0".equals(text(counter).toString()); }), "Initial native counter must draw zero");
      View initialCounter = ui(() -> firstText(view("paper-contract-counter"))), initialCustom = ui(() -> view("paper-contract-customtouch"));
      require(initialCounter != null && "Custom 0".contentEquals(initialCustom.getContentDescription()), "Both native inputs must initially show zero");
      initialCounterId = initialCounter.getId(); initialCustomId = initialCustom.getId();
      retained.put("counter-text", initialCounter); retained.put("custom-touch", initialCustom);
      report.put("initialCount", 0).put("initialCustomCount", 0).put("initialCounterText", "0").put("initialCustomLabel", "Custom 0").put("initialCounterNativeId", initialCounterId).put("initialCustomTouchNativeId", initialCustomId);
      tap("paper-contract-counter");
      await(() -> ui(() -> metadata().getInt("count") == 1), "Native child touch must activate once");
      tap("paper-contract-customtouch");
      await(() -> ui(() -> metadata().getInt("customCount") == 1 && metadata().getJSONObject("touch").getInt("count") == 1), "Custom root must deliver one real native touch");
      long lastRequest = 0;
      for (int index = 0; index < STATES.length; index++) {
        final int state = index;
        await(() -> ui(() -> metadata().getInt("state") == state), "Finite state must commit");
        final long previous = lastRequest;
        tap("paper-contract-measure");
        await(() -> ui(() -> fresh(metadata(), state, previous)), "A fresh explicit measure request must complete for all roots");
        JSONObject sample = ui(() -> sample(state));
        lastRequest = sample.getJSONObject("metadata").getLong("request");
        states.put(sample); stages.put(STATES[index]);
        Bundle update = new Bundle(); update.putString("paperStage", STATES[index]); driver.sendStatus(1, update);
        if (index <= 5 || index == 12 || index == 20 || index >= 28) capture(STATES[index] + ".png");
        if (index + 1 < STATES.length) tap("paper-contract-next");
      }
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString() + (error.getCause() == null ? "" : " <- " + error.getCause())); if (directory != null && activity != null && automation != null) capture("failure.png"); }
      catch (Throwable ignored) { /* Keep the original assertion. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("states", states).put("stages", stages).put("screenshots", pictures).put("navigation", navigation); result.putString("paperReport", report.toString()); }
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
    JSONObject metadata = metadata(), input = metadata.getJSONObject("input");
    require(metadata.getInt("state") == state && metadata.getInt("count") == 1 && metadata.getInt("customCount") == 1, "State and retained inputs must agree");
    float density = driver.getTargetContext().getResources().getDisplayMetrics().density;
    float fontScale = driver.getTargetContext().getResources().getConfiguration().fontScale;
    require(Math.abs(metadata.getDouble("fontScale") - fontScale) <= .01, "Actual OS font scale differs from receipt");
    JSONObject touch = metadata.getJSONObject("touch");
    require(touch.getInt("count") == 1 && touch.getInt("target") > 0 && Double.isFinite(touch.getDouble("pageX")) && Double.isFinite(touch.getDouble("pageY")) && Double.isFinite(touch.getDouble("timestamp")), "Original native event fields must survive");
    boolean reset = input.getBoolean("reset"), outlined = "outlined".equals(input.getString("variant"));
    JSONArray roots = new JSONArray();
    for (String key : KEYS) {
      View root = view("paper-contract-" + key), frame = view("paper-contract-" + key + "-frame");
      View old = retained.get(key); require(old == null || old == root, "Actual native root was replaced: " + key); retained.put(key, root);
      JSONObject refs = metadata.getJSONObject("refs").getJSONObject(key);
      require(refs.getInt("attached") == 1 && refs.getInt("cleaned") == 0 && refs.getInt("generation") == 1 && refs.getBoolean("sameRoot"), "Ref lifetime changed: " + key);
      JSONObject actual = bounds(root), outer = bounds(frame), receipt = metadata.getJSONObject("receipts").getJSONObject(key);
      for (String axis : new String[]{"x", "y", "width", "height"}) near(actual.getDouble(axis), receipt.getJSONObject("window").getDouble(axis), "Fresh ref differs from independent native bounds: " + key);
      near(actual.getDouble("x"), outer.getDouble("x") + 24, "Native frame left inset");
      near(actual.getDouble("y"), outer.getDouble("y") + 24, "Native frame top inset");
      near(actual.getDouble("width"), outer.getDouble("width") - 48, "Native Paper width");
      require(actual.getDouble("height") >= 86.5, "Paper minimum must remain at least88dp within native rounding");
      require(root.getLayoutDirection() == (input.getBoolean("rtl") ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual host direction differs");
      View child = view("paper-contract-" + (key.equals("stock") ? "counter" : "customtouch"));
      JSONObject childBounds = bounds(child);
      double padding = reset ? 0 : 16, border = outlined ? 1 : 0;
      near(childBounds.getDouble("x"), actual.getDouble("x") + padding + border, "Actual child padding");
      near(childBounds.getDouble("width"), actual.getDouble("width") - 2 * (padding + border), "Actual child inner width");
      near(childBounds.getDouble("y") + childBounds.getDouble("height") / 2, actual.getDouble("y") + actual.getDouble("height") / 2, "Actual child vertical centering");
      require(childBounds.getDouble("height") >= 42.5 && childBounds.getDouble("width") >= 42.5, "Actual touch target must retain minimum44dp within rounding");
      near(actual.getDouble("height"), Math.max(88, childBounds.getDouble("height") + 2 * (padding + border)), "Actual intrinsic Paper height including vertical padding and border");
      require(childBounds.getDouble("y") >= actual.getDouble("y") + padding + border - 1.5 && childBounds.getDouble("y") + childBounds.getDouble("height") <= actual.getDouble("y") + actual.getDouble("height") - padding - border + 1.5, "Actual scaled child must fit vertical padding/border");
      Float width = BackgroundStyleApplicator.getBorderWidth(root, LogicalEdge.ALL);
      Integer color = BackgroundStyleApplicator.getBorderColor(root, LogicalEdge.ALL);
      LengthPercentage radius = BackgroundStyleApplicator.getBorderRadius(root, BorderRadiusProp.BORDER_RADIUS);
      // ReactViewManager retains a DIP LengthPercentage here, unlike pixel bounds.
      float radiusDp = radius == null ? 0 : radius.resolve(Math.min(root.getWidth(), root.getHeight()) / density);
      nearProperty(width == null ? 0 : width, border, "Actual native border width");
      nearProperty(radiusDp, input.getBoolean("square") || reset ? 0 : 4, "Actual native radius");
      if (outlined) require(color != null && color == 0x1f000000, "Actual outlined palette border missing");
      JSONObject observation = new JSONObject().put("key", key).put("nativeId", root.getId()).put("class", root.getClass().getName())
        .put("bounds", actual).put("frame", outer).put("child", childBounds).put("paint", paint(root, input, density))
        .put("direction", root.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr")
        .put("borderWidthDp", width == null ? 0 : width).put("borderColor", color == null ? JSONObject.NULL : color & 0xffffffffL).put("radiusDp", radiusDp);
      roots.put(observation);
    }
    View counter = firstText(view("paper-contract-counter")), custom = view("paper-contract-customtouch");
    require(counter != null && counter == retained.get("counter-text") && custom == retained.get("custom-touch"), "Actual native input identities changed");
    require(counter.getId() == initialCounterId && custom.getId() == initialCustomId && "Custom 1".contentEquals(custom.getContentDescription()), "Native input identity/count changed");
    Object content = text(counter); Layout layout = layout(counter);
    require("1".contentEquals((CharSequence)content) && layout != null && layout.getLineCount() > 0 && layout.getText().toString().equals(content.toString()), "Native counter glyph layout must survive updates");
    TextPaint glyph = new TextPaint(layout.getPaint());
    if (content instanceof android.text.Spanned) for (android.text.style.CharacterStyle span : ((android.text.Spanned)content).getSpans(0, 1, android.text.style.CharacterStyle.class)) span.updateDrawState(glyph);
    float expected = (float)Math.ceil(PixelUtil.toPixelFromSP(14));
    require(Math.abs(glyph.getTextSize() - expected) <= 1.1, "Actual OS-scaled glyph size differs");
    require(glyph.getColor() == (input.getBoolean("dark") ? Color.WHITE : 0xde000000), "Counter glyph contrast differs after palette change");
    return new JSONObject().put("name", STATES[state]).put("metadata", metadata).put("roots", roots).put("counterText", content.toString())
      .put("counterTextClass", counter.getClass().getName()).put("counterColor", glyph.getColor() & 0xffffffffL).put("counterFontPx", glyph.getTextSize()).put("expectedCounterFontPx", expected)
      .put("counterNativeId", counter.getId()).put("customTouchNativeId", custom.getId()).put("customTouchLabel", custom.getContentDescription().toString());
  }
  /** Draw the retained native View. Sample only actual text-free interior points;
   * this observes backgrounds/gradients, not calibrated GPU shadows or performance. */
  private JSONObject paint(View root, JSONObject input, float density) throws Exception {
    require(root.getWidth() > 0 && root.getHeight() > 0, "Raster needs mounted nonempty bounds");
    ArrayList<Rect> excluded = new ArrayList<>(); textRects(root, root, excluded);
    JSONArray exclusions = new JSONArray(), samples = new JSONArray();
    for (Rect rect : excluded) exclusions.put(new JSONObject().put("left", rect.left).put("top", rect.top).put("right", rect.right).put("bottom", rect.bottom));
    Bitmap raster = Bitmap.createBitmap(root.getWidth(), root.getHeight(), Bitmap.Config.ARGB_8888);
    try {
      root.draw(new Canvas(raster));
      int x = Math.round(8 * density), y = Math.round((input.getBoolean("reset") ? 2 : 8) * density);
      int right = raster.getWidth() - 1 - x, bottom = raster.getHeight() - 1 - y, center = (raster.getWidth() - 1) / 2;
      int[][] points = {{x, y}, {center, y}, {right, y}, {x, bottom}, {right, bottom}};
      int base = input.getBoolean("reset") ? Color.rgb(36, 52, 71) : input.getBoolean("dark") ? Color.rgb(18, 18, 18) : Color.WHITE;
      double alpha = input.getBoolean("dark") && !input.getBoolean("reset") && "elevation".equals(input.getString("variant")) ? reference.getJSONArray("overlayAlphas").getDouble(input.getInt("elevation")) : 0;
      require(Double.isFinite(alpha) && alpha >= 0 && alpha <= 1, "Invalid pinned overlay alpha");
      int[] rgb = {Color.red(base), Color.green(base), Color.blue(base)};
      for (int[] point : points) {
        require(point[0] >= 0 && point[1] >= 0 && point[0] < raster.getWidth() && point[1] < raster.getHeight(), "Interior sample escaped native raster");
        for (Rect rect : excluded) require(!rect.contains(point[0], point[1]), "Actual native text overlaps an interior paint sample");
        int argb = raster.getPixel(point[0], point[1]);
        require(Color.alpha(argb) == 255, "Paper background sample must remain opaque");
        int[] actual = {Color.red(argb), Color.green(argb), Color.blue(argb)};
        for (int channel = 0; channel < 3; channel++) require(Math.abs(actual[channel] - Math.round(rgb[channel] + (255 - rgb[channel]) * alpha)) <= 3, "Actual source-derived native background/overlay color differs");
        samples.put(new JSONObject().put("x", point[0]).put("y", point[1]).put("argb", argb & 0xffffffffL));
      }
      return new JSONObject().put("method", "retained-view-draw").put("widthPx", raster.getWidth()).put("heightPx", raster.getHeight()).put("excludedTextRects", exclusions).put("samples", samples);
    } finally { raster.recycle(); }
  }
  private static void nearProperty(double actual, double expected, String message) { require(Double.isFinite(actual) && Math.abs(actual - expected) <= .01, message + ": actual=" + actual + " expected=" + expected); }
  private static void near(double actual, double expected, String message) { require(Double.isFinite(actual) && Double.isFinite(expected) && Math.abs(actual - expected) <= 1.5, message + ": actual=" + actual + " expected=" + expected); }
  private void textRects(View root, View child, ArrayList<Rect> result) {
    if (isText(child)) { int[] a = new int[2], b = new int[2]; root.getLocationInWindow(a); child.getLocationInWindow(b); result.add(new Rect(b[0] - a[0], b[1] - a[1], b[0] - a[0] + child.getWidth(), b[1] - a[1] + child.getHeight())); }
    if (child instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)child).getChildCount(); i++) textRects(root, ((ViewGroup)child).getChildAt(i), result);
  }
  private static boolean isText(View view) { return view instanceof TextView || view.getClass().getName().equals("com.facebook.react.views.text.PreparedLayoutTextView"); }
  private View firstText(View root) { if (isText(root)) return root; if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View found = firstText(((ViewGroup)root).getChildAt(i)); if (found != null) return found; } return null; }
  private Object text(View target) throws Exception { return target instanceof TextView ? ((TextView)target).getText() : target.getClass().getMethod("getText").invoke(target); }
  private Layout layout(View target) throws Exception { if (target instanceof TextView) return ((TextView)target).getLayout(); Object prepared = target.getClass().getMethod("getPreparedLayout").invoke(target); return prepared == null ? null : (Layout)prepared.getClass().getMethod("getLayout").invoke(prepared); }
  private JSONObject bounds(View target) throws Exception { int[] origin = new int[2]; target.getLocationInWindow(origin); float density = target.getResources().getDisplayMetrics().density; require(target.getWidth() > 0 && target.getHeight() > 0, "Actual native bounds must be nonempty"); return new JSONObject().put("x", origin[0] / density).put("y", origin[1] / density).put("width", target.getWidth() / density).put("height", target.getHeight() / density); }
  private JSONObject metadata() throws Exception { View receipt = find("paper-contract-receipt"); return receipt == null || receipt.getContentDescription() == null ? new JSONObject() : new JSONObject(receipt.getContentDescription().toString()); }
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
