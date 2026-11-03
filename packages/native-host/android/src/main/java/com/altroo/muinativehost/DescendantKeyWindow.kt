/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package com.altroo.muinativehost

import android.annotation.SuppressLint
import android.os.IBinder
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.Window
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.modal.ReactModalHostView
import java.lang.ref.WeakReference
import java.util.Collections
import java.util.IdentityHashMap
import java.util.WeakHashMap

/**
 * Claim only after installing a matching-window release boundary. A descendant
 * alone cannot observe UP after focus leaves its subtree. Every other Window
 * callback is delegated unchanged; the wrapper is removed when no key is held.
 * All access is on Android's UI thread.
 */
internal object DescendantKeyWindows {
  private val windows = WeakHashMap<IBinder, WeakReference<Window>>()
  private val captures = WeakHashMap<IBinder, WeakReference<Capture>>()
  private fun physical(event: KeyEvent) = DescendantPhysicalKey(event.deviceId, event.keyCode, event.downTime)

  fun claim(owner: AltrooMUIInteractiveView, event: KeyEvent): Boolean {
    val token = owner.windowToken ?: return false
    val window = matchingWindow(owner, token) ?: return false
    var capture = captures[token]?.get()
    if (capture == null || window.callback !== capture.callback) {
      val previous = window.callback ?: return false
      val activityWindow = (owner.context as? ThemedReactContext)?.currentActivity?.window
      capture = Capture(window, token, previous, preserveDialogEscape = window !== activityWindow)
      captures[token] = WeakReference(capture)
      window.callback = capture.callback
    }
    return capture.claim(owner, event)
  }

  fun released(owner: AltrooMUIInteractiveView, event: KeyEvent) {
    if (event.action != KeyEvent.ACTION_UP) return
    val token = owner.windowToken ?: return
    captures[token]?.get()?.retire(event)
  }

  private fun matchingWindow(owner: View, token: IBinder): Window? {
    windows[token]?.get()?.takeIf { it.decorView.windowToken == token }?.let { return it }
    val activity = (owner.context as? ThemedReactContext)?.currentActivity ?: return null
    val main = activity.window
    val found = main.takeIf { it.decorView.windowToken == token } ?: modalWindow(main.decorView, token,
      Collections.newSetFromMap(IdentityHashMap<View, Boolean>()))
    if (found != null) windows[token] = WeakReference(found)
    return found
  }

  // RN's pinned public getter exposes the real Dialog Window. Its testing
  // annotation is narrower than the public ABI; no hidden Android API or
  // reflection is used. Unknown application-owned windows are not intercepted.
  @SuppressLint("VisibleForTests")
  private fun modalWindow(view: View, token: IBinder, seen: MutableSet<View>): Window? {
    if (!seen.add(view)) return null
    if (view is ReactModalHostView) view.dialog?.window?.takeIf { it.decorView.windowToken == token }?.let { return it }
    if (view is ViewGroup) for (index in 0 until view.childCount) {
      modalWindow(view.getChildAt(index), token, seen)?.let { return it }
    }
    return null
  }

  private class Capture(window: Window, private val token: IBinder, private val previous: Window.Callback,
    private val preserveDialogEscape: Boolean) {
    private val windowReference = WeakReference(window)
    private val keys = DescendantKeyPolicy<WeakReference<AltrooMUIInteractiveView>>()
    val callback: Window.Callback = object : Window.Callback by previous {
      override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action != KeyEvent.ACTION_DOWN && event.action != KeyEvent.ACTION_UP) return previous.dispatchKeyEvent(event)
        val key = physical(event)
        val owner = keys.targetFor(key)?.get()
        val decision = keys.dispatch(key, event.action == KeyEvent.ACTION_DOWN, event.repeatCount > 0,
          event.isCanceled, null) { it.get()?.isAttachedToWindow == true }
        if (decision.consumed) {
          val nativeEscapeUp = preserveDialogEscape && event.action == KeyEvent.ACTION_UP && event.keyCode == KeyEvent.KEYCODE_ESCAPE
          // Even cancellation must retire the View's local ledger. A detached
          // owner is a tombstone: swallow the release without targeting B.
          if (owner?.isAttachedToWindow == true) {
            if (nativeEscapeUp) owner.retireDescendantSequence(event)
            else owner.dispatchDescendantKey(event, windowReference.get()?.decorView?.findFocus())
          }
          uninstallIfIdle()
          // RN Dialog owns Escape-up request-close before View dispatch. Keep
          // that established route; the JS window overlay defers closing to it.
          return if (nativeEscapeUp) previous.dispatchKeyEvent(event) else true
        }
        uninstallIfIdle()
        return previous.dispatchKeyEvent(event)
      }
    }
    fun claim(owner: AltrooMUIInteractiveView, event: KeyEvent): Boolean =
      keys.dispatch(physical(event), true, false, false, WeakReference(owner)) { it.get() === owner }.consumed

    fun retire(event: KeyEvent) {
      keys.dispatch(physical(event), false, false, event.isCanceled, null) { false }
      uninstallIfIdle()
    }

    private fun uninstallIfIdle() {
      if (keys.hasHeldKeys) return
      val current = windowReference.get()
      // An application may have installed another callback in the meantime.
      if (current?.callback === callback) current.callback = previous
      if (captures[token]?.get() === this) captures.remove(token)
    }
  }
}
