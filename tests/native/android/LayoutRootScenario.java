/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.text.TextPaint;
import android.text.Layout;
import android.util.TypedValue;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.TextView;
import com.facebook.react.uimanager.BackgroundStyleApplicator;
import com.facebook.react.uimanager.PixelUtil;
import com.facebook.react.uimanager.style.LogicalEdge;
import java.io.File;
import java.io.FileOutputStream;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/** Actual wrapper hosts, touches, glyph runs and measurement receipts; not a performance gate. */
public final class LayoutRootScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private static final String[] GROUPS = {"inherited", "own-false", "custom", "styled"};
  private static final String[] AVATARS = {"native", "custom", "portal"};
  private final Instrumentation driver;
  private final boolean textAlignment;
  private final String fontProfile;
  private final JSONArray stages = new JSONArray(), states = new JSONArray(), pictures = new JSONArray();
  private final Map<String, View> hosts = new HashMap<>();
  private Activity activity;
  private UiAutomation automation;
  private File directory;
  private int tagId;
  private String textDiagnostic;

  private LayoutRootScenario(Instrumentation driver, boolean textAlignment, String fontProfile) { this.driver = driver; this.textAlignment = textAlignment; this.fontProfile = fontProfile; }
  public static void run(Instrumentation driver, String fontProfile) { new LayoutRootScenario(driver, false, fontProfile).run(); }
  public static void runTextAlignment(Instrumentation driver) { new LayoutRootScenario(driver, true, null).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      directory = new File(driver.getTargetContext().getCacheDir(), (textAlignment ? "mui-text-alignment-" : "mui-layout-roots-") + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing native evidence");
      report.put("schemaVersion", 1).put("scenario", textAlignment ? "text-alignment-v1" : "layout-roots-v1")
        .put("driver", "native Instrumentation and UiAutomation").put("artifactDirectory", "cache/" + directory.getName())
        .put("device", new JSONObject().put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL)
          .put("density", driver.getTargetContext().getResources().getDisplayMetrics().density)
          .put("fontScale", driver.getTargetContext().getResources().getConfiguration().fontScale));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Catalog must be installed");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      if (!textAlignment) {
        require("normal".equals(fontProfile) || "enlarged".equals(fontProfile), "Layout root checks require an explicit normal/enlarged font profile");
        float actualFontScale = activity.getResources().getConfiguration().fontScale;
        report.put("fontProfile", fontProfile);
        report.getJSONObject("device").put("fontScale", actualFontScale);
        require("normal".equals(fontProfile) ? Math.abs(actualFontScale - 1) < .01 : actualFontScale >= 1.6,
          "Actual native OS font scale does not match requested profile: " + fontProfile + " scale=" + actualFontScale);
      }

      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test identifier resource is missing");
      tap("catalog-tab-Wrappers");
      if (textAlignment) {
        revealComplete("root-layout-details"); tap("root-layout-details");
        alignment("alignment-20-ltr", 20, false, 0);
        tap("details-contract-child"); tap("details-contract-font"); tap("details-contract-rtl");
        alignment("alignment-24-rtl", 24, true, 1);
        tap("details-contract-font"); tap("details-contract-rtl");
        alignment("alignment-restored-ltr", 20, false, 1);
      } else {
      group("group-initial", false, false, false, false, 16, 0); capture("group-column.png");
      tap("form-group-contract-child-custom");
      group("group-counter", false, false, false, false, 16, 1);
      tap("form-group-contract-row");
      group("group-row", true, false, false, false, 16, 1);
      tap("form-group-contract-error");
      group("group-error", true, true, false, false, 16, 1); capture("group-row-error.png");
      tap("form-group-contract-theme");
      group("group-theme", true, true, true, false, 16, 1);
      tap("form-group-contract-rtl");
      group("group-rtl", true, true, true, true, 16, 1);
      tap("form-group-contract-text");
      group("group-text", true, true, true, true, 20, 1); capture("group-rtl-text.png");
      tap("form-group-contract-text"); tap("form-group-contract-rtl");
      tap("form-group-contract-theme"); tap("form-group-contract-error"); tap("form-group-contract-row");
      group("group-restored", false, false, false, false, 16, 1);
      tap("root-layout-avatar");
      avatar("avatar-initial", false, false, false, 0); capture("avatar-default.png");
      tap("avatar-contract-child");
      avatar("avatar-counter", false, false, false, 1);
      tap("avatar-contract-alignment");
      avatar("avatar-alignment", true, false, false, 1);
      tap("avatar-contract-theme");
      avatar("avatar-theme", true, false, true, 1);
      tap("avatar-contract-rtl");
      avatar("avatar-rtl", true, true, true, 1); capture("avatar-themed-rtl.png");
      tap("avatar-contract-rtl"); tap("avatar-contract-theme"); tap("avatar-contract-alignment");
      avatar("avatar-restored", false, false, false, 1); capture("avatar-restored.png");
      }
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", describeFailure(error)); if (textDiagnostic != null) report.put("nativeTextDiagnostic", textDiagnostic); if (directory != null) capture("failure.png"); }
      catch (Throwable ignored) { /* Preserve the first assertion. */ }
    } finally {
      try {
        report.put("status", passed ? "passed" : "failed").put("stages", stages).put("states", states).put("screenshots", pictures);
        result.putString(textAlignment ? "textAlignmentReport" : "layoutRootReport", report.toString());
      } catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }

  /** Three source-unique short text states; glyph position comes from actual PNG pixels. */
  private void alignment(String name, int font, boolean rtl, int count) throws Exception {
    JSONArray roots = new JSONArray(); JSONObject metadata = null;
    for (String key : new String[]{"stock", "custom"}) {
      revealComplete("details-contract-" + key);
      JSONObject root = settled(() -> {
        JSONObject current = metadata("details-contract-receipt");
        require(current.getBoolean("large") == (font == 24) && current.getBoolean("rtl") == rtl &&
          current.getInt("childCount") == count && current.getString("spacing").equals("source") &&
          !current.getBoolean("inline") && !current.getBoolean("adjusted"), "Details controls/state have not committed");
        scale(current);
        require(Math.abs(current.getDouble("fontScale") - 1) < .01, "First alignment proof requires the actual baseline OS font scale");
        View host = retained("details-contract-" + key), content = retained("details-contract-content-" + key);
        JSONObject refs = current.getJSONObject("refs").getJSONObject(key);
        require(refs.getInt("attached") == 1 && refs.getInt("cleaned") == 0 && refs.getBoolean("sameRoot"), "Details actual root ref must survive");
        require(host.getLayoutDirection() == (rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual Details root direction differs");
        View action = retained("details-contract-child");
        require(text(action).equalsIgnoreCase("Mark " + count), "Actual native child counter must survive");
        if (count > 0) {
          JSONObject touch = current.getJSONObject("touches").getJSONObject("custom");
          require(touch.getInt("count") > 0 && touch.getInt("target") > 0 && Double.isFinite(touch.getDouble("pageX")) &&
            Double.isFinite(touch.getDouble("pageY")) && Double.isFinite(touch.getDouble("timestamp")), "Actual bubbling native touch receipt missing");
        }
        JSONArray texts = new JSONArray();
        for (String kind : new String[]{"primary", "small"}) {
          String id = "details-contract-" + kind + "-" + key;
          View leaf = retained(id); NativeText nativeLeaf = nativeText(leaf);
          String expected = kind.equals("primary") ? (key.equals("stock") ? "Dock 3." : "Notes.") : (key.equals("stock") ? "Keep dry." : "Fragile.");
          require(nativeLeaf.text.toString().equals(expected), "Source-unique native text differs: " + id);
          require(leaf.getLayoutDirection() == (rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual Text direction differs: " + id);
          float authored = kind.equals("primary") ? font : font * .5f;
          float expectedPx = (float)Math.ceil(PixelUtil.toPixelFromSP(authored));
          TextPaint paint = nativeLeaf.glyphPaint(); float density = leaf.getResources().getDisplayMetrics().density;
          require(Math.abs(paint.getTextSize() - expectedPx) <= 1.1 && nativeLeaf.layout.getLineCount() == 1, "Actual native font/line count differs: " + id);
          JSONObject actual = bounds(leaf), frame = current.getJSONObject("textFrames").getJSONObject(kind + "-" + key);
          double lineHeight = (nativeLeaf.layout.getLineBottom(0) - nativeLeaf.layout.getLineTop(0)) / density;
          JSONArray lines = current.getJSONObject("metrics").getJSONArray(kind + "-" + key);
          require(lines.length() == 1 && Math.abs(lines.getJSONObject(0).getDouble("height") - authored * 1.25) <= 1.5 &&
            lines.getJSONObject(0).getDouble("capHeight") > 0, "Current native line receipt missing/stale: " + id);
          require(Math.abs(lineHeight - authored * 1.25) <= 1.5 && Math.abs(actual.getDouble("height") - authored * 1.25) <= 1.5 &&
            Math.abs(frame.getDouble("width") - actual.getDouble("width")) <= 1.5 && Math.abs(frame.getDouble("height") - actual.getDouble("height")) <= 1.5,
            "Actual inherited native line height/frame differs: " + id);
          texts.put(new JSONObject().put("id", id).put("text", expected).put("nativeId", leaf.getId()).put("class", leaf.getClass().getName())
            .put("backend", nativeLeaf.backend).put("bounds", actual).put("direction", rtl ? "rtl" : "ltr")
            .put("fontPx", paint.getTextSize()).put("expectedFontPx", expectedPx).put("lineHeight", lineHeight)
            .put("advance", nativeLeaf.desiredWidth() / density));
        }
        View primary = view("details-contract-primary-" + key), small = view("details-contract-small-" + key);
        return measured(key, host, current).put("refs", refs).put("content", bounds(content))
          .put("physical", physicalChildren(host, new String[]{"content"}, new View[]{content}))
          .put("textPhysical", physicalChildren(content, new String[]{"primary", "small"}, new View[]{primary, small}))
          .put("contentId", content.getId()).put("texts", texts).put("metadata", current);
      }, name + "-" + key);
      String picture = name + "-" + key + ".png"; capture(picture);
      Bitmap bitmap = BitmapFactory.decodeFile(new File(directory, picture).getPath());
      require(bitmap != null, "Decode actual native screenshot");
      try {
        for (int index = 0; index < root.getJSONArray("texts").length(); index++) {
          JSONObject leaf = root.getJSONArray("texts").getJSONObject(index);
          JSONObject painted = ui(() -> screenshotInk(view(leaf.getString("id")), leaf, bitmap));
          double blank = leaf.getJSONObject("bounds").getDouble("width") - leaf.getDouble("advance");
          double authored = leaf.getString("id").contains("-small-") ? font * .5 : font;
          double tolerance = Math.min(Math.max(2, authored * .2), blank / 3);
          require(blank > Math.max(6, authored * .1) && painted.getDouble("width") > authored, "Fixture must distinguish native glyph edges");
          double inset = rtl ? leaf.getJSONObject("bounds").getDouble("width") - painted.getDouble("x") - painted.getDouble("width") : painted.getDouble("x");
          double oppositeInset = rtl ? painted.getDouble("x") : leaf.getJSONObject("bounds").getDouble("width") - painted.getDouble("x") - painted.getDouble("width");
          require(inset >= -1 && inset <= tolerance && oppositeInset >= blank - tolerance && painted.getDouble("width") <= leaf.getDouble("advance") + tolerance,
            "Actual screenshot glyph edges/blank space differ: " + leaf.getString("id") + " rtl=" + rtl + " ink=" + painted + " blank=" + blank + " opposite=" + oppositeInset + " tolerance=" + tolerance);
          leaf.put("ink", painted);
        }
      } finally { bitmap.recycle(); }
      metadata = root.getJSONObject("metadata"); root.remove("metadata");
      roots.put(root.put("screenshot", picture));
    }
    JSONObject child = ui(() -> { View action = retained("details-contract-child"); return new JSONObject().put("nativeId", action.getId()).put("text", text(action)); });
    states.put(new JSONObject().put("name", name).put("metadata", metadata).put("roots", roots).put("child", child)); stage(name);
  }
  private void revealComplete(String id) throws Exception {
    await(() -> ui(() -> find(id) != null && view(id).isShown() && view(id).getWidth() > 0), "Native target must mount: " + id);
    ui(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); return null; });
    await(() -> ui(() -> { View target = view(id); Rect visible = new Rect(); return target.getGlobalVisibleRect(visible) && visible.width() == target.getWidth() && visible.height() == target.getHeight(); }), "Complete native frame must be visible: " + id);
  }
  private static double colorDistance(int a, int b) {
    return Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)) + Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) + Math.abs((a & 255) - (b & 255));
  }
  private JSONObject screenshotInk(View leaf, JSONObject sample, Bitmap bitmap) throws Exception {
    Rect visible = new Rect(); int[] origin = new int[2]; leaf.getLocationOnScreen(origin);
    require(leaf.getGlobalVisibleRect(visible) && visible.width() == leaf.getWidth() && visible.height() == leaf.getHeight(), "Actual Text screenshot frame must be fully visible");
    int width = leaf.getWidth(), height = leaf.getHeight(), x = origin[0], y = origin[1];
    require(width > 4 && height > 4 && x >= 0 && y >= 0 && x + width <= bitmap.getWidth() && y + height <= bitmap.getHeight(), "Actual Text must fit screenshot pixels");
    JSONObject actual = bounds(leaf), before = sample.getJSONObject("bounds");
    for (String axis : new String[]{"x", "y", "width", "height"}) require(Math.abs(actual.getDouble(axis) - before.getDouble(axis)) <= .5, "Native Text moved during screenshot");
    int background = bitmap.getPixel(x, y), foreground = nativeText(leaf).glyphPaint().getColor();
    for (int corner : new int[]{bitmap.getPixel(x + width - 1, y), bitmap.getPixel(x, y + height - 1), bitmap.getPixel(x + width - 1, y + height - 1)})
      require(colorDistance(corner, background) <= 24, "Text screenshot background must be uniform at its corners");
    double contrast = colorDistance(background, foreground); require(contrast >= 48, "Native glyphs need measurable screenshot contrast");
    int left = width, right = -1, top = height, bottom = -1, pixels = 0;
    // Read the actual visible frame, not Layout.lineLeft: draw-time gravity may
    // move glyphs without changing intrinsic line coordinates on either backend.
    for (int row = 0; row < height; row++) for (int column = 0; column < width; column++) {
      int pixel = bitmap.getPixel(x + column, y + row);
      if (colorDistance(pixel, background) > Math.max(36, contrast * .2) && colorDistance(pixel, foreground) < contrast * .9) {
        left = Math.min(left, column); right = Math.max(right, column); top = Math.min(top, row); bottom = Math.max(bottom, row); pixels++;
      }
    }
    require(pixels >= 12, "Screenshot must contain meaningful native glyph paint");
    float density = leaf.getResources().getDisplayMetrics().density;
    return new JSONObject().put("x", left / density).put("y", top / density).put("width", (right - left + 1) / density)
      .put("height", (bottom - top + 1) / density).put("pixels", pixels);
  }

  private void group(String stage, boolean row, boolean error, boolean themed, boolean rtl, int fontSize, int count) throws Exception {
    JSONObject sample = settled(() -> {
      JSONObject metadata = metadata("form-group-contract-receipt");
      require(metadata.getInt("schemaVersion") == 1 && metadata.getBoolean("row") == row && metadata.getBoolean("parentError") == error &&
        metadata.getBoolean("themed") == themed && metadata.getBoolean("rtl") == rtl && metadata.getInt("fontSize") == fontSize, "Group controls have not committed");
      scale(metadata);
      JSONArray roots = new JSONArray();
      for (String key : GROUPS) {
        View root = retained("form-group-contract-" + key);
        JSONObject refs = metadata.getJSONObject("refs").getJSONObject(key);
        require(refs.getInt("attached") == 1 && refs.getInt("cleaned") == 0, "Group ref must remain attached once: " + key);
        require(root.getLayoutDirection() == (rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual Group direction differs: " + key + " actual=" + root.getLayoutDirection() + " expected=" + (rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR));
        View literal = literal(root, key), leaf = view("form-group-contract-text-" + key);
        View action = view("form-group-contract-child-" + key);
        View label = firstText(action);
        if (literal == null || label == null) throw unreadableText("Native Group text runs must exist: " + key, root, null);
        NativeText literalText = nativeText(literal), labelText = nativeText(label), leafText = nativeText(leaf);
        require(leafText.text.toString().equals("Inherited text"), "Actual inherited native text differs: " + key);
        require(text(action).equalsIgnoreCase("Choice " + (key.equals("custom") ? count : 0)), "Native child counter did not survive: " + key);
        JSONObject a = bounds(action), l = bounds(literal), t = bounds(leaf);
        JSONObject physical = groupPhysical(root, literal, action, leaf);
        float density = root.getResources().getDisplayMetrics().density;
        // The interaction root's measured width includes inner content padding and
        // minimum sizing that a label-only estimate misses. Eight DIPs retain the
        // existing conservative allowance for the owning root's border edges.
        double fitWidth = (literalText.desiredWidth() + action.getWidth()) / density + 8;
        if (row) {
          // Quantize only conversion residue; a real native pixel still overlaps.
          boolean sameRow = Math.round(overlapY(a, l) * density) > 0;
          require(fitWidth > root.getWidth() / density || sameRow, "Group items must share a row when actual native text fits: " + key);
          require(sameRow ? (rtl ? centerX(l) > centerX(a) : centerX(l) < centerX(a)) :
            l.getDouble("y") + l.getDouble("height") <= a.getDouble("y") + 1.5, String.format(java.util.Locale.ROOT, "Group order %s ov=%.6fpx lx=%.2f ax=%.2f ly=%.3f lh=%.3f ay=%.3f ah=%.3f", key, overlapY(a, l) * density, centerX(l), centerX(a), l.getDouble("y"), l.getDouble("height"), a.getDouble("y"), a.getDouble("height")));
        } else {
          require(l.getDouble("y") + l.getDouble("height") <= a.getDouble("y") + 1.5 &&
            a.getDouble("y") + a.getDouble("height") <= t.getDouble("y") + 1.5, "Group column children must stack: " + key);
        }
        // Use the rendered view's platform resources, independent of RN's cached metrics.
        float expectedFont = (float)Math.ceil(TypedValue.applyDimension(
          TypedValue.COMPLEX_UNIT_SP, fontSize * .8f, leaf.getResources().getDisplayMetrics()));
        TextPaint paint = glyphPaint(leaf);
        require(Math.abs(paint.getTextSize() - expectedFont) <= 1.1 && leafText.layout.getLineCount() > 0, "Actual inherited glyph size differs: " + key + " actualPx=" + paint.getTextSize() + " expectedPx=" + expectedFont + " lines=" + leafText.layout.getLineCount());
        float alpha = key.equals("styled") && error ? .6f : 1f;
        require(Math.abs(root.getAlpha() - alpha) < .02, "Native styled error opacity differs: " + key);
        Float border = BackgroundStyleApplicator.getBorderWidth(root, LogicalEdge.ALL);
        Integer color = BackgroundStyleApplicator.getBorderColor(root, LogicalEdge.ALL);
        require(border != null && Math.abs(border - (themed ? 2 : 1)) < .1 && color != null, "Native themed Group border differs: " + key + " allWidthDip=" + border + " expectedDip=" + (themed ? 2 : 1) + " allColor=" + color);
        Float right = BackgroundStyleApplicator.getBorderWidth(root, LogicalEdge.RIGHT);
        if (key.equals("styled") && row) {
          require(right != null && Math.abs(right - 4) < .1, "Wrapped row selector must update the native border");
        }
        roots.put(measured(key, root, metadata).put("refs", refs).put("physical", physical).put("literal", l).put("action", a).put("text", t)
          .put("textClass", leaf.getClass().getName()).put("textBackend", leafText.backend).put("textLayoutClass", leafText.layout.getClass().getName()).put("textLines", leafText.layout.getLineCount())
          .put("literalTextClass", literal.getClass().getName()).put("literalTextBackend", literalText.backend).put("actionTextClass", label.getClass().getName()).put("actionTextBackend", labelText.backend)
          .put("count", key.equals("custom") ? count : 0).put("unwrappedFitWidth", fitWidth).put("fontPx", paint.getTextSize()).put("expectedFontPx", expectedFont)
          .put("textColor", unsigned(paint.getColor())).put("borderColor", unsigned(color)).put("borderWidth", border)
          .put("borderRightWidth", right == null ? JSONObject.NULL : right).put("alpha", root.getAlpha()));
      }
      JSONObject own = roots.getJSONObject(1);
      for (int index : new int[]{0, 2, 3}) {
        JSONObject current = roots.getJSONObject(index);
        require(error ? current.getLong("borderColor") != own.getLong("borderColor") && current.getLong("textColor") != own.getLong("textColor") :
          current.getLong("textColor") == own.getLong("textColor"), "Own false must select the actual native inherited error style");
      }
      return new JSONObject().put("name", stage).put("metadata", metadata).put("roots", roots);
    }, stage);
    states.put(sample); stage(stage);
  }

  private void avatar(String stage, boolean top, boolean rtl, boolean themed, int count) throws Exception {
    JSONObject sample = settled(() -> {
      JSONObject metadata = metadata("avatar-contract-receipt");
      require(metadata.getBoolean("top") == top && metadata.getBoolean("rtl") == rtl && metadata.getBoolean("customStyle") == themed, "Avatar controls have not committed");
      scale(metadata);
      View badgeText = firstText(view("avatar-contract-child"));
      if (badgeText == null) throw unreadableText("Native badge text must exist", view("avatar-contract-child"), null);
      NativeText badge = nativeText(badgeText);
      require(text(view("avatar-contract-child")).equals(Integer.toString(count)), "Real native badge touch/state must survive updates");
      JSONArray roots = new JSONArray(); View scroll = view("root-layout-scroll");
      for (String key : AVATARS) {
        View root = retained("avatar-contract-" + key), row = view("avatar-contract-row-" + key);
        View primary = scopedText(row, key.equals("custom") ? "Live custom root" : key.equals("portal") ? "Portaled account owner" : "Account owner with a longer name");
        if (primary == null) throw unreadableText("Actual Avatar primary text is missing: " + key, row, null);
        NativeText primaryText = nativeText(primary);
        JSONObject b = bounds(root), r = bounds(row), p = bounds(primary);
        JSONObject rowPhysical = physicalChildren(row, new String[]{"avatar", "primary"}, new View[]{root, primary});
        require(rtl ? centerX(b) > centerX(p) : centerX(b) < centerX(p), "Actual Avatar order must follow the row direction: " + key);
        require(Math.abs(b.getDouble("width") - (themed ? 64 : 56)) <= 1 &&
          (key.equals("custom") ? b.getDouble("height") >= 43.5 : Math.abs(b.getDouble("height") - 40) <= 1), "Actual Avatar wrapper dimensions differ: " + key);
        require(row.getLayoutDirection() == (rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR), "Actual Avatar row direction differs: " + key);
        if (top) require(Math.abs(b.getDouble("y") - r.getDouble("y") - (themed ? 20 : 16)) <= 1.5, "Actual Avatar top margin differs: " + key);
        else require(Math.abs(b.getDouble("y") + b.getDouble("height") / 2 - r.getDouble("y") - r.getDouble("height") / 2) <= 1.5, "Actual Avatar center alignment differs: " + key);
        boolean inScroll = contains(scroll, root), sameWindow = root.getWindowToken() != null && root.getWindowToken().equals(activity.getWindow().getDecorView().getWindowToken());
        require(inScroll == !key.equals("portal") && sameWindow, "Avatar must use its actual inline/window Portal owner: " + key);
        roots.put(measured(key, root, metadata).put("row", r).put("rowNativeId", row.getId()).put("rowClass", row.getClass().getName()).put("rowPhysical", rowPhysical).put("primary", p).put("primaryTextClass", primary.getClass().getName()).put("primaryTextBackend", primaryText.backend).put("rowDirection", row.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr")
          .put("inScroll", inScroll).put("sameWindow", sameWindow).put("count", key.equals("custom") ? count : 0));
      }
      return new JSONObject().put("name", stage).put("metadata", metadata).put("roots", roots).put("counterTextClass", badgeText.getClass().getName()).put("counterTextBackend", badge.backend);
    }, stage);
    states.put(sample); stage(stage);
  }

  private JSONObject measured(String key, View root, JSONObject metadata) throws Exception {
    JSONObject receipt = metadata.getJSONObject("receipts").getJSONObject(key), actual = bounds(root);
    // Scrolling changes window origins without another onLayout. Compare both
    // measured dimensions to the same retained native host; retain origins as
    // diagnostics, not an invented absolute-position tracking contract.
    for (String kind : new String[]{"local", "window"}) {
      JSONObject rect = receipt.getJSONObject(kind);
      for (String axis : new String[]{"x", "y", "width", "height"}) require(Double.isFinite(rect.getDouble(axis)), "Invalid measured receipt");
      require(Math.abs(rect.getDouble("width") - actual.getDouble("width")) <= 1.5 &&
        Math.abs(rect.getDouble("height") - actual.getDouble("height")) <= 1.5, "Stale/mismatched native receipt: " + key + " " + kind + " actual=" + actual + " receipt=" + rect);
    }
    return new JSONObject().put("key", key).put("nativeId", root.getId()).put("bounds", actual).put("receipt", receipt)
      .put("direction", root.getLayoutDirection() == View.LAYOUT_DIRECTION_RTL ? "rtl" : "ltr");
  }
  private void scale(JSONObject metadata) throws Exception {
    require(Math.abs(metadata.getDouble("fontScale") - driver.getTargetContext().getResources().getConfiguration().fontScale) < .01, "Receipt must expose the actual Android OS font scale");
  }
  private View retained(String id) {
    View current = view(id), previous = hosts.get(id);
    require(previous == null || previous == current, "Live update replaced the actual native host: " + id);
    if (previous == null) hosts.put(id, current);
    return current;
  }
  private JSONObject metadata(String id) throws Exception {
    CharSequence description = view(id).getContentDescription();
    require(description != null, "Native receipt accessibility label missing: " + id);
    return new JSONObject(description.toString());
  }
  private JSONObject bounds(View root) throws Exception {
    int[] origin = new int[2]; root.getLocationInWindow(origin); float density = root.getResources().getDisplayMetrics().density;
    require(root.getWidth() > 0 && root.getHeight() > 0, "Actual native host has empty bounds");
    return new JSONObject().put("x", origin[0] / density).put("y", origin[1] / density).put("width", root.getWidth() / density).put("height", root.getHeight() / density);
  }
  private static boolean isNativeText(View view) {
    return view instanceof TextView || view.getClass().getName().equals("com.facebook.react.views.text.PreparedLayoutTextView");
  }
  private static final class NativeText {
    final CharSequence text;
    final Layout layout;
    final String backend;
    NativeText(CharSequence text, Layout layout, String backend) { this.text = text; this.layout = layout; this.backend = backend; }
    float desiredWidth() { return Layout.getDesiredWidth(text, layout.getPaint()); }
    TextPaint glyphPaint() {
      TextPaint paint = new TextPaint(layout.getPaint());
      if (text instanceof android.text.Spanned && text.length() > 0)
        for (android.text.style.CharacterStyle span : ((android.text.Spanned)text).getSpans(0, 1, android.text.style.CharacterStyle.class)) span.updateDrawState(paint);
      return paint;
    }
  }
  private static Object publicGetter(Object owner, String name) throws ReflectiveOperationException {
    return owner.getClass().getMethod(name).invoke(owner);
  }
  private NativeText nativeText(View view) {
    try {
      Object value, measured;
      String backend;
      if (view instanceof TextView) {
        value = ((TextView)view).getText(); measured = ((TextView)view).getLayout(); backend = "TextView";
      } else if (isNativeText(view)) {
        // RN 0.88 PreparedLayoutTextView explicitly keeps getText for reflective
        // black-box E2E probes. Its public preparedLayout/layout getters expose
        // the actual Layout drawn by onDraw, without private fields or flags.
        value = publicGetter(view, "getText");
        Object prepared = publicGetter(view, "getPreparedLayout");
        measured = prepared == null ? null : publicGetter(prepared, "getLayout");
        backend = "prepared-layout";
      } else throw unreadableText("Unsupported native text class " + view.getClass().getName(), view, null);
      if (!(value instanceof CharSequence) || !(measured instanceof Layout))
        throw unreadableText("Native text/layout is not ready: " + view.getClass().getName(), view, null);
      Layout layout = (Layout)measured;
      if (!layout.getText().toString().equals(value.toString())) throw unreadableText("Public native text and rendered Layout disagree: " + view.getClass().getName(), view, null);
      return new NativeText((CharSequence)value, layout, backend);
    } catch (ReflectiveOperationException error) {
      throw unreadableText("Public native text getter failed: " + view.getClass().getName(), view, error);
    }
  }
  private View firstText(View root) {
    if (isNativeText(root) && nativeText(root).text.length() > 0) return root;
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View result = firstText(((ViewGroup)root).getChildAt(i)); if (result != null) return result; }
    return null;
  }
  private View findText(View root, String expected) {
    if (isNativeText(root) && nativeText(root).text.toString().equals(expected)) return root;
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View result = findText(((ViewGroup)root).getChildAt(i), expected); if (result != null) return result; }
    return null;
  }
  private View literal(View root, String key) {
    return scopedText(root, "Literal " + key);
  }
  private View scopedText(View root, String expected) {
    View result = findText(root, expected);
    if (result != null) return result;
    // RN 0.88 may retain a painted/testID FormsView without a stacking context.
    // Fabric then mounts its children beside it under the same native parent.
    // Scope the exact source-unique native text to that parent, never the window.
    ViewParent parent = root.getParent();
    return parent instanceof View ? findText((View)parent, expected) : null;
  }
  private JSONArray ancestorIds(View view) {
    JSONArray path = new JSONArray(); int limit = 16;
    for (ViewParent parent = view.getParent(); parent instanceof View && limit-- > 0; parent = parent.getParent()) path.put(((View)parent).getId());
    return path;
  }
  private JSONObject groupPhysical(View root, View literal, View action, View leaf) throws Exception {
    return physicalChildren(root, new String[]{"literal", "action", "text"}, new View[]{literal, action, leaf});
  }
  private JSONObject physicalChildren(View root, String[] names, View[] children) throws Exception {
    ViewParent parent = root.getParent();
    boolean descendants = true, siblings = parent instanceof View;
    for (View child : children) { descendants &= contains(root, child); siblings &= child.getParent() == parent; }
    if (!(parent instanceof View) || (!descendants && !siblings)) throw unreadableText("Wrapper native children must be descendants or immediate flattened siblings", root, null);
    JSONObject frame = bounds(root);
    for (View child : children) {
      JSONObject actual = bounds(child);
      require(actual.getDouble("x") >= frame.getDouble("x") - 1.5 && actual.getDouble("y") >= frame.getDouble("y") - 1.5 &&
        actual.getDouble("x") + actual.getDouble("width") <= frame.getDouble("x") + frame.getDouble("width") + 1.5 &&
        actual.getDouble("y") + actual.getDouble("height") <= frame.getDouble("y") + frame.getDouble("height") + 1.5,
        "Actual child frame must stay inside its measured wrapper: root=" + frame + " child=" + actual);
    }
    JSONObject relation = new JSONObject().put("mode", descendants ? "descendants" : "flattened-siblings").put("parentId", ((View)parent).getId()).put("parentClass", parent.getClass().getName())
      .put("rootChildren", root instanceof ViewGroup ? ((ViewGroup)root).getChildCount() : 0);
    for (int i = 0; i < children.length; i++) relation.put(names[i] + "ParentId", children[i].getParent() instanceof View ? ((View)children[i].getParent()).getId() : JSONObject.NULL).put(names[i] + "Ancestors", ancestorIds(children[i]));
    return relation;
  }
  private TextPaint glyphPaint(View leaf) { return nativeText(leaf).glyphPaint(); }
  private String text(View root) {
    if (isNativeText(root)) return nativeText(root).text.toString().trim();
    StringBuilder value = new StringBuilder();
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) value.append(text(((ViewGroup)root).getChildAt(i)));
    return value.toString().trim();
  }
  private AssertionError unreadableText(String message, View root, Throwable cause) {
    StringBuilder tree = new StringBuilder();
    int[] remaining = {24};
    textSubtree(root, tree, remaining, 0);
    if (root.getParent() instanceof View && remaining[0] > 0) { tree.append(" | immediate native parent: "); textSubtree((View)root.getParent(), tree, remaining, 0); }
    textDiagnostic = tree.length() <= 3072 ? tree.toString() : tree.substring(0, 3069) + "...";
    return new AssertionError(message + "; native subtree retained in nativeTextDiagnostic", cause);
  }
  private void textSubtree(View root, StringBuilder tree, int[] remaining, int depth) {
    if (remaining[0]-- <= 0 || depth > 5 || tree.length() >= 3072) return;
    if (tree.length() > 0) tree.append(" | ");
    tree.append(depth).append(':').append(root.getClass().getName()).append(" id=").append(root.getTag(tagId)).append(' ').append(root.getWidth()).append('x').append(root.getHeight());
    if (isNativeText(root)) {
      tree.append(" backend=").append(root instanceof TextView ? "TextView" : "prepared-layout");
      try {
        Object value = root instanceof TextView ? ((TextView)root).getText() : publicGetter(root, "getText");
        String snippet = String.valueOf(value);
        tree.append(" text=");
        for (int i = 0; i < Math.min(64, snippet.length()); i++) { char c = snippet.charAt(i); tree.append(Character.isISOControl(c) ? ' ' : c); }
      } catch (ReflectiveOperationException error) { tree.append(" <public text getter failed:").append(error.getClass().getName()).append('>'); }
    }
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) textSubtree(((ViewGroup)root).getChildAt(i), tree, remaining, depth + 1);
  }
  private static long unsigned(int color) { return color & 0xffffffffL; }
  private static double centerX(JSONObject r) throws Exception { return r.getDouble("x") + r.getDouble("width") / 2; }
  private static double overlapY(JSONObject a, JSONObject b) throws Exception { return Math.min(a.getDouble("y") + a.getDouble("height"), b.getDouble("y") + b.getDouble("height")) - Math.max(a.getDouble("y"), b.getDouble("y")); }
  private boolean contains(View ancestor, View child) { for (ViewParent parent = child.getParent(); parent != null; parent = parent.getParent()) if (parent == ancestor) return true; return ancestor == child; }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View found = find(id); require(found != null, "Missing native view " + id); return found; }
  private View search(View root, String id) {
    if (id.equals(root.getTag(tagId))) return root;
    if (root instanceof ViewGroup) for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) { View result = search(((ViewGroup)root).getChildAt(i), id); if (result != null) return result; }
    return null;
  }
  private void tap(String id) throws Exception {
    await(() -> ui(() -> find(id) != null && view(id).isShown() && view(id).getWidth() > 0), "Touch target must mount: " + id);
    if (id.equals("avatar-contract-child")) ui(() -> {
      // The window Portal has a bounded bottom surface. Put the retained badge
      // above it using the real catalog ScrollView before injecting its touch.
      View scroll = view("root-layout-scroll");
      require(scroll instanceof android.widget.ScrollView, "Catalog must own vertical scrolling");
      ((android.widget.ScrollView)scroll).fullScroll(View.FOCUS_DOWN);
      return null;
    });
    final Rect[] previous = {null}; final long[] stableSince = {0}; final float[][] touch = {null};
    // Font-profile relayout and selected-tab scrolling can move a target between UI calls.
    // Capture visibility and coordinates atomically, after 100ms of stable native bounds.
    await(() -> ui(() -> {
      View target = find(id); Rect visible = new Rect();
      if (target == null || !target.isShown()) { previous[0] = null; return false; }
      target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true);
      if (!target.getGlobalVisibleRect(visible) || visible.width() <= 0 || visible.height() <= 0) { previous[0] = null; return false; }
      if (!visible.equals(previous[0])) { previous[0] = new Rect(visible); stableSince[0] = SystemClock.uptimeMillis(); return false; }
      if (SystemClock.uptimeMillis() - stableSince[0] < 100) return false;
      touch[0] = new float[]{visible.exactCenterX(), visible.exactCenterY()};
      return true;
    }), "Touch target must be stably visible: " + id);
    float[] point = touch[0];
    long down = SystemClock.uptimeMillis();
    for (int action : new int[]{MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, point[0], point[1], 0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); } finally { event.recycle(); }
      SystemClock.sleep(30);
    }
  }
  private void capture(String name) throws Exception {
    CountDownLatch committed = new CountDownLatch(1);
    ui(() -> { View root = activity.getWindow().getDecorView(); root.getViewTreeObserver().registerFrameCommitCallback(committed::countDown); root.invalidate(); return null; });
    require(committed.await(5, TimeUnit.SECONDS), "Screenshot frame must commit");
    AccessibilityNodeInfo owner = automation.getRootInActiveWindow();
    require(owner != null && PACKAGE.contentEquals(owner.getPackageName()), "Catalog must own the screenshot window");
    Bitmap bitmap = automation.takeScreenshot(); require(bitmap != null, "Native screenshot missing");
    try (FileOutputStream output = new FileOutputStream(new File(directory, name))) { require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output), "Screenshot encoding failed"); }
    finally { bitmap.recycle(); }
    pictures.put(name);
  }
  private void stage(String name) { stages.put(name); Bundle update = new Bundle(); update.putString(textAlignment ? "textAlignmentStage" : "layoutRootStage", name); driver.sendStatus(1, update); }
  private JSONObject settled(java.util.concurrent.Callable<JSONObject> sample, String name) throws Exception {
    long deadline = SystemClock.uptimeMillis() + 20000; Throwable last = null;
    do { textDiagnostic = null; try { return ui(sample); } catch (AssertionError error) { last = error; } SystemClock.sleep(16); } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError("Native state did not settle: " + name, last);
  }
  private void await(java.util.function.BooleanSupplier condition, String message) throws Exception {
    long deadline = SystemClock.uptimeMillis() + 35000;
    do { if (condition.getAsBoolean()) return; SystemClock.sleep(16); } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError(message);
  }
  private <T> T ui(java.util.concurrent.Callable<T> action) {
    AtomicReference<T> value = new AtomicReference<>(); AtomicReference<Throwable> error = new AtomicReference<>();
    driver.runOnMainSync(() -> { try { value.set(action.call()); } catch (Throwable failure) { error.set(failure); } });
    if (error.get() != null) throw new AssertionError(error.get());
    return value.get();
  }
  /** Keep the phase and nested native assertion as one bounded report scalar. */
  private static String describeFailure(Throwable error) {
    StringBuilder value = new StringBuilder();
    IdentityHashMap<Throwable, Boolean> seen = new IdentityHashMap<>();
    Throwable current = error;
    int depth = 0;
    while (current != null && depth++ < 8) {
      if (seen.put(current, Boolean.TRUE) != null) { value.append(" <- [cause cycle]"); current = null; break; }
      if (value.length() > 0) value.append(" <- caused by ");
      String type = current.getClass().getName();
      value.append(type.length() <= 128 ? type : type.substring(0, 128) + "...");
      String message = current.getMessage();
      if (message != null && !message.isEmpty()) {
        value.append(": ");
        int length = Math.min(message.length(), 192);
        for (int i = 0; i < length; i++) { char character = message.charAt(i); value.append(Character.isISOControl(character) ? ' ' : character); }
        if (message.length() > length) value.append("...");
      }
      current = current.getCause();
    }
    if (current != null) value.append(" <- [cause depth limit]");
    return value.length() <= 3072 ? value.toString() : value.substring(0, 3069) + "...";
  }
  private static void require(boolean value, String message) { if (!value) throw new AssertionError(message); }
}
