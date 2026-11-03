/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil.dpToPx
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AltrooMUIInteractiveViewManagerInterface
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

// Keep ReactViewManager setters that are absent from BaseViewManagerDelegate.
// This manager is not registered and never creates a native view.
private class InheritedViewPropsManager : ReactViewManager() {
  fun propertyDelegate(): ViewManagerDelegate<ReactViewGroup> = super.getDelegate()
}

@ReactModule(name = "AltrooMUIInteractiveView")
class AltrooMUIInteractiveViewManager : ReactViewManager(),
    AltrooMUIInteractiveViewManagerInterface<ReactViewGroup> {
  private val delegate = AltrooMUIInteractiveViewDelegate(
    this, InheritedViewPropsManager().propertyDelegate(),
  )

  override fun getDelegate(): ViewManagerDelegate<ReactViewGroup> = delegate
  override fun getName() = "AltrooMUIInteractiveView"
  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
      AltrooMUIInteractiveView(context)

  @ReactProp(name = "nativeFocusable", defaultBoolean = true)
  override fun setNativeFocusable(view: ReactViewGroup, value: Boolean) {
    super.setFocusable(view, value)
    (view as AltrooMUIInteractiveView).allowKeyboardFocus = value
    view.isFocusable = value
    view.isFocusableInTouchMode = value
    if (!value) view.clearManagedFocus()
  }

  override fun onAfterUpdateTransaction(view: ReactViewGroup) {
    super.onAfterUpdateTransaction(view)
    val host = view as AltrooMUIInteractiveView
    view.isFocusable = host.allowKeyboardFocus
    view.isFocusableInTouchMode = host.allowKeyboardFocus
  }

  @ReactProp(name = "nativeTabIndex", defaultInt = 0)
  override fun setNativeTabIndex(view: ReactViewGroup, value: Int) {
    (view as AltrooMUIInteractiveView).nativeTabIndex = value
  }

  @ReactProp(name = "managedKeys")
  override fun setManagedKeys(view: ReactViewGroup, value: ReadableArray?) {
    (view as AltrooMUIInteractiveView).managedKeys =
        (0 until (value?.size() ?: 0)).mapNotNull { value?.getString(it) }.toSet()
  }

  @ReactProp(name = "managedDescendantKeys")
  override fun setManagedDescendantKeys(view: ReactViewGroup, value: ReadableArray?) {
    (view as AltrooMUIInteractiveView).managedDescendantKeys =
        (0 until (value?.size() ?: 0)).mapNotNull { value?.getString(it) }.filter { it in descendantNavigationKeys }.toSet()
  }

  @ReactProp(name = "rippleEnabled", defaultBoolean = false)
  override fun setRippleEnabled(view: ReactViewGroup, value: Boolean) {
    (view as AltrooMUIInteractiveView).apply { rippleEnabled = value; updateRipple() }
  }

  @ReactProp(name = "rippleColor", customType = "Color")
  override fun setRippleColor(view: ReactViewGroup, value: Int?) {
    (view as AltrooMUIInteractiveView).apply { rippleColor = value; updateRipple() }
  }

  @ReactProp(name = "rippleRadius", defaultFloat = -1f)
  override fun setRippleRadius(view: ReactViewGroup, value: Float) {
    (view as AltrooMUIInteractiveView).apply { rippleRadius = value.dpToPx(); updateRipple() }
  }

  @ReactProp(name = "rippleBorderless", defaultBoolean = false)
  override fun setRippleBorderless(view: ReactViewGroup, value: Boolean) {
    (view as AltrooMUIInteractiveView).apply { rippleBorderless = value; updateRipple() }
  }

  @ReactProp(name = "rippleForeground", defaultBoolean = false)
  override fun setRippleForeground(view: ReactViewGroup, value: Boolean) {
    (view as AltrooMUIInteractiveView).rippleForeground = value
  }

  override fun focus(view: ReactViewGroup) {
    (view as AltrooMUIInteractiveView).requestManagedFocus()
  }

  override fun blur(view: ReactViewGroup) {
    (view as AltrooMUIInteractiveView).clearManagedFocus()
  }

  override fun setPressed(view: ReactViewGroup, pressed: Boolean) { view.isPressed = pressed }

  override fun setHotspot(view: ReactViewGroup, x: Double, y: Double) {
    (view as AltrooMUIInteractiveView).setManagedHotspot(
      x.toFloat().dpToPx(), y.toFloat().dpToPx(),
    )
  }

  override fun receiveCommand(root: ReactViewGroup, commandId: String, args: ReadableArray?) {
    when (commandId) {
      "focus" -> focus(root)
      "blur" -> blur(root)
      "setPressed" -> setPressed(root, args?.getBoolean(0) ?: false)
      "setHotspot" -> if (args != null) setHotspot(root, args.getDouble(0), args.getDouble(1))
      else -> super.receiveCommand(root, commandId, args)
    }
  }

  override fun getExportedCustomBubblingEventTypeConstants(): MutableMap<String, Any> {
    val events = super.getExportedCustomBubblingEventTypeConstants()?.toMutableMap()
        ?: mutableMapOf()
    for (name in listOf("MUIKeyDown", "MUIKeyUp", "MUIFocus", "MUIBlur", "KeyDown", "KeyUp")) {
      events["top$name"] = mapOf("phasedRegistrationNames" to mapOf(
        "bubbled" to "on$name", "captured" to "on${name}Capture",
      ))
    }
    return events
  }
}
