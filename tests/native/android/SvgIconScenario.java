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

/** Real SVG layout, paint, text rasterization and ref events on the installed native backend. */
public final class SvgIconScenario {
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int tagId;
  private File directory;
  private final JSONArray stages=new JSONArray(), pictures=new JSONArray(), samples=new JSONArray();
  private SvgIconScenario(Instrumentation driver) {this.driver=driver;}
  public static void run(Instrumentation driver) {new SvgIconScenario(driver).run();}
  private void run() {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); boolean passed=false;
    try {
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-svg-icon-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve existing native evidence");
      report.put("schemaVersion",1).put("scenario","svg-icon-v1").put("driver","native Instrumentation and UiAutomation")
        .put("artifactDirectory","cache/"+directory.getName()).put("device",new JSONObject().put("sdk",Build.VERSION.SDK_INT).put("model",Build.MODEL));
      automation=driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch=driver.getTargetContext().getPackageManager().getLaunchIntentForPackage("dev.altroo.muinative.catalog");
      require(launch!=null,"Catalog must be installed"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity=driver.startActivitySync(launch);
      tagId=driver.getTargetContext().getResources().getIdentifier("react_test_id","id","dev.altroo.muinative.catalog");
      await(()->ui(()->find("catalog-tabs") instanceof HorizontalScrollView && ((HorizontalScrollView)view("catalog-tabs")).getChildCount()>0&&((HorizontalScrollView)view("catalog-tabs")).getChildAt(0).getWidth()>0),"Catalog tabs must finish layout");
      ui(()->{HorizontalScrollView tabs=(HorizontalScrollView)view("catalog-tabs");tabs.scrollTo(tabs.getChildAt(0).getWidth(),0);return null;});
      await(()->ui(()->{View tab=find("catalog-tab-Icons");Rect visible=new Rect();return tab!=null&&tab.getGlobalVisibleRect(visible)&&visible.width()==tab.getWidth();}),"Icons tab must be fully visible");
      tap("catalog-tab-Icons");
      await(()->ui(()->find("svg-paint-probe")!=null&&view("svg-paint-probe").getWidth()>0),"SvgIcon scene must render");
      stage("scene-ready");
      String[] sizes={"small","medium","large"};int[] expected={20,24,35};
      for(int i=0;i<sizes.length;i++) bounds("svg-size-"+sizes[i],expected[i],expected[i]);
      bounds("svg-paint-probe",48,48);stage("native-sizes");
      color("svg-group-probe",0xff2e7d32);color("svg-paint-probe",0xff0274d7);stage("inherited-paint");capture("initial.png");
      tap("svg-paint-probe");await(()->ui(()->text("svg-press-receipt").equals("SVG taps: 1")),"Original onClick must dispatch once on native touch");stage("native-click");
      tap("svg-use-error");await(()->ui(()->text("svg-palette-value").equals("error #d32f2f")),"Palette event must commit");
      color("svg-paint-probe",0xffd32f2f);stage("palette-update");capture("error.png");
      tap("svg-verify");await(()->ui(()->text("svg-ref-receipt").matches("Measured 48\\.0 × 48\\.0 · PNG [1-9][0-9]+")),"Actual SVG ref must measure and export PNG");stage("native-ref");
      bounds("svg-text-small",120,50);bounds("svg-text-large",120,50);
      int[] small=ink("svg-text-small"),large=ink("svg-text-large");
      require(small[0]>0&&small[1]>0&&large[0]>small[0]*1.6&&large[1]>small[1]*1.6,"Font size must change actual native glyph pixels");
      samples.put(new JSONObject().put("name","font-ink").put("smallWidth",small[0]).put("smallHeight",small[1]).put("largeWidth",large[0]).put("largeHeight",large[1]));
      stage("native-font");tap("svg-text-large");capture("fonts.png");passed=true;
    } catch(Throwable error) {
      try {report.put("error",error.toString());if(directory!=null)capture("failure.png");} catch(Throwable ignored) { /* Preserve the original assertion. */ }
    } finally {
      try {report.put("status",passed?"passed":"failed").put("stages",stages).put("screenshots",pictures).put("samples",samples);result.putString("svgIconReport",report.toString());}
      catch(Exception error){result.putString("Error",error.toString());passed=false;}
      driver.finish(passed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  private String text(String id){return ((TextView)view(id)).getText().toString();}
  private void stage(String name){stages.put(name);Bundle update=new Bundle();update.putString("svgIconStage",name);driver.sendStatus(1,update);}
  private void bounds(String id,int width,int height){ui(()->{View target=view(id);float density=target.getResources().getDisplayMetrics().density;double w=target.getWidth()/density,h=target.getHeight()/density;require(Math.abs(w-width)<0.6&&Math.abs(h-height)<0.6,"Native SVG bounds differ for "+id+": "+w+"x"+h);samples.put(new JSONObject().put("name",id).put("width",w).put("height",h));return null;});}
  private Bitmap raster(String id){View target=view(id);require(target.getWidth()>0&&target.getHeight()>0,"SVG raster must be nonempty");Bitmap image=Bitmap.createBitmap(target.getWidth(),target.getHeight(),Bitmap.Config.ARGB_8888);target.draw(new Canvas(image));return image;}
  private void color(String id,int expected){ui(()->{Bitmap image=raster(id);try{int actual=image.getPixel(image.getWidth()/2,image.getHeight()/2);require(actual==expected,"Native currentColor differs for "+id+": "+Integer.toHexString(actual));samples.put(new JSONObject().put("name",id+"-paint").put("argb",Integer.toHexString(actual)));}finally{image.recycle();}return null;});}
  private int[] ink(String id){return ui(()->{Bitmap image=raster(id);try{int left=image.getWidth(),right=-1,top=image.getHeight(),bottom=-1;for(int y=0;y<image.getHeight();y++)for(int x=0;x<image.getWidth();x++)if(Color.alpha(image.getPixel(x,y))>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return new int[]{Math.max(0,right-left+1),Math.max(0,bottom-top+1)};}finally{image.recycle();}});}
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
