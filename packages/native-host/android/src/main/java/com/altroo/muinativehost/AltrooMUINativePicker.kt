package com.altroo.muinativehost

import android.app.AlertDialog
import android.content.res.Configuration
import android.graphics.Typeface
import android.os.Build
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.CheckedTextView
import android.widget.TextView
import com.facebook.react.common.LifecycleState
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.views.view.ReactViewGroup

internal data class PickerOption(val id: String, val label: String, val groupId: String,
  val groupLabel: String, val enabled: Boolean, val selected: Boolean)
private data class PickerRow(val label: String, val option: PickerOption?)
private data class PickerConfiguration(val multiple: Boolean, val title: String, val doneText: String, val cancelText: String, val scheme: String)
private data class PickerRowTag(val id: String, val revision: String)
private class PickerClose(val session: String, var reason: String = "cancel", var notify: Boolean = true, var terminal: Boolean = true, var reported: Boolean = false)

class AltrooMUINativePicker(private val reactContext: ThemedReactContext) : ReactViewGroup(reactContext), LifecycleEventListener {
  var active = false
  var sessionId = ""
  var revision = ""
  var multiple = false
  var title = ""
  var doneText = ""
  var cancelText = ""
  var colorScheme = "system"
  private var options: List<PickerOption> = emptyList()
  private var rows: List<PickerRow> = emptyList()
  private var dialog: AlertDialog? = null
  private var close: PickerClose? = null
  private var adapter: BaseAdapter? = null
  private var configuration: PickerConfiguration? = null
  private val presentation = PickerPresentationState()
  private var renderedRevision = ""
  private var acknowledgedSession = ""
  private val closing = mutableSetOf<PickerClose>()
  private var observing = false
  init {
    pointerEvents = PointerEvents.NONE
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    isFocusable = false
  }
  fun setOptions(value: ReadableArray?) {
    options = (0 until (value?.size() ?: 0)).mapNotNull { index ->
      val item = value?.getMap(index) ?: return@mapNotNull null
      PickerOption(item.getString("id") ?: "", item.getString("label") ?: "",
        item.getString("groupId") ?: "", item.getString("groupLabel") ?: "",
        item.hasKey("enabled") && item.getBoolean("enabled"),
        item.hasKey("selected") && item.getBoolean("selected"))
    }
  }
  private fun emit(name: String, session: String, reason: String? = null, option: PickerOption? = null, selected: Boolean = false) {
    val data = Arguments.createMap().apply {
      putString("sessionId", session)
      if (reason != null) putString("reason", reason)
      if (option != null) { putString("revision", revision); putString("optionId", option.id); putBoolean("selected", selected) }
    }
    UIManagerHelper.getEventDispatcher(reactContext)?.dispatchEvent(
      HostEvent(UIManagerHelper.getSurfaceId(reactContext), id, name, data, true))
  }
  private fun presentationEvent(session: String, state: String, reason: String, terminal: Boolean) {
    if (terminal && session == sessionId) acknowledgedSession = session
    val data = Arguments.createMap().apply {
      putString("sessionId", session); putString("state", state); putString("reason", reason); putBoolean("terminal", terminal)
    }
    UIManagerHelper.getEventDispatcher(reactContext)?.dispatchEvent(
      HostEvent(UIManagerHelper.getSurfaceId(reactContext), id, "topPickerPresentation", data, true))
  }
  private fun acknowledgeIdle() {
    if (!active && dialog == null && closing.isEmpty() && sessionId.isNotEmpty() && acknowledgedSession != sessionId)
      presentationEvent(sessionId, "dismissed", "programmatic", true)
  }
  private fun rebuildRows() {
    var previous = ""
    rows = buildList {
      for (option in options) {
        if (option.groupId.isNotEmpty() && option.groupId != previous) add(PickerRow(option.groupLabel, null))
        add(PickerRow(option.label, option)); previous = option.groupId
      }
    }
  }
  private fun closePicker(reason: String, notify: Boolean) {
    val current = dialog ?: return
    close?.apply {
      this.reason = reason; this.notify = notify; this.terminal = reason != "configuration"
      closing.add(this)
      if (notify) presentation.consume(session, sessionId)
    }
    dialog = null; adapter = null; close = null
    current.dismiss()
  }
  private fun unavailable(reason: String = "unavailable") {
    val gate = presentation.gate(active, sessionId, true, true, true, true, 1)
    if (gate != PickerGate.CONSUMED) {
      presentation.consume(sessionId, sessionId)
      emit("topPickerDismiss", sessionId, reason)
      presentationEvent(sessionId, "dismissed", reason, true)
    }
  }
  fun syncPicker() {
    val valid = revision.isNotEmpty() && options.none { it.id.isEmpty() } && options.map { it.id }.toSet().size == options.size &&
      (multiple || options.count { it.selected } <= 1)
    val gate = presentation.gate(active, sessionId, isAttachedToWindow,
      isShown && windowVisibility == View.VISIBLE,
      reactContext.reactApplicationContext.lifecycleState == LifecycleState.RESUMED, valid, options.size)
    if (gate == PickerGate.INACTIVE) { closePicker("programmatic", false); acknowledgeIdle(); return }
    if (gate == PickerGate.DETACHED) return
    if (dialog != null && close?.session != sessionId) closePicker("replaced", false)
    if (gate == PickerGate.CONSUMED) return
    if (gate == PickerGate.BACKGROUND || gate == PickerGate.UNAVAILABLE) {
      val reason = if (gate == PickerGate.BACKGROUND) "background" else "unavailable"
      closePicker(reason, true); unavailable(reason); return
    }
    val nextConfiguration = PickerConfiguration(multiple, title, doneText, cancelText, colorScheme)
    if (dialog != null && configuration != nextConfiguration) closePicker("configuration", false)
    if (renderedRevision != revision) {
      rebuildRows(); renderedRevision = revision; adapter?.notifyDataSetChanged()
    }
    if (dialog != null) return
    val activity = reactContext.currentActivity
    if (activity == null || activity.isFinishing || activity.isDestroyed || options.isEmpty()) { unavailable(); return }
    val dark = colorScheme == "dark" || (colorScheme == "system" &&
      resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES)
    val themed = ContextThemeWrapper(activity, if (dark) android.R.style.Theme_Material_Dialog_Alert else android.R.style.Theme_Material_Light_Dialog_Alert)
    val state = PickerClose(sessionId)
    val listAdapter = object : BaseAdapter() {
      override fun getCount() = rows.size
      override fun getItem(position: Int) = rows[position]
      override fun getItemId(position: Int) = position.toLong()
      override fun areAllItemsEnabled() = false
      override fun isEnabled(position: Int) = rows.getOrNull(position)?.option?.enabled == true
      override fun getViewTypeCount() = 2
      override fun getItemViewType(position: Int) = if (rows[position].option == null) 0 else 1
      override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        val row = rows[position]
        val layout = if (row.option == null) android.R.layout.simple_list_item_1 else if (multiple)
          android.R.layout.simple_list_item_multiple_choice else android.R.layout.simple_list_item_single_choice
        val text = (convertView ?: LayoutInflater.from(themed).inflate(layout, parent, false)) as TextView
        text.text = row.label
        text.minHeight = (48 * resources.displayMetrics.density).toInt()
        text.isEnabled = row.option?.enabled ?: true
        text.tag = row.option?.let { PickerRowTag(it.id, revision) }
        text.setTypeface(null, if (row.option == null) Typeface.BOLD else Typeface.NORMAL)
        if (Build.VERSION.SDK_INT >= 28) text.isAccessibilityHeading = row.option == null
        if (text is CheckedTextView) text.isChecked = row.option?.selected == true
        return text
      }
    }
    var ownedDialog: AlertDialog? = null
    fun ownsPresentation() = active && dialog === ownedDialog && close === state && state.session == sessionId
    val builder = AlertDialog.Builder(themed).setAdapter(listAdapter, null)
      .setTitle(title.ifEmpty { null })
      .setNegativeButton(cancelText.ifEmpty { themed.getString(android.R.string.cancel) }) { _, _ -> if (ownsPresentation()) closePicker("cancel", true) }
    if (multiple) builder.setPositiveButton(doneText.ifEmpty { themed.getString(android.R.string.ok) }) { _, _ -> if (ownsPresentation()) closePicker("done", true) }
    val current = builder.create()
    ownedDialog = current
    current.setOnCancelListener {
      if (ownsPresentation()) { state.reason = "cancel"; presentation.consume(state.session, sessionId) }
    }
    current.setOnDismissListener {
      if (state.reported) return@setOnDismissListener
      state.reported = true; closing.remove(state)
      if (dialog === current) { dialog = null; adapter = null; close = null }
      if (state.notify) {
        presentation.consume(state.session, sessionId)
        emit("topPickerDismiss", state.session, state.reason)
      }
      presentationEvent(state.session, "dismissed", state.reason, state.terminal)
      acknowledgeIdle()
    }
    dialog = current; close = state; adapter = listAdapter; configuration = nextConfiguration
    try { current.show() } catch (_: android.view.WindowManager.BadTokenException) {
      dialog = null; adapter = null; close = null; state.notify = false; unavailable(); return
    }
    presentationEvent(state.session, "presented", "", false)
    current.listView.setOnItemClickListener { _, view, _, _ ->
      val tag = view.tag as? PickerRowTag ?: return@setOnItemClickListener
      if (!active || dialog !== current || state.session != sessionId || tag.revision != revision) return@setOnItemClickListener
      val option = options.firstOrNull { it.id == tag.id && it.enabled } ?: return@setOnItemClickListener
      val selected = if (multiple) !option.selected else true
      if (selected != option.selected) emit("topPickerSelection", state.session, option = option, selected = selected)
      // Authored props own checkmarks, including a controlled caller declining a change.
      listAdapter.notifyDataSetChanged()
      if (!multiple) closePicker("selected", true)
    }
    val selectedIndex = rows.indexOfFirst { it.option?.selected == true }
    if (selectedIndex >= 0) current.listView.setSelection(selectedIndex)
  }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (!observing) { reactContext.addLifecycleEventListener(this); observing = true }
    syncPicker()
  }
  override fun onDetachedFromWindow() { closePicker("unavailable", true); stopObserving(); super.onDetachedFromWindow() }
  private fun stopObserving() { if (observing) { reactContext.removeLifecycleEventListener(this); observing = false } }
  fun dispose() { active = false; closePicker("unavailable", false); stopObserving() }
  override fun onHostPause() { closePicker("background", true) }
  override fun onHostResume() { syncPicker() }
  override fun onHostDestroy() { closePicker("unavailable", true); stopObserving() }
}
