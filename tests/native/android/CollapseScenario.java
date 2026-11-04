/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
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
import android.widget.HorizontalScrollView;
import android.widget.TextView;
import com.facebook.react.views.view.ReactViewGroup;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/** Observe actual clipped native bounds; a React completion label alone is insufficient. */
public final class CollapseScenario {
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray stages = new JSONArray(), pictures = new JSONArray(), samples = new JSONArray();
  private CollapseScenario(Instrumentation driver) { this.driver = driver; }
  public static void run(Instrumentation driver) { new CollapseScenario(driver).run(); }
  private void run() {
    Bundle result = new Bundle(); JSONObject report = new JSONObject(); boolean passed = false;
    try {
      directory = new File(driver.getTargetContext().getCacheDir(), "mui-collapse-" + System.currentTimeMillis());
      require(directory.mkdir(), "Preserve previous native evidence");
      report.put("schemaVersion", 1).put("scenario", "collapse-v1").put("driver", "native Instrumentation and UiAutomation")
        .put("artifactDirectory", "cache/" + directory.getName()).put("device", new JSONObject().put("sdk", Build.VERSION.SDK_INT).put("model", Build.MODEL));
      automation = driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch = driver.getTargetContext().getPackageManager().getLaunchIntentForPackage("dev.altroo.muinative.catalog");
      require(launch != null, "Catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity = driver.startActivitySync(launch);
      tagId = driver.getTargetContext().getResources().getIdentifier("react_test_id", "id", "dev.altroo.muinative.catalog");
      await(() -> ui(() -> find("catalog-tabs") instanceof HorizontalScrollView && view("catalog-tabs").getWidth() > 0 && ((HorizontalScrollView)view("catalog-tabs")).getChildCount() > 0 && ((HorizontalScrollView)view("catalog-tabs")).getChildAt(0).getWidth() > 0), "Catalog tabs did not finish layout");
      ui(() -> { HorizontalScrollView tabs = (HorizontalScrollView)view("catalog-tabs"); tabs.scrollTo(tabs.getChildAt(0).getWidth(), 0); return null; });
      await(() -> ui(() -> { View tab=view("catalog-tab-Transitions"); Rect visible=new Rect(); return tab.getGlobalVisibleRect(visible) && visible.width()==tab.getWidth(); }), "Transitions tab must be fully visible after scrolling");
      driver.waitForIdleSync();
      tap("catalog-tab-Transitions");
      await(() -> ui(() -> find("collapse-vertical-root") != null && find("collapse-horizontal-root") != null), "Transitions scene did not replace its predecessor");
      stage("scene-ready");
      await(() -> ui(() -> height("collapse-vertical-wrapper") > 0 && height("collapse-vertical-root") == 0), "Closed content must retain natural measurement outside a zero-height root");
      record("vertical-closed", "vertical"); stage("vertical-measured"); capture("closed.png");
      tap("collapse-vertical-toggle");
      await(() -> recordIntermediate("vertical-intermediate", "vertical"), "Vertical transition must produce an intermediate native height"); stage("vertical-entering");
      await(() -> expanded("vertical") && ui(() -> text("collapse-phase").equals("Expanded")), "Vertical completion must restore natural native height");
      record("vertical-entered", "vertical"); stage("vertical-entered");
      int originalHeight = ui(() -> height("collapse-vertical-root"));
      tap("collapse-add-note");
      await(() -> ui(() -> text("collapse-note-count").equals("Delivery notes: 1") && height("collapse-vertical-root") > originalHeight) && expanded("vertical"), "Expanded content must grow without a new collapse cycle");
      record("content-grown", "vertical"); stage("content-grown"); capture("expanded.png");
      tap("collapse-vertical-toggle");
      await(() -> ui(() -> height("collapse-vertical-root") == 0 && text("collapse-phase").equals("Collapsed")), "Closing must reach its actual zero-height endpoint");
      stage("vertical-exited");
      tap("collapse-vertical-toggle");
      await(() -> expanded("vertical") && ui(() -> text("collapse-note-count").equals("Delivery notes: 1") && text("collapse-phase").equals("Expanded")), "Reopening must retain the edited content tree");
      stage("retained-edit");
      tap("collapse-slow");
      await(() -> ui(() -> view("collapse-slow").createAccessibilityNodeInfo().isChecked()), "Slow preview must receive its native touch");
      stage("slow-preview");
      String beforeReverse = ui(() -> text("collapse-receipts"));
      tap("collapse-vertical-toggle"); await(() -> recordIntermediate("vertical-exit-intermediate", "vertical"), "Exit must begin before reversing");
      tap("collapse-vertical-toggle");
      await(() -> expanded("vertical") && ui(() -> text("collapse-phase").equals("Expanded")), "Interrupted exit must return to natural size");
      require(ui(() -> text("collapse-receipts").endsWith("Exited 1")), "Retired exit cannot report completion after reversal: " + beforeReverse);
      stage("interrupted-exit");
      tap("collapse-horizontal-toggle");
      await(() -> recordIntermediate("horizontal-intermediate", "horizontal"), "Horizontal transition must produce an intermediate native width"); stage("horizontal-entering");
      await(() -> expanded("horizontal") && ui(() -> text("collapse-horizontal-phase").equals("Horizontal: Expanded")), "Horizontal completion must restore natural width and deliver its receipt");
      record("horizontal-entered", "horizontal"); stage("horizontal-entered"); capture("horizontal.png");
      tap("collapse-horizontal-toggle"); await(() -> ui(() -> view("collapse-horizontal-root").getWidth() == 0 && text("collapse-horizontal-phase").equals("Horizontal: Collapsed")), "Horizontal exit must reach zero width and deliver its receipt"); stage("horizontal-exited");
      tap("collapse-reduced");
      await(() -> ui(() -> view("collapse-reduced").createAccessibilityNodeInfo().isChecked()), "The reduced-motion switch must receive its touch");
      tap("collapse-vertical-toggle");
      await(() -> ui(() -> height("collapse-vertical-root") == 0 && text("collapse-phase").equals("Collapsed")), "Reduced motion must still deliver the terminal layout and callback");
      stage("reduced-motion"); capture("reduced.png"); passed = true;
    } catch (Throwable error) {
      try { report.put("error", error.toString()); if (directory != null) capture("failure.png"); } catch (Throwable ignored) { /* Preserve the first assertion. */ }
    } finally {
      try { report.put("status", passed ? "passed" : "failed").put("stages", stages).put("screenshots", pictures).put("samples", samples); result.putString("collapseReport", report.toString()); }
      catch (Exception error) { result.putString("Error", error.toString()); passed = false; }
      driver.finish(passed ? Activity.RESULT_OK : Activity.RESULT_CANCELED, result);
    }
  }
  private int height(String id) { return view(id).getHeight(); }
  private String text(String id) { return ((TextView)view(id)).getText().toString(); }
  private boolean expanded(String axis) { return ui(() -> { View root = view("collapse-"+axis+"-root"), wrapper = view("collapse-"+axis+"-wrapper"); int actual = axis.equals("vertical") ? root.getHeight() : root.getWidth(), natural = axis.equals("vertical") ? wrapper.getHeight() : wrapper.getWidth(); return natural > 0 && Math.abs(actual-natural) <= 2 && root instanceof ReactViewGroup && "visible".equals(((ReactViewGroup)root).getOverflow()); }); }
  private JSONObject sample(String name, String axis) { return ui(() -> { View root = view("collapse-"+axis+"-root"), wrapper = view("collapse-"+axis+"-wrapper"); return new JSONObject().put("name",name).put("axis",axis).put("overflow",root instanceof ReactViewGroup ? ((ReactViewGroup)root).getOverflow() : "unknown").put("actual",axis.equals("vertical")?root.getHeight():root.getWidth()).put("natural",axis.equals("vertical")?wrapper.getHeight():wrapper.getWidth()).put("cross",axis.equals("vertical")?root.getWidth():root.getHeight()); }); }
  private void record(String name, String axis) { samples.put(sample(name, axis)); }
  // Capture the assertion and bounds in the same UI turn, before another frame.
  private boolean recordIntermediate(String name, String axis) { JSONObject value=sample(name,axis); int actual=value.optInt("actual"), natural=value.optInt("natural"); if(actual<=0 || actual>=natural-2)return false; samples.put(value); return true; }
  private void stage(String name) { stages.put(name); }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View node = find(id); require(node != null, "Missing native view " + id); return node; }
  private View search(View root, String id) { if (id.equals(root.getTag(tagId))) return root; if (root instanceof ViewGroup) for (int index=0; index<((ViewGroup)root).getChildCount(); index++) { View child=search(((ViewGroup)root).getChildAt(index),id); if(child!=null)return child; } return null; }
  private void tap(String id) throws Exception {
    await(() -> ui(() -> find(id)!=null && view(id).isShown() && view(id).getWidth()>0), "Native touch target did not lay out: " + id);
    ui(() -> { View target=view(id); target.requestRectangleOnScreen(new Rect(0,0,target.getWidth(),target.getHeight()),true); return null; });
    float[] point=ui(() -> { View target=view(id); Rect visible=new Rect(); int[] origin=new int[2]; require(target.getLocalVisibleRect(visible)&&!visible.isEmpty(),"Native touch target is covered"); target.getLocationOnScreen(origin); return new float[]{origin[0]+visible.exactCenterX(),origin[1]+visible.exactCenterY()}; });
    long time=SystemClock.uptimeMillis();
    for(int action:new int[]{MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP}) { MotionEvent event=MotionEvent.obtain(time,SystemClock.uptimeMillis(),action,point[0],point[1],0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN); try { require(automation.injectInputEvent(event,true),"Native touch injection failed"); } finally { event.recycle(); } SystemClock.sleep(30); }
  }
  private void capture(String name) throws Exception {
    CountDownLatch committed=new CountDownLatch(1); ui(() -> { View root=activity.getWindow().getDecorView(); root.getViewTreeObserver().registerFrameCommitCallback(committed::countDown); root.invalidate(); return null; });
    require(committed.await(5,TimeUnit.SECONDS),"Native screenshot frame did not commit");
    AccessibilityNodeInfo root=automation.getRootInActiveWindow(); require(root!=null&&"dev.altroo.muinative.catalog".contentEquals(root.getPackageName()),"Catalog must own the screenshot window");
    Bitmap image=automation.takeScreenshot(); require(image!=null,"Native screenshot missing");
    try(FileOutputStream output=new FileOutputStream(new File(directory,name))) { require(image.compress(Bitmap.CompressFormat.PNG,100,output),"Native screenshot encoding failed"); } finally { image.recycle(); } pictures.put(name);
  }
  private void await(java.util.function.BooleanSupplier condition,String message) throws Exception { long end=SystemClock.uptimeMillis()+35000; while(SystemClock.uptimeMillis()<end) { if(condition.getAsBoolean())return; SystemClock.sleep(16); } throw new AssertionError(message); }
  private <T>T ui(java.util.concurrent.Callable<T> action) { AtomicReference<T> result=new AtomicReference<>(); AtomicReference<Throwable> error=new AtomicReference<>(); driver.runOnMainSync(() -> { try { result.set(action.call()); } catch(Throwable failure) { error.set(failure); } }); if(error.get()!=null)throw new AssertionError(error.get()); return result.get(); }
  private static void require(boolean value,String message) { if(!value)throw new AssertionError(message); }
}
