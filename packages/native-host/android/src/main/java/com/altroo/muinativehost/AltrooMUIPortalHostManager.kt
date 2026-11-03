// Copyright (c) 2026 Altroo and contributors
// SPDX-License-Identifier: MIT
package com.altroo.muinativehost
import android.view.View
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AltrooMUIPortalHostManagerDelegate
import com.facebook.react.viewmanagers.AltrooMUIPortalHostManagerInterface
@ReactModule(name = "AltrooMUIPortalHost")
class AltrooMUIPortalHostManager : ViewGroupManager<AltrooMUIPortalHost>(), AltrooMUIPortalHostManagerInterface<AltrooMUIPortalHost> {
  private val delegate = AltrooMUIPortalHostManagerDelegate(this)
  override fun getDelegate() = delegate
  override fun getName() = "AltrooMUIPortalHost"
  override fun createViewInstance(context: ThemedReactContext) = AltrooMUIPortalHost(context)
  // Keep React's child API separate from the host's physical Android hierarchy.
  // Inherited removeView/removeAllViews dispatch through these same live getters.
  override fun addView(parent: AltrooMUIPortalHost, child: View, index: Int) { parent.addReactChild(child,index) }
  override fun getChildCount(parent: AltrooMUIPortalHost): Int = parent.reactChildCount()
  override fun getChildAt(parent: AltrooMUIPortalHost, index: Int): View? = parent.reactChildAt(index)
  override fun removeViewAt(parent: AltrooMUIPortalHost, index: Int) { parent.removeReactChildAt(index) }
  @ReactProp(name = "active", defaultBoolean = false)
  override fun setActive(view: AltrooMUIPortalHost, value: Boolean) { view.active = value }
  @ReactProp(name = "revision")
  override fun setRevision(view: AltrooMUIPortalHost, value: String?) { view.revision = value ?: "" }
  @ReactProp(name = "containerTag", defaultInt = 0)
  override fun setContainerTag(view: AltrooMUIPortalHost, value: Int) { view.containerTag = value }
  @ReactProp(name = "layer", defaultDouble = 0.0)
  override fun setLayer(view: AltrooMUIPortalHost, value: Double) { view.layer = value }
  @ReactProp(name = "observedTag", defaultInt = 0)
  override fun setObservedTag(view: AltrooMUIPortalHost, value: Int) { view.observedTag = value }
  @ReactProp(name = "popperTag", defaultInt = 0)
  override fun setPopperTag(view: AltrooMUIPortalHost, value: Int) { view.popperTag = value }
  @ReactProp(name = "arrowTag", defaultInt = 0)
  override fun setArrowTag(view: AltrooMUIPortalHost, value: Int) { view.arrowTag = value }
  @ReactProp(name = "observationOnly", defaultBoolean = false)
  override fun setObservationOnly(view: AltrooMUIPortalHost, value: Boolean) { view.observationOnly = value }
  @ReactProp(name = "boundaryTags")
  override fun setBoundaryTags(view: AltrooMUIPortalHost, value: com.facebook.react.bridge.ReadableArray?) {
    view.boundaryTags = if (value == null) emptyList() else (0 until value.size()).map { value.getInt(it) }
  }
  @ReactProp(name = "observationRevision")
  override fun setObservationRevision(view: AltrooMUIPortalHost, value: String?) { view.observationRevision = value ?: "" }
  @ReactProp(name="viewportX", defaultDouble=0.0)
  override fun setViewportX(view: AltrooMUIPortalHost, value: Double) = Unit
  @ReactProp(name="viewportY", defaultDouble=0.0)
  override fun setViewportY(view: AltrooMUIPortalHost, value: Double) = Unit
  @ReactProp(name="viewportA", defaultDouble=1.0)
  override fun setViewportA(view: AltrooMUIPortalHost, value: Double) = Unit
  @ReactProp(name="viewportB", defaultDouble=0.0)
  override fun setViewportB(view: AltrooMUIPortalHost, value: Double) = Unit
  @ReactProp(name="viewportC", defaultDouble=0.0)
  override fun setViewportC(view: AltrooMUIPortalHost, value: Double) = Unit
  @ReactProp(name="viewportD", defaultDouble=1.0)
  override fun setViewportD(view: AltrooMUIPortalHost, value: Double) = Unit
  override fun onAfterUpdateTransaction(view: AltrooMUIPortalHost) { super.onAfterUpdateTransaction(view); view.syncPortal() }
  override fun onDropViewInstance(view: AltrooMUIPortalHost) { view.dispose(); super.onDropViewInstance(view) }
  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf("topPortalLayout" to mapOf("registrationName" to "onPortalLayout"), "topPortalObservation" to mapOf("registrationName" to "onPortalObservation"))
}
