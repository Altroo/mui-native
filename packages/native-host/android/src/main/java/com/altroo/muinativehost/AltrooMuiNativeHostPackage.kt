/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost
import android.graphics.Typeface
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.assets.ReactFontManager
import com.facebook.react.uimanager.ViewManager
class AltrooMuiNativeHostPackage : ReactPackage {
  init {
    // Register only our private CSS-default alias; public/app font names stay owned by the app.
    // Run before JS/Fabric text mounting, not when a host view manager is requested.
    val fontManager = ReactFontManager.getInstance()
    SystemFontRegistration.ensure(fontManager, { fontManager.customFontFamilies }) {
      fontManager.addCustomFont(SystemFontRegistration.FAMILY, Typeface.DEFAULT)
    }
  }
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = listOf(AltrooMUITextInputManager(), AltrooMUIInteractiveViewManager(), AltrooMUINativePickerManager(), AltrooMUIPortalHostManager(), AltrooMUIPortalCanvasManager(), AltrooMUIStructuralViewManager())
}
