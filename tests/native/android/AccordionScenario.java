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
import android.view.inputmethod.InputMethodManager;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.EditText;
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

/** Touch real summaries and retain the same edited native body across controlled expansion. */
public final class AccordionScenario {
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray stages=new JSONArray(), pictures=new JSONArray(), samples=new JSONArray(), touches=new JSONArray();
  private AccordionScenario(Instrumentation driver) {this.driver=driver;}
  public static void run(Instrumentation driver) {new AccordionScenario(driver).run();}
  private void run() {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); boolean passed=false;
    try {
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-accordion-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve existing native evidence");
      report.put("schemaVersion",1).put("scenario","accordion-v1").put("driver","native Instrumentation and UiAutomation")
        .put("artifactDirectory","cache/"+directory.getName()).put("device",new JSONObject().put("sdk",Build.VERSION.SDK_INT).put("model",Build.MODEL).put("fontScale",driver.getTargetContext().getResources().getConfiguration().fontScale));
      automation=driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch=driver.getTargetContext().getPackageManager().getLaunchIntentForPackage("dev.altroo.muinative.catalog");
      require(launch!=null,"Catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity=driver.startActivitySync(launch);
      tagId=driver.getTargetContext().getResources().getIdentifier("react_test_id","id","dev.altroo.muinative.catalog");
      await(()->ui(()->find("catalog-tabs") instanceof HorizontalScrollView && ((HorizontalScrollView)view("catalog-tabs")).getChildCount()>0&&((HorizontalScrollView)view("catalog-tabs")).getChildAt(0).getWidth()>0),"Catalog tabs must finish layout");
      tap("catalog-tab-Accordion");
      await(()->expanded("delivery")&&ui(()->find("accordion-note-value")!=null),"Accordion scene must render and measure");
      require(ui(()->{for(String id:new String[]{"accordion-delivery","accordion-payment","accordion-disabled","accordion-help"})if(Math.abs(view(id).getElevation())>0.01f)return false;return true;}),"Flat bordered catalog panels must explicitly disable Android elevation");
      stage("scene-ready"); sample("delivery-initial","delivery"); capture("initial.png");
      EditText original=ui(()->editor(view("accordion-note")));
      require(original!=null,"Native note editor must exist");
      tap("accordion-note"); await(()->ui(original::isFocused),"Native editor must receive touch focus");
      driver.sendStringSync("8472");
      await(()->ui(()->text("accordion-note-value").contains("8472")),"Native text events must update body-local state");
      String edited=ui(()->text("accordion-note-value"));
      ui(()->{((InputMethodManager)activity.getSystemService(Activity.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(original.getWindowToken(),0);original.clearFocus();return null;});
      await(() -> ui(() -> Build.VERSION.SDK_INT < 30 || (activity.getWindow().getDecorView().getRootWindowInsets() != null && !activity.getWindow().getDecorView().getRootWindowInsets().isVisible(android.view.WindowInsets.Type.ime()))),
        "The editor IME must finish hiding before a different summary is touched");
      stage("edited-local-note");
      tap("accordion-payment-summary");
      await(()->expanded("payment")&&ui(()->view("accordion-delivery-transition").getHeight()==0&&text("accordion-changes").equals("Section changes: 1")),"Controlled expansion must close delivery and open payment exactly once");
      sample("delivery-closed","delivery");sample("payment-open","payment");stage("delivery-closed-payment-open");capture("payment.png");
      tap("accordion-delivery-summary");
      await(()->expanded("delivery")&&ui(()->text("accordion-note-value").equals(edited)&&text("accordion-changes").equals("Section changes: 2")),"Reopened panel must retain edited body state");
      require(ui(()->editor(view("accordion-note")))==original,"Reopening must preserve the same native editor instance");
      sample("delivery-reopened","delivery");stage("retained-body-and-note");
      tap("accordion-save");await(()->ui(()->text("accordion-status").equals("Note saved")),"Actions must remain interactive inside the expanded body");stage("actions-activated");capture("retained.png");
      tap("accordion-disabled-summary");SystemClock.sleep(150);
      require(ui(()->text("accordion-changes").equals("Section changes: 2"))&&expanded("delivery"),"Disabled summary must not dispatch or collapse its sibling");stage("disabled-summary");
      require(ui(()->find("accordion-help-details")==null),"unmountOnExit body must initially be absent");
      tap("accordion-help-summary");await(()->ui(()->find("accordion-help-details")!=null&&view("accordion-help-transition").getHeight()>0),"Independent help must mount its body");stage("help-mounted");
      tap("accordion-help-summary");await(()->ui(()->find("accordion-help-details")==null),"unmountOnExit must remove the body after closing");stage("help-unmounted");
      passed=true;
    } catch(Throwable error) {
      try {report.put("error",error.toString());if(directory!=null)capture("failure.png");} catch(Throwable ignored) { /* Preserve the original assertion. */ }
    } finally {
      try {report.put("status",passed?"passed":"failed").put("stages",stages).put("screenshots",pictures).put("samples",samples).put("touches",touches);result.putString("accordionReport",report.toString());}
      catch(Exception error){result.putString("Error",error.toString());passed=false;}
      driver.finish(passed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  private EditText editor(View root) {if(root instanceof EditText)return (EditText)root;if(root instanceof ViewGroup)for(int i=0;i<((ViewGroup)root).getChildCount();i++){EditText child=editor(((ViewGroup)root).getChildAt(i));if(child!=null)return child;}return null;}
  private String text(String id) {return ((TextView)view(id)).getText().toString();}
  // Native scene commits are asynchronous; readiness probes must tolerate absent nodes.
  private boolean expanded(String panel){return ui(()->{View root=find("accordion-"+panel+"-transition"),wrapper=find("accordion-"+panel+"-wrapper");return root!=null&&wrapper!=null&&wrapper.getHeight()>0&&Math.abs(root.getHeight()-wrapper.getHeight())<=2&&root instanceof ReactViewGroup&&"visible".equals(((ReactViewGroup)root).getOverflow());});}
  private void sample(String name,String panel){samples.put(ui(()->new JSONObject().put("name",name).put("actual",view("accordion-"+panel+"-transition").getHeight()).put("natural",view("accordion-"+panel+"-wrapper").getHeight())));}
  private void stage(String name){stages.put(name);Bundle update=new Bundle();update.putString("accordionStage",name);driver.sendStatus(1,update);}
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View node = find(id); require(node != null, "Missing native view " + id); return node; }
  private View search(View root, String id) { if (id.equals(root.getTag(tagId))) return root; if (root instanceof ViewGroup) for (int index=0; index<((ViewGroup)root).getChildCount(); index++) { View child=search(((ViewGroup)root).getChildAt(index),id); if(child!=null)return child; } return null; }
  private void tap(String id) throws Exception {
    await(() -> ui(() -> find(id)!=null && view(id).isShown() && view(id).getWidth()>0), "Native touch target did not lay out: " + id);
    ui(() -> { View target=view(id); target.requestRectangleOnScreen(new Rect(0,0,target.getWidth(),target.getHeight()),true); return null; });
    // Keyboard insets and scroll requests settle asynchronously. Inject against
    // a stable native viewport, never a coordinate sampled during that movement.
    // Fabric may retain request-layout flags after applying native positions.
    final Rect[] previous = {null};
    final long[] stableSince = {0};
    await(() -> ui(() -> {
      View target = view(id);
      Rect visible = new Rect();
      if (!target.getGlobalVisibleRect(visible) || visible.width() < target.getWidth() || visible.height() < target.getHeight()) {
        target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true);
        previous[0] = null;
        stableSince[0] = 0;
        return false;
      }
      long now = SystemClock.uptimeMillis();
      if (!visible.equals(previous[0])) { previous[0] = new Rect(visible); stableSince[0] = now; }
      if (stableSince[0] == 0) stableSince[0] = now;
      return now - stableSince[0] >= 150;
    }), "Native touch target must settle after scrolling: " + id);
    float[] point = ui(() -> {
      View target = view(id);
      Rect visible = new Rect(); int[] origin = new int[2];
      require(target.getLocalVisibleRect(visible) && !visible.isEmpty(), "Native touch target is covered");
      target.getLocationOnScreen(origin);
      return new float[]{origin[0] + visible.exactCenterX(), origin[1] + visible.exactCenterY()};
    });
    boolean imeVisible = ui(() -> Build.VERSION.SDK_INT >= 30 && activity.getWindow().getDecorView().getRootWindowInsets() != null && activity.getWindow().getDecorView().getRootWindowInsets().isVisible(android.view.WindowInsets.Type.ime()));
    touches.put(new JSONObject().put("target", id).put("x", point[0]).put("y", point[1]).put("imeVisible", imeVisible));
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
