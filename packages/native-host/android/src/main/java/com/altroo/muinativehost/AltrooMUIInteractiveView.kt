/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import android.content.res.ColorStateList
import android.util.TypedValue
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.RippleDrawable
import android.view.KeyEvent
import android.view.inputmethod.BaseInputConnection
import android.widget.EditText
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.IllegalViewOperationException
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup
import java.lang.ref.WeakReference

internal fun interactiveKeyName(event: KeyEvent): String = when (event.keyCode) {
  KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_DPAD_CENTER -> "Enter"
  KeyEvent.KEYCODE_SPACE -> " "
  KeyEvent.KEYCODE_TAB -> "Tab"
  KeyEvent.KEYCODE_ESCAPE -> "Escape"
  KeyEvent.KEYCODE_DPAD_UP -> "ArrowUp"
  KeyEvent.KEYCODE_DPAD_DOWN -> "ArrowDown"
  KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
  KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
  KeyEvent.KEYCODE_PAGE_UP -> "PageUp"
  KeyEvent.KEYCODE_PAGE_DOWN -> "PageDown"
  KeyEvent.KEYCODE_MOVE_HOME -> "Home"
  KeyEvent.KEYCODE_MOVE_END -> "End"
  KeyEvent.KEYCODE_DEL -> "Backspace"
  KeyEvent.KEYCODE_FORWARD_DEL -> "Delete"
  else -> { val character = event.getUnicodeChar(event.metaState and (KeyEvent.META_CTRL_MASK or KeyEvent.META_META_MASK or KeyEvent.META_ALT_MASK).inv()); if(character > 0) String(Character.toChars(character)) else "Unidentified" }
}

internal class HostEvent(surface: Int, tag: Int, private val name: String, private val data: WritableMap, private val discrete: Boolean = false) : Event<HostEvent>(surface, tag) {
  override fun getEventName() = name
  override fun canCoalesce() = false
  override fun getEventData() = data
  // RN RawEvent::Category::Discrete. The category constants are Kotlin-internal.
  override fun getEventCategory(): Int = if (discrete) 3 else super.getEventCategory()
}
/** A weak, revocable native boundary shared by delivery and text-state acknowledgement. */
internal class NativeInputBackspaceRequest(private val current: () -> Boolean, private val acknowledgement: () -> Boolean, private val deliver: () -> Unit) {
  fun canAcknowledge() = acknowledgement()
  operator fun invoke() { if (current()) deliver() }
}
class AltrooMUIInteractiveView(context: ThemedReactContext) : ReactViewGroup(context) {
  private var drawableDirection: Int? = null
  private fun invalidateDirectionDrawable(drawable: Drawable?) {
    if (drawable is LayerDrawable) {
      for (index in 0 until drawable.numberOfLayers) {
        invalidateDirectionDrawable(drawable.getDrawable(index))
      }
    }
    drawable?.invalidateSelf()
  }
  override fun onRtlPropertiesChanged(layoutDirection: Int) {
    super.onRtlPropertiesChanged(layoutDirection)
    if (drawableDirection == layoutDirection) return
    drawableDirection = layoutDirection
    // RN 0.88 caches resolved background/border paths without invalidating them
    // when Drawable.layoutDirection changes. Dirty the actual layers so a live
    // direction update repaints their logical corners/insets on this same view.
    invalidateDirectionDrawable(background)
    invalidateDirectionDrawable(foreground)
  }
  var nativeTabIndex = 0
  var managedKeys: Set<String> = emptySet()
  var managedDescendantKeys: Set<String> = emptySet()
    set(value) {
      if (("Backspace" in field) != ("Backspace" in value)) inputBackspaceDeclarationRevision++
      if (field != value) descendantDeclarationRevision++
      field = value
      syncDescendantFocusObserver()
    }
  var allowKeyboardFocus = true
  var rippleEnabled = false
  var rippleColor: Int? = null
  var rippleRadius = -1f
  var rippleForeground = false
  private var focusOnAttach = false
  var rippleBorderless = false
  private var ripple: RippleDrawable? = null
  private var descendantDeclarationRevision = 0L
  // A value acknowledgement emits no key. Unrelated Enter/navigation changes
  // do not revoke it; removing/reintroducing Backspace always does.
  private var inputBackspaceDeclarationRevision = 0L
  private var descendantFocusRevision = 0L
  private var descendantFocusObserver: ViewTreeObserver? = null
  private val descendantFocusListener = ViewTreeObserver.OnGlobalFocusChangeListener { old, next ->
    if (old !== next) descendantFocusRevision++
  }
  private data class DescendantTarget(val source: WeakReference<View>, val target: WeakReference<View>,
    val tag: Int, val declarationRevision: Long, val focusRevision: Long)
  private val descendantSequences = DescendantKeyPolicy<DescendantTarget>()
  private fun physicalKey(event: KeyEvent) = DescendantPhysicalKey(event.deviceId, event.keyCode, event.downTime)
  internal fun ownsDescendantSequence(event: KeyEvent) = descendantSequences.contains(physicalKey(event))
  private fun syncDescendantFocusObserver() {
    val needed = isAttachedToWindow && (managedDescendantKeys.isNotEmpty() || descendantSequences.hasHeldKeys)
    if (needed && descendantFocusObserver == null) {
      viewTreeObserver.addOnGlobalFocusChangeListener(descendantFocusListener)
      descendantFocusObserver = viewTreeObserver
    } else if (!needed) {
      descendantFocusObserver?.takeIf { it.isAlive }?.removeOnGlobalFocusChangeListener(descendantFocusListener)
      descendantFocusObserver = null
    }
  }
  private fun emit(name: String, data: WritableMap) {
    val context = context as ThemedReactContext
    UIManagerHelper.getEventDispatcher(context)?.dispatchEvent(HostEvent(UIManagerHelper.getSurfaceId(context), id, name, data))
  }
  private fun codeName(event: KeyEvent, key: String): String = when {
    event.keyCode in KeyEvent.KEYCODE_A..KeyEvent.KEYCODE_Z -> "Key" + ('A'.code + event.keyCode - KeyEvent.KEYCODE_A).toChar()
    event.keyCode in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 -> "Digit" + (event.keyCode - KeyEvent.KEYCODE_0)
    event.keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER -> "NumpadEnter"
    key == " " -> "Space"
    else -> key
  }
  private fun isManaged(key: String): Boolean {
    if (key == "Enter" || key == " ") return true
    var view: View? = this
    while(view != null) {
      if(view is AltrooMUIInteractiveView && key in view.managedKeys) return true
      view = logicalParent(view)
    }
    return false
  }
  private fun descendantOwner(focused: View, key: String) = logicalKeyOwner(focused, key)
  private fun reactTarget(focused: View): View? {
    val manager = UIManagerHelper.getUIManager(context as ThemedReactContext, UIManagerType.FABRIC) ?: return null
    var current: View? = focused
    while (current != null && current !== this) {
      if (current.id != View.NO_ID) {
        try { if (manager.resolveView(current.id) === current) return current }
        catch (_: IllegalViewOperationException) { /* Pure native subview; use its React component. */ }
      }
      current = logicalParent(current)
    }
    return null
  }
  internal fun dispatchDescendantKey(event: KeyEvent, focused: View?): Boolean {
    val key = interactiveKeyName(event)
    val editor = focused?.onCheckIsTextEditor() == true
    val composing = focused is EditText &&
      (BaseInputConnection.getComposingSpanStart(focused.editableText) >= 0 || BaseInputConnection.getComposingSpanEnd(focused.editableText) >= 0)
    // Inspect only known editor composition APIs. A claimed sequence is still
    // consumed after a close/composition change, but cannot notify another target.
    val caretEligible = descendantCaretEligible(key, (focused as? EditText)?.selectionStart,
      (focused as? EditText)?.selectionEnd, (focused as? EditText)?.length())
    val eligible = focused != null && caretEligible && descendantOwner(focused, key) === this &&
      event.flags and KeyEvent.FLAG_SOFT_KEYBOARD == 0 && !composing && (!editor || focused is EditText)
    val target = if (eligible) reactTarget(focused!!) else null
    val reactContext = context as ThemedReactContext
    val dispatcher = UIManagerHelper.getEventDispatcher(reactContext)
    val surface = target?.let { UIManagerHelper.getSurfaceId(it) } ?: -1
    var candidate = if (target != null && dispatcher != null && surface >= 0)
      DescendantTarget(WeakReference(focused!!), WeakReference(target), target.id,
        descendantDeclarationRevision, descendantFocusRevision) else null
    if (candidate != null && event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0 &&
        !event.isCanceled && !ownsDescendantSequence(event) && !DescendantKeyWindows.claim(this, event)) candidate = null
    val decision = descendantSequences.dispatch(physicalKey(event), event.action == KeyEvent.ACTION_DOWN,
      event.repeatCount > 0, event.isCanceled, candidate) { previous ->
        candidate != null && previous.source.get() === focused && previous.target.get() === target && previous.tag == target!!.id &&
          previous.declarationRevision == descendantDeclarationRevision && previous.focusRevision == descendantFocusRevision
      }
    syncDescendantFocusObserver()
    DescendantKeyWindows.released(this, event)
    if (!decision.consumed) return false
    if (decision.target == null) return true
    val data = Arguments.createMap().apply {
      putString("key", key); putString("code", codeName(event,key))
      putBoolean("altKey",event.isAltPressed); putBoolean("ctrlKey",event.isCtrlPressed)
      putBoolean("metaKey",event.isMetaPressed); putBoolean("shiftKey",event.isShiftPressed)
      putBoolean("repeat",event.repeatCount > 0); putBoolean("isComposing",false); putBoolean("isCanceled",event.isCanceled)
      putString("muiKeySource","hardware"); putString("muiKeySequence",physicalKey(event).sequenceToken()); putBoolean("isEditable",editor); putInt("target",target!!.id)
    }
    dispatcher!!.dispatchEvent(HostEvent(surface,target!!.id,if(event.action == KeyEvent.ACTION_DOWN) "topKeyDown" else "topKeyUp",data,true))
    return true
  }
  /** Capture the native boundary before an input-method default can change it. */
  internal fun inputBackspaceRequest(source: EditText, event: KeyEvent?): NativeInputBackspaceRequest? {
    fun eligible(host: AltrooMUIInteractiveView, input: EditText) =
      host.isAttachedToWindow && input.isAttachedToWindow && input.hasFocus() && input.hasWindowFocus() && input.isEnabled &&
        host.descendantOwner(input, "Backspace") === host &&
        descendantCaretEligible("Backspace", input.selectionStart, input.selectionEnd, input.length()) &&
        BaseInputConnection.getComposingSpanStart(input.editableText) < 0 && BaseInputConnection.getComposingSpanEnd(input.editableText) < 0
    if (!eligible(this, source)) return null
    val target = reactTarget(source) ?: return null
    val window = source.windowToken ?: return null
    val ownerRef = WeakReference(this); val sourceRef = WeakReference(source); val targetRef = WeakReference(target); val windowRef = WeakReference(window)
    val tag = target.id; val declaration = descendantDeclarationRevision; val inputDeclaration = inputBackspaceDeclarationRevision; val focus = descendantFocusRevision
    val current = current@{ acknowledgement: Boolean ->
      val host = ownerRef.get() ?: return@current false
      val input = sourceRef.get() ?: return@current false
      val actualTarget = targetRef.get() ?: return@current false
      val actualWindow = windowRef.get() ?: return@current false
      eligible(host, input) && (if (acknowledgement) host.inputBackspaceDeclarationRevision == inputDeclaration else host.descendantDeclarationRevision == declaration) && host.descendantFocusRevision == focus &&
        input.windowToken === actualWindow && actualTarget.id == tag && host.reactTarget(input) === actualTarget
    }
    return NativeInputBackspaceRequest({ current(false) }, { current(true) }) deliver@{
      val host = ownerRef.get() ?: return@deliver
      val actualTarget = targetRef.get() ?: return@deliver
      val dispatcher = UIManagerHelper.getEventDispatcher(host.context as ThemedReactContext) ?: return@deliver
      val surface = UIManagerHelper.getSurfaceId(actualTarget); if (surface < 0) return@deliver
      val data = Arguments.createMap().apply {
        putString("key", "Backspace"); putString("code", if (event == null) "Unidentified" else "Backspace")
        putBoolean("altKey", event?.isAltPressed ?: false); putBoolean("ctrlKey", event?.isCtrlPressed ?: false)
        putBoolean("metaKey", event?.isMetaPressed ?: false); putBoolean("shiftKey", event?.isShiftPressed ?: false)
        if (event != null) putBoolean("repeat", event.repeatCount > 0)
        putBoolean("isComposing", false); putBoolean("isCanceled", false)
        putString("muiKeySource", "input"); putBoolean("isEditable", true); putInt("target", tag)
      }
      dispatcher.dispatchEvent(HostEvent(surface, tag, "topKeyDown", data, true))
    }
  }
  override fun dispatchKeyEventPreIme(event: KeyEvent): Boolean {
    if (event.action !in listOf(KeyEvent.ACTION_DOWN, KeyEvent.ACTION_UP)) return super.dispatchKeyEventPreIme(event)
    // A recently blurred editor can leave its IME connection active briefly.
    // Offer held sequences to their original owner before any newly focused
    // host can see the release. Undeclared editor defaults still reach the IME.
    if (DescendantKeyWindows.dispatchHeld(this, event)) return true
    val focused = findFocus()
    if (focused === this) {
      if (event.flags and KeyEvent.FLAG_SOFT_KEYBOARD == 0 && isManaged(interactiveKeyName(event))) return dispatchKeyEvent(event)
    } else if (dispatchDescendantKey(event, focused)) return true
    return super.dispatchKeyEventPreIme(event)
  }
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if(event.action !in listOf(KeyEvent.ACTION_DOWN,KeyEvent.ACTION_UP)) return super.dispatchKeyEvent(event)
    val focused = findFocus()
    if (focused !== this || ownsDescendantSequence(event)) {
      if (dispatchDescendantKey(event,focused)) return true
      return super.dispatchKeyEvent(event)
    }
    val key = interactiveKeyName(event)
    val data = Arguments.createMap().apply {
      putString("key",key); putString("code",codeName(event,key)); putBoolean("altKey",event.isAltPressed)
      putBoolean("ctrlKey",event.isCtrlPressed); putBoolean("metaKey",event.isMetaPressed); putBoolean("shiftKey",event.isShiftPressed)
      putBoolean("repeat",event.repeatCount > 0); putBoolean("isComposing",false); putBoolean("isCanceled",event.isCanceled)
    }
    data.putString("muiKeySource","hardware")
    emit(if(event.action == KeyEvent.ACTION_DOWN) "topMUIKeyDown" else "topMUIKeyUp",data)
    // JavaScript owns these keys. Never also call View's native performClick path.
    return if(isManaged(key)) true else super.dispatchKeyEvent(event)
  }
  override fun onFocusChanged(gainFocus: Boolean, direction: Int, previous: Rect?) {
    super.onFocusChanged(gainFocus,direction,previous)
    emit(if(gainFocus) "topMUIFocus" else "topMUIBlur",Arguments.createMap().apply { putInt("target",id); putString("muiFocusSource","owned") })
  }
  override fun addFocusables(views: ArrayList<View>?, direction: Int, mode: Int) {
    if(allowKeyboardFocus && nativeTabIndex >= 0) super.addFocusables(views,direction,mode)
    else if(views != null) {
      val descendants=ArrayList<View>()
      super.addFocusables(descendants,direction,mode)
      descendants.remove(this)
      views.addAll(descendants)
    }
  }
  fun requestManagedFocus() {
    if(!allowKeyboardFocus) return
    if(!isAttachedToWindow) { focusOnAttach = true; return }
    focusOnAttach = false
    isFocusable = true; isFocusableInTouchMode = true; requestFocus()
  }
  fun clearManagedFocus() { focusOnAttach = false; clearFocus() }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); syncDescendantFocusObserver(); if(focusOnAttach) requestManagedFocus() }
  override fun onDetachedFromWindow() {
    descendantSequences.clear()
    descendantFocusObserver?.takeIf { it.isAlive }?.removeOnGlobalFocusChangeListener(descendantFocusListener)
    descendantFocusObserver = null
    isPressed=false; ripple?.jumpToCurrentState(); super.onDetachedFromWindow()
  }
  fun updateRipple() {
    ripple?.callback = null
    val color = rippleColor ?: TypedValue().let { attribute ->
      if(context.theme.resolveAttribute(android.R.attr.colorControlHighlight,attribute,true)) {
        if(attribute.resourceId != 0) context.getColor(attribute.resourceId) else attribute.data
      } else 0x1f000000
    }
    ripple = if(!rippleEnabled) null else run { RippleDrawable(ColorStateList.valueOf(color),null,if(rippleBorderless) null else ColorDrawable(-1)).also {
      it.callback = this; it.setBounds(0,0,width,height); if(rippleRadius >= 0) it.radius = rippleRadius.toInt()
    } }
    invalidate()
  }
  override fun drawableStateChanged() { super.drawableStateChanged(); ripple?.state = drawableState }
  override fun verifyDrawable(drawable: Drawable): Boolean = drawable === ripple || super.verifyDrawable(drawable)
  override fun dispatchDraw(canvas: Canvas) { if(!rippleForeground) ripple?.draw(canvas); super.dispatchDraw(canvas); if(rippleForeground) ripple?.draw(canvas) }
  override fun onSizeChanged(w: Int,h: Int,oldw: Int,oldh: Int) { super.onSizeChanged(w,h,oldw,oldh); ripple?.setBounds(0,0,w,h) }
  fun setManagedHotspot(x: Float,y: Float) { ripple?.setHotspot(x,y) }
}
