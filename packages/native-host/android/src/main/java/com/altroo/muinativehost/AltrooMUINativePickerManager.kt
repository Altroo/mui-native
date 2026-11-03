package com.altroo.muinativehost
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AltrooMUINativePickerManagerDelegate
import com.facebook.react.viewmanagers.AltrooMUINativePickerManagerInterface

@ReactModule(name = "AltrooMUINativePicker")
class AltrooMUINativePickerManager : SimpleViewManager<AltrooMUINativePicker>(), AltrooMUINativePickerManagerInterface<AltrooMUINativePicker> {
  private val delegate = AltrooMUINativePickerManagerDelegate(this)
  override fun getDelegate() = delegate
  override fun getName() = "AltrooMUINativePicker"
  override fun createViewInstance(context: ThemedReactContext) = AltrooMUINativePicker(context)
  @ReactProp(name = "active", defaultBoolean = false)
  override fun setActive(view: AltrooMUINativePicker, value: Boolean) { view.active = value }
  @ReactProp(name = "sessionId")
  override fun setSessionId(view: AltrooMUINativePicker, value: String?) { view.sessionId = value ?: "" }
  @ReactProp(name = "revision")
  override fun setRevision(view: AltrooMUINativePicker, value: String?) { view.revision = value ?: "" }
  @ReactProp(name = "options")
  override fun setOptions(view: AltrooMUINativePicker, value: ReadableArray?) { view.setOptions(value) }
  @ReactProp(name = "multiple", defaultBoolean = false)
  override fun setMultiple(view: AltrooMUINativePicker, value: Boolean) { view.multiple = value }
  @ReactProp(name = "title")
  override fun setTitle(view: AltrooMUINativePicker, value: String?) { view.title = value ?: "" }
  @ReactProp(name = "doneText")
  override fun setDoneText(view: AltrooMUINativePicker, value: String?) { view.doneText = value ?: "" }
  @ReactProp(name = "cancelText")
  override fun setCancelText(view: AltrooMUINativePicker, value: String?) { view.cancelText = value ?: "" }
  @ReactProp(name = "colorScheme")
  override fun setColorScheme(view: AltrooMUINativePicker, value: String?) { view.colorScheme = value ?: "system" }
  override fun onAfterUpdateTransaction(view: AltrooMUINativePicker) { super.onAfterUpdateTransaction(view); view.syncPicker() }
  override fun onDropViewInstance(view: AltrooMUINativePicker) { view.dispose(); super.onDropViewInstance(view) }
  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf(
    "topPickerSelection" to mapOf("registrationName" to "onPickerSelection"),
    "topPickerDismiss" to mapOf("registrationName" to "onPickerDismiss"),
    "topPickerPresentation" to mapOf("registrationName" to "onPickerPresentation"),
  )
}
