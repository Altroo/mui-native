package com.altroo.muinativehost
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
  @ReactProp(name = "active", defaultBoolean = false)
  override fun setActive(view: AltrooMUIPortalHost, value: Boolean) { view.active = value }
  @ReactProp(name = "revision")
  override fun setRevision(view: AltrooMUIPortalHost, value: String?) { view.revision = value ?: "" }
  @ReactProp(name = "containerTag", defaultInt = 0)
  override fun setContainerTag(view: AltrooMUIPortalHost, value: Int) { view.containerTag = value }
  @ReactProp(name = "layer", defaultDouble = 0.0)
  override fun setLayer(view: AltrooMUIPortalHost, value: Double) { view.layer = value }
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
  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf("topPortalLayout" to mapOf("registrationName" to "onPortalLayout"))
}
