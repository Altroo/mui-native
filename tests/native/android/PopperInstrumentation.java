/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package dev.altroo.muinative.catalog.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Matrix;
import android.view.View;
import android.view.ViewGroup;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.concurrent.TimeoutException;

/** Real native touch and geometry checks; this is not a release-performance benchmark. */
public final class PopperInstrumentation extends Instrumentation {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private final JSONArray steps = new JSONArray();
  private final JSONArray screenshots = new JSONArray();
  private final JSONArray milestones = new JSONArray();
  private UiAutomation automation;
  private Activity activity;
  private File directory;
  private String relativeDirectory;

  @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }

  @Override public void onStart() {
    JSONObject report = new JSONObject();
    Bundle result = new Bundle();
    boolean passed = false;
    try {
      // Keep enabled accessibility services intact. These checks do not certify
      // screen-reader behavior and must not change the device's service settings.
      automation = getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      AccessibilityServiceInfo service = automation.getServiceInfo();
      service.flags |= AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS | AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
      automation.setServiceInfo(service);
      relativeDirectory = "popper-checks/run-" + System.currentTimeMillis();
      directory = new File(getTargetContext().getCacheDir(), relativeDirectory);
      require(directory.mkdirs(), "Could not create the test artifact directory");
      Intent launch = getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch != null, "Catalog launch activity is missing");
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = startActivitySync(launch);
      AccessibilityNodeInfo overlaysTab = waitFor("catalog-tab-Overlays", 35000);
      verifyManagerOperations();
      tap(overlaysTab);
      tap(waitFor("delivery-trigger", 10000));
      waitFor("delivery-note", 10000);
      verify("window-popup", false, false, false);
      exerciseScrolling("window", false);
      confirm(1);
      toggle("Render inline");
      verify("inline-popup", true, false, false);
      exerciseScrolling("inline", true);
      confirm(2);
      toggle("Transform the frame");
      verify("transformed-inline-popup", true, true, false);
      confirm(3);
      toggle("Keep inside the frame");
      verify("bounded-transformed-popup", true, true, true);
      // Include both directions: the reported Fabric crash was on reset.
      for (int cycle = 0; cycle < 2; cycle++) {
        toggle("Transform the frame"); verify("repeat-" + cycle + "-reset", true, false, true);
        toggle("Transform the frame"); verify("repeat-" + cycle + "-transformed", true, true, true);
      }
      toggle("Transform the frame");
      verify("reset-inline-popup", true, false, true);
      toggle("Render inline");
      toggle("Transform the frame");
      confirm(4);
      verify("transformed-window-popup", false, true, true);
      toggle("Transform the frame");
      verify("reset-window-popup", false, false, true);
      tap(waitFor("delivery-trigger", 10000));
      waitForUnmount();
      milestones.put("closed-popup");
      capture("closed-popup");
      for (int cycle = 0; cycle < 3; cycle++) {
        tap(waitFor("delivery-trigger", 10000));
        verify("repeat-open-" + cycle, false, false, true);
        tap(waitFor("delivery-trigger", 10000));
        waitForUnmount();
        milestones.put("repeat-close-" + cycle);
      }
      passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString()); capture("failure"); } catch (Throwable ignored) { }
    } finally {
      try {
        report.put("schemaVersion", 1).put("scenario", "popper-window-inline-scroll-transform-v2").put("package", PACKAGE).put("status", passed ? "passed" : "failed")
          .put("steps", steps).put("milestones", milestones).put("screenshots", screenshots).put("directory", relativeDirectory == null ? JSONObject.NULL : relativeDirectory)
          .put("sdk", android.os.Build.VERSION.SDK_INT).put("model", android.os.Build.MODEL);
        if (directory != null) try (FileOutputStream stream = new FileOutputStream(new File(directory, "report.json"))) {
          stream.write(report.toString(2).getBytes(StandardCharsets.UTF_8));
        }
        result.putString("report", report.toString());
      } catch (Throwable error) { passed = false; result.putString("error", error.toString()); }
      finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }

  private void waitForUnmount() {
    // Read on the UI thread, but report failures on the instrumentation thread.
    // Throwing in runOnMainSync would crash the catalog instead of recording evidence.
    final boolean[] mounted = {true};
    long deadline = SystemClock.uptimeMillis() + 10000;
    do {
      runOnMainSync(() -> mounted[0] = nativeView(activity.getWindow().getDecorView(), "delivery-note") != null);
      if (!mounted[0] && find("delivery-note") == null) return;
      SystemClock.sleep(100);
    } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError("Closed popup remains mounted or accessible");
  }

  private int scrollOffset() {
    final int[] offset = {-1};
    runOnMainSync(() -> {
      View scroll = nativeView(activity.getWindow().getDecorView(), "delivery-scroll");
      if (scroll != null) offset[0] = scroll.getScrollY();
    });
    require(offset[0] >= 0, "Native delivery scroll view is missing");
    return offset[0];
  }

  private void dragScroll(int distanceDp) throws Exception {
    AccessibilityNodeInfo scroll = waitFor("delivery-scroll", 10000);
    require(PACKAGE.equals(String.valueOf(scroll.getPackageName())), "Scroll target left the catalog");
    Rect bounds = new Rect(); scroll.getBoundsInScreen(bounds);
    float density = getTargetContext().getResources().getDisplayMetrics().density;
    float distance = Math.min(Math.abs(distanceDp)*density, bounds.height()-40*density);
    require(distance > 0 && bounds.width() > 40*density, "Scroll viewport is too small");
    float x = bounds.right-18*density;
    float start = distanceDp > 0 ? bounds.bottom-20*density : bounds.top+20*density;
    float end = start + (distanceDp > 0 ? -distance : distance);
    AccessibilityNodeInfo foreground = automation.getRootInActiveWindow();
    require(foreground != null && PACKAGE.equals(String.valueOf(foreground.getPackageName())), "Catalog is no longer foreground");
    int before = scrollOffset();
    long down = SystemClock.uptimeMillis();
    // Use the empty right gutter, outside the popup, and stop before releasing
    // so this checks anchor tracking without relying on a fling's device speed.
    for (int step = 0; step <= 13; step++) {
      int action = step == 0 ? MotionEvent.ACTION_DOWN : step == 13 ? MotionEvent.ACTION_UP : MotionEvent.ACTION_MOVE;
      float y = start + (end-start)*Math.min(step,10)/10;
      MotionEvent event = MotionEvent.obtain(down, SystemClock.uptimeMillis(), action, x, y, 0);
      event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event,true), "Native scroll injection failed"); }
      finally { event.recycle(); }
      SystemClock.sleep(35);
    }
    int previous = scrollOffset(), stable = 0;
    long deadline = SystemClock.uptimeMillis()+5000;
    do {
      SystemClock.sleep(100); int current = scrollOffset();
      stable = current == previous ? stable+1 : 0; previous = current;
    } while (stable < 3 && SystemClock.uptimeMillis() < deadline);
    require(stable == 3, "Native scroll did not settle");
    steps.put("scroll:" + before + ":" + previous);
  }

  private void exerciseScrolling(String mode, boolean inline) throws Exception {
    float density = getTargetContext().getResources().getDisplayMetrics().density;
    require(scrollOffset() <= density, "Scrolling scenario must start at the top");
    dragScroll(48);
    require(scrollOffset() >= 24*density, "Native gesture did not move the inner scroll view");
    verify("scrolled-" + mode + "-popup", inline, false, false);
    dragScroll(-180);
    require(scrollOffset() <= density, "Reverse native scroll did not restore the top");
    verify("returned-" + mode + "-popup", inline, false, false);
    dragScroll(240);
    final Throwable[] failure = {null};
    runOnMainSync(() -> {
      try {
        View root = activity.getWindow().getDecorView();
        View trigger = nativeView(root,"delivery-trigger"), popup = nativeView(root,"delivery-note"), scroll = nativeView(root,"delivery-scroll"), title = nativeView(root,"delivery-note-title");
        require(trigger != null && popup != null && scroll instanceof ViewGroup && title != null, "Clipping fixture views are missing");
        Rect viewport = new Rect(); require(scroll.getGlobalVisibleRect(viewport), "Scroll viewport is not visible");
        RectF anchor = rectangle(trigger,new Matrix());
        require(anchor.bottom <= viewport.top+2*density, "Anchor did not leave the physical scroll clip: " + anchor + " / " + viewport);
        require(descendant(popup,scroll) == inline, "Scroll changed inline/window physical ownership");
        Rect visible = new Rect(); boolean shown = popup.getGlobalVisibleRect(visible);
        if (inline) {
          RectF titleRect = rectangle(title,new Matrix());
          require(titleRect.bottom < viewport.top, "Inline title must be wholly outside the scroll clip");
          Matrix scrollGlobal = new Matrix(), inverse = new Matrix(); scroll.transformMatrixToGlobal(scrollGlobal);
          require(scrollGlobal.invert(inverse), "Scroll transform is singular");
          float[] point = {titleRect.centerX(),titleRect.centerY()}; inverse.mapPoints(point);
          int[] nativeTarget = {0};
          // RN clips overflow in its canvas while leaving clipChildren false.
          // getGlobalVisibleRect is not a pixel-clip oracle. Check the actual RN
          // touch path at the clipped title and retain screenshots for visual review.
          com.facebook.react.uimanager.TouchTargetHelper.findTargetTagAndCoordinatesForTouch(
            point[0],point[1],(ViewGroup)scroll,new float[2],nativeTarget);
          View target = nativeTarget[0] == 0 ? null : root.findViewById(nativeTarget[0]);
          require(target == null || (target != popup && !descendant(target,popup)),
            "Clipped inline content remains in the native scroll touch path");
        }
        if (!inline) require(shown && popup.getAlpha() > 0 && verifyChildBridge(root,popup,root) > 0,
          "Window popup lost its attached overlay when its anchor was clipped");
      } catch (Throwable error) { failure[0] = error; }
    });
    if (failure[0] != null) throw new AssertionError("Clipped " + mode + " anchor check failed: " + failure[0],failure[0]);
    milestones.put("clipped-" + mode + "-anchor"); capture("clipped-" + mode + "-anchor");
    dragScroll(-300);
    require(scrollOffset() <= density, "Clipped anchor did not return to the scroll viewport");
    verify("restored-" + mode + "-popup", inline, false, false);
  }

  private AccessibilityNodeInfo find(String identifier) {
    AccessibilityNodeInfo root = automation.getRootInActiveWindow();
    if (root == null || !PACKAGE.equals(String.valueOf(root.getPackageName()))) return null;
    ArrayDeque<AccessibilityNodeInfo> nodes = new ArrayDeque<>(); nodes.add(root);
    int examined = 0;
    while (!nodes.isEmpty() && examined++ < 5000) {
      AccessibilityNodeInfo node = nodes.remove();
      if (identifier.equals(node.getViewIdResourceName()) || identifier.contentEquals(node.getText() == null ? "" : node.getText()) ||
          identifier.contentEquals(node.getContentDescription() == null ? "" : node.getContentDescription())) return node;
      for (int index = 0; index < node.getChildCount(); index++) {
        AccessibilityNodeInfo child = node.getChild(index); if (child != null) nodes.add(child);
      }
    }
    return null;
  }

  private AccessibilityNodeInfo waitFor(String identifier, long timeout) {
    long deadline = SystemClock.uptimeMillis() + timeout;
    do {
      AccessibilityNodeInfo node = find(identifier);
      if (node != null && node.isVisibleToUser()) return node;
      SystemClock.sleep(100);
    } while (SystemClock.uptimeMillis() < deadline);
    throw new AssertionError("Native element unavailable: " + identifier);
  }

  private void tap(AccessibilityNodeInfo node) throws Exception {
    // Injection can target any app. Guard package and current bounds before
    // every touch so a system dialog or unrelated foreground app is not tapped.
    require(PACKAGE.equals(String.valueOf(node.getPackageName())) && node.isVisibleToUser(), "Touch target left the catalog");
    Rect bounds = new Rect(); node.getBoundsInScreen(bounds);
    require(!bounds.isEmpty(), "Touch target has empty bounds");
    AccessibilityNodeInfo current = automation.getRootInActiveWindow();
    require(current != null && PACKAGE.equals(String.valueOf(current.getPackageName())), "Catalog is no longer foreground");
    long downTime = SystemClock.uptimeMillis();
    for (int action : new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      MotionEvent event = MotionEvent.obtain(downTime, SystemClock.uptimeMillis(), action, bounds.exactCenterX(), bounds.exactCenterY(), 0);
      event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); }
      finally { event.recycle(); }
    }
    try { automation.waitForIdle(150, 2000); } catch (TimeoutException ignored) {
      // An active animation need not become globally idle. Each following
      // assertion still waits for its own observable native state.
    }
    steps.put("tap:" + (node.getViewIdResourceName() == null ? node.getText() : node.getViewIdResourceName()));
  }

  private void toggle(String label) throws Exception {
    String id = label.equals("Render inline") ? "popper-inline-toggle" :
      label.equals("Transform the frame") ? "popper-transform-toggle" : "popper-boundary-toggle";
    AccessibilityNodeInfo control = waitFor(id, 10000);
    require(control.isCheckable(), "Switch does not expose a native checked state: " + id);
    boolean before = control.isChecked();
    tap(control);
    long deadline = SystemClock.uptimeMillis() + 10000;
    AccessibilityNodeInfo changed;
    do {
      changed = find(id);
      if (changed != null && changed.isChecked() != before) break;
      SystemClock.sleep(100);
    } while (SystemClock.uptimeMillis() < deadline);
    require(changed != null && changed.isChecked() != before, "Switch did not update: " + id);
    waitFor("delivery-note", 10000);
    steps.put("toggle:" + id + ":" + !before);
  }
  private void confirm(int count) throws Exception {
    tap(waitFor("Mark as read", 10000)); waitFor("Read confirmations: " + count, 10000);
    milestones.put("confirm-" + count);
  }
  private View nativeView(View root, String id) {
    if (id.equals(root.getTag(com.facebook.react.R.id.react_test_id))) return root;
    if (root instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)root).getChildCount(); index++) {
      View found = nativeView(((ViewGroup)root).getChildAt(index), id);
      if (found != null) return found;
    }
    return null;
  }
  private static boolean descendant(View child, View ancestor) {
    for (android.view.ViewParent parent = child.getParent(); parent != null; parent = parent.getParent())
      if (parent == ancestor) return true;
    return false;
  }
  private static RectF rectangle(View view, Matrix coordinateSpace) {
    Matrix global = new Matrix(); view.transformMatrixToGlobal(global);
    Matrix mapped = new Matrix(); mapped.setConcat(coordinateSpace, global);
    RectF result = new RectF(0, 0, view.getWidth(), view.getHeight()); mapped.mapRect(result);
    return result;
  }
  private void verify(String stage, boolean inline, boolean transformed, boolean bounded) throws Exception {
    waitFor("delivery-note", 10000);
    long deadline = SystemClock.uptimeMillis() + 5000;
    AssertionError last = null;
    do {
      final AssertionError[] error = {null};
      runOnMainSync(() -> {
        try { verifyGeometry(inline, transformed, bounded); }
        catch (AssertionError failure) { error[0] = failure; }
      });
      last = error[0];
      if (last == null) break;
      SystemClock.sleep(100);
    } while (SystemClock.uptimeMillis() < deadline);
    if (last != null) throw new AssertionError(stage + ": " + last.getMessage(), last);
    milestones.put(stage);
    if (stage.equals("window-popup")) milestones.put("react-physical-child-bridge");
    if (!stage.startsWith("repeat-")) capture(stage);
  }
  private void verifyManagerOperations() {
    final Throwable[] failure = {null};
    runOnMainSync(() -> {
      try {
        View tab = nativeView(activity.getWindow().getDecorView(), "catalog-tab-Overlays");
        require(tab != null && tab.getContext() instanceof com.facebook.react.uimanager.ThemedReactContext,
          "Native React context is unavailable for the child-manager regression");
        com.altroo.muinativehost.AltrooMUIPortalHost host = new com.altroo.muinativehost.AltrooMUIPortalHost(
          (com.facebook.react.uimanager.ThemedReactContext)tab.getContext());
        com.facebook.react.uimanager.ViewGroupManager<com.altroo.muinativehost.AltrooMUIPortalHost> manager =
          new com.altroo.muinativehost.AltrooMUIPortalHostManager();
        View first = new View(tab.getContext()), second = new View(tab.getContext()), inserted = new View(tab.getContext());
        try {
          manager.addView(host,first,0); manager.addView(host,second,1);
          manager.addViews(host,java.util.Arrays.asList(inserted));
          require(host.getChildCount() == 0 && manager.getChildCount(host) == 3,
            "Framework and React child counts are conflated");
          require(manager.getChildAt(host,0) == inserted && manager.getChildAt(host,1) == first && manager.getChildAt(host,2) == second,
            "Batched React insertion changed child order");
          // Fabric can remove directly from the real parent during reparenting.
          ((ViewGroup)first.getParent()).removeView(first);
          require(manager.getChildCount(host) == 2 && manager.getChildAt(host,1) == second,
            "React child getters retain a stale cached list");
          manager.removeView(host,second);
          require(manager.getChildCount(host) == 1 && manager.getChildAt(host,0) == inserted,
            "Inherited manager removal bypassed logical children");
          manager.removeAllViews(host);
          require(manager.getChildCount(host) == 0 && inserted.getParent() == null,
            "Inherited removeAllViews retained portal children");
          manager.addView(host,first,0); manager.removeViewAt(host,0);
          require(manager.getChildCount(host) == 0 && first.getParent() == null,
            "React re-add/remove lost the physical parent");
        } finally { manager.removeAllViews(host); host.dispose(); }
      } catch (Throwable error) { failure[0] = error; }
    });
    if (failure[0] != null) throw new AssertionError("Native child-manager contract failed",failure[0]);
    milestones.put("react-manager-operations");
  }
  private int verifyChildBridge(View view, View popup, View decor) {
    int owners = 0;
    if (view instanceof com.altroo.muinativehost.AltrooMUIPortalHost) {
      com.altroo.muinativehost.AltrooMUIPortalHost host = (com.altroo.muinativehost.AltrooMUIPortalHost)view;
      com.altroo.muinativehost.AltrooMUIPortalHostManager manager = new com.altroo.muinativehost.AltrooMUIPortalHostManager();
      require(host.getChildCount() == 0, "Logical host exposes nonphysical Android children");
      int count = manager.getChildCount(host);
      for (int index = 0; index < count; index++) {
        View child = manager.getChildAt(host,index);
        require(child != null && child.getParent() != host && child.getParent() instanceof ViewGroup,
          "React child manager lost its physical overlay parent");
        if (host.getActive() && !host.getObservationOnly() && child.isAttachedToWindow() &&
            (child == popup || descendant(popup,child)) && descendant(child,decor)) owners++;
      }
    }
    if (view instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)view).getChildCount(); index++)
      owners += verifyChildBridge(((ViewGroup)view).getChildAt(index),popup,decor);
    return owners;
  }
  private void verifyGeometry(boolean inline, boolean transformed, boolean bounded) {
    // Read actual Views on the UI thread. Accessibility rectangles are already
    // clipped, so they cannot prove that a popup fits inside its boundary.
    View root = activity.getWindow().getDecorView();
    View popup = nativeView(root, "delivery-note"), trigger = nativeView(root, "delivery-trigger"), frame = nativeView(root, "delivery-frame");
    require(popup != null && trigger != null && frame != null, "Native fixture views are missing");
    int owners = verifyChildBridge(root,popup,root);
    require(inline || owners > 0, "Window popup has no matching active, physically attached React child owner");
    require(descendant(popup, frame) == inline, "Physical inline/window ancestry is wrong");
    float[] transform = new float[9]; frame.getMatrix().getValues(transform);
    double angle = transformed ? Math.toRadians(6) : 0, scale = transformed ? .92 : 1;
    require(Math.abs(transform[Matrix.MSCALE_X]-scale*Math.cos(angle)) < .002 &&
      Math.abs(transform[Matrix.MSKEW_Y]-scale*Math.sin(angle)) < .002 &&
      Math.abs(transform[Matrix.MSKEW_X]+scale*Math.sin(angle)) < .002 &&
      Math.abs(transform[Matrix.MSCALE_Y]-scale*Math.cos(angle)) < .002, "Native frame transform/reset is wrong");
    Matrix coordinates = new Matrix();
    if (inline) {
      Matrix frameGlobal = new Matrix(); frame.transformMatrixToGlobal(frameGlobal);
      require(frameGlobal.invert(coordinates), "Frame conversion is singular");
    }
    RectF popupRect = rectangle(popup, coordinates), anchorRect = rectangle(trigger, coordinates);
    float density = getTargetContext().getResources().getDisplayMetrics().density, tolerance = 4*density;
    float gap = Math.min(Math.abs(popupRect.top-anchorRect.bottom-10*density), Math.abs(anchorRect.top-popupRect.bottom-10*density));
    float aligned = Math.min(Math.abs(popupRect.left-anchorRect.left), Math.abs(popupRect.right-anchorRect.right));
    require(popupRect.width() > 200*density && gap < tolerance && aligned < tolerance,
      "Native horizontal/vertical attachment is wrong: " + popupRect + " / " + anchorRect);
    Matrix popupGlobal = new Matrix(), frameGlobal = new Matrix();
    popup.transformMatrixToGlobal(popupGlobal); frame.transformMatrixToGlobal(frameGlobal);
    float[] actual = new float[9], expected = new float[9]; popupGlobal.getValues(actual);
    (inline ? frameGlobal : new Matrix()).getValues(expected);
    for (int index : new int[] {Matrix.MSCALE_X, Matrix.MSKEW_Y, Matrix.MSKEW_X, Matrix.MSCALE_Y})
      require(Math.abs(actual[index]-expected[index]) < .002, "Popup inherited the wrong physical transform");
    if (bounded) {
      // The fixture explicitly declares a 2dp border. Its CSS padding box
      // includes padding and excludes only that border, independently of the adapter.
      RectF boundary = new RectF(2*density,2*density,frame.getWidth()-2*density,frame.getHeight()-2*density);
      if (!inline) frameGlobal.mapRect(boundary);
      require(popupRect.left >= boundary.left-tolerance && popupRect.top >= boundary.top-tolerance &&
        popupRect.right <= boundary.right+tolerance && popupRect.bottom <= boundary.bottom+tolerance,
        "Unclipped native popup exceeds its explicit boundary: " + popupRect + " / " + boundary);
    }
  }
  private void capture(String name) throws Exception {
    if (automation == null || directory == null) return;
    AccessibilityNodeInfo root = automation.getRootInActiveWindow();
    if (root == null || !PACKAGE.equals(String.valueOf(root.getPackageName()))) return;
    Bitmap bitmap = automation.takeScreenshot(); require(bitmap != null, "Screenshot unavailable");
    try (FileOutputStream stream = new FileOutputStream(new File(directory, name + ".png"))) {
      require(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream), "Screenshot compression failed");
    } finally { bitmap.recycle(); }
    screenshots.put(name + ".png");
  }
  private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
