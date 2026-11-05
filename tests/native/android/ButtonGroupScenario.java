/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package dev.altroo.muinative.catalog.test;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;
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
  private final JSONArray stages=new JSONArray(), pictures=new JSONArray(), samples=new JSONArray(), portalSamples=new JSONArray();
  private float nestedCompact,nestedExpanded;
  private boolean nativeFocus;
  private ButtonGroupScenario(Instrumentation driver) {this.driver=driver;}
  public static void run(Instrumentation driver) {new ButtonGroupScenario(driver).run();}
  private void run() {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); boolean passed=false;
    try {
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-button-group-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve existing native evidence");
      report.put("schemaVersion",2).put("scenario","button-group-v2").put("driver","native Instrumentation and UiAutomation")
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
      require(ui(()->text("group-save").equals("Save 1")),"Child removal must preserve first action state");stage("dynamic-children");capture("compact.png");
      tap("group-closure-toggle");
      await(()->ui(()->find("group-closure-themed-first")!=null),"Surface examples must mount");
      tap("group-closure-themed-first");
      tap("group-closure-theme-toggle");
      await(()->ui(()->text("group-closure-theme-status").startsWith("Violet")),"Custom theme must update");
      require(ui(()->text("group-closure-themed-first").equalsIgnoreCase("Review 1")),"Theme changes must retain local state");stage("theme-live");
      tap("group-closure-focus-first");
      await(()->ui(()->text("group-closure-focus-status").endsWith("· focused")&&!text("group-closure-focus-status").startsWith("focus 0 ")),"Native focus callback must arrive");
      nativeFocus=ui(()->view("group-closure-themed-first").isFocused());
      require(nativeFocus,"The actual first native control must own focus");stage("theme-focus");capture("themed-focus.png");
      nestedCompact=ui(()->width("group-closure-nested"));
      tap("group-closure-nested-first");tap("group-closure-nested-toggle");
      await(()->ui(()->width("group-closure-nested")>nestedCompact+30),"Nested descendant styles must update geometry");
      nestedExpanded=ui(()->width("group-closure-nested"));
      require(ui(()->text("group-closure-nested-first").equals("Nested 1")),"Nested style updates must retain local state");stage("nested-live");capture("nested.png");
      tap("group-closure-portal-window");awaitPortal("window");portalSample("window",false,false,0);tap("group-closure-portal-action");
      await(()->ui(()->text("group-closure-portal-action").equals("Go 1")),"Window action must activate");stage("portal-window");capture("portal-window.png");
      tap("group-closure-portal-inside");awaitPortal("inside");portalSample("inside",true,false,0);tap("group-closure-portal-action");
      tap("group-closure-portal-paint-toggle");await(()->ui(()->width("group-closure-portal-action")>103),"Inside paint must change width");portalSample("inside-updated",true,false,1);
      tap("group-closure-portal-paint-toggle");stage("portal-inside");capture("portal-inside.png");
      tap("group-closure-portal-sibling");awaitPortal("sibling");portalSample("sibling",false,true,0);tap("group-closure-portal-action");
      tap("group-closure-portal-paint-toggle");await(()->ui(()->width("group-closure-portal-action")>135),"Sibling paint must change width");portalSample("sibling-updated",false,true,1);
      stage("portal-sibling");capture("portal-sibling.png");
      tap("group-closure-portal-close");await(()->ui(()->find("group-closure-portal-action")==null),"Closed Portal must detach its physical content");stage("portal-closed");passed=true;
    } catch(Throwable error) {
      try {report.put("error",error.toString());if(directory!=null)capture("failure.png");} catch(Throwable ignored) { /* Preserve the original assertion. */ }
    } finally {
      try {report.put("status",passed?"passed":"failed").put("stages",stages).put("screenshots",pictures).put("samples",samples).put("closure",new JSONObject().put("nativeFocus",nativeFocus).put("nestedCompact",nestedCompact).put("nestedExpanded",nestedExpanded).put("portals",portalSamples));result.putString("buttonGroupReport",report.toString());}
      catch(Exception error){result.putString("Error",error.toString());passed=false;}
      driver.finish(passed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  /** The global RTL override is process-local and is restored before completion. */
  public static void runReading(Instrumentation driver, boolean globalRTL) {
    new ButtonGroupScenario(driver).reading(globalRTL);
  }
  private void reading(boolean globalRTL) {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); JSONArray states=new JSONArray(); boolean passed=false;
    String previousRTL=System.getProperty("FORCE_RTL_FOR_TESTING");
    try {
      System.setProperty("FORCE_RTL_FOR_TESTING",Boolean.toString(globalRTL));
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-button-group-reading-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve existing reading evidence");
      report.put("schemaVersion",3).put("scenario","button-group-reading-v3").put("driver","native Instrumentation and UiAutomation")
        .put("artifactDirectory","cache/"+directory.getName()).put("expectedGlobalRTL",globalRTL)
        .put("device",new JSONObject().put("sdk",Build.VERSION.SDK_INT).put("model",Build.MODEL)
          .put("fontScale",driver.getTargetContext().getResources().getConfiguration().fontScale)
          .put("density",driver.getTargetContext().getResources().getDisplayMetrics().density));
      automation=driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch=driver.getTargetContext().getPackageManager().getLaunchIntentForPackage("dev.altroo.muinative.catalog");
      require(launch!=null,"Catalog must be installed");launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity=driver.startActivitySync(launch);
      tagId=driver.getTargetContext().getResources().getIdentifier("react_test_id","id","dev.altroo.muinative.catalog");
      await(()->ui(()->find("catalog-tab-Groups")!=null),"Catalog tabs must mount");
      tap("catalog-tab-Groups");tap("group-closure-toggle");
      await(()->ui(()->find("group-reading-scene")!=null),"Reading scene must mount");
      tap("group-reading-measurements-toggle");
      await(()->ui(()->readingMetadata().optJSONObject("metrics")!=null&&readingMetadata().getJSONObject("metrics").optJSONArray("2")!=null),"Real native text receipts must arrive");
      require(ui(()->readingMetadata().getBoolean("globalRTL"))==globalRTL,"The actual RN global direction must match the requested process profile");
      tap("group-reading-action-0");
      await(()->ui(()->text("group-reading-action-0").equals("Save 1")),"Reading action must activate once");
      states.put(readingState("ltr-horizontal",false,false));capture("reading-ltr-horizontal.png");
      tap("group-reading-direction");awaitReading("rtl","horizontal");
      states.put(readingState("rtl-horizontal",true,false));capture("reading-rtl-horizontal.png");
      tap("group-reading-orientation");awaitReading("rtl","vertical");
      states.put(readingState("rtl-vertical",true,true));capture("reading-rtl-vertical.png");
      tap("group-reading-direction");awaitReading("ltr","vertical");
      states.put(readingState("ltr-vertical",false,true));capture("reading-ltr-vertical.png");
      tap("group-reading-orientation");awaitReading("ltr","horizontal");
      states.put(readingState("restored-horizontal",false,false));capture("reading-restored.png");
      tap("group-reading-action-1");tap("group-reading-action-2");
      tap("group-reading-follow-toggle");
      await(()->ui(()->readingMetadata().optBoolean("followSystem")),"Review policy must commit before revealing the next control");
      tap("group-reading-cap-toggle");
      await(()->ui(()->readingMetadata().optBoolean("followSystem")&&readingMetadata().optBoolean("uncapped")),"Live native scaling policies must commit");
      states.put(readingState("scaling-live",false,false));capture("reading-scaling-live.png");
      tap("group-reading-follow-toggle");
      await(()->ui(()->!readingMetadata().optBoolean("followSystem")),"Review reset must commit before revealing the next control");
      tap("group-reading-cap-toggle");
      await(()->ui(()->!readingMetadata().optBoolean("followSystem")&&!readingMetadata().optBoolean("uncapped")),"Scaling policies must restore without remounting");
      states.put(readingState("scaling-restored",false,false));capture("reading-scaling-restored.png");
      tap("group-reading-mixed-action");
      await(()->ui(()->text("group-reading-mixed-last").equals("delivery 1")),"Mixed authored/literal content must activate once");
      report.put("mixed",ui(()->new JSONObject().put("count",1).put("root",readingBounds(view("group-reading-mixed-action"))).put("first",readingBounds(view("group-reading-mixed-first"))).put("last",readingBounds(view("group-reading-mixed-last")))));
      tap("group-reading-text-portal-toggle");
      await(()->ui(()->find("group-reading-text-portal") instanceof TextView&&readingMetadata().getJSONObject("metrics").optJSONArray("portal")!=null),"Typography-origin Portal must produce a physical native text root and its own layout event");
      JSONObject portal=ui(()->{
        TextView leaf=(TextView)view("group-reading-text-portal");
        float density=leaf.getResources().getDisplayMetrics().density;
        float font=glyphPaint(leaf).getTextSize();
        require(Math.abs(font-Math.ceil(14*density))<=1.1,"Text-origin Portal must keep its unscaled root font policy");
        require(leaf.getLayout()!=null&&leaf.getLayout().getLineCount()>0,"Portal must have actual native glyph layout");
        return new JSONObject().put("fontPx",font).put("expectedFontPx",Math.ceil(14*density)).put("bounds",readingBounds(leaf)).put("text",leaf.getText().toString());
      });
      report.put("portal",portal);capture("reading-text-portal.png");
      tap("group-reading-text-portal-toggle");await(()->ui(()->find("group-reading-text-portal")==null),"Text-origin Portal must detach");
      passed=true;
    } catch(Throwable error) {
      try {report.put("error",error.toString());if(directory!=null)capture("failure.png");}catch(Throwable ignored){/* Preserve the first failure. */}
    } finally {
      if(previousRTL==null)System.clearProperty("FORCE_RTL_FOR_TESTING");else System.setProperty("FORCE_RTL_FOR_TESTING",previousRTL);
      try {report.put("status",passed?"passed":"failed").put("states",states).put("screenshots",pictures);result.putString("buttonGroupReadingReport",report.toString());}
      catch(Exception error){result.putString("Error",error.toString());passed=false;}
      driver.finish(passed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  private JSONObject readingMetadata()throws Exception{View receipt=find("group-reading-metadata");return receipt==null?new JSONObject():new JSONObject(caption(receipt));}
  private void awaitReading(String direction,String orientation)throws Exception{
    await(()->ui(()->readingMetadata().getString("direction").equals(direction)&&readingMetadata().getString("orientation").equals(orientation)),"Reading direction/orientation must commit");
  }
  private JSONObject readingBounds(View target)throws Exception{
    int[] origin=new int[2];target.getLocationOnScreen(origin);float density=target.getResources().getDisplayMetrics().density;
    return new JSONObject().put("x",origin[0]/density).put("y",origin[1]/density).put("width",target.getWidth()/density).put("height",target.getHeight()/density);
  }
  private Drawable readingBorder(Drawable drawable){
    if(drawable==null)return null;
    if(drawable.getClass().getName().equals("com.facebook.react.uimanager.drawable.BorderDrawable"))return drawable;
    if(drawable instanceof LayerDrawable){LayerDrawable layers=(LayerDrawable)drawable;for(int i=0;i<layers.getNumberOfLayers();i++){Drawable border=readingBorder(layers.getDrawable(i));if(border!=null)return border;}}
    return null;
  }
  // Draw the actual retained border layer. Reconstructing the same radius inputs
  // misses a cached native path that did not invalidate on direction changes.
  private JSONObject readingPaint(View target,boolean vertical)throws Exception{
    com.facebook.react.uimanager.style.BorderRadiusStyle radii=new com.facebook.react.uimanager.style.BorderRadiusStyle();
    JSONObject raw=new JSONObject();
    for(com.facebook.react.uimanager.style.BorderRadiusProp key:com.facebook.react.uimanager.style.BorderRadiusProp.values()){
      com.facebook.react.uimanager.LengthPercentage value=com.facebook.react.uimanager.BackgroundStyleApplicator.getBorderRadius(target,key);
      radii.set(key,value);raw.put(key.name(),value==null?JSONObject.NULL:new JSONObject().put("value",value.resolve(100f)).put("unit",value.getType().name()));
    }
    float density=target.getResources().getDisplayMetrics().density;
    com.facebook.react.uimanager.style.ComputedBorderRadius corners=radii.resolve(target.getLayoutDirection(),target.getContext(),target.getWidth()/density,target.getHeight()/density);
    JSONObject resolved=new JSONObject();
    String[] names={"topLeft","topRight","bottomLeft","bottomRight"};
    com.facebook.react.uimanager.style.CornerRadii[] values={corners.getTopLeft(),corners.getTopRight(),corners.getBottomLeft(),corners.getBottomRight()};
    for(int index=0;index<names.length;index++)resolved.put(names[index],new JSONObject().put("x",values[index].getHorizontal()).put("y",values[index].getVertical()));
    Drawable border=readingBorder(target.getBackground());require(border!=null,"The actual RN border drawing layer must be present");
    Rect bounds=border.getBounds();require(bounds.width()>3&&bounds.height()>3,"The border layer must own real drawing bounds");
    Bitmap raster=Bitmap.createBitmap(bounds.width(),bounds.height(),Bitmap.Config.ARGB_8888);
    JSONObject pixels=new JSONObject();
    try {
      Canvas canvas=new Canvas(raster);canvas.translate(-bounds.left,-bounds.top);border.draw(canvas);
      // Probe along an edge that is present in this outlined workload: top /
      // bottom for a row, left / right for a column. Avoid transparent dividers.
      int inset=Math.max(1,(int)Math.ceil(2*density)),right=raster.getWidth()-1,bottom=raster.getHeight()-1;
      require(inset<right&&inset<bottom,"The border must have space for actual corner probes");
      // First/last edge pixels also intersect a one-physical-pixel outline.
      int[][] points=vertical?new int[][]{{0,inset},{right,inset},{0,bottom-inset},{right,bottom-inset}}
        :new int[][]{{inset,0},{right-inset,0},{inset,bottom},{right-inset,bottom}};
      for(int index=0;index<names.length;index++)pixels.put(names[index],Color.alpha(raster.getPixel(points[index][0],points[index][1])));
    } finally {raster.recycle();}
    return new JSONObject().put("direction",target.getLayoutDirection()==View.LAYOUT_DIRECTION_RTL?"rtl":"ltr")
      .put("drawableDirection",border.getLayoutDirection()==View.LAYOUT_DIRECTION_RTL?"rtl":"ltr").put("drawableClass",border.getClass().getName())
      .put("corners",resolved).put("rawCorners",raw).put("cornerAlpha",pixels);
  }
  private JSONObject readingState(String phase,boolean rtl,boolean vertical)throws Exception{
    ui(()->{View root=view("group-reading-actions");root.requestRectangleOnScreen(new Rect(0,0,root.getWidth(),root.getHeight()),true);return null;});
    AtomicReference<JSONObject> settled=new AtomicReference<>();AtomicReference<AssertionError> pending=new AtomicReference<>();
    try {await(()->{try{settled.set(readingStateNow(phase,rtl,vertical));return true;}catch(AssertionError error){pending.set(error);return false;}},"Native reading glyph/layout updates did not settle");}
    catch(AssertionError error){if(pending.get()!=null)throw new AssertionError("Native reading update failed: "+pending.get(),pending.get());throw error;}
    return settled.get();
  }
  private JSONObject readingStateNow(String phase,boolean rtl,boolean vertical){return ui(()->{
    JSONObject metadata=readingMetadata();View root=view("group-reading-actions");JSONArray actions=new JSONArray();
    require(text("group-reading-action-0").equals("Save 1"),"Live direction and orientation must retain action state");
    require(root.getWidth()>0&&root.getHeight()>0,"Actual reading group must finish layout");
    JSONObject rootBounds=readingBounds(root);JSONObject previous=null;
    require(metadata.getString("direction").equals(rtl?"rtl":"ltr")&&metadata.getString("orientation").equals(vertical?"vertical":"horizontal"),"Requested React reading state must commit");
    for(int index=0;index<3;index++){
      View action=view("group-reading-action-"+index),label=view("group-reading-label-"+index);
      require(label instanceof TextView,"Authored labels must keep their own physical native text roots");
      TextView text=(TextView)label;android.util.DisplayMetrics metrics=text.getResources().getDisplayMetrics();
      float auto=android.util.TypedValue.applyDimension(android.util.TypedValue.COMPLEX_UNIT_SP,14,metrics);
      float expected=(float)Math.ceil(index==1&&!metadata.getBoolean("followSystem")?14*metrics.density:index==2&&!metadata.getBoolean("uncapped")?Math.min(auto,14*metrics.density*1.2):auto);
      float actual=glyphPaint(text).getTextSize();
      require(Math.abs(actual-expected)<=1.1,"Native glyph font must follow the authored scaling policy for label "+index+": "+actual+" vs "+expected);
      require(text.getLayout()!=null&&text.getLayout().getLineCount()>0,"Native label must own glyph layout");
      for(int line=0;line<text.getLayout().getLineCount();line++){
        require(text.getLayout().getEllipsisCount(line)==0,"Reading text must not be silently ellipsized");
        require(text.getLayout().getLineLeft(line)>=-1.5&&text.getLayout().getLineRight(line)<=text.getWidth()+1.5,"Actual native glyph line must fit its label");
      }
      JSONArray lines=new JSONArray();
      for(int line=0;line<text.getLayout().getLineCount();line++)lines.put(new JSONObject().put("left",text.getLayout().getLineLeft(line)/metrics.density).put("right",text.getLayout().getLineRight(line)/metrics.density).put("top",text.getLayout().getLineTop(line)/metrics.density).put("bottom",text.getLayout().getLineBottom(line)/metrics.density).put("ellipsis",text.getLayout().getEllipsisCount(line)));
      int count=index==0||phase.startsWith("scaling-")?1:0;
      require(text("group-reading-action-"+index).equals(new String[]{"Save","Review","Send"}[index]+" "+count),"Live policy changes must retain every local action counter");
      JSONObject actionBounds=readingBounds(action);
      double expectedX=vertical?rootBounds.getDouble("x"):index==0?(rtl?rootBounds.getDouble("x")+rootBounds.getDouble("width")-actionBounds.getDouble("width"):rootBounds.getDouble("x")):rtl?previous.getDouble("x")+1-actionBounds.getDouble("width"):previous.getDouble("x")+previous.getDouble("width")-1;
      double expectedY=vertical&&index>0?previous.getDouble("y")+previous.getDouble("height")-1:rootBounds.getDouble("y");
      require(Math.abs(actionBounds.getDouble("x")-expectedX)<=1.5&&Math.abs(actionBounds.getDouble("y")-expectedY)<=1.5,"Native direction/orientation joins must commit");previous=actionBounds;
      actions.put(new JSONObject().put("paint",readingPaint(action,vertical)).put("count",count).put("lines",lines).put("index",index).put("bounds",readingBounds(action)).put("label",readingBounds(label)).put("fontPx",actual).put("expectedFontPx",expected).put("lineCount",text.getLayout().getLineCount()));
    }
    return new JSONObject().put("phase",phase).put("direction",rtl?"rtl":"ltr").put("orientation",vertical?"vertical":"horizontal").put("count",1).put("root",readingBounds(root)).put("container",readingBounds(view("group-reading-scene"))).put("actions",actions).put("metadata",metadata);
  });}

  // Fabric stores run colors in native spans; TextView's fallback color does
  // not describe the glyph paint when a foreground span is present.
  private int textColor(TextView text){return glyphPaint(text).getColor();}
  private android.text.TextPaint glyphPaint(TextView text){
    android.text.TextPaint paint=new android.text.TextPaint(text.getPaint());
    CharSequence value=text.getText();
    if(value instanceof android.text.Spanned && value.length()>0)
      for(android.text.style.CharacterStyle span:((android.text.Spanned)value).getSpans(0,1,android.text.style.CharacterStyle.class))span.updateDrawState(paint);
    return paint;
  }
  private float width(String id){View target=view(id);return target.getWidth()/target.getResources().getDisplayMetrics().density;}
  private boolean contains(View ancestor,View child){for(android.view.ViewParent parent=child.getParent();parent!=null;parent=parent.getParent())if(parent==ancestor)return true;return ancestor==child;}
  private void awaitPortal(String mode)throws Exception{await(()->ui(()->text("group-closure-portal-status").contains("route "+mode+" · presented")),"Portal must attach to "+mode);}
  private void portalSample(String phase,boolean inside,boolean sibling,int count){ui(()->{
    View action=view("group-closure-portal-action"),raw=view("group-closure-portal-text");
    require(raw instanceof TextView,"Physical text probe must be an actual native TextView");TextView text=(TextView)raw;
    boolean inSource=contains(view("group-closure-portal-inside-target"),action),inSibling=contains(view("group-closure-portal-sibling-target"),action);
    require(inSource==inside&&inSibling==sibling,"Actual native parent must match destination");
    require(text("group-closure-portal-action").equals("Go "+count),"Container changes reset local state; same-container changes retain it");
    String context=text("group-closure-portal-context");require(context.equals("Defaults text/inherit/large · last"),"Public defaults and position must remain logical");
    portalSamples.put(new JSONObject().put("phase",phase).put("width",width("group-closure-portal-action"))
      .put("fontSize",text.getTextSize()/text.getResources().getDisplayMetrics().scaledDensity).put("color",Integer.toUnsignedLong(textColor(text)))
      .put("inside",inSource).put("sibling",inSibling).put("context",context).put("count",count));return null;
  });}
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
    // Custom target resizing and ScrollView reveal commit asynchronously. Wait
    // for the real native clipped rectangle before choosing a touch coordinate.
    await(() -> ui(() -> { View target=find(id); Rect visible=new Rect(); return target!=null&&target.getLocalVisibleRect(visible)&&!visible.isEmpty(); }),"Native touch target remains clipped: "+id);
    float[] point=ui(() -> { View target=view(id); Rect visible=new Rect(); int[] origin=new int[2]; require(target.getLocalVisibleRect(visible)&&!visible.isEmpty(),"Native touch target is covered: "+id); target.getLocationOnScreen(origin); return new float[]{origin[0]+visible.exactCenterX(),origin[1]+visible.exactCenterY()}; });
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
