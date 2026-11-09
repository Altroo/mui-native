// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
package com.altroo.muinativehost;

import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.ReactStylesDiffMap;
import com.facebook.react.uimanager.StateWrapper;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

/** Controlled probe: the inherited manager keeps the full native View behavior. */
@ReactModule(name = "AltrooMUIStructuralView")
public final class AltrooMUIStructuralViewManager extends ReactViewManager {
  @Override
  public String getName() {
    return "AltrooMUIStructuralView";
  }

  @Override
  public Object updateState(ReactViewGroup view, ReactStylesDiffMap props,
                            StateWrapper stateWrapper) {
    // Insert always delivers state before layout, even when Android reused an
    // early preallocation. The ordinary currentProps argument can be stale.
    if (stateWrapper == null)
      throw new IllegalStateException("Owned native mount state is missing");
    ReadableNativeMap state = stateWrapper.getStateData();
    if (state == null || !state.hasKey("schema") || state.getDouble("schema") != 1.0 ||
        !state.hasKey("selectedProps") || state.isNull("selectedProps"))
      throw new IllegalStateException("Owned native mount state is missing");
    ReadableMap selected = state.getMap("selectedProps");
    if (selected == null || selected.hasKey("ownedProgramme"))
      throw new IllegalStateException("Owned native mount props are invalid");
    updateProperties(view, new ReactStylesDiffMap(selected));
    return null;
  }

  // Fabric consumes these candidates before Yoga. The physical View must not
  // apply a second padding override after receiving the resolved layout.
  @ReactProp(name = "normalPaddingBottom", defaultDouble = 16.0)
  public void setNormalPaddingBottom(ReactViewGroup view, double value) {}

  @ReactProp(name = "lastPaddingBottom", defaultDouble = 24.0)
  public void setLastPaddingBottom(ReactViewGroup view, double value) {}
}
