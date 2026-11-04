/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package dev.altroo.muinative.catalog.test;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.text.Editable;
import android.text.InputFilter;
import android.text.TextWatcher;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.TextView;
import com.facebook.react.views.modal.ReactModalHostView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicReference;

/** Diagnostic cold-scene comparison, not an IME or physical-keyboard claim. */
public final class InputIntegrityScenario {
  private static final String PACKAGE = "dev.altroo.muinative.catalog";
  private final Instrumentation driver;
  private Activity activity;
  private UiAutomation automation;
  private int testId;
  private final JSONArray touches = new JSONArray();
  private InputIntegrityScenario(Instrumentation driver) { this.driver=driver; }
  public static void run(Instrumentation driver) { new InputIntegrityScenario(driver).run(); }
  private void run() {
    Bundle result=new Bundle(); JSONObject report=new JSONObject(); JSONArray trials=new JSONArray(); File directory=null;
    boolean completed=false;
    try {
      directory=new File(driver.getTargetContext().getCacheDir(),"mui-input-integrity-"+System.currentTimeMillis());
      require(directory.mkdir(),"Preserve previous evidence");
      result.putString("inputIntegrityDirectory","cache/"+directory.getName());
      report.put("artifactDirectory","cache/"+directory.getName()).put("schemaVersion",1).put("scenario","input-integrity-v1").put("expectedText","New city").put("driver","Instrumentation.sendStringSync")
        .put("device",new JSONObject().put("sdk",Build.VERSION.SDK_INT).put("model",Build.MODEL).put("os",Build.VERSION.RELEASE)).put("trials",trials).put("touches",touches);
      automation=driver.getUiAutomation(UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
      Intent launch=driver.getTargetContext().getPackageManager().getLaunchIntentForPackage(PACKAGE);
      require(launch!=null,"Catalog unavailable"); launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
      activity=driver.startActivitySync(launch);
      testId=driver.getTargetContext().getResources().getIdentifier("react_test_id","id",PACKAGE);
      require(testId!=0,"Missing testID resource");
      await(()->ui(()->find("catalog-tabs") instanceof HorizontalScrollView),"Catalog unavailable",35000);
      ui(()->{HorizontalScrollView tabs=(HorizontalScrollView)find("catalog-tabs");tabs.scrollTo(tabs.getChildAt(0).getWidth(),0);return null;});
      tap("catalog-tab-Inputs");
      await(()->ui(()->find("typing-receipt") instanceof TextView),"Input fixture unavailable");
      int generation=ui(()->new JSONObject(((TextView)view("typing-receipt")).getText().toString()).getInt("generation"));
      int previousTag=ui(()->view("typing-editor").getId());
      for(int round=0;round<8;round++) for(String mode:new String[]{"native","field","autocomplete","uncontrolled"}) {
        // Close the previous editor's suggestions before touching a mode beneath
        // its Portal. A covered touch can otherwise select an option instead.
        driver.sendKeyDownUpSync(KeyEvent.KEYCODE_ESCAPE);
        await(() -> ui(() -> find("typing-popup") == null), "Previous suggestions must close before the next cold-scene touch");
        tap("typing-mode-"+mode);
        final int previousGeneration=generation;
        await(()->ui(()->{JSONObject receipt=new JSONObject(((TextView)view("typing-receipt")).getText().toString());
          return mode.equals(receipt.getString("mode"))&&receipt.getInt("generation")>previousGeneration&&receipt.getString("value").isEmpty();}),"Cold scene did not replace its predecessor");
        generation=ui(()->new JSONObject(((TextView)view("typing-receipt")).getText().toString()).getInt("generation"));
        final String scene="typing-scene-"+mode+"-"+generation;
        // Fabric may flatten the editor beside its tagged scene container.
        // A committed scene receipt plus a new React tag identifies the remount.
        final int oldTag=previousTag;
        await(()->ui(()->find(scene)!=null&&find("typing-editor") instanceof EditText&&view("typing-editor").getId()!=oldTag),"New scene editor unavailable");
        EditText editor=ui(()->(EditText)view("typing-editor"));
        previousTag=ui(editor::getId);
        require(ui(()->editor.getText().length()==0),"Cold editor was nonempty");
        tap("typing-editor");
        await(()->ui(()->editor.hasFocus()),"Native focus unavailable");
        JSONArray changes = new JSONArray(), replacements = new JSONArray();
        boolean[] truncated = {false}, filtersTruncated = {false};
        JSONObject trial = new JSONObject().put("mode", mode).put("round", round)
          .put("generation", generation).put("reactTag", editor.getId())
          .put("changes", changes).put("replacements", replacements);
        trials.put(trial);
        trial.put("focus", ui(() -> new JSONObject().put("focused", editor.hasFocus())
          .put("windowFocused", editor.hasWindowFocus()).put("attached", editor.isAttachedToWindow())
          .put("imeActive", ((InputMethodManager)activity.getSystemService(Activity.INPUT_METHOD_SERVICE)).isActive(editor))
          .put("selectionStart", editor.getSelectionStart()).put("selectionEnd", editor.getSelectionEnd())));
        TextWatcher trace = new TextWatcher() {
          private void record(String phase, CharSequence text, int start, int before, int after) {
            if (changes.length() >= 256) { truncated[0] = true; return; }
            try {
              changes.put(new JSONObject().put("phase", phase).put("text", text.toString())
                .put("start", start).put("before", before).put("after", after)
                .put("selectionStart", editor.getSelectionStart()).put("selectionEnd", editor.getSelectionEnd())
                .put("time", SystemClock.uptimeMillis()).put("stack", textStack()));
            } catch (Exception error) { throw new AssertionError(error); }
          }
          public void beforeTextChanged(CharSequence text, int start, int count, int after) { record("before", text, start, count, after); }
          public void onTextChanged(CharSequence text, int start, int before, int count) { record("change", text, start, before, count); }
          public void afterTextChanged(Editable text) {}
        };
        // ReactEditText suppresses JS-origin TextWatcher callbacks. A final
        // non-mutating InputFilter observes replacement proposals separately.
        // Positive controls below prove visibility for authored replace/clear.
        InputFilter filter = (source, start, end, destination, dstart, dend) -> {
          if (replacements.length() >= 256) { filtersTruncated[0] = true; return null; }
          try {
            replacements.put(new JSONObject().put("source", source.subSequence(start, end).toString())
              .put("destination", destination.toString()).put("start", dstart).put("end", dend)
              .put("nativeBefore", editor.getText().toString()).put("time", SystemClock.uptimeMillis())
              .put("stack", textStack()));
          } catch (Exception error) { throw new AssertionError(error); }
          return null; // Preserve every preceding filter's accepted text.
        };
        ui(() -> {
          editor.addTextChangedListener(trace);
          InputFilter[] original = editor.getFilters();
          InputFilter[] observed = java.util.Arrays.copyOf(original, original.length + 1);
          observed[original.length] = filter;
          editor.setFilters(observed);
          return null;
        });
        try {
          driver.sendStringSync("New city");
          // No character retry: keep a mismatch and continue the fixed matrix.
          long deadline = SystemClock.uptimeMillis() + 2500;
          while (SystemClock.uptimeMillis() < deadline) {
            if (ui(() -> editor.getText().toString().equals("New city") && receipt().getString("value").equals("New city"))) break;
            SystemClock.sleep(40);
          }
          trial.put("typedChangeCount", changes.length()).put("typedReplacementCount", replacements.length());
          trial.put("nativeText", ui(() -> editor.getText().toString())).put("receipt", ui(this::receipt));
          trial.put("matched", trial.getString("nativeText").equals("New city") && trial.getJSONObject("receipt").getString("value").equals("New city"));
          if (!mode.equals("uncontrolled")) {
            tap("typing-replace");
            await(() -> ui(() -> editor.getText().toString().equals("JS replacement")), "Authored replacement did not reach the native editor");
            trial.put("authoredReplacement", ui(() -> editor.getText().toString()));
            tap("typing-replace");
            await(() -> ui(() -> editor.getText().length() == 0), "Authored clear did not reach the native editor");
            trial.put("authoredClear", ui(() -> editor.getText().toString()));
          }
        } finally {
          ui(() -> {
            editor.removeTextChangedListener(trace);
            InputFilter[] current = editor.getFilters();
            trial.put("filterAttached", java.util.Arrays.asList(current).contains(filter));
            // Remove only our observer; preserve filters added while JS ran.
            editor.setFilters(java.util.Arrays.stream(current).filter(value -> value != filter).toArray(InputFilter[]::new));
            trial.put("filterRemoved", !java.util.Arrays.asList(editor.getFilters()).contains(filter));
            return null;
          });
          trial.put("sameEditor", ui(() -> find("typing-editor") == editor)).put("finalReactTag", ui(editor::getId))
            .put("traceTruncated", truncated[0]).put("filtersTruncated", filtersTruncated[0]);
        }
      }
      completed=true;
    }catch(Throwable error){try{report.put("error",error.toString()).put("nativeHierarchy",ui(()->hierarchy(activity.getWindow().getDecorView())));}catch(Exception ignored){}}
    finally{
      try{
        boolean matched=completed&&trials.length()==32;
        for(int index=0;index<trials.length();index++) matched&=trials.getJSONObject(index).optBoolean("matched",false);
        report.put("completed",completed).put("status",matched?"passed":completed?"mismatch":"aborted");
        // Detailed traces stay in app-private cache; only the safe relative path
        // crosses Instrumentation's size-limited result Binder transaction.
        if(directory!=null) Files.write(new File(directory,"report.json").toPath(),report.toString(2).getBytes(StandardCharsets.UTF_8));
        result.putString("inputIntegrityStatus",report.getString("status"));
        completed=matched;
      }catch(Throwable error){result.putString("Error",error.toString());completed=false;}
      driver.finish(completed?Activity.RESULT_OK:Activity.RESULT_CANCELED,result);
    }
  }
  private JSONObject receipt() throws Exception {
    return new JSONObject(((TextView)view("typing-receipt")).getText().toString());
  }
  private JSONArray textStack() {
    JSONArray stack = new JSONArray();
    for (StackTraceElement frame : Thread.currentThread().getStackTrace()) {
      if ((frame.getClassName().contains("textinput") || frame.getClassName().startsWith("android.text.") || frame.getClassName().contains("TextView")) && stack.length() < 12)
        stack.put(frame.toString());
    }
    return stack;
  }
  private JSONArray hierarchy(View root) throws Exception {
    JSONArray result=new JSONArray(); Object tag=root.getTag(testId);
    if(tag!=null) result.put(new JSONObject().put("testID",String.valueOf(tag)).put("class",root.getClass().getSimpleName()).put("reactTag",root.getId()).put("children",root instanceof ViewGroup?((ViewGroup)root).getChildCount():0).put("text",root instanceof TextView?((TextView)root).getText().toString():""));
    if(root instanceof ViewGroup) for(int i=0;i<((ViewGroup)root).getChildCount();i++) {
      JSONArray child=hierarchy(((ViewGroup)root).getChildAt(i));for(int j=0;j<child.length();j++) result.put(child.get(j));
    }
    return result;
  }
  private View find(String id) { return search(activity.getWindow().getDecorView(), id); }
  private View view(String id) { View found = find(id); require(found != null, "Missing native view " + id); return found; }
  private View search(View root, String id) {
    if (id.equals(root.getTag(testId))) return root;
    if (root instanceof ReactModalHostView) {
      android.app.Dialog dialog = ((ReactModalHostView)root).getDialog();
      if (dialog != null && dialog.getWindow() != null) {
        View found = search(dialog.getWindow().getDecorView(), id); if (found != null) return found;
      }
    }
    if (root instanceof ViewGroup) for (int index = 0; index < ((ViewGroup)root).getChildCount(); index++) {
      View found = search(((ViewGroup)root).getChildAt(index), id); if (found != null) return found;
    }
    return null;
  }
  private boolean opaque(View target) {
    if (!target.isShown()) return false;
    for (View view = target; view != null; view = view.getParent() instanceof View ? (View)view.getParent() : null)
      if (view.getAlpha() <= 0) return false;
    return true;
  }
  private void tap(String id) throws Exception {
    await(() -> ui(() -> find(id) != null && view(id).getWidth() > 0 && opaque(view(id))), "Target did not lay out visibly: " + id);
    ui(() -> { View target = view(id); target.requestRectangleOnScreen(new Rect(0, 0, target.getWidth(), target.getHeight()), true); return null; });
    await(() -> ui(() -> { Rect rect = new Rect(); return opaque(view(id)) && view(id).getGlobalVisibleRect(rect) && !rect.isEmpty(); }), "Target not visible: " + id);
    float[] point = ui(() -> { View target = view(id); Rect rect = new Rect(); int[] origin = new int[2];
      require(target.getLocalVisibleRect(rect) && !rect.isEmpty(), "Target has no local visible bounds");
      target.getLocationOnScreen(origin);
      return new float[] {origin[0] + rect.exactCenterX(), origin[1] + rect.exactCenterY()}; });
    touches.put(new JSONObject().put("id", id).put("x", point[0]).put("y", point[1]));
    long time = SystemClock.uptimeMillis();
    for (int action : new int[] {MotionEvent.ACTION_DOWN, MotionEvent.ACTION_UP}) {
      MotionEvent event = MotionEvent.obtain(time, SystemClock.uptimeMillis(), action, point[0], point[1], 0); event.setSource(InputDevice.SOURCE_TOUCHSCREEN);
      try { require(automation.injectInputEvent(event, true), "Native touch injection failed"); } finally { event.recycle(); }
      SystemClock.sleep(40);
    }
  }
  private void await(java.util.function.BooleanSupplier condition, String message) throws Exception { await(condition, message, 10000); }
  private void await(java.util.function.BooleanSupplier condition, String message, long timeout) throws Exception {
    long deadline = SystemClock.uptimeMillis() + timeout;
    while (SystemClock.uptimeMillis() < deadline) { if (condition.getAsBoolean()) return; SystemClock.sleep(40); }
    throw new AssertionError(message);
  }
  private <T> T ui(java.util.concurrent.Callable<T> callback) {
    AtomicReference<T> result = new AtomicReference<>(); AtomicReference<Throwable> error = new AtomicReference<>();
    driver.runOnMainSync(() -> { try { result.set(callback.call()); } catch (Throwable failure) { error.set(failure); } });
    if (error.get() != null) throw new AssertionError(error.get()); return result.get();
  }
  private static void require(boolean value, String message) { if (!value) throw new AssertionError(message); }
}
