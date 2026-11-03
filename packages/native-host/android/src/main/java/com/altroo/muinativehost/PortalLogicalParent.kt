/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost
import android.view.View
import android.view.KeyEvent
internal interface PortalLogicalParent { val portalSource: View? }
internal fun logicalParent(view: View): View? = if (view is PortalLogicalParent) view.portalSource else view.parent as? View
internal fun logicalKeyOwner(focused: View, key: String): AltrooMUIInteractiveView? {
  if (focused is AltrooMUIInteractiveView) return null
  var current: View? = focused
  val seen = HashSet<View>()
  while (current != null && seen.add(current)) {
    if (current is AltrooMUIInteractiveView && key in current.managedDescendantKeys) return current
    current = logicalParent(current)
  }
  return null
}
/** Finish a claimed sequence before a new declaration can acquire its repeat/up. */
internal fun logicalKeySequenceOwner(focused: View, event: KeyEvent): AltrooMUIInteractiveView? {
  var current: View? = focused
  val seen = HashSet<View>()
  while (current != null && seen.add(current)) {
    if (current is AltrooMUIInteractiveView && current.ownsDescendantSequence(event)) return current
    current = logicalParent(current)
  }
  return null
}
