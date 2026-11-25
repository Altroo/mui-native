// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
package com.altroo.muinativehost;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

/** Descriptor registration only. A TextEffect-derived marker never mounts. */
@ReactModule(name = "AltrooMUITextColorMarker")
public final class AltrooMUITextColorMarkerManager extends ReactViewManager {
  @Override public String getName() { return "AltrooMUITextColorMarker"; }
  @Override public ReactViewGroup createViewInstance(ThemedReactContext context) {
    throw new IllegalStateException("A virtual text color marker must not create a native View");
  }
  @ReactProp(name = "colorProgramme")
  public void setColorProgramme(ReactViewGroup view, ReadableMap value) {}
}
