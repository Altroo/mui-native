/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package dev.altroo.muinative.benchmark.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.app.usage.StorageStats;
import android.app.usage.StorageStatsManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.os.Debug;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Process;
import android.os.SystemClock;
import android.os.storage.StorageManager;
import android.system.Os;
import android.system.OsConstants;
import android.view.FrameMetrics;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/** In-process release instrumentation. Driver/collector overhead remains in process CPU/PSS. */
public final class PopperBenchmark extends Instrumentation {
  private static final String PACKAGE = "dev.altroo.muinative.benchmark";
  private final JSONArray trials = new JSONArray();
  private Activity activity;
  private UiAutomation automation;
  private JSONObject lastGesture;
  private JSONObject lastGeometry;
  private final MotionEvent.PointerProperties[] pointerProperties = {new MotionEvent.PointerProperties()};
  private final MotionEvent.PointerCoords[] pointerCoordinates = {new MotionEvent.PointerCoords()};
  private String expectedSource;
  private float density;
  private int testIdKey;

  @Override public void onCreate(Bundle arguments) {
    super.onCreate(arguments);
    expectedSource = arguments.getString("sourceId", "");
    start();
  }

  @Override public void onStart() {
    JSONObject report = new JSONObject();
    Bundle output = new Bundle();
    boolean passed = false;
    try {
      require(Build.VERSION.SDK_INT >= 31, "Frame deadline collection needs Android API 31+");
      require(expectedSource.matches("[a-f0-9]{64}"), "Provide the built sourceId");
      require((getTargetContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0,
        "Refusing a debuggable target");
      automation = getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      pointerProperties[0].id = 0;
      pointerProperties[0].toolType = MotionEvent.TOOL_TYPE_FINGER;
      pointerCoordinates[0].size = 1;
      Intent launch = getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Benchmark launch activity unavailable");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = startActivitySync(launch);
      density = getTargetContext().getResources().getDisplayMetrics().density;
      // R8 can inline/remove React Native's R class in a release target. Resolve
      // its merged app resource once, outside the measured workload.
      testIdKey = getTargetContext().getResources().getIdentifier("react_test_id", "id", PACKAGE);
      require(testIdKey != 0, "React Native testID resource unavailable");
      waitText("benchmark-mode", "rn");
      final String[] identityText = {null};
      onUi(() -> identityText[0] = ((TextView)view("benchmark-identity")).getText().toString());
      JSONObject identity = new JSONObject(identityText[0]);
      require(identity.getInt("schemaVersion") == 1 && "popper-scroll-v1".equals(identity.getString("workload")) &&
        !identity.getBoolean("dev") && identity.getBoolean("hermes") &&
        expectedSource.equals(identity.getString("sourceId")), "Wrong source, workload, engine or JS build mode");
      report.put("identity", identity);
      report.put("schemaVersion", 1).put("package", PACKAGE);
      report.put("device", new JSONObject().put("model", Build.MODEL).put("hardware", Build.HARDWARE)
        .put("fingerprint", Build.FINGERPRINT).put("sdk", Build.VERSION.SDK_INT).put("os", Build.VERSION.RELEASE).put("fontScale", getTargetContext().getResources().getConfiguration().fontScale).put("density", density));
      final float[] refreshRate = {0};
      onUi(() -> refreshRate[0] = activity.getDisplay().getRefreshRate());
      report.put("refreshRateHz", refreshRate[0]);
      report.put("protocol", new JSONObject().put("inputDriver", "UiAutomation.injectInputEvent")
        .put("pointerType", "finger").put("moveInjection", "asynchronous")
        .put("stationarySamples", 3)
        .put("warmupTrialsPerMode", 1).put("measuredTrialsPerMode", 3)
        .put("tapSamplesPerTrial", 20).put("scrollCyclesPerTrial", 3).put("dragDistanceDp", 64)
        .put("dragDurationMs", 400).put("releaseHoldMs", 120).put("maxMoveLatenessMs", 40)
        .put("order", "rn,mui,mui,rn,rn,mui,mui,rn"));
      // Round zero warms both paths. Alternating order reduces a fixed-order bias.
      for (int round = 0; round < 4; round++) {
        String[] order = round % 2 == 0 ? new String[] {"rn", "mui"} : new String[] {"mui", "rn"};
        for (String mode : order) {
          select(mode);
          trials.put(trial(mode, round));
        }
      }
      StorageStats stats = getTargetContext().getSystemService(StorageStatsManager.class)
        .queryStatsForUid(StorageManager.UUID_DEFAULT, Process.myUid());
      report.put("storage", new JSONObject().put("appBytes", stats.getAppBytes()).put("dataBytes", stats.getDataBytes())
        .put("cacheBytes", stats.getCacheBytes()).put("scope", "whole benchmark app, both modes bundled"));
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString()).put("lastGesture", lastGesture).put("lastGeometry", lastGeometry); } catch (Exception ignored) { /* Preserve the original failure. */ }
    } finally {
      try {
        report.put("status", passed ? "passed" : "failed").put("trials", trials);
        output.putString("report", report.toString());
      } catch (Exception error) { output.putString("Error", error.toString()); passed = false; }
      finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, output);
    }
  }

  private JSONObject trial(String mode, int round) throws Exception {
    verifyGeometry();
    long beforePss = pssKb();
    JSONArray taps = new JSONArray();
    int initial = count();
    for (int index = 1; index <= 20; index++) taps.put(tapToDraw(initial + index));
    JSONObject beforeCpu = cpu();
    HandlerThread collector = new HandlerThread("mui-benchmark-frames");
    collector.start();
    Handler handler = new Handler(collector.getLooper());
    ArrayList<long[]> frames = new ArrayList<>();
    AtomicLong reportDrops = new AtomicLong();
    AtomicLong measurementEnd = new AtomicLong();
    CountDownLatch sentinel = new CountDownLatch(1);
    JSONArray gestures = new JSONArray();
    Window.OnFrameMetricsAvailableListener listener = (window, metrics, dropped) -> {
      reportDrops.addAndGet(dropped);
      // Copy values before this reusable platform FrameMetrics is overwritten.
      if (frames.size() < 20000) frames.add(new long[] {
        metrics.getMetric(FrameMetrics.INTENDED_VSYNC_TIMESTAMP),
        metrics.getMetric(FrameMetrics.TOTAL_DURATION), metrics.getMetric(FrameMetrics.DEADLINE),
        metrics.getMetric(FrameMetrics.FIRST_DRAW_FRAME)
      }); else reportDrops.incrementAndGet();
      if (measurementEnd.get() > 0 && metrics.getMetric(FrameMetrics.INTENDED_VSYNC_TIMESTAMP) > measurementEnd.get()) sentinel.countDown();
    };
    long start = 0, end = 0;
    JSONObject afterCpu;
    boolean installed = false;
    try {
      onUi(() -> activity.getWindow().addOnFrameMetricsAvailableListener(listener, handler));
      installed = true;
      start = System.nanoTime();
      for (int cycle = 0; cycle < 3; cycle++) {
        gestures.put(drag(-64, initial + 20)); verifyGeometry();
        gestures.put(drag(64, initial + 20)); verifyGeometry();
      }
      end = System.nanoTime();
      afterCpu = cpu();
      measurementEnd.set(end);
      // RenderThread delivers reports asynchronously. A barrier on our Handler
      // alone cannot prove that the last slow measured frame has arrived.
      for (int attempt = 0; attempt < 30 && sentinel.getCount() > 0; attempt++) {
        onUi(() -> activity.getWindow().getDecorView().postInvalidateOnAnimation());
        sentinel.await(100, TimeUnit.MILLISECONDS);
      }
      require(sentinel.getCount() == 0, "No post-measurement frame sentinel");
    } finally {
      try {
        if (installed) onUi(() -> activity.getWindow().removeOnFrameMetricsAvailableListener(listener));
        CountDownLatch drained = new CountDownLatch(1);
        require(handler.post(drained::countDown) && drained.await(3, TimeUnit.SECONDS), "Frame collector did not drain");
      } finally {
        collector.quitSafely();
        collector.join(3000);
      }
      require(!collector.isAlive(), "Frame collector did not terminate");
    }
    JSONArray selectedFrames = new JSONArray();
    for (long[] frame : frames) if (frame[0] >= start && frame[0] <= end) {
      require(frame[1] >= 0 && frame[2] > 0, "Frame duration/deadline unavailable");
      selectedFrames.put(new JSONArray(new long[] {frame[0] - start, frame[1], frame[2], frame[3]}));
    }
    require(selectedFrames.length() >= 20, "Insufficient rendered scroll frames");
    return new JSONObject().put("mode", mode).put("round", round).put("warmup", round == 0)
      .put("tapUpInjectionToCounterOnDrawMs", taps).put("scrollDurationMs", (end - start) / 1e6)
      .put("frames", selectedFrames).put("listenerReportDrops", reportDrops.get()).put("postEndSentinel", true).put("gestures", gestures)
      .put("cpuBefore", beforeCpu).put("cpuAfter", afterCpu)
      .put("pssBeforeKb", beforePss).put("pssAfterKb", pssKb());
  }

  private void select(String mode) throws Exception {
    final int[] epoch = {0};
    onUi(() -> epoch[0] = Integer.parseInt(((TextView)view("benchmark-epoch")).getText().toString()));
    tap("benchmark-mode-" + mode);
    waitText("benchmark-epoch", String.valueOf(epoch[0] + 1));
    waitText("benchmark-mode", mode);
    SystemClock.sleep(400);
    require(count() == 0, "Trial counter did not reset");
    onUi(() -> require(view("benchmark-scroll").getScrollY() == 0, "Trial scroll offset did not reset"));
    verifyGeometry();
  }

  private int count() {
    final int[] value = {0};
    onUi(() -> value[0] = Integer.parseInt(((TextView)view("benchmark-count")).getText().toString().substring(5)));
    return value[0];
  }

  private double tapToDraw(int expected) throws Exception {
    CountDownLatch drawn = new CountDownLatch(1);
    AtomicLong injection = new AtomicLong(), observed = new AtomicLong();
    final TextView[] counter = {null};
    onUi(() -> counter[0] = (TextView)view("benchmark-count"));
    ViewTreeObserver.OnDrawListener listener = () -> {
      if (injection.get() > 0 && ("Read " + expected).contentEquals(counter[0].getText()) &&
        observed.compareAndSet(0, System.nanoTime())) drawn.countDown();
    };
    View decor = activity.getWindow().getDecorView();
    onUi(() -> decor.getViewTreeObserver().addOnDrawListener(listener));
    try {
      float[] point = center("benchmark-confirm");
      long downTime = SystemClock.uptimeMillis();
      inject(MotionEvent.ACTION_DOWN, downTime, point[0], point[1]);
      SystemClock.sleep(40);
      injection.set(System.nanoTime());
      inject(MotionEvent.ACTION_UP, downTime, point[0], point[1]);
      require(drawn.await(3, TimeUnit.SECONDS), "Counter did not reach its draw callback");
      require(count() == expected, "Popup lost its child state");
      SystemClock.sleep(60);
      return (observed.get() - injection.get()) / 1e6;
    } finally {
      onUi(() -> decor.getViewTreeObserver().removeOnDrawListener(listener));
    }
  }

  private void tap(String id) throws Exception {
    float[] point = center(id);
    long downTime = SystemClock.uptimeMillis();
    inject(MotionEvent.ACTION_DOWN, downTime, point[0], point[1]);
    SystemClock.sleep(40);
    inject(MotionEvent.ACTION_UP, downTime, point[0], point[1]);
  }

  private JSONObject drag(float dp, int expectedCounter) throws Exception {
    float[] point = new float[2];
    final RectF[] scrollBounds = {null};
    final String[] scrollClass = {null};
    final int[] before = {0}, childHeight = {0}, counterBefore = {0};
    final boolean[] canScroll = {false};
    // Use the right edge, clear of both the anchor and popup touch regions.
    onUi(() -> {
      View target = view("benchmark-scroll");
      require(target.isShown() && activity.hasWindowFocus(), "Scroll target unavailable");
      RectF rect = bounds(target);
      point[0] = rect.right - 12 * density; point[1] = rect.centerY();
      scrollBounds[0] = rect; scrollClass[0] = target.getClass().getName();
      before[0] = target.getScrollY();
      canScroll[0] = target.canScrollVertically(dp < 0 ? 1 : -1);
      if (target instanceof ViewGroup && ((ViewGroup)target).getChildCount() > 0)
        childHeight[0] = ((ViewGroup)target).getChildAt(0).getHeight();
      counterBefore[0] = Integer.parseInt(((TextView)view("benchmark-count")).getText().toString().substring(5));
    });
    lastGesture = new JSONObject().put("distanceDp", dp).put("scrollBeforePx", before[0])
      .put("targetClass", scrollClass[0]).put("boundsPx", new JSONArray(new float[] {
        scrollBounds[0].left, scrollBounds[0].top, scrollBounds[0].right, scrollBounds[0].bottom}))
      .put("pointPx", new JSONArray(point)).put("contentHeightPx", childHeight[0]).put("canScroll", canScroll[0]);
    long downTime = SystemClock.uptimeMillis();
    inject(MotionEvent.ACTION_DOWN, downTime, point[0], point[1]);
    long downAcknowledgedAt = SystemClock.uptimeMillis();
    long maximumLateness = 0, lastMoveAt = 0, firstMoveLateness = 0, maximumDispatchDuration = 0;
    int worstMoveStep = 0;
    for (int step = 1; step <= 20; step++) {
      long due = downTime + step * 20;
      SystemClock.sleep(Math.max(0, due - SystemClock.uptimeMillis()));
      long dispatchStartedAt = SystemClock.uptimeMillis();
      lastMoveAt = inject(MotionEvent.ACTION_MOVE, downTime, point[0], point[1] + dp * density * step / 20);
      maximumDispatchDuration = Math.max(maximumDispatchDuration, SystemClock.uptimeMillis() - dispatchStartedAt);
      long lateness = lastMoveAt - due;
      if (step == 1) firstMoveLateness = lateness;
      if (lateness > maximumLateness) { maximumLateness = lateness; worstMoveStep = step; }
    }
    // Repeated stationary samples make the hold visible to the native velocity
    // tracker instead of relying on one possibly batched sample before release.
    long movingFinishedAt = SystemClock.uptimeMillis();
    for (int step = 1; step <= 3; step++) {
      long due = movingFinishedAt + step * 40;
      SystemClock.sleep(Math.max(0, due - SystemClock.uptimeMillis()));
      inject(MotionEvent.ACTION_MOVE, downTime, point[0], point[1] + dp * density);
    }
    inject(MotionEvent.ACTION_UP, downTime, point[0], point[1] + dp * density);
    final int[] released = {0};
    onUi(() -> released[0] = view("benchmark-scroll").getScrollY());
    lastGesture.put("downAckMs", downAcknowledgedAt - downTime).put("maxMoveDispatchMs", maximumDispatchDuration)
      .put("firstMoveLatenessMs", firstMoveLateness).put("worstMoveStep", worstMoveStep)
      .put("moveDurationMs", lastMoveAt - downTime).put("maxMoveLatenessMs", maximumLateness);
    require(maximumLateness <= 40, "Move injection exceeded timing tolerance: " + maximumLateness +
      "ms step=" + worstMoveStep + " downAckMs=" + (downAcknowledgedAt - downTime) +
      " firstMoveLatenessMs=" + firstMoveLateness + " maxMoveDispatchMs=" + maximumDispatchDuration);
    SystemClock.sleep(120);
    final int[] after = {0}, counterAfter = {0};
    onUi(() -> {
      after[0] = view("benchmark-scroll").getScrollY();
      counterAfter[0] = Integer.parseInt(((TextView)view("benchmark-count")).getText().toString().substring(5));
    });
    lastGesture.put("scrollAfterPx", after[0]).put("scrollAtReleasePx", released[0])
      .put("counterBefore", counterBefore[0]).put("counterAfter", counterAfter[0]);
    require(Math.abs(after[0] - released[0]) <= 2 * density,
      "Native scroll kept moving after the stationary hold: " + lastGesture);
    int moved = after[0] - before[0];
    require(Math.abs(moved) >= 24 * density && Math.signum(moved) == -Math.signum(dp), "Native drag did not scroll in the expected direction: " + lastGesture);
    require(counterBefore[0] == expectedCounter && counterAfter[0] == expectedCounter,
      "Popup child state changed during scroll");
    return lastGesture;
  }

  private long inject(int action, long downTime, float x, float y) throws Exception {
    if (action == MotionEvent.ACTION_DOWN) {
      final boolean[] foreground = {false};
      onUi(() -> foreground[0] = activity.hasWindowFocus());
      require(foreground[0], "Benchmark lost foreground focus");
    }
    long eventTime = SystemClock.uptimeMillis();
    pointerCoordinates[0].x = x; pointerCoordinates[0].y = y;
    pointerCoordinates[0].pressure = action == MotionEvent.ACTION_UP ? 0 : 1;
    MotionEvent event = MotionEvent.obtain(downTime, eventTime, action, 1, pointerProperties,
      pointerCoordinates, 0, 0, 1, 1, 0, 0, InputDevice.SOURCE_TOUCHSCREEN, 0);
    // Synchronous move dispatch cannot sustain the fixed cadence on this
    // platform. Down/up retain handling barriers; actual scrolling and OnDraw
    // assertions prove delivery instead of treating an async queue ACK as proof.
    try { require(automation.injectInputEvent(event, action != MotionEvent.ACTION_MOVE), "Native input injection failed"); }
    finally { event.recycle(); }
    return eventTime;
  }

  private float[] center(String id) {
    float[] point = new float[2];
    onUi(() -> {
      View target = view(id);
      require(target.isShown() && activity.hasWindowFocus(), "Touch target unavailable: " + id);
      RectF rect = bounds(target);
      require(rect.width() > 0 && rect.height() > 0, "Empty touch target: " + id);
      point[0] = rect.centerX(); point[1] = rect.centerY();
    });
    return point;
  }

  private void waitText(String id, String expected) {
    long deadline = SystemClock.uptimeMillis() + 30000;
    do {
      final boolean[] ready = {false};
      onUi(() -> {
        View target = find(activity.getWindow().getDecorView(), id);
        ready[0] = target instanceof TextView && expected.contentEquals(((TextView)target).getText());
      });
      if (ready[0]) return;
      SystemClock.sleep(50);
    } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError("Native text unavailable: " + id + "=" + expected);
  }

  private void verifyGeometry() throws Exception {
    final RectF[] anchor = {null}, popup = {null};
    final int[] scroll = {0};
    onUi(() -> {
      anchor[0] = bounds(view("benchmark-anchor")); popup[0] = bounds(view("benchmark-popup"));
      scroll[0] = view("benchmark-scroll").getScrollY();
    });
    lastGeometry = new JSONObject().put("anchorPx", new JSONArray(new float[] {
      anchor[0].left, anchor[0].top, anchor[0].right, anchor[0].bottom}))
      .put("popupPx", new JSONArray(new float[] {popup[0].left, popup[0].top, popup[0].right, popup[0].bottom}))
      .put("scrollOffsetPx", scroll[0]);
    require(Math.abs(anchor[0].left - popup[0].left) <= 2 * density &&
      Math.abs(anchor[0].bottom + 8 * density - popup[0].top) <= 2 * density,
      "Popup lost its simple bottom-start attachment: " + lastGeometry);
  }

  private static RectF bounds(View target) {
    Matrix matrix = new Matrix(); target.transformMatrixToGlobal(matrix);
    RectF rect = new RectF(0, 0, target.getWidth(), target.getHeight()); matrix.mapRect(rect);
    return rect;
  }

  private View view(String id) {
    View target = find(activity.getWindow().getDecorView(), id);
    require(target != null, "Native view unavailable: " + id); return target;
  }

  private View find(View root, String id) {
    if (id.equals(root.getTag(testIdKey))) return root;
    if (root instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)root).getChildCount(); index++) {
      View target = find(((ViewGroup)root).getChildAt(index), id); if (target != null) return target;
    }
    return null;
  }

  private long pssKb() { Debug.MemoryInfo memory = new Debug.MemoryInfo(); Debug.getMemoryInfo(memory); return memory.getTotalPss(); }

  private JSONObject cpu() throws Exception {
    final long[] uiNanos = {0};
    onUi(() -> uiNanos[0] = Debug.threadCpuTimeNanos());
    JSONObject value = new JSONObject().put("processMs", Process.getElapsedCpuTime()).put("uiThreadNs", uiNanos[0]);
    File[] tasks = new File("/proc/self/task").listFiles();
    require(tasks != null, "Own process threads unavailable");
    JSONArray js = new JSONArray();
    for (File task : tasks) {
      try {
        String name = new String(Files.readAllBytes(new File(task, "comm").toPath()), StandardCharsets.UTF_8).trim();
        // Pinned RN 0.88 runtime uses v_js; the legacy bridge uses js.
        if (!name.equals("mqt_v_js") && !name.equals("mqt_js")) continue;
        String stat = new String(Files.readAllBytes(new File(task, "stat").toPath()), StandardCharsets.UTF_8);
        String[] fields = stat.substring(stat.lastIndexOf(')') + 2).split("\\s+");
        js.put(new JSONObject().put("tid", task.getName()).put("name", name).put("ticks", Long.parseLong(fields[11]) + Long.parseLong(fields[12])));
      } catch (java.nio.file.NoSuchFileException ignored) { /* A non-JS worker can exit during the snapshot. */ }
    }
    value.put("jsThreads", js).put("clockTicksPerSecond", Os.sysconf(OsConstants._SC_CLK_TCK));
    return value;
  }

  /** Return native assertions to the instrumentation thread instead of crashing main. */
  private void onUi(Runnable action) {
    final Throwable[] failure = {null};
    runOnMainSync(() -> {
      try { action.run(); } catch (Throwable error) { failure[0] = error; }
    });
    if (failure[0] != null) throw new AssertionError("Native UI operation failed: " + failure[0], failure[0]);
  }

  private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
