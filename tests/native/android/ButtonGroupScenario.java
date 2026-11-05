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
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

/** Real grouped layout, local action state and ref events on the installed native backend. */
public final class ButtonGroupScenario {
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray stages=new JSONArray(), pictures=new JSONArray(), samples=new JSONArray();
  private ButtonGroupScenario(Instrumentation driver) {this.driver=driver;}
  public static void run(Instrumentation driver) {new ButtonGroupScenario(driver).run();}
  private void run() {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); boolean passed=false;
    try {
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-button-group-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve existing native evidence");
      report.put("schemaVersion",1).put("scenario","button-group-v1").put("driver","native Instrumentation and UiAutomation")
        .put("artifactDirectory","cache/"+directory.getName()).put("device",new JSONObject().put("sdk",Build.VERSION.SDK_INT).put("model",Build.MODEL));
      automation=driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch=driver.getTargetContext().getPackageManager().getLaunchIntentForPackage("dev.altroo.muinative.catalog");
      require(launch!=null,"Catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity=driver.startActivitySync(launch);
      tagId=driver.getTargetContext().getResources().getIdentifier("react_test_id","id","dev.altroo.muinative.catalog");
      await(()->ui(()->find("catalog-tabs") instanceof HorizontalScrollView && ((HorizontalScrollView)view("catalog-tabs")).getChildCount()>0&&((HorizontalScrollView)view("catalog-tabs")).getChildAt(0).getWidth()>0),"Catalog tabs must finish layout");
      ui(()->{HorizontalScrollView tabs=(HorizontalScrollView)view("catalog-tabs");tabs.scrollTo(tabs.getChildAt(0).getWidth(),0);return null;});
      await(()->ui(()->{View tab=find("catalog-tab-Groups");Rect visible=new Rect();return tab!=null&&tab.getGlobalVisibleRect(visible)&&visible.width()==tab.getWidth();}),"Groups tab must be fully visible");
      tap("catalog-tab-Groups");
      await(()->ui(()->find("document-actions")!=null&&view("document-actions").getWidth()>0),"Group scene must lay out");
      stage("scene-ready");
      geometry("horizontal",new String[]{"document-content","document-actions","group-save","group-preview","group-send"});
      await(()->ui(()->text("group-ref-receipt").startsWith("Measured ")),"Actual group ref must measure");
      stage("horizontal-layout");capture("horizontal.png");
      tap("group-save");await(()->ui(()->text("group-save").equals("Save 1")),"Wrapped save must activate exactly once");stage("wrapped-action");
      tap("group-vertical");await(()->ui(()->view("document-actions").getHeight()>view("group-save").getHeight()*2.5),"Orientation must update native bounds");
      geometry("vertical",new String[]{"document-content","document-actions","group-save","group-preview","group-send"});
      require(ui(()->text("group-save").equals("Save 1")),"Orientation must preserve wrapped state");stage("vertical-layout");capture("vertical.png");
      tap("group-toggle-disabled");await(()->ui(()->text("group-status").startsWith("Actions paused")),"Group pause must commit");
      tap("group-save");tap("group-toggle-disabled");await(()->ui(()->text("group-status").startsWith("Draft ready")),"Group resume must commit");
      require(ui(()->text("group-save").equals("Save 1")),"Inherited disabled class must block a child with disabled=false");stage("disabled-pointer");
      tap("group-send");await(()->ui(()->text("group-status").startsWith("Preparing delivery")),"Send must enter loading");
      tap("group-complete");await(()->ui(()->text("group-status").endsWith("sent 1")),"Completion must commit once");stage("loading-cycle");
      tap("group-toggle-preview");await(()->ui(()->find("group-preview")==null),"Dynamic child must unmount");
      tap("group-horizontal");await(()->ui(()->view("document-actions").getHeight()<view("group-save").getHeight()*1.5),"Compact layout must return to a row");
      geometry("compact",new String[]{"document-content","document-actions","group-save","group-send"});
      require(ui(()->text("group-save").equals("Save 1")),"Child removal must preserve first action state");stage("dynamic-children");capture("compact.png");passed=true;
    } catch(Throwable error) {
      try {report.put("error",error.toString());if(directory!=null)capture("failure.png");} catch(Throwable ignored) { /* Preserve the original assertion. */ }
    } finally {
      try {report.put("status",passed?"passed":"failed").put("stages",stages).put("screenshots",pictures).put("samples",samples);result.putString("buttonGroupReport",report.toString());}
      catch(Exception error){result.putString("Error",error.toString());passed=false;}
      driver.finish(passed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  private String text(String id){return caption(view(id));}
  private String caption(View target){if(target instanceof TextView)return ((TextView)target).getText().toString();StringBuilder value=new StringBuilder();if(target instanceof ViewGroup)for(int index=0;index<((ViewGroup)target).getChildCount();index++)value.append(caption(((ViewGroup)target).getChildAt(index)));return value.toString();}
  private void stage(String name){stages.put(name);Bundle update=new Bundle();update.putString("buttonGroupStage",name);driver.sendStatus(1,update);}
  private void geometry(String phase,String[] names){ui(()->{for(String id:names){View target=view(id);float density=target.getResources().getDisplayMetrics().density;int[] position=new int[2];target.getLocationOnScreen(position);samples.put(new JSONObject().put("name",phase+":"+id).put("x",position[0]/density).put("y",position[1]/density).put("width",target.getWidth()/density).put("height",target.getHeight()/density));}return null;});}
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
