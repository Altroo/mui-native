/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
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

/** Observes retained native roots, text attributes and finite text-free raster bands.
 * Android font conversion is read through RN's PixelUtil, including nonlinear SP scaling.
 * Contract decisions remain in the independent Node report parser, not JS style receipts. */
public final class CardScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private static final String[] KEYS = {"stock", "custom"};
  private static final String[] PROBES = {"theme", "owner", "as"};
  private static final String[] STATES = {"default", "raised", "explicit-zero", "explicit-three", "explicit-undefined", "paper-default", "card-default", "dark-raised", "outlined-raised", "square", "theme-sx", "native-reset", "restored"};
  private final Instrumentation driver;
  private final String fontProfile;
  private Activity activity;
  private UiAutomation automation;
  private int tagId, nativeTagId;
  private File directory;
  private final JSONArray states = new JSONArray(), stages = new JSONArray(), pictures = new JSONArray(), navigation = new JSONArray();
  private final Map<String, View> retained = new HashMap<>();
  private CardScenario(Instrumentation driver, String profile) { this.driver = driver; fontProfile = profile; }
  public static void run(Instrumentation driver, String profile) { new CardScenario(driver, profile).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      float fontScale = driver.getTargetContext().getResources().getConfiguration().fontScale;
      require(Build.VERSION.SDK_INT >= 29, "Frame-commit capture requires Android29+");
      require("normal".equals(fontProfile) ? Math.abs(fontScale - 1) <= .01 : "enlarged".equals(fontProfile) && Math.abs(fontScale - 2) <= .01, "Select verified normal/enlarged OS font profile before running");
      directory = new File(driver.getTargetContext().getCacheDir(), "mui-card-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing Card evidence");
      JSONObject conversions = new JSONObject();
      report.put("schemaVersion", 1).put("scenario", "card-native-root-contract-v1").put("driver", "native Instrumentation and UiAutomation")
        .put("artifactDirectory", "cache/" + directory.getName()).put("fontProfile", fontProfile).put("paintMethod", "retained-view-draw-interior-samples")
        .put("device", new JSONObject().put("package", PACKAGE).put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL).put("fontScale", fontScale)
          .put("density", driver.getTargetContext().getResources().getDisplayMetrics().density).put("spToPx", conversions));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Existing catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test-id resource missing");
      nativeTagId = driver.getTargetContext().getResources().getIdentifier("view_tag_native_id", "id", PACKAGE);
      require(nativeTagId != 0, "Native nativeID resource missing");
      navigate("catalog-tab-Wrappers", "root-layout-card", false);
      navigate("root-layout-card", "card-contract-receipt", true);
      // RN initializes DisplayMetricsHolder with the active catalog surface.
      // Read its actual nonlinear SP conversion only after that surface mounts.
      ui(() -> {
        for (int sp : new int[]{1, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32}) conversions.put(String.valueOf(sp), PixelUtil.toPixelFromSP(sp));
        return null;
      });
      await(() -> ui(() -> metadata().optInt("state", -1) == 0 && counts(metadata(), 0)), "Fresh scene counters must start at zero");
      JSONObject initial = ui(() -> {
        JSONArray roots = new JSONArray();
        for (String key : KEYS) {
          View root = view("card-contract-" + key), counter = view("card-contract-" + key + "-counter"), copy = view("card-contract-" + key + "-text");
          View glyph = firstText(counter); require(glyph != null && (key + " 0").equals(text(glyph).toString()), "Native counter must draw zero");
          retained.put(key, root); retained.put(key + "-counter", counter); retained.put(key + "-text", copy);
          roots.put(identity(key, root, counter, copy).put("counterText", text(glyph).toString()));
        }
        JSONArray probes = new JSONArray();
        for (String key : PROBES) {
          View root = view(probeHost(key));
          retained.put("probe-" + key, root);
          probes.put(new JSONObject().put("key", key).put("rootId", System.identityHashCode(root)).put("testID", String.valueOf(root.getTag(tagId))).put("nativeID", String.valueOf(root.getTag(nativeTagId))));
        }
        return new JSONObject().put("counts", metadata().getJSONObject("counts")).put("roots", roots).put("probes", probes);
      });
      report.put("initial", initial);
      for (String key : KEYS) tap("card-contract-" + key + "-counter");
      await(() -> ui(() -> counts(metadata(), 1) && metadata().optJSONObject("touch") != null), "Two real counter touches must activate once");
      long lastRequest = 0;
      for (int index = 0; index < STATES.length; index++) {
        final int state = index;
        await(() -> ui(() -> metadata().getInt("state") == state), "Finite state must commit");
        final long previous = lastRequest;
        tap("card-contract-measure");
        await(() -> ui(() -> fresh(metadata(), state, previous)), "Four current-generation main-root measurements must complete");
        JSONObject sample = ui(() -> sample(state));
        lastRequest = sample.getJSONObject("metadata").getLong("request");
        states.put(sample); stages.put(STATES[index]);
        Bundle update = new Bundle(); update.putString("cardStage", STATES[index]); driver.sendStatus(1, update);
        capture(STATES[index] + ".png");
        if (index + 1 < STATES.length) tap("card-contract-next");
      }
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString() + (error.getCause() == null ? "" : " <- " + error.getCause())); if (directory != null && activity != null && automation != null) capture("failure.png"); }
      catch (Throwable ignored) { /* Preserve the first failure even if capture fails. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("states", states).put("stages", stages).put("screenshots", pictures).put("navigation", navigation); result.putString("cardReport", report.toString()); }
      catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }
  private static JSONObject identity(String key, View root, View counter, View copy) throws Exception {
    return new JSONObject().put("key", key).put("rootId", System.identityHashCode(root)).put("counterId", System.identityHashCode(counter)).put("textId", System.identityHashCode(copy));
  }
  private static boolean counts(JSONObject metadata, int expected) throws Exception {
    JSONObject counts = metadata.optJSONObject("counts"); if (counts == null) return false;
    for (String key : KEYS) if (counts.optInt(key, -1) != expected) return false;
    return true;
  }
  private boolean fresh(JSONObject metadata, int state, long previous) throws Exception {
    if (metadata.getInt("state") != state || metadata.getLong("request") <= previous || !counts(metadata, 1)) return false;
    for (String map : new String[]{"receipts", "textReceipts"}) for (String key : KEYS) {
      JSONObject receipt = metadata.getJSONObject(map).optJSONObject(key);
      if (receipt == null || receipt.getLong("request") != metadata.getLong("request") || receipt.getInt("state") != state || receipt.getInt("generation") != 1) return false;
    }
    JSONObject probes = metadata.optJSONObject("probeReceipts");
    if (probes == null) return false;
    for (String key : PROBES) {
      JSONObject receipt = probes.optJSONObject(key);
      if (receipt == null || receipt.getLong("request") != metadata.getLong("request") || receipt.getInt("state") != state || receipt.getInt("generation") != 1) return false;
    }
    return true;
  }
  private JSONObject sample(int state) throws Exception {
    JSONObject metadata = metadata(); require(metadata.getInt("state") == state && counts(metadata, 1), "State and counters must agree");
    nearProperty(metadata.getDouble("fontScale"), driver.getTargetContext().getResources().getConfiguration().fontScale, "Actual OS font scale differs");
    JSONObject touch = metadata.getJSONObject("touch"); require(touch.getInt("count") == 1 && touch.getInt("target") > 0 && Double.isFinite(touch.getDouble("pageX")) && Double.isFinite(touch.getDouble("pageY")) && Double.isFinite(touch.getDouble("timestamp")), "Raw custom native touch fields missing");
    JSONArray roots = new JSONArray();
    for (String key : KEYS) {
      View root = view("card-contract-" + key), counter = view("card-contract-" + key + "-counter"), copy = view("card-contract-" + key + "-text");
      require(retained.get(key) == root && retained.get(key + "-counter") == counter && retained.get(key + "-text") == copy, "Actual retained native identity changed: " + key);
      for (String map : new String[]{"refs", "textRefs"}) {
        JSONObject ref = metadata.getJSONObject(map).getJSONObject(key);
        require(ref.getInt("attached") == 1 && ref.getInt("cleaned") == 0 && ref.getInt("generation") == 1 && ref.getBoolean("sameRoot"), "React ref lease changed");
      }
      JSONObject actual = bounds(root), textBounds = bounds(copy);
      for (String axis : new String[]{"x", "y", "width", "height"}) {
        near(actual.getDouble(axis), metadata.getJSONObject("receipts").getJSONObject(key).getJSONObject("window").getDouble(axis), "Fresh root native bounds differ: " + key);
        near(textBounds.getDouble(axis), metadata.getJSONObject("textReceipts").getJSONObject(key).getJSONObject("window").getDouble(axis), "Fresh Copy native bounds differ: " + key);
      }
      View counterGlyph = firstText(counter), copyGlyph = firstText(copy); require(counterGlyph != null && copyGlyph != null, "Native text hosts missing");
      Layout copyLayout = layout(copyGlyph), counterLayout = layout(counterGlyph); require(copyLayout != null && counterLayout != null && copyLayout.getLineCount() == 1, "Current native text layout missing or unexpectedly wrapped");
      TextPaint copyPaint = glyphPaint(copyGlyph), counterPaint = glyphPaint(counterGlyph);
      require((key + " 1").equals(text(counterGlyph).toString()) && "Copy".equals(text(copyGlyph).toString()), "Native counter/Copy text changed");
      Float border = BackgroundStyleApplicator.getBorderWidth(root, LogicalEdge.ALL);
      Integer borderColor = BackgroundStyleApplicator.getBorderColor(root, LogicalEdge.ALL);
      LengthPercentage radius = BackgroundStyleApplicator.getBorderRadius(root, BorderRadiusProp.BORDER_RADIUS);
      float density = root.getResources().getDisplayMetrics().density;
      JSONObject observation = identity(key, root, counter, copy).put("class", root.getClass().getName()).put("alpha", root.getAlpha()).put("effectiveAlpha", effectiveAlpha(root)).put("shown", root.isShown()).put("direction", root.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr")
        .put("frame", bounds(view("card-contract-" + key + "-frame"))).put("bounds", actual).put("counter", bounds(counter)).put("textBounds", textBounds)
        .put("counterText", text(counterGlyph).toString()).put("copyText", text(copyGlyph).toString()).put("counterTextClass", counterGlyph.getClass().getName()).put("textClass", copyGlyph.getClass().getName())
        .put("counterFontPx", counterPaint.getTextSize()).put("counterColor", counterPaint.getColor() & 0xffffffffL).put("textFontPx", copyPaint.getTextSize()).put("textLineHeightPx", copyLayout.getLineBottom(0) - copyLayout.getLineTop(0))
        .put("textLetterSpacingEm", copyPaint.getLetterSpacing()).put("textColor", copyPaint.getColor() & 0xffffffffL).put("borderWidthDp", border == null ? 0 : border)
        .put("borderColor", borderColor == null ? JSONObject.NULL : borderColor & 0xffffffffL).put("radiusDp", radius == null ? 0 : radius.resolve(Math.min(root.getWidth(), root.getHeight()) / density)).put("paint", paint(root, density));
      roots.put(observation);
    }
    JSONArray probes = new JSONArray();
    for (String key : PROBES) probes.put(sampleProbe(key, metadata));
    return new JSONObject().put("name", STATES[state]).put("metadata", metadata).put("roots", roots).put("probes", probes);
  }
  private static String probeHost(String key) {
    return "as".equals(key) ? "card-contract-probe-as-alternate" : "card-contract-probe-" + key;
  }
  /** Native-only observations for the three empty reserved-prop probe surfaces.
   * No class vocabulary or computed JS style is used as a native oracle. */
  private JSONObject sampleProbe(String key, JSONObject metadata) throws Exception {
    View root = view(probeHost(key));
    require(retained.get("probe-" + key) == root, "Actual probe host instance changed: " + key);
    JSONObject lease = metadata.getJSONObject("probeRefs").getJSONObject(key);
    require(lease.getInt("attached") == 1 && lease.getInt("cleaned") == 0 && lease.getInt("generation") == 1 && lease.getBoolean("sameRoot"), "Probe ref lease changed");
    JSONObject actual = bounds(root), measured = metadata.getJSONObject("probeReceipts").getJSONObject(key).getJSONObject("window");
    for (String axis : new String[]{"x", "y", "width", "height"}) near(actual.getDouble(axis), measured.getDouble(axis), "Fresh probe native bounds differ: " + key);
    Float border = BackgroundStyleApplicator.getBorderWidth(root, LogicalEdge.ALL);
    Integer borderColor = BackgroundStyleApplicator.getBorderColor(root, LogicalEdge.ALL);
    LengthPercentage radius = BackgroundStyleApplicator.getBorderRadius(root, BorderRadiusProp.BORDER_RADIUS);
    float density = root.getResources().getDisplayMetrics().density;
    return new JSONObject().put("key", key).put("rootId", System.identityHashCode(root)).put("testID", String.valueOf(root.getTag(tagId))).put("nativeID", String.valueOf(root.getTag(nativeTagId))).put("class", root.getClass().getName()).put("direction", root.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr")
      .put("frame", bounds(view("card-contract-probe-" + key + "-frame"))).put("bounds", actual)
      .put("alpha", root.getAlpha()).put("effectiveAlpha", effectiveAlpha(root)).put("shown", root.isShown())
      .put("borderWidthDp", border == null ? 0 : border).put("borderColor", borderColor == null ? JSONObject.NULL : borderColor & 0xffffffffL)
      .put("radiusDp", radius == null ? 0 : radius.resolve(Math.min(root.getWidth(), root.getHeight()) / density))
      .put("nativeChildCount", root instanceof ViewGroup ? ((ViewGroup)root).getChildCount() : 0)
      .put("originalHostPresent", "as".equals(key) && find("card-contract-probe-as-original") != null).put("paint", paint(root, density));
  }
  // View.draw omits parent compositing. Observe native alpha/visibility too so
  // ignored MuiCard opacity must not disappear from the finite raster contract.
  private static float effectiveAlpha(View target) {
    float product = 1;
    for (View current = target; current != null; current = current.getParent() instanceof View ? (View)current.getParent() : null) product *= current.getAlpha();
    return product;
  }
  private TextPaint glyphPaint(View target) throws Exception {
    Layout glyphLayout = layout(target); require(glyphLayout != null && glyphLayout.getText().toString().equals(text(target).toString()), "Native layout does not match current text");
    TextPaint paint = new TextPaint(glyphLayout.getPaint()); Object content = text(target);
    if (content instanceof android.text.Spanned) for (android.text.style.CharacterStyle span : ((android.text.Spanned)content).getSpans(0, content.toString().length(), android.text.style.CharacterStyle.class)) span.updateDrawState(paint);
    return paint;
  }
  /** Sample only a finite top strip, excluding actual native text rectangles.
   * Raw edge columns let the parser reject stale reset borders independently. */
  private JSONObject paint(View root, float density) throws Exception {
    require(root.getWidth() > 0 && root.getHeight() > 0, "Raster requires nonempty mounted bounds");
    ArrayList<Rect> excluded = new ArrayList<>(); textRects(root, root, excluded);
    JSONArray exclusions = new JSONArray(), samples = new JSONArray(), edgeSamples = new JSONArray(), columns = new JSONArray();
    for (Rect rect : excluded) exclusions.put(new JSONObject().put("left", rect.left).put("top", rect.top).put("right", rect.right).put("bottom", rect.bottom));
    Bitmap raster = Bitmap.createBitmap(root.getWidth(), root.getHeight(), Bitmap.Config.ARGB_8888);
    try {
      root.draw(new Canvas(raster)); int width = raster.getWidth();
      int[] xs = {Math.round(4 * density), (width - 1) / 4, (width - 1) / 2, 3 * (width - 1) / 4, width - 1 - Math.round(4 * density)};
      for (int x : xs) {
        samples.put(pixel(raster, excluded, x, Math.round(4 * density)));
        edgeSamples.put(pixel(raster, excluded, x, Math.round(density)));
      }
      for (int x : new int[]{(width - 1) / 4, (width - 1) / 2, 3 * (width - 1) / 4}) {
        JSONArray pixels = new JSONArray();
        for (int y = 0; y <= (int)Math.ceil(4 * density) + 1; y++) pixels.put(pixel(raster, excluded, x, y).getLong("argb"));
        columns.put(new JSONObject().put("x", x).put("pixels", pixels));
      }
      return new JSONObject().put("method", "retained-view-draw").put("widthPx", raster.getWidth()).put("heightPx", raster.getHeight()).put("excludedTextRects", exclusions).put("samples", samples).put("edgeSamples", edgeSamples).put("topBorderColumns", columns);
    } finally { raster.recycle(); }
  }
  private static JSONObject pixel(Bitmap raster, ArrayList<Rect> excluded, int x, int y) throws Exception {
    require(x >= 0 && y >= 0 && x < raster.getWidth() && y < raster.getHeight(), "Raster sample escaped native bounds");
    for (Rect rect : excluded) require(!rect.contains(x, y), "Actual text overlaps finite paint sample");
    return new JSONObject().put("x", x).put("y", y).put("argb", raster.getPixel(x, y) & 0xffffffffL);
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
  private JSONObject metadata() throws Exception { View receipt = find("card-contract-receipt"); return receipt == null || receipt.getContentDescription() == null ? new JSONObject() : new JSONObject(receipt.getContentDescription().toString()); }
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
    return receipt.optInt("state", -1) == 0 && receipt.optJSONObject("counts") != null && receipt.getJSONObject("counts").getInt("stock") == 0 && receipt.getJSONObject("counts").getInt("custom") == 0;
  }
  private void tap(String id) throws Exception { tap(id, false); }
  private void tap(String id, boolean navigationTouch) throws Exception {
    await(this::catalogOwnsTouchWindow, "Catalog must own the focused window before touch: " + id);
    await(() -> ui(() -> find(id) != null && view(id).getWidth() > 0 && view(id).getHeight() > 0), "Touch target must mount: " + id);
    ui(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); return null; });
    await(() -> ui(() -> { Rect visible = new Rect(); return view(id).getGlobalVisibleRect(visible) && visible.width() > 0 && visible.height() > 0; }), "Touch target must be visible");
    if (navigationTouch) commitFrame();
    float[] point = ui(() -> { Rect visible = new Rect(); require(view(id).getGlobalVisibleRect(visible), "Touch target clipped"); return new float[]{visible.exactCenterX(), visible.exactCenterY()}; });
    long down = SystemClock.uptimeMillis();
    for (int action : new int[]{MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) { require(catalogOwnsTouchWindow(), "Catalog lost its focused touch window: " + id); MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, point[0], point[1], 0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN); try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); } finally { event.recycle(); } SystemClock.sleep(30); }
  }
  // Offscreen bounds can remain valid underneath a system or another app window.
  // Check actual focus and the active accessibility owner before each injected event.
  private boolean catalogOwnsTouchWindow() {
    AccessibilityNodeInfo owner = automation.getRootInActiveWindow();
    return owner != null && PACKAGE.equals(String.valueOf(owner.getPackageName()))
      && ui(() -> activity.hasWindowFocus());
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
