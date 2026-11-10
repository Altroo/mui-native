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
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.TextView;
import android.widget.EditText;
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
  private enum Scenario {
    LAYOUT_ROOTS("layout-roots", "layoutRoot"), TEXT_ALIGNMENT("text-alignment", "textAlignment"),
    FORM_GROUP_EVENTS("form-group-events", "formGroupEvents"), FORM_GROUP_KEYBOARD("form-group-keyboard", "formGroupKeyboard"),
    FORM_GROUP_FOCUS("form-group-focus", "formGroupFocus"), FORM_GROUP_EDITOR("form-group-editor", "formGroupEditor"),
    FORM_GROUP_ACCESSIBILITY("form-group-accessibility", "formGroupAccessibility");
    final String label, key;
    Scenario(String label, String key) { this.label = label; this.key = key; }
  }
  private final Instrumentation driver;
  private final Scenario scenario;
  private final boolean textAlignment;
  private final String fontProfile;
  private final JSONArray stages = new JSONArray(), states = new JSONArray(), pictures = new JSONArray();
  private final Map<String, View> hosts = new HashMap<>();
  private Activity activity;
  private UiAutomation automation;
  private File directory;
  private int tagId;
  private String textDiagnostic;

  private LayoutRootScenario(Instrumentation driver, Scenario scenario, String fontProfile) {
    this.driver = driver; this.scenario = scenario; this.textAlignment = scenario == Scenario.TEXT_ALIGNMENT; this.fontProfile = fontProfile;
  }
  public static void run(Instrumentation driver, String fontProfile) { new LayoutRootScenario(driver, Scenario.LAYOUT_ROOTS, fontProfile).run(); }
  public static void runTextAlignment(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.TEXT_ALIGNMENT, null).run(); }
  public static void runFormGroupEvents(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.FORM_GROUP_EVENTS, null).run(); }
  public static void runFormGroupKeyboard(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.FORM_GROUP_KEYBOARD, null).run(); }
  public static void runFormGroupFocus(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.FORM_GROUP_FOCUS, null).run(); }
  public static void runFormGroupEditor(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.FORM_GROUP_EDITOR, null).run(); }
  public static void runFormGroupAccessibility(Instrumentation driver) { new LayoutRootScenario(driver, Scenario.FORM_GROUP_ACCESSIBILITY, null).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      String label = scenario.label;
      directory = new File(driver.getTargetContext().getCacheDir(), "mui-" + label + "-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing native evidence");
      report.put("schemaVersion", 1).put("scenario", label + "-v1")
        .put("driver", "native Instrumentation and UiAutomation").put("artifactDirectory", "cache/" + directory.getName())
        .put("device", new JSONObject().put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL)
          .put("density", driver.getTargetContext().getResources().getDisplayMetrics().density)
          .put("fontScale", driver.getTargetContext().getResources().getConfiguration().fontScale));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Catalog must be installed");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      if (scenario == Scenario.LAYOUT_ROOTS) {
        require("normal".equals(fontProfile) || "enlarged".equals(fontProfile), "Layout root checks require an explicit normal/enlarged font profile");
        float actualFontScale = activity.getResources().getConfiguration().fontScale;
        report.put("fontProfile", fontProfile);
        report.getJSONObject("device").put("fontScale", actualFontScale);
        require("normal".equals(fontProfile) ? Math.abs(actualFontScale - 1) < .01 : actualFontScale >= 1.6,
          "Actual native OS font scale does not match requested profile: " + fontProfile + " scale=" + actualFontScale);
      }

      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test identifier resource is missing");
      // Initial JS layout can still move the horizontal catalog tabs. Only
      // navigation is retried, and the destination must acknowledge the touch.
      int navigationAttempts = 0;
      boolean wrappersReady = false;
      do {
        tap("catalog-tab-Wrappers"); navigationAttempts++;
        long deadline = SystemClock.uptimeMillis() + 2500;
        do {
          wrappersReady = ui(() -> find("root-layout-navigation") != null && view("root-layout-navigation").isShown());
          if (!wrappersReady) SystemClock.sleep(25);
        } while (!wrappersReady && SystemClock.uptimeMillis() < deadline);
      } while (!wrappersReady && navigationAttempts < 2);
      report.put("navigationAttempts", navigationAttempts);
      require(wrappersReady, "Catalog Wrappers navigation must acknowledge the native touch");
      if (scenario == Scenario.FORM_GROUP_ACCESSIBILITY) {
        formGroupAccessibility();
      } else if (scenario == Scenario.FORM_GROUP_EDITOR) {
        formGroupEditor(report);
      } else if (scenario == Scenario.FORM_GROUP_FOCUS) {
        formGroupFocus(report);
      } else if (scenario == Scenario.FORM_GROUP_KEYBOARD) {
        formGroupKeyboard(report);
      } else if (scenario == Scenario.FORM_GROUP_EVENTS) {
        formGroupEvents(report);
      } else if (textAlignment) {
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
        result.putString(scenario.key + "Report", report.toString());
      } catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }

  private static final String[] EDITORS = {"stock-native", "stock-field", "custom-native", "custom-field", "styled-native", "styled-field"};
  /** Real editable commands retain native input identity before callback claims are evaluated. */
  private void formGroupEditor(JSONObject report) throws Exception {
    require(Build.VERSION.SDK_INT >= 30, "Editor QA viewport checks require API30+; API29 remains unverified");
    java.util.HashSet<String> generations = new java.util.HashSet<>();
    JSONObject observedValues = new JSONObject();
    boolean framework = com.facebook.react.internal.featureflags.ReactNativeFeatureFlags.enableKeyEvents();
    report.put("keyEventsEnabled", framework);
    tap("root-layout-group-editor");
    await(() -> ui(() -> find("form-group-editor-receipt") != null && metadata("form-group-editor-receipt").optBoolean("ready")), "Every native editor must lay out");
    JSONObject initial = settledEditorReceipt(); report.put("initial", initial); stage("ready");
    for (String control : EDITORS) {
      require(ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getText().toString()).equals("Rabat"), "Actual native initial editor text must match the fixture");
      require(!ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getShowSoftInputOnFocus()), "Explicit native soft-input-on-focus policy must reach every editor");
    }
    require(ui(() -> view("form-group-editor-baseline-input").getClass() == com.facebook.react.views.textinput.ReactEditText.class), "Independent baseline must be the original RN native editor, not an MUI subclass");
    hideEditorIme(); tap("form-group-editor-baseline-input");
    await(() -> ui(() -> view("form-group-editor-baseline-input").isFocused() && metadata("form-group-editor-receipt").optInt("focused") == view("form-group-editor-baseline-input").getId()), "Original RN baseline must receive real focus");
    ui(() -> { EditText editor = (EditText)view("form-group-editor-baseline-input"); editor.setSelection(editor.length()); return null; });
    String baselineBefore = ui(() -> ((EditText)view("form-group-editor-baseline-input")).getText().toString());
    require(baselineBefore.equals("Rabat"), "Original RN baseline must start with native fixture text");
    driver.sendKeyDownUpSync(KeyEvent.KEYCODE_A);
    await(() -> ui(() -> ((EditText)view("form-group-editor-baseline-input")).getText().toString().equals("Rabata") && metadata("form-group-editor-receipt").getString("baselineValue").equals("Rabata")), "Original RN baseline must acknowledge actual character editing");
    if (framework) await(() -> ui(() -> { JSONArray events = metadata("form-group-editor-receipt").getJSONArray("entries"); for (int i=0;i<events.length();i++) if (events.getJSONObject(i).optString("phase").equals("up")) return true; return false; }), "Original RN framework key-up positive control is required");
    hideEditorIme(); JSONObject baseline = settledEditorReceipt();
    int baselineRoot = ui(() -> view("form-group-editor-baseline").getId()), baselineInput = ui(() -> view("form-group-editor-baseline-input").getId());
    String baselineAfter = ui(() -> ((EditText)view("form-group-editor-baseline-input")).getText().toString());
    require(!ui(() -> ((EditText)view("form-group-editor-baseline-input")).getShowSoftInputOnFocus()), "Original RN soft-input-on-focus policy must remain false");
    require(baselineAfter.equals("Rabata") && ui(() -> view("form-group-editor-baseline-input").isFocused()), "Final original RN text and focus must remain native observations");
    JSONArray baselineEvents = baseline.getJSONArray("entries");
    java.util.ArrayList<String> baselinePhases = new java.util.ArrayList<>();
    for (int i=0;i<baselineEvents.length();i++) {
      JSONObject event = baselineEvents.getJSONObject(i); String phase = event.getString("phase"), scope = event.getString("scope");
      require(event.getString("control").equals("baseline") && event.getString("key").equals("a") && event.getString("code").equals("KeyA") && event.isNull("source") && event.getInt("target")==baselineInput && event.getInt("nativeTarget")==baselineInput && event.getInt("currentTarget")==baselineRoot && event.getString("targetKind").equals("object") && event.getInt("sequence")==i+1 && !event.getBoolean("prevented") && !event.getBoolean("stopped"), "Independent RN events must retain actual unmarked native targets");
      require(scope.equals(i%2==0?"capture":"bubble"), "Original RN phases must retain capture/bubble order");
      if(i%2==0) baselinePhases.add(phase);
      else { JSONObject first=baselineEvents.getJSONObject(i-1); require(first.getString("phase").equals(phase) && first.getInt("eventId")>0 && first.getInt("eventId")==event.getInt("eventId") && first.getInt("payloadId")>0 && first.getInt("payloadId")==event.getInt("payloadId"), "Original RN event/payload identity must survive capture/bubble"); }
    }
    require(framework ? baselinePhases.equals(java.util.Arrays.asList("up")) || baselinePhases.equals(java.util.Arrays.asList("down","up")) : baselinePhases.isEmpty(), "Original RN baseline requires unique observed native phases, including enabled key-up");
    require(baselineEvents.length()==baselinePhases.size()*2, "Every original RN phase must complete both callbacks");
    report.put("frameworkBaseline",new JSONObject().put("metadata",baseline).put("nativeInputId",baselineInput).put("nativeInputClass",ui(() -> view("form-group-editor-baseline-input").getClass().getName())).put("nativeRootId",baselineRoot).put("nativeFocused",true).put("showSoftInputOnFocus",ui(() -> ((EditText)view("form-group-editor-baseline-input")).getShowSoftInputOnFocus())).put("nativeTextBefore",baselineBefore).put("nativeTextAfter",baselineAfter).put("phases",new JSONArray(baselinePhases)));
    capture("form-group-editor-baseline.png"); stage("framework-baseline");
    for (String policy : new String[]{"observe", "prevent", "stop"}) {
      if (!policy.equals("observe")) tap("form-group-editor-policy");
      await(() -> ui(() -> metadata("form-group-editor-receipt").getString("policy").equals(policy)), "Editor capture policy must acknowledge update");
      for (String key : new String[]{"ArrowDown", "Enter", "a"}) for (String control : EDITORS) {
        hideEditorIme();
        tap("form-group-editor-" + control + "-focus");
        await(() -> ui(() -> view("form-group-editor-" + control + "-input").isFocused() && metadata("form-group-editor-receipt").optInt("focused") == view("form-group-editor-" + control + "-input").getId()), "Public editor ref must acknowledge native touch with actual focus");
        ui(() -> { EditText editor = (EditText)view("form-group-editor-" + control + "-input"); editor.setSelection(editor.length()); return null; });
        String before = ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getText().toString());
        tap("form-group-editor-reset");
        // Android reset buttons can take focus, so acknowledge the actual input again.
        tap("form-group-editor-" + control + "-focus");
        await(() -> ui(() -> metadata("form-group-editor-receipt").getInt("total") == 0 && metadata("form-group-editor-receipt").getJSONObject("submissions").length() == 0 && view("form-group-editor-" + control + "-input").isFocused() && metadata("form-group-editor-receipt").optInt("focused") == view("form-group-editor-" + control + "-input").getId()), "Reset must clear all observations before injecting input");
        ui(() -> { EditText editor = (EditText)view("form-group-editor-" + control + "-input"); editor.setSelection(editor.length()); return null; });
        driver.sendKeyDownUpSync(key.equals("ArrowDown") ? KeyEvent.KEYCODE_DPAD_DOWN : key.equals("Enter") ? KeyEvent.KEYCODE_ENTER : KeyEvent.KEYCODE_A);
        String expectedText = key.equals("a") ? before + "a" : before;
        await(() -> ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getText().toString().equals(expectedText) && (!key.equals("a") || metadata("form-group-editor-receipt").getJSONObject("values").optString(control).equals(expectedText))), "Actual native editing and value callbacks must settle");
        if (!key.equals("a") || framework) await(() -> ui(() -> {
          JSONArray delivered = metadata("form-group-editor-receipt").getJSONArray("entries");
          for (int i = 0; i < delivered.length(); i++) { JSONObject event = delivered.getJSONObject(i); if (event.optString("control").equals(control) && event.optString("key").equals(key) && event.optString("phase").equals("up")) return true; }
          return false;
        }), "Actual editable key-up must acknowledge dispatch before evidence settles");
        hideEditorIme();
        JSONObject value = settledEditorReceipt();
        String actualAfter = ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getText().toString());
        boolean softInputOnFocus = ui(() -> ((EditText)view("form-group-editor-" + control + "-input")).getShowSoftInputOnFocus());
        require(!softInputOnFocus, "Native editor soft-input-on-focus prop must survive editing and ref rebinding");
        require(actualAfter.equals(expectedText), "Final actual native text must match after viewport and JS settling");
        if (key.equals("a")) observedValues.put(control, actualAfter);
        require(value.getJSONObject("values").toString().equals(observedValues.toString()), "Every earlier native value acknowledgement must survive reset and later cases");
        require(value.getJSONObject("nodes").toString().equals(initial.getJSONObject("nodes").toString()), "Editor interactions must retain every actual native host");
        int inputId = ui(() -> view("form-group-editor-" + control + "-input").getId()), rootId = ui(() -> view("form-group-editor-" + control).getId()), ownerId = ui(() -> view("form-group-editor-" + control + "-owner").getId());
        boolean focused = ui(() -> view("form-group-editor-" + control + "-input").isFocused());
        require(focused && value.getInt("focused") == inputId, "The same actual native editor must retain focus");
        require(value.getJSONObject("submissions").length() == 0, "Managed Enter must not submit or blur the native editor");
        JSONArray events = value.getJSONArray("entries");
        java.util.ArrayList<String> expected = new java.util.ArrayList<>();
        boolean claimed = !key.equals("a"), stopped = claimed && policy.equals("stop"), prevented = claimed && policy.equals("prevent");
        java.util.ArrayList<String> observedPhases = new java.util.ArrayList<>();
        if (claimed) observedPhases.addAll(java.util.Arrays.asList("down","up"));
        else if (framework) {
          for (int i=0;i<events.length();i++) { JSONObject event = events.getJSONObject(i); if (event.getString("scope").equals("input")) observedPhases.add(event.getString("phase")); }
          require(observedPhases.equals(java.util.Arrays.asList("up")) || observedPhases.equals(java.util.Arrays.asList("down","up")), "Every grouped editor needs unique ordinary input phases and a key-up positive control");
          require(!baselinePhases.contains("down") || observedPhases.contains("down"), "Grouped input lacks key-down observed by independent RN baseline; ordinary input parity remains unverified");
        }
        for (String phase : observedPhases) {
          if (claimed) { expected.add("capture/" + phase); if (!stopped) { expected.add("input/" + phase); expected.add("owner/" + phase); expected.add("bubble/" + phase); } }
          else if (framework) { if (!control.startsWith("custom")) expected.add("capture/" + phase); expected.add("input/" + phase); if (!control.startsWith("custom")) expected.add("bubble/" + phase); }
        }
        states.put(new JSONObject().put("name", policy + "-" + control + "-" + key).put("control", control).put("key", key).put("policy", policy).put("nativeInputId", inputId).put("nativeRootId", rootId).put("nativeOwnerId", ownerId).put("nativeFocused", focused).put("showSoftInputOnFocus", softInputOnFocus).put("nativeTextBefore", before).put("nativeTextAfter", actualAfter).put("metadata", value));
        stage(policy + "-" + control + "-" + key);
        require(events.length() == expected.size(), "Exact editor callback count is required: " + control + " " + key + " " + policy + " " + events.toString());
        String sequenceToken = null;
        java.util.HashMap<String, Integer> eventIds = new java.util.HashMap<>(), payloadIds = new java.util.HashMap<>();
        for (int i = 0; i < events.length(); i++) {
          JSONObject event = events.getJSONObject(i); String scope = event.getString("scope"), phase = event.getString("phase");
          require((scope + "/" + phase).equals(expected.get(i)) && event.getString("control").equals(control) && event.getInt("sequence") == i + 1, "Exact editor callback order and identity are required");
          require(event.getString("key").equals(key) && event.getString("code").equals(key.equals("a") ? "KeyA" : key), "Real native key/code fields are required");
          require(event.getString("targetKind").equals("object") && event.getInt("target") == inputId && event.getInt("nativeTarget") == inputId && event.getInt("currentTarget") == (scope.equals("input") ? inputId : scope.equals("owner") ? ownerId : rootId), "Actual editable target/currentTarget identities must match native views");
          require(event.getBoolean("prevented") == prevented && event.getBoolean("stopped") == stopped, "Capture cancellation must survive each editable callback");
          require(event.getInt("eventId") > 0 && event.getInt("payloadId") > 0, "Original editable event/payload identities are required");
          if (!eventIds.containsKey(phase)) { eventIds.put(phase, event.getInt("eventId")); payloadIds.put(phase, event.getInt("payloadId")); }
          require(eventIds.get(phase) == event.getInt("eventId") && payloadIds.get(phase) == event.getInt("payloadId"), "All editable phases must share one original event/payload per native dispatch");
          if (claimed) {
            require(event.getString("source").equals("hardware") && event.getBoolean("editable") && !event.getBoolean("composing") && !event.getBoolean("canceled"), "Actual owned editable hardware provenance is required");
            String token = event.getString("keySequence"); require(!token.isEmpty(), "Native editable generation token is required");
            if (sequenceToken == null) sequenceToken = token; require(sequenceToken.equals(token), "Native down/up must belong to one owned generation");
          } else require(event.isNull("source"), "Ordinary native editing must remain a separate framework transport");
        }
        if (payloadIds.containsKey("down") && payloadIds.containsKey("up")) require(!payloadIds.get("down").equals(payloadIds.get("up")), "Down and up need distinct native payloads");
        if (claimed) require(sequenceToken != null && generations.add(sequenceToken), "Different injected native presses must use distinct owned generations");
      }
      capture("form-group-editor-" + policy + ".png");
    }
    report.put("gaps", new JSONArray()); require(states.length() == 54, "All54 editable interaction cases are required");
  }
  /** Hardware input may expose the IME even when focus itself does not. Keep
   * the diagnostic viewport clear without changing editor focus or app sessions. */
  private void hideEditorIme() throws Exception {
    require(Build.VERSION.SDK_INT >= 30, "Editor viewport observation requires API30+");
    final long[] hiddenSince = {0}, lastRequest = {0};
    await(() -> ui(() -> {
      View decor = activity.getWindow().getDecorView();
      android.view.WindowInsets insets = decor.getRootWindowInsets();
      if (insets == null) return false;
      long now = SystemClock.uptimeMillis();
      if (insets.isVisible(android.view.WindowInsets.Type.ime())) {
        hiddenSince[0] = 0;
        if (now - lastRequest[0] >= 150) {
          android.view.WindowInsetsController controller = decor.getWindowInsetsController();
          require(controller != null, "Native IME viewport controller must be available");
          controller.hide(android.view.WindowInsets.Type.ime());
          android.view.inputmethod.InputMethodManager input = (android.view.inputmethod.InputMethodManager)activity.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
          View focused = activity.getCurrentFocus();
          require(input != null && focused != null, "Current editor IME connection must remain application-owned");
          input.hideSoftInputFromWindow(focused.getWindowToken(), 0);
          lastRequest[0] = now;
        }
        return false;
      }
      if (hiddenSince[0] == 0) hiddenSince[0] = now;
      return now - hiddenSince[0] >= 150;
    }), "Hardware diagnostic viewport must stably exclude the IME before touches");
  }
  private JSONObject settledEditorReceipt() throws Exception {
    final String[] previous = {null}; final long[] stable = {0}; final JSONObject[] result = {null};
    await(() -> ui(() -> {
      JSONObject value = metadata("form-group-editor-receipt");
      require(value.getBoolean("ready") && value.getInt("total") == value.getJSONArray("entries").length() && value.getInt("total") <= 64, "Complete bounded editor history is required");
      require(value.getJSONObject("nodes").length() == 20 && value.getJSONObject("refs").length() == 20, "Exactly20 native baseline/group/owner/input bindings are required");
      java.util.HashSet<Integer> tags = new java.util.HashSet<>();
      for (String control : EDITORS) for (String suffix : new String[]{"", "-owner", "-input"}) {
        String id = control + suffix; int tag = view("form-group-editor-" + id).getId(); JSONObject ref = value.getJSONObject("refs").getJSONObject(id);
        require(tag > 0 && tags.add(tag) && value.getJSONObject("nodes").getInt(id) == tag, "Every editor binding must match a distinct actual native view");
        require(ref.getInt("attached") > 0 && ref.getInt("cleaned") == ref.getInt("attached") - 1, "Every public ref must retain one live native node");
        if (!suffix.equals("-input")) require(ref.getInt("attached") == 1, "Grouping and command-owner refs must not remount");
      }
      for (String id : new String[]{"baseline", "baseline-input"}) {
        int tag = view("form-group-editor-"+id).getId(); JSONObject ref=value.getJSONObject("refs").getJSONObject(id);
        require(tag>0 && tags.add(tag) && value.getJSONObject("nodes").getInt(id)==tag && ref.getInt("attached")>0 && ref.getInt("cleaned")==ref.getInt("attached")-1, "Independent RN baseline bindings must retain actual native hosts");
        if(id.equals("baseline")) require(ref.getInt("attached")==1,"Original RN baseline root must not remount");
      }
      require(Math.abs(value.getDouble("fontScale") - activity.getResources().getConfiguration().fontScale) < .01, "Actual OS font scale must agree");
      String serialized = value.toString(); if (!serialized.equals(previous[0])) { previous[0] = serialized; stable[0] = SystemClock.uptimeMillis(); return false; }
      if (SystemClock.uptimeMillis() - stable[0] < 100) return false;
      result[0] = value; return true;
    }), "Editor callback receipt must settle");
    return result[0];
  }

  /** Public JS ref commands must produce actual native child focus and original bubbling. */
  private void formGroupFocus(JSONObject report) throws Exception {
    tap("root-layout-group-focus");
    await(() -> ui(() -> find("form-group-focus-receipt") != null && metadata("form-group-focus-receipt").optBoolean("ready")), "All focus controls must lay out");
    JSONObject initial = settledGroupReceipt("form-group-focus-receipt", "form-group-focus-");
    require(initial.getInt("total") == 0, "Focus history must start empty");
    report.put("initial", initial); stage("ready");
    for (String kind : new String[]{"native", "host", "stock", "custom", "styled"}) {
      String id = "form-group-focus-" + kind + "-button";
      tap(id);
      await(() -> ui(() -> metadata("form-group-focus-receipt").getJSONObject("requests").optInt(kind) == 1 &&
        metadata("form-group-focus-receipt").optInt("focused") == view(id).getId() && view(id).isFocused()), "Public ref must focus the actual native child: " + kind);
      JSONObject current = settledGroupReceipt("form-group-focus-receipt", "form-group-focus-");
      states.put(new JSONObject().put("kind", kind).put("name", kind).put("metadata", current)
        .put("nativeRootId", ui(() -> view("form-group-focus-" + kind).getId())).put("nativeChildId", ui(() -> view(id).getId()))
        .put("nativeFocused", ui(() -> view(id).isFocused())).put("rootFrame", ui(() -> bounds(view("form-group-focus-" + kind))))
        .put("childFrame", ui(() -> bounds(view(id)))));
      capture("form-group-focus-" + kind + ".png"); stage(kind);
    }
    tap("form-group-focus-release");
    await(() -> ui(() -> noObservedFocus()), "Every observed native child must release focus");
    JSONObject released = settledGroupReceipt("form-group-focus-receipt", "form-group-focus-");
    report.put("released", released).put("releasedNativeFocusedChildren", new JSONArray()); stage("released");
    JSONArray entries = released.getJSONArray("entries"), gaps = new JSONArray();
    for (int i = 0; i < entries.length(); i++) {
      JSONObject event = entries.getJSONObject(i);
      String kind = event.getString("kind"), phase = event.getString("phase"), type = event.getString("type");
      require(java.util.Arrays.asList("native", "host", "stock", "custom", "styled").contains(kind), "Only observed focus kinds may log callbacks");
      require(java.util.Arrays.asList("capture", "child", "bubble").contains(phase) && (type.equals("focus") || type.equals("blur")), "Focus callback type and phase must be explicit");
      int target = ui(() -> view("form-group-focus-" + kind + "-button").getId());
      int currentTarget = ui(() -> view("form-group-focus-" + kind + (phase.equals("child") ? "-button" : "")).getId());
      require(event.getInt("sequence") == i + 1 && event.getInt("eventId") > 0 && event.getInt("payloadId") > 0 && event.getString("targetKind").equals("object"), "Complete original focus event identities are required");
      require(event.getInt("target") == target && event.getInt("nativeTarget") == target && event.getInt("currentTarget") == currentTarget, "Actual focus target/currentTarget IDs must agree with native views");
    }
    String[] expected = {"focus/capture", "focus/child", "focus/bubble", "blur/capture", "blur/child", "blur/bubble"};
    for (String kind : new String[]{"native", "host", "stock", "custom", "styled"}) {
      JSONArray own = new JSONArray(), child = new JSONArray();
      for (int i = 0; i < entries.length(); i++) {
        JSONObject event = entries.getJSONObject(i);
        if (event.getString("kind").equals(kind)) { own.put(event); if (event.getString("phase").equals("child")) child.put(event); }
      }
      require(child.length() == 2 && child.getJSONObject(0).getString("type").equals("focus") && child.getJSONObject(1).getString("type").equals("blur"), "Actual native child must provide one focus/blur pair: " + kind);
      if (kind.equals("native")) continue;
      boolean valid = own.length() == 6;
      for (int i = 0; i < own.length(); i++) {
        JSONObject event = own.getJSONObject(i);
        valid &= i < expected.length && (event.getString("type") + "/" + event.getString("phase")).equals(expected[Math.min(i, expected.length - 1)]);
        valid &= event.optString("focusSource").equals("owned");
      }
      if (valid) for (int offset : new int[]{0, 3}) {
        JSONObject first = own.getJSONObject(offset);
        for (int i = 0; i < 3; i++) {
          JSONObject event = own.getJSONObject(offset + i);
          valid &= first.getInt("eventId") > 0 && event.getInt("eventId") == first.getInt("eventId") && first.getInt("payloadId") > 0 && event.getInt("payloadId") == first.getInt("payloadId");
        }
      }
      if (!valid) gaps.put(kind + ": missing original owned focus/blur propagation");
    }
    tap("form-group-focus-clear");
    await(() -> ui(() -> metadata("form-group-focus-receipt").optInt("total") == 0 && noObservedFocus()), "Clear must retain roots without observed focus");
    report.put("cleared", settledGroupReceipt("form-group-focus-receipt", "form-group-focus-")).put("clearedNativeFocusedChildren", new JSONArray()).put("gaps", gaps);
    stage("cleared"); capture("form-group-focus-released.png");
    require(gaps.length() == 0, "Missing native focus contract: " + gaps.toString());
  }
  private boolean noObservedFocus() {
    for (String kind : new String[]{"native", "host", "stock", "custom", "styled"}) if (view("form-group-focus-" + kind + "-button").isFocused()) return false;
    return true;
  }

  /** A focused native button proves input delivery before parent propagation is assessed. */
  private void formGroupKeyboard(JSONObject report) throws Exception {
    require(Math.abs(activity.getResources().getConfiguration().fontScale - 1) < .01, "Keyboard proof requires baseline OS text scale");
    report.put("keyEventsEnabled", com.facebook.react.internal.featureflags.ReactNativeFeatureFlags.enableKeyEvents());
    tap("root-layout-group-keyboard");
    await(() -> ui(() -> find("form-group-keyboard-receipt") != null && metadata("form-group-keyboard-receipt").optBoolean("ready")), "Keyboard controls must lay out");
    JSONArray gaps = new JSONArray();
    for (String policy : new String[]{"observe", "prevent", "stop"}) {
      if (!policy.equals("observe")) tap("form-group-keyboard-policy");
      final String expectedPolicy = policy;
      await(() -> ui(() -> metadata("form-group-keyboard-receipt").optString("policy").equals(expectedPolicy)), "Keyboard policy must commit");
      for (String key : new String[]{"Enter", " ", "a"}) for (String kind : new String[]{"native", "host", "stock", "custom", "styled"}) {
        tap("form-group-keyboard-reset");
        await(() -> ui(() -> metadata("form-group-keyboard-receipt").optInt("total") == 0), "Keyboard log must clear");
        String id = "form-group-keyboard-" + kind + "-button";
        revealComplete(id);
        View button = ui(() -> view(id));
        int target = ui(button::getId);
        require(ui(button::requestFocus) && ui(button::isFocused), "Actual child button must own keyboard focus");
        driver.sendKeyDownUpSync(key.equals("Enter") ? KeyEvent.KEYCODE_ENTER : key.equals(" ") ? KeyEvent.KEYCODE_SPACE : KeyEvent.KEYCODE_A);
        await(() -> ui(() -> {
          JSONArray entries = metadata("form-group-keyboard-receipt").getJSONArray("entries");
          for (int i = 0; i < entries.length(); i++) if (entries.getJSONObject(i).getString("phase").startsWith("up")) return true;
          return false;
        }), "Real key-up must reach a root or child callback");
        JSONObject receipt = settledKeyboardReceipt();
        JSONArray entries = receipt.getJSONArray("entries");
        JSONArray parent = new JSONArray(), child = new JSONArray();
        for (int i = 0; i < entries.length(); i++) {
          JSONObject event = entries.getJSONObject(i);
          require(event.getString("kind").equals(kind) && event.getString("key").equals(key), "Only the focused child may receive this key");
          if (event.getString("scope").equals("root")) parent.put(event); else child.put(event);
        }
        int rootTag = ui(() -> view("form-group-keyboard-" + kind).getId());
        int clicks = receipt.getJSONObject("clicks").optInt(kind);
        boolean baseline = kind.equals("native");
        boolean stopped = policy.equals("stop") && !baseline && !key.equals("a");
        boolean canceled = !policy.equals("observe") && !baseline && !key.equals("a");
        boolean valid = parent.length() == (stopped ? 3 : 4) && child.length() == (stopped ? 1 : 2) && clicks == (canceled || key.equals("a") ? 0 : 1);
        if (!baseline && !valid) gaps.put(policy + "/" + (key.equals(" ") ? "Space" : key) + "/" + kind + ": parent=" + parent.length() + " child=" + child.length() + " clicks=" + clicks);
        // Root tags come from actual native Views, independently of JS's ref receipt.
        require(receipt.getJSONObject("nodes").getInt(kind) == rootTag && receipt.getJSONObject("nodes").getInt(kind + "-button") == target, "Actual keyboard root/child ref tags must agree");
        for (int i = 0; i < parent.length(); i++) {
          JSONObject event = parent.getJSONObject(i);
          require(event.getInt("target") == target && event.getInt("currentTarget") == rootTag, "Parent callback must retain actual child target and root currentTarget");
        }
        require(ui(button::isFocused), "Key dispatch must preserve native child focus");
        String name = policy + "-" + kind + "-" + (key.equals(" ") ? "Space" : key);
        states.put(new JSONObject().put("name", name).put("policy", policy).put("kind", kind).put("key", key)
          .put("rootId", rootTag).put("buttonId", target).put("rootClass", ui(() -> view("form-group-keyboard-" + kind).getClass().getName()))
          .put("parent", parent).put("child", child).put("clicks", clicks).put("metadata", receipt));
        stage(name);
      }
      capture("form-group-keyboard-" + policy + ".png");
    }
    report.put("gaps", gaps);
    require(gaps.length() == 0, "Missing native parent key contract: " + gaps.toString());
  }
  private JSONObject settledKeyboardReceipt() throws Exception {
    return settledGroupReceipt("form-group-keyboard-receipt", "form-group-keyboard-");
  }
  private JSONObject settledGroupReceipt(String receiptId, String prefix) throws Exception {
    final String[] previous = {null}; final long[] stable = {0}; final JSONObject[] result = {null};
    await(() -> ui(() -> {
      JSONObject value = metadata(receiptId);
      require(value.getBoolean("ready") && value.getInt("total") == value.getJSONArray("entries").length(), "Group event history must remain complete");
      require(value.getJSONObject("nodes").length() == 10 && value.getJSONObject("refs").length() == 10, "Exactly ten root/child bindings must be retained");
      java.util.HashSet<Integer> tags = new java.util.HashSet<>();
      for (String kind : new String[]{"native", "host", "stock", "custom", "styled"}) for (String suffix : new String[]{"", "-button"}) {
        String id = kind + suffix; JSONObject ref = value.getJSONObject("refs").getJSONObject(id);
        require(ref.getInt("attached") == 1 && ref.getInt("cleaned") == 0, "Root and child refs must survive every policy/reset");
        int tag = view(prefix + id).getId();
        require(tag > 0 && tags.add(tag) && value.getJSONObject("nodes").getInt(id) == tag, "Every group control must bind a distinct actual native host");
      }
      String serialized = value.toString();
      if (!serialized.equals(previous[0])) { previous[0] = serialized; stable[0] = SystemClock.uptimeMillis(); return false; }
      if (SystemClock.uptimeMillis() - stable[0] < 100) return false;
      result[0] = value; return true;
    }), "Group callback receipt must settle");
    return result[0];
  }

  /** Native focus and custom actions have a plain View positive control before MUI roots. */
  private void formGroupEvents(JSONObject report) throws Exception {
    require(Math.abs(activity.getResources().getConfiguration().fontScale - 1) < .01, "Event probe requires actual baseline OS text scale");
    boolean keyEventsEnabled = com.facebook.react.internal.featureflags.ReactNativeFeatureFlags.enableKeyEvents();
    report.put("keyEventsEnabled", keyEventsEnabled);
    await(() -> ui(() -> find("form-group-events-receipt") != null && metadata("form-group-events-receipt").optBoolean("ready")), "All event control roots must lay out");
    tap("form-group-events-reset");
    // A hardware key exits touch mode. Move focus outside the observed roots so
    // every controlled request below must produce a fresh native focus event.
    driver.sendKeyDownUpSync(KeyEvent.KEYCODE_TAB);
    require(ui(() -> view("form-group-events-reset").requestFocus()), "Neutral native control must accept hardware focus");
    JSONObject before = settledEventReceipt();
    int baseline = before.getInt("total");
    report.put("baseline", before); stage("ready");
    String previous = null;
    for (String key : new String[]{"native", "stock", "custom", "styled"}) {
      final String current = key;
      revealComplete("form-group-events-" + key);
      View host = ui(() -> view("form-group-events-" + current));
      int nativeId = ui(host::getId);
      int start = settledEventReceipt().getInt("total");
      require(ui(host::requestFocus), "Actual event root must accept native focus: " + key);
      await(() -> ui(host::hasFocus), "Actual event root must own focus: " + key);
      int expectedFocusCount = previous == null ? 2 : 4;
      await(() -> ui(() -> metadata("form-group-events-receipt").optInt("total") >= start + expectedFocusCount), "Focus callbacks must reach JavaScript: " + key);
      JSONObject focused = settledEventReceipt();
      JSONArray focus = eventSlice(focused, start);
      require(focus.length() == expectedFocusCount, "Exactly capture/bubble for each native focus transition: " + key);
      if (previous != null) eventPair(focus, 0, previous, "blur", before.getJSONObject("nodes").getInt(previous));
      eventPair(focus, expectedFocusCount - 2, key, "focus", nativeId);
      int keyStart = focused.getInt("total");
      driver.sendKeyDownUpSync(KeyEvent.KEYCODE_A);
      // The actual accessibility action is also a JS acknowledgement after the
      // hardware event. It avoids inferring absent key events from a fixed sleep.
      AccessibilityNodeInfo node = eventAccessibilityNode("form-group-events-" + key);
      int actionId = 0;
      for (AccessibilityNodeInfo.AccessibilityAction action : node.getActionList())
        if (action.getLabel() != null && "Inspect control".contentEquals(action.getLabel())) actionId = action.getId();
      require(actionId != 0 && node.performAction(actionId), "Real custom accessibility action must dispatch: " + key);
      await(() -> ui(() -> {
        JSONObject receipt = metadata("form-group-events-receipt"); JSONArray entries = receipt.optJSONArray("entries");
        return entries != null && entries.length() > 0 && entries.optJSONObject(entries.length() - 1).optString("type").equals("accessibility");
      }), "Custom action callback must acknowledge native input: " + key);
      JSONObject after = settledEventReceipt();
      JSONArray input = eventSlice(after, keyStart);
      require(input.length() == (keyEventsEnabled ? 5 : 1), "Native key capability and callback count must agree: " + key);
      if (keyEventsEnabled) {
        eventPair(input, 0, key, "key-down", nativeId); eventPair(input, 2, key, "key-up", nativeId);
        for (int i = 0; i < 4; i++) {
          JSONObject event = input.getJSONObject(i);
          require(event.getString("key").equals("a") && event.getString("code").equals("KeyA") &&
            !event.getBoolean("altKey") && !event.getBoolean("ctrlKey") && !event.getBoolean("metaKey") && !event.getBoolean("shiftKey"), "Actual key and modifiers must survive native dispatch");
        }
      }
      JSONObject action = input.getJSONObject(input.length() - 1);
      eventTarget(action, key, "accessibility", "direct", nativeId);
      require(action.getString("actionName").equals("inspect"), "Actual custom action name must survive");
      require(ui(host::hasFocus), "Input must preserve the actual focused event root");
      states.put(new JSONObject().put("name", key).put("nativeId", nativeId).put("nativeClass", host.getClass().getName())
        .put("bounds", ui(() -> bounds(host))).put("focus", focus).put("input", input).put("metadata", after));
      previous = key; before = after; stage(key);
    }
    int releaseStart = before.getInt("total");
    require(ui(() -> view("form-group-events-reset").requestFocus()), "Neutral control must release the last event root");
    await(() -> ui(() -> metadata("form-group-events-receipt").optInt("total") >= releaseStart + 2), "Final native blur must reach JavaScript");
    JSONObject released = settledEventReceipt(); JSONArray blur = eventSlice(released, releaseStart);
    require(blur.length() == 2, "Exactly one final native blur pair");
    eventPair(blur, 0, "styled", "blur", released.getJSONObject("nodes").getInt("styled"));
    require(baseline < released.getInt("total"), "Controlled native dispatch must advance the receipt");
    report.put("released", released).put("release", blur); stage("released"); capture("form-group-events.png");
  }
  private JSONObject settledEventReceipt() throws Exception {
    final String[] prior = {null}; final long[] stableSince = {0}; final JSONObject[] result = {null};
    await(() -> ui(() -> {
      JSONObject value = metadata("form-group-events-receipt");
      require(value.getBoolean("ready"), "All event roots must stay mounted");
      int total = value.getInt("total"); JSONArray entries = value.getJSONArray("entries");
      require(entries.length() == total && total <= 64, "Native event history must be complete and bounded");
      java.util.HashSet<Integer> ids = new java.util.HashSet<>();
      for (String key : new String[]{"native", "stock", "custom", "styled"}) {
        JSONObject refs = value.getJSONObject("refs").getJSONObject(key);
        require(refs.getInt("attached") == 1 && refs.getInt("cleaned") == 0, "Event roots must retain their original refs");
        int tag = view("form-group-events-" + key).getId();
        require(tag > 0 && ids.add(tag) && value.getJSONObject("nodes").getInt(key) == tag, "Callback ref must identify each distinct actual native root");
      }
      String serialized = value.toString();
      if (!serialized.equals(prior[0])) { prior[0] = serialized; stableSince[0] = SystemClock.uptimeMillis(); return false; }
      if (SystemClock.uptimeMillis() - stableSince[0] < 100) return false;
      result[0] = value; return true;
    }), "Native event receipts must settle");
    return result[0];
  }
  private static JSONArray eventSlice(JSONObject receipt, int start) throws Exception {
    JSONArray all = receipt.getJSONArray("entries"), result = new JSONArray();
    require(start >= 0 && start <= all.length(), "Event slice must be part of complete history");
    for (int i = start; i < all.length(); i++) result.put(all.getJSONObject(i));
    return result;
  }
  private static void eventTarget(JSONObject event, String key, String type, String phase, int tag) throws Exception {
    require(event.getString("kind").equals(key) && event.getString("type").equals(type) && event.getString("phase").equals(phase) &&
      event.getInt("target") == tag && event.getInt("currentTarget") == tag && event.getInt("expectedTarget") == tag,
      "Native callback must retain phase and actual target: " + key + "/" + type + "/" + phase);
  }
  private static void eventPair(JSONArray entries, int index, String key, String type, int tag) throws Exception {
    JSONObject capture = entries.getJSONObject(index), bubble = entries.getJSONObject(index + 1);
    eventTarget(capture, key, type, "capture", tag); eventTarget(bubble, key, type, "bubble", tag);
    require(capture.getInt("eventId") == bubble.getInt("eventId") && bubble.getInt("sequence") == capture.getInt("sequence") + 1,
      "Capture and bubble must observe the same native event object in order");
    if (type.equals("focus") || type.equals("blur")) require(capture.getInt("nativeTarget") == tag && bubble.getInt("nativeTarget") == tag, "Native focus payload must identify its actual host");
  }
  private AccessibilityNodeInfo eventAccessibilityNode(String id) throws Exception {
    final AccessibilityNodeInfo[] result = {null};
    await(() -> {
      AccessibilityNodeInfo root = automation.getRootInActiveWindow();
      if (root == null || !PACKAGE.contentEquals(root.getPackageName())) return false;
      java.util.ArrayDeque<AccessibilityNodeInfo> queue = new java.util.ArrayDeque<>(); queue.add(root);
      for (int inspected = 0; !queue.isEmpty() && inspected < 2048; inspected++) {
        AccessibilityNodeInfo node = queue.removeFirst();
        if (id.equals(node.getViewIdResourceName()) && PACKAGE.contentEquals(node.getPackageName()) && node.isVisibleToUser()) { result[0] = node; return true; }
        for (int i = 0; i < node.getChildCount(); i++) { AccessibilityNodeInfo child = node.getChild(i); if (child != null) queue.addLast(child); }
      }
      return false;
    }, "Actual accessible event control must be visible: " + id);
    return result[0];
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

  private void formGroupAccessibility() throws Exception {
    require(Math.abs(activity.getResources().getConfiguration().fontScale - 1) < .01, "Normal native font scale required");
    android.accessibilityservice.AccessibilityServiceInfo service = automation.getServiceInfo();
    service.flags |= android.accessibilityservice.AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS;
    automation.setServiceInfo(service);
    groupAccessibilityState("initial", false, 0);
    for (String group : GROUPS) tap("form-group-contract-child-" + group);
    String[] controls = {"row", "error", "theme", "rtl", "text"};
    for (String control : controls) tap("form-group-contract-" + control);
    groupAccessibilityState("updated", true, 1);
    for (String control : controls) tap("form-group-contract-" + control);
    groupAccessibilityState("restored", false, 1);
  }

  private void groupAccessibilityState(String name, boolean updated, int count) throws Exception {
    JSONObject current = settled(() -> {
      JSONObject value = metadata("form-group-contract-receipt");
      require(value.getInt("schemaVersion") == 1 && value.getBoolean("row") == updated &&
        value.getBoolean("parentError") == updated && value.getBoolean("themed") == updated &&
        value.getBoolean("rtl") == updated && value.getInt("fontSize") == (updated ? 20 : 16), "Actual group stage did not commit");
      scale(value);
      // The default state can render before the first native layout acknowledges refs.
      for (String group : GROUPS) {
        JSONObject ref = value.getJSONObject("refs").getJSONObject(group);
        require(ref.getInt("attached") == 1 && ref.getInt("cleaned") == 0, "Live group ref not ready: " + group + " " + ref);
        require(value.getJSONObject("receipts").has(group), "Native group layout not ready: " + group);
      }
      return value;
    }, "Group accessibility stage " + name);
    JSONArray groups = new JSONArray();
    for (String group : GROUPS) {
      String rootId = "form-group-contract-" + group;
      JSONObject ref = current.getJSONObject("refs").getJSONObject(group);
      require(ref.getInt("attached") == 1 && ref.getInt("cleaned") == 0, "Retained group ref " + group);
      int rootTag = ui(() -> retained(rootId).getId());
      JSONObject button = groupAccessibilityLeaf(rootId, "form-group-contract-child-" + group, "android.widget.Button", "Choice " + count, true);
      JSONObject text = groupAccessibilityLeaf(rootId, "form-group-contract-text-" + group, "android.widget.TextView", "Inherited text", false);
      groups.put(new JSONObject().put("group", group).put("rootTag", rootTag).put("refs", ref).put("button", button).put("text", text));
    }
    states.put(new JSONObject().put("name", name).put("updated", updated).put("groups", groups));
    stage(name); capture("group-tree-" + name + ".png");
  }

  private JSONObject groupAccessibilityLeaf(String rootId, String id, String expectedRole, String expectedLabel, boolean click) throws Exception {
    revealComplete(id);
    final JSONObject[] observed = {null};
    await(() -> {
      AccessibilityNodeInfo root = automation.getRootInActiveWindow();
      if (root == null || !PACKAGE.equals(String.valueOf(root.getPackageName()))) return false;
      java.util.ArrayDeque<AccessibilityNodeInfo> queue = new java.util.ArrayDeque<>(); queue.add(root);
      AccessibilityNodeInfo match = null;
      int examined = 0, matches = 0;
      while (!queue.isEmpty()) {
        require(examined++ < 5000, "Accessibility tree exceeds the diagnostic node limit");
        AccessibilityNodeInfo node = queue.removeFirst();
        if (id.equals(node.getViewIdResourceName())) { matches++; match = node; }
        for (int i = 0; i < node.getChildCount(); i++) { AccessibilityNodeInfo child = node.getChild(i); if (child != null) queue.addLast(child); }
      }
      if (match == null || !match.isVisibleToUser()) return false;
      require(matches == 1, "One native accessibility node must expose " + id);
      String role = String.valueOf(match.getClassName());
      CharSequence description = match.getContentDescription();
      String label = String.valueOf(description != null ? description : match.getText());
      boolean clickable = match.getActionList().stream().anyMatch(action -> action.getId() == AccessibilityNodeInfo.ACTION_CLICK);
      require(expectedRole.equals(role) && expectedLabel.equals(label), "Wrong native role/label for " + id + ": " + role + " / " + label);
      require(!click || (match.isEnabled() && clickable), "Native button must expose its enabled click action: " + id);
      Rect bounds = new Rect(); match.getBoundsInScreen(bounds);
      Rect owner = ui(() -> {
        View view = retained(rootId); int[] origin = new int[2]; view.getLocationOnScreen(origin);
        return new Rect(origin[0], origin[1], origin[0] + view.getWidth(), origin[1] + view.getHeight());
      });
      require(!bounds.isEmpty() && owner.contains(bounds.centerX(), bounds.centerY()), "Native accessibility node center must stay in its group: " + id);
      observed[0] = new JSONObject().put("id", id).put("role", role).put("label", label).put("matches", matches)
        .put("enabled", match.isEnabled()).put("clickAction", clickable).put("visibleToUser", match.isVisibleToUser())
        .put("bounds", new JSONArray().put(bounds.left).put(bounds.top).put(bounds.right).put(bounds.bottom))
        .put("groupBounds", new JSONArray().put(owner.left).put(owner.top).put(owner.right).put(owner.bottom));
      return true;
    }, "Visible native accessibility node must be reachable: " + id);
    return observed[0];
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
  private void stage(String name) { stages.put(name); Bundle update = new Bundle(); update.putString(scenario.key + "Stage", name); driver.sendStatus(1, update); }
  private JSONObject settled(java.util.concurrent.Callable<JSONObject> sample, String name) throws Exception {
    long deadline = SystemClock.uptimeMillis() + 20000; Throwable last = null;
    do { textDiagnostic = null; try { return ui(sample); } catch (AssertionError error) { last = error; } SystemClock.sleep(16); } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError("Native state did not settle: " + name, last);
  }
  private void await(java.util.concurrent.Callable<Boolean> condition, String message) throws Exception {
    long deadline = SystemClock.uptimeMillis() + 35000;
    do { if (condition.call()) return; SystemClock.sleep(16); } while (SystemClock.uptimeMillis() < deadline);
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
