// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
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
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityNodeInfo;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Private finite logical-ref/dirty-hint probe, with independently sampled
 * native frames. Zero-layout host families may flatten: native ViewGroup order
 * is not a logical-ref oracle. This collector does not establish CSS, first
 * paint, Portal semantics or scalability.
 */
public final class StructuralObservationScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private static final String[] NAMES = {
      "initial",       "zero-tail",   "pure-reorder", "hidden-tail",
      "remove-hidden", "layout-only", "restored"};
  private static final String[][] ORDERS = {
      {"target", "a", "b"},      {"target", "a", "b", "c"},
      {"b", "a", "c", "target"}, {"b", "a", "c", "target", "hidden"},
      {"b", "a", "c", "target"}, {"b", "a", "c", "target"},
      {"target", "a", "b"}};
  private final Instrumentation driver;
  private final String watchMode;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private View retainedTarget, retainedParent;
  private final JSONArray states = new JSONArray(), stages = new JSONArray(),
                          pictures = new JSONArray(),
                          navigation = new JSONArray();
  private long idleAttached, idleCleaned, lastRequest, baselineLayouts,
      previousLayouts, baselineAttached, baselineCleaned, subscriptionId,
      previousRevision;
  private JSONArray previousEvents = new JSONArray();
  private StructuralObservationScenario(Instrumentation driver,
                                        String watchMode) {
    this.driver = driver;
    this.watchMode = watchMode;
  }
  public static void run(Instrumentation driver) { run(driver, "siblings"); }
  public static void run(Instrumentation driver, String watchMode) {
    new StructuralObservationScenario(driver, watchMode).run();
  }
  private void run() {
    Bundle result = new Bundle();
    JSONObject report = new JSONObject();
    boolean passed = false;
    try {
      require("siblings".equals(watchMode) || "children".equals(watchMode),
              "Choose a finite structural watch mode");
      require(Build.VERSION.SDK_INT >= 29,
              "Frame-commit observation requires Android29+");
      directory = new File(driver.getTargetContext().getCacheDir(),
                           "mui-structure-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve existing structure evidence");
      report.put("schemaVersion", 1)
          .put("scenario", "structure-native-observation-v1")
          .put("watchMode", watchMode)
          .put("driver", "native Instrumentation and UiAutomation")
          .put("artifactDirectory", "cache/" + directory.getName())
          .put("device", new JSONObject()
                             .put("package", PACKAGE)
                             .put("sdk", Build.VERSION.SDK_INT)
                             .put("model", Build.MODEL)
                             .put("density", driver.getTargetContext()
                                                 .getResources()
                                                 .getDisplayMetrics()
                                                 .density)
                             .put("fontScale", driver.getTargetContext()
                                                   .getResources()
                                                   .getConfiguration()
                                                   .fontScale))
          .put(
              "limits",
              "Current public logical-ref metadata plus independently "
                  +
                  "sampled native target frames; not atomic cross-thread, CSS, "
                  + "first-paint, Portal or performance evidence");
      automation = driver.getUiAutomation(
          UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext()
                          .getPackageManager()
                          .getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Existing catalog must be installed");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                      Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      tagId = driver.getTargetContext().getResources().getIdentifier(
          "react_test_id", "id", PACKAGE);
      require(tagId != 0, "Native test-id resource missing");
      navigate("catalog-tab-Wrappers", "root-layout-structure", false);
      navigate("root-layout-structure", "structure-probe-receipt", true);
      await(()
                -> ui(()
                          -> "siblings".equals(
                                 metadata().optString("watchMode")) &&
                                 metadata().optInt("stage", -1) == 0),
            "Fresh scene starts in siblings mode");
      if ("children".equals(watchMode)) {
        tap("structure-probe-mode");
        await(()
                  -> ui(()
                            -> "children".equals(
                                   metadata().optString("watchMode")) &&
                                   metadata().optInt("stage", -1) == 0 &&
                                   !metadata().optBoolean("active", true)),
              "Choose the remounted children session before starting");
      }
      settle(0, -1);
      JSONObject idle = fresh(0);
      diagnostics(idle, false);
      report.put("idle", idle);
      idleAttached =
          idle.getJSONObject("leases").getJSONObject("target").getLong(
              "attached");
      idleCleaned =
          idle.getJSONObject("leases").getJSONObject("target").getLong(
              "cleaned");
      ui(() -> {
        retainedTarget = view("structure-probe-target");
        retainedParent = view("structure-probe-parent");
        return null;
      });
      tap("structure-probe-start");
      await(()
                -> ui(() -> {
              JSONArray events = metadata().optJSONArray("events");
              return events != null && events.length() == 1 &&
                  events.getJSONObject(0).optLong("revision", -1) == 1;
            }),
            "Native registration must deliver initial revision1");
      for (int stage = 0; stage < NAMES.length; stage++) {
        final int current = stage;
        if (stage > 0) {
          tap("structure-probe-next");
          await(()
                    -> ui(() -> metadata().optInt("stage", -1) == current),
                "Authored stage must commit");
          if (stage == 5) {
            settle(stage, previousLayouts);
            SystemClock.sleep(400);
          } else {
            final int before = previousEvents.length();
            await(()
                      -> ui(()
                                -> metadata().getJSONArray("events").length() >
                                       before),
                  "Structural stage must deliver a fresh native dirty hint");
          }
        }
        settle(stage, stage >= 5 ? previousLayouts : -1);
        JSONObject data = fresh(stage);
        JSONObject sample = ui(() -> checkedSample(current, data));
        states.put(sample);
        stages.put(NAMES[stage]);
        capture(NAMES[stage] + ".png");
        Bundle progress = new Bundle();
        progress.putString("structureStage", NAMES[stage]);
        driver.sendStatus(1, progress);
      }
      tap("structure-probe-stop");
      JSONObject stopped = fresh(6);
      diagnostics(stopped, false);
      report.put("stopped", stopped);
      final int stoppedCount = stopped.getJSONArray("events").length();
      SystemClock.sleep(400);
      JSONObject finalStopped = fresh(6);
      diagnostics(finalStopped, false);
      require(finalStopped.getJSONArray("events").length() == stoppedCount,
              "Notifications must stop after lease cleanup");
      JSONObject finalFrame = ui(() -> nativeFrame(6));
      report.put("finalStopped", new JSONObject()
                                     .put("metadata", finalStopped)
                                     .put("native", finalFrame));
      capture("final-stopped.png");
      passed = true;
    } catch (Throwable error) {
      try {
        report.put("error",
                   error.toString() + (error.getCause() == null
                                           ? ""
                                           : " <- " + error.getCause()));
        if (directory != null && activity != null && automation != null)
          capture("failure.png");
      } catch (Throwable ignored) { /* Preserve the original failure when
                                       evidence capture also fails. */
      }
    } finally {
      // A failed probe must attempt to release its opt-in hooks. Foreign-window
      // ownership checks still apply; the outer runner handles an unconfirmed
      // stop.
      JSONObject cleanup = new JSONObject();
      try {
        if (activity != null && automation != null &&
            ui(() -> metadata().optBoolean("active", false))) {
          cleanup.put("attempted", true);
          tap("structure-probe-stop");
          JSONObject stopped = fresh(ui(() -> metadata().getInt("stage")));
          diagnostics(stopped, false);
        }
        if (activity != null)
          diagnostics(ui(this::metadata), false);
        cleanup.put("observedStopped", activity != null);
      } catch (Throwable failure) {
        passed = false;
        try {
          cleanup.put("error", failure.toString());
        } catch (Exception ignored) { /* Keep the primary receipt. */
        }
      }
      try {
        report.put("status", passed ? "passed" : "failed")
            .put("states", states)
            .put("stages", stages)
            .put("screenshots", pictures)
            .put("navigation", navigation)
            .put("cleanup", cleanup);
        result.putString("structureReport", report.toString());
      } catch (Exception error) {
        result.putString("Error", error.toString());
        passed = false;
      }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED,
                    result);
    }
  }
  private JSONObject fresh(int stage) throws Exception {
    final long before = ui(() -> metadata().optLong("request", -1));
    tap("structure-probe-measure");
    await(()
              -> ui(() -> {
            JSONObject m = metadata();
            return !m.has("error") && m.optInt("stage", -1) == stage &&
                watchMode.equals(m.optString("watchMode")) &&
                m.optLong("request", -1) > before;
          }),
          "Explicit current-stage public-ref capture must answer");
    JSONObject data = ui(this::metadata);
    require(watchMode.equals(data.optString("watchMode")),
            "Captured watch mode must match the requested scenario");
    require(data.getLong("request") > lastRequest,
            "Capture request must increase across samples");
    lastRequest = data.getLong("request");
    return data;
  }
  private void settle(int stage, long previous) throws Exception {
    await(()
              -> ui(() -> {
            JSONObject m = metadata();
            if (m.optInt("stage", -1) != stage ||
                !watchMode.equals(m.optString("watchMode")) ||
                m.optLong("targetLayouts", -1) < 1 ||
                previous >= 0 && m.getLong("targetLayouts") <= previous)
              return false;
            nativeFrame(stage);
            return true;
          }),
          "Current authored target layout must settle");
    commitFrame();
  }
  private JSONObject nativeFrame(int stage) throws Exception {
    View target = view("structure-probe-target"),
         parent = view("structure-probe-parent");
    if (retainedTarget != null)
      require(target == retainedTarget && parent == retainedParent,
              "Native target/parent identity must be retained");
    require(target.isAttachedToWindow() && parent.isAttachedToWindow(),
            "Native target/parent must remain mounted");
    JSONObject frame = bounds(target), parentFrame = bounds(parent);
    float density = target.getResources().getDisplayMetrics().density;
    nearPixels(frame.getDouble("width"), stage == 5 ? 48 : 40, density,
               "Native target width");
    nearPixels(frame.getDouble("height"), 40, density, "Native target height");
    nearPixels(parentFrame.getDouble("width"), 240, density,
               "Native parent width");
    nearPixels(parentFrame.getDouble("height"), 120, density,
               "Native parent height");
    nearPixels(frame.getDouble("x"), parentFrame.getDouble("x"), density,
               "Authored target left edge");
    nearPixels(frame.getDouble("y"), parentFrame.getDouble("y"), density,
               "Authored target top edge");
    return new JSONObject()
        .put("targetId", System.identityHashCode(target))
        .put("parentId", System.identityHashCode(parent))
        .put("targetClass", target.getClass().getName())
        .put("parentClass", parent.getClass().getName())
        .put("targetFrame", frame)
        .put("parentFrame", parentFrame);
  }
  private JSONObject checkedSample(int stage, JSONObject data)
      throws Exception {
    JSONObject current = metadata();
    require(watchMode.equals(data.optString("watchMode")) &&
                watchMode.equals(current.optString("watchMode")),
            "Native frame and receipt must belong to the selected mode");
    require(current.getLong("request") >= data.getLong("request") &&
                current.getInt("stage") == stage,
            "Stage must remain current while native frame is sampled");
    require(data.getInt("schemaVersion") == 1 &&
                "native-structure-observation-probe-v1".equals(
                    data.getString("scenario")) &&
                data.getInt("stage") == stage,
            "Current probe identity");
    diagnostics(data, true);
    JSONObject authored = data.getJSONObject("authored"),
               actual = data.getJSONObject("actual");
    require(NAMES[stage].equals(authored.getString("name")) &&
                authored.getInt("width") == (stage == 5 ? 48 : 40),
            "Authored stage constants");
    require(actual.getBoolean("parentMatchesForwardedRef") &&
                actual.getBoolean("targetIsCanonicalChild"),
            "Actual public native refs must be canonical");
    JSONArray order = actual.getJSONArray("order");
    require(order.length() == ORDERS[stage].length &&
                actual.getInt("count") == order.length(),
            "Actual logical child count");
    int expectedIndex = -1;
    for (int i = 0; i < ORDERS[stage].length; i++) {
      require(ORDERS[stage][i].equals(order.getString(i)),
              "Actual public logical order");
      if ("target".equals(ORDERS[stage][i]))
        expectedIndex = i;
    }
    require(actual.getInt("index") == expectedIndex,
            "Canonical target logical index");
    JSONArray events = data.getJSONArray("events");
    require(events.length() > 0 && events.length() <= 128,
            "Bounded native event history");
    long revision = 0;
    for (int i = 0; i < events.length(); i++) {
      JSONObject event = events.getJSONObject(i);
      require("structure-probe:1".equals(event.getString("lease")) &&
                  !event.getBoolean("closed") &&
                  event.getLong("revision") > revision,
              "Current retained native lease/revision");
      revision = event.getLong("revision");
      if (i == 0)
        subscriptionId = event.getLong("subscriptionId");
      require(subscriptionId > 0 &&
                  event.getLong("subscriptionId") == subscriptionId,
              "One retained subscription identity");
    }
    require(events.length() >= previousEvents.length(),
            "Native history cannot shrink");
    for (int i = 0; i < previousEvents.length(); i++)
      for (String key : new String[] {"subscriptionId", "lease", "revision",
                                      "closed", "committedStage"})
        require(events.getJSONObject(i).get(key).equals(
                    previousEvents.getJSONObject(i).get(key)),
                "Native history prefix must remain exact");
    JSONObject lease = data.getJSONObject("leases").getJSONObject("target");
    long attached = lease.getLong("attached"),
         cleaned = lease.getLong("cleaned"),
         layouts = data.getLong("targetLayouts");
    if (stage == 0) {
      require(events.length() == 1 && revision == 1 && layouts >= 1 &&
                  attached - cleaned == 1 && attached == idleAttached &&
                  cleaned == idleCleaned,
              "Initial registration and retained lease baseline");
      baselineLayouts = layouts;
      baselineAttached = attached;
      baselineCleaned = cleaned;
    } else if (stage == 5)
      require(events.length() == previousEvents.length() &&
                  revision == previousRevision && layouts > previousLayouts,
              "Layout-only update must not deliver a structural record");
    else {
      require(events.length() > previousEvents.length() &&
                  revision > previousRevision,
              "Structural change must deliver a new record");
      if (stage < 5)
        require(layouts == baselineLayouts,
                "Zero-layout structure must not depend on target onLayout");
      else
        require(layouts > previousLayouts,
                "Restored width requires actual layout acknowledgment");
    }
    require(attached == baselineAttached && cleaned == baselineCleaned,
            "Memoized target ref must not remount");
    previousLayouts = layouts;
    previousRevision = revision;
    previousEvents = new JSONArray(events.toString());
    return new JSONObject()
        .put("name", NAMES[stage])
        .put("metadata", data)
        .put("native", nativeFrame(stage));
  }
  private static void diagnostics(JSONObject data, boolean active)
      throws Exception {
    require(data.getBoolean("active") == active &&
                data.getJSONArray("errors").length() == 0,
            "No scene errors and exact active state");
    JSONObject d = data.getJSONObject("nativeDiagnostics");
    for (String key : new String[] {"connected", "commitHookRegistered",
                                    "mountHookRegistered"})
      require(d.getBoolean(key) == active, "Native owned hook state: " + key);
    require(d.getInt("subscriptions") == (active ? 1 : 0) &&
                d.getInt("observedRoots") == (active ? 1 : 0) &&
                d.getInt("pendingRecords") == 0 &&
                !d.getBoolean("notificationPending"),
            "Owned native watch/pending diagnostics");
  }
  private static void nearPixels(double actual, double expected, double density,
                                 String message) {
    require(Double.isFinite(actual) && Double.isFinite(expected) &&
                Double.isFinite(density) && density > 0 &&
                Math.abs(actual - expected) * density <= 1.01,
            message);
  }
  private JSONObject bounds(View target) throws Exception {
    int[] point = new int[2];
    target.getLocationInWindow(point);
    float density = target.getResources().getDisplayMetrics().density;
    require(target.getWidth() > 0 && target.getHeight() > 0,
            "Native frame must be nonempty");
    return new JSONObject()
        .put("x", point[0] / density)
        .put("y", point[1] / density)
        .put("width", target.getWidth() / density)
        .put("height", target.getHeight() / density);
  }
  private JSONObject metadata() throws Exception {
    View receipt = find("structure-probe-receipt");
    return receipt == null || receipt.getContentDescription() == null
        ? new JSONObject()
        : new JSONObject(receipt.getContentDescription().toString());
  }
  private View find(String id) {
    return search(activity.getWindow().getDecorView(), id);
  }
  private View view(String id) {
    View found = find(id);
    require(found != null, "Missing native view: " + id);
    return found;
  }
  private View search(View root, String id) {
    if (id.equals(root.getTag(tagId)))
      return root;
    if (root instanceof ViewGroup)
      for (int i = 0; i < ((ViewGroup)root).getChildCount(); i++) {
        View found = search(((ViewGroup)root).getChildAt(i), id);
        if (found != null)
          return found;
      }
    return null;
  }
  /**
   * Only catalog navigation is idempotent. Never retry counted component
   * touches.
   */
  private void navigate(String control, String destination,
                        boolean initialReceipt) throws Exception {
    JSONObject step = new JSONObject()
                          .put("control", control)
                          .put("destination", destination)
                          .put("attempts", 0)
                          .put("success", false);
    navigation.put(step);
    for (int attempt = 0; attempt <= 3; attempt++) {
      if (ui(() -> destinationReady(destination, initialReceipt))) {
        step.put("success", true);
        return;
      }
      if (attempt == 3)
        break;
      step.put("attempts", attempt + 1);
      tap(control, true);
      long deadline = SystemClock.uptimeMillis() + 3000;
      do {
        if (ui(() -> destinationReady(destination, initialReceipt))) {
          step.put("success", true);
          return;
        }
        SystemClock.sleep(16);
      } while (SystemClock.uptimeMillis() < deadline);
    }
    throw new AssertionError("Catalog navigation did not commit: " + control);
  }
  private boolean destinationReady(String id, boolean initialReceipt)
      throws Exception {
    View target = find(id);
    if (target == null || target.getWidth() <= 0 || target.getHeight() <= 0)
      return false;
    if (!initialReceipt)
      return true;
    JSONObject receipt = metadata();
    return receipt.optInt("stage", -1) == 0 &&
        receipt.optJSONObject("actual") != null;
  }
  private void tap(String id) throws Exception { tap(id, false); }
  private void tap(String id, boolean navigationTouch) throws Exception {
    await(this::catalogOwnsTouchWindow,
          "Catalog must own the focused window before touch: " + id);
    await(()
              -> ui(()
                        -> find(id) != null && view(id).getWidth() > 0 &&
                               view(id).getHeight() > 0),
          "Touch target must mount: " + id);
    ui(() -> {
      View target = view(id);
      target.requestRectangleOnScreen(
          new Rect(0, 0, target.getWidth(), target.getHeight()), true);
      return null;
    });
    await(()
              -> ui(() -> {
            Rect visible = new Rect();
            return view(id).getGlobalVisibleRect(visible) &&
                visible.width() > 0 && visible.height() > 0;
          }),
          "Touch target must be visible");
    if (navigationTouch)
      commitFrame();
    float[] point = ui(() -> {
      Rect visible = new Rect();
      require(view(id).getGlobalVisibleRect(visible), "Touch target clipped");
      return new float[] {visible.exactCenterX(), visible.exactCenterY()};
    });
    long down = SystemClock.uptimeMillis();
    for (int action :
         new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      require(catalogOwnsTouchWindow(),
              "Catalog lost its focused touch window: " + id);
      MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(),
                                             action, point[0], point[1], 0);
      event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try {
        require(automation.injectInputEvent(event, true),
                "Native touch injection failed");
      } finally {
        event.recycle();
      }
      SystemClock.sleep(30);
    }
  }
  // Offscreen bounds can remain valid underneath a system or another app
  // window. Check actual focus and the active accessibility owner before each
  // injected event.
  private boolean catalogOwnsTouchWindow() {
    AccessibilityNodeInfo owner = automation.getRootInActiveWindow();
    return owner != null &&
        PACKAGE.equals(String.valueOf(owner.getPackageName())) &&
        ui(() -> activity.hasWindowFocus());
  }
  private void commitFrame() throws Exception {
    CountDownLatch committed = new CountDownLatch(1);
    ui(() -> {
      View root = activity.getWindow().getDecorView();
      root.getViewTreeObserver().registerFrameCommitCallback(
          committed::countDown);
      root.invalidate();
      return null;
    });
    require(committed.await(5, TimeUnit.SECONDS), "Catalog frame must commit");
  }
  private void capture(String name) throws Exception {
    commitFrame();
    AccessibilityNodeInfo owner = automation.getRootInActiveWindow();
    require(owner != null && PACKAGE.contentEquals(owner.getPackageName()),
            "Catalog must own screenshot window");
    Bitmap bitmap = automation.takeScreenshot();
    require(bitmap != null, "Screenshot missing");
    try (FileOutputStream output =
             new FileOutputStream(new File(directory, name))) {
      require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output),
              "Screenshot encoding failed");
    } finally {
      bitmap.recycle();
    }
    pictures.put(name);
  }
  private void await(java.util.function.BooleanSupplier condition,
                     String message) throws Exception {
    long deadline = SystemClock.uptimeMillis() + 25000;
    AssertionError last = null;
    do {
      try {
        if (condition.getAsBoolean())
          return;
      } catch (AssertionError pending) {
        last = pending;
      }
      SystemClock.sleep(16);
    } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError(message, last);
  }
  private <T> T ui(java.util.concurrent.Callable<T> action) {
    AtomicReference<T> value = new AtomicReference<>();
    AtomicReference<Throwable> error = new AtomicReference<>();
    driver.runOnMainSync(() -> {
      try {
        value.set(action.call());
      } catch (Throwable failure) {
        error.set(failure);
      }
    });
    if (error.get() != null)
      throw new AssertionError(error.get());
    return value.get();
  }
  private static void require(boolean value, String message) {
    if (!value)
      throw new AssertionError(message);
  }
}
