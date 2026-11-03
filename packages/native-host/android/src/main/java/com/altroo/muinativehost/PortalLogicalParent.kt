package com.altroo.muinativehost
import android.view.View
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
