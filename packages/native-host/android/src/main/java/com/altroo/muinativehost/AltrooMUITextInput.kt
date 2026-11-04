/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import android.graphics.Rect
import android.content.res.Configuration
import android.text.Editable
import com.facebook.react.uimanager.ReactStylesDiffMap
import java.util.WeakHashMap
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputConnectionWrapper
import android.view.inputmethod.BaseInputConnection
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.textinput.ReactEditText

/** Retain the stock editor; observe explicit backward-delete requests before their defaults. */
class AltrooMUITextInput(context: ThemedReactContext) : ReactEditText(context) {
  private data class EmptyEdit(val buffer: Editable, val counter: Int, val generation: Long, val owner: NativeInputBackspaceRequest, val metadata: NativeTextInputMetadata)
  private var emptyEdit: EmptyEdit? = null
  private var layoutMetadata: NativeTextInputMetadata? = null
  private var pendingMetadata: Pair<Any, NativeTextInputMetadata>? = null
  private var batchDepth = 0
  private var connectionGeneration = 0L
  internal fun retireEmptyEdit() { emptyEdit = null }
  internal fun needsLayoutMetadata() = logicalKeyOwner(this, "Backspace") != null
  private fun rememberEmptyEdit() {
    if (batchDepth != 0) return
    val boundary = request() ?: return
    val metadata = layoutMetadata ?: return
    emptyEdit = EmptyEdit(editableText, nativeEventCount, connectionGeneration, boundary, metadata)
  }
  internal fun acceptsAcknowledgementProps(props: ReactStylesDiffMap): Boolean {
    if (emptyEdit == null) return true
    return try { props.toMap().keys.all { it == "text" || it == "mostRecentEventCount" || it == "accessibilityState" } }
      catch (_: UnsupportedOperationException) { false }
  }
  /** A native edit already refreshed RN's span cache. Accept its value-equal,
   * counter-exact Fabric acknowledgement without resetting the empty Editable:
   * stock setText(null) invalidates the IME and can cancel the next Gboard key.
   * Any layout/editing prop, command, composition or ownership change delegates.
   * This intentionally preserves the buffer/undo state for this acknowledgement. */
  internal fun acknowledgeEmptyEdit(update: Any, props: ReactStylesDiffMap, metadata: NativeTextInputMetadata?): Boolean {
    val edit = emptyEdit
    if (metadata == null) layoutMetadata = null
    val compatibleProps = acceptsAcknowledgementProps(props)
    emptyEdit = null
    val accepted = edit != null && metadata != null && metadata == edit.metadata &&
      edit.generation == connectionGeneration && edit.buffer === editableText && edit.counter == nativeEventCount &&
      batchDepth == 0 && edit.owner.canAcknowledge() && AltrooTextInputState.isEmptyAcknowledgement(update, edit.counter, breakStrategy) && compatibleProps
    pendingMetadata = if (!accepted && metadata != null) Pair(update, metadata) else null
    return accepted
  }
  internal fun completeStateUpdate(update: Any) {
    val pending = pendingMetadata ?: return
    if (pending.first !== update) return
    pendingMetadata = null
    if (AltrooTextInputState.isCurrentUpdate(update, nativeEventCount, breakStrategy, editableText)) layoutMetadata = pending.second
  }
  override fun onTextChanged(value: CharSequence?, start: Int, before: Int, count: Int) {
    retireEmptyEdit()
    super.onTextChanged(value, start, before, count)
  }
  override fun onSelectionChanged(selStart: Int, selEnd: Int) {
    if (selStart != 0 || selEnd != 0) retireEmptyEdit()
    super.onSelectionChanged(selStart, selEnd)
  }
  override fun onConfigurationChanged(newConfig: Configuration) {
    retireEmptyEdit()
    super.onConfigurationChanged(newConfig)
  }
  override fun onRtlPropertiesChanged(direction: Int) {
    retireEmptyEdit()
    super.onRtlPropertiesChanged(direction)
  }
  // Identity, not timestamps or key fields, binds queued IME delivery to its
  // originating connection. A platform copy safely keeps the ordinary default.
  private val pendingDeletes = WeakHashMap<KeyEvent, Long>()
  override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
    pendingDeletes.clear()
    retireEmptyEdit()
    val generation = ++connectionGeneration
    val target = super.onCreateInputConnection(outAttrs) ?: return null
    return when {
      android.os.Build.VERSION.SDK_INT >= 34 -> DeleteConnection34(target, generation)
      android.os.Build.VERSION.SDK_INT >= 33 -> DeleteConnection33(target, generation)
      else -> DeleteConnection(target, generation)
    }
  }
  override fun onDetachedFromWindow() {
    connectionGeneration++
    retireEmptyEdit()
    pendingDeletes.clear()
    super.onDetachedFromWindow()
  }
  override fun onFocusChanged(focused: Boolean, direction: Int, previouslyFocusedRect: Rect?) {
    if (!focused) { pendingDeletes.clear(); retireEmptyEdit() }
    super.onFocusChanged(focused, direction, previouslyFocusedRect)
  }
  override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
    if (!hasWindowFocus) { pendingDeletes.clear(); retireEmptyEdit() }
    super.onWindowFocusChanged(hasWindowFocus)
  }
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    val origin = pendingDeletes.remove(event)
    if (origin == connectionGeneration && keyCode == KeyEvent.KEYCODE_DEL && event.flags and KeyEvent.FLAG_SOFT_KEYBOARD != 0 && !event.isCanceled) {
      val notify = request(event)
      if (notify != null) {
        // Claim at actual dispatch time. IMM delivery is asynchronous: emitting
        // earlier would let a queued native default delete newly authored text.
        notify()
        return true
      }
    }
    val before = length()
    val result = super.onKeyDown(keyCode, event)
    if (origin == connectionGeneration && keyCode == KeyEvent.KEYCODE_DEL && before > 0 && length() == 0) rememberEmptyEdit()
    return result
  }
  private fun request(event: KeyEvent? = null): NativeInputBackspaceRequest? {
    if (!hasFocus() || !hasWindowFocus() || !isEnabled || length() != 0 || selectionStart != 0 || selectionEnd != 0 ||
        BaseInputConnection.getComposingSpanStart(editableText) >= 0 || BaseInputConnection.getComposingSpanEnd(editableText) >= 0) return null
    return logicalKeyOwner(this, "Backspace")?.inputBackspaceRequest(this, event)
  }
  private open inner class DeleteConnection(target: InputConnection, private val generation: Long) :
      InputConnectionWrapper(target, false) {
    private var closed = false
    private var localBatchDepth = 0
    private fun current() = !closed && generation == connectionGeneration && isAttachedToWindow
    // Retirement revokes only our added command ownership. The original
    // connection still decides ordinary editing and its own return values.
    override fun deleteSurroundingText(beforeLength: Int, afterLength: Int): Boolean {
      retireEmptyEdit()
      val notify = if (current() && beforeLength > 0 && afterLength == 0) request() else null
      val oldLength = length()
      val result = super.deleteSurroundingText(beforeLength, afterLength)
      if (result && current()) {
        if (beforeLength > 0 && afterLength == 0 && oldLength > 0 && length() == 0) rememberEmptyEdit()
        notify?.invoke()
      }
      return result
    }
    override fun deleteSurroundingTextInCodePoints(beforeLength: Int, afterLength: Int): Boolean {
      retireEmptyEdit()
      val notify = if (current() && beforeLength > 0 && afterLength == 0) request() else null
      val oldLength = length()
      val result = super.deleteSurroundingTextInCodePoints(beforeLength, afterLength)
      if (result && current()) {
        if (beforeLength > 0 && afterLength == 0 && oldLength > 0 && length() == 0) rememberEmptyEdit()
        notify?.invoke()
      }
      return result
    }
    override fun sendKeyEvent(event: KeyEvent): Boolean {
      if (event.keyCode != KeyEvent.KEYCODE_DEL) return super.sendKeyEvent(event)
      // InputConnection DEL is an IME event even when the sender omits its flag.
      // Keep it out of the separate hardware bridge; forward an immutable copy
      // with all key/modifier/time fields retained and notify this route once.
      // Android strips FROM_SYSTEM on IME dispatch. Normalize it before
      // recording identity so that mandatory sanitization needs no later copy.
      val forwarded = KeyEvent.changeFlags(event, (event.flags or KeyEvent.FLAG_SOFT_KEYBOARD) and KeyEvent.FLAG_FROM_SYSTEM.inv())
      if (current() && event.action == KeyEvent.ACTION_DOWN && hasFocus() && hasWindowFocus()) {
        // Bound missing deliveries without retaining controls or event objects.
        if (pendingDeletes.size >= 64) pendingDeletes.clear()
        pendingDeletes[forwarded] = generation
      }
      // BaseInputConnection queues delivery and returns false. Preserve that
      // result; the managed editor owns a request only when it receives DOWN.
      return try { super.sendKeyEvent(forwarded) } catch (error: Throwable) {
        pendingDeletes.remove(forwarded)
        throw error
      }
    }
    override fun beginBatchEdit(): Boolean {
      retireEmptyEdit()
      val result = try { super.beginBatchEdit() } catch (error: Throwable) { batchDepth = -1; throw error }
      if (result) {
        localBatchDepth++
        batchDepth = if (batchDepth in 0..255) batchDepth + 1 else -1
      }
      return result
    }
    override fun endBatchEdit(): Boolean {
      retireEmptyEdit()
      return try { super.endBatchEdit().also {
        // false also denotes a successfully closed outermost batch.
        if (localBatchDepth > 0) { localBatchDepth--; if (batchDepth > 0) batchDepth-- }
      } } catch (error: Throwable) { batchDepth = -1; throw error }
    }
    override fun commitText(text: CharSequence, cursor: Int): Boolean {
      retireEmptyEdit()
      return super.commitText(text, cursor)
    }
    override fun setComposingText(text: CharSequence, cursor: Int): Boolean {
      retireEmptyEdit()
      return super.setComposingText(text, cursor)
    }
    override fun setComposingRegion(start: Int, end: Int): Boolean {
      retireEmptyEdit()
      return super.setComposingRegion(start, end)
    }
    override fun finishComposingText(): Boolean {
      retireEmptyEdit()
      return super.finishComposingText()
    }
    override fun closeConnection() {
      retireEmptyEdit()
      closed = true
      if (generation == connectionGeneration) connectionGeneration++
      try {
        super.closeConnection()
        if (batchDepth >= 0) batchDepth = (batchDepth - localBatchDepth).coerceAtLeast(0)
        localBatchDepth = 0
      } catch (error: Throwable) { batchDepth = -1; throw error }
    }
    // Empty replacements/cleanup retire only the optional acknowledgement;
    // their original editing behavior and return values always delegate.
  }
  @android.annotation.TargetApi(33)
  private open inner class DeleteConnection33(target: InputConnection, generation: Long) : DeleteConnection(target, generation) {
    override fun commitText(text: CharSequence, cursor: Int, attributes: android.view.inputmethod.TextAttribute?): Boolean {
      retireEmptyEdit(); return super.commitText(text, cursor, attributes)
    }
    override fun setComposingText(text: CharSequence, cursor: Int, attributes: android.view.inputmethod.TextAttribute?): Boolean {
      retireEmptyEdit(); return super.setComposingText(text, cursor, attributes)
    }
    override fun setComposingRegion(start: Int, end: Int, attributes: android.view.inputmethod.TextAttribute?): Boolean {
      retireEmptyEdit(); return super.setComposingRegion(start, end, attributes)
    }
  }
  @android.annotation.TargetApi(34)
  private inner class DeleteConnection34(target: InputConnection, generation: Long) : DeleteConnection33(target, generation) {
    override fun replaceText(start: Int, end: Int, text: CharSequence, cursor: Int, attributes: android.view.inputmethod.TextAttribute?): Boolean {
      retireEmptyEdit(); return super.replaceText(start, end, text, cursor, attributes)
    }
  }
}
