/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
class AltrooMuiNativeHostPackage : ReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = listOf(AltrooMUIInteractiveViewManager(), AltrooMUINativePickerManager(), AltrooMUIPortalHostManager(), AltrooMUIPortalCanvasManager())
}
