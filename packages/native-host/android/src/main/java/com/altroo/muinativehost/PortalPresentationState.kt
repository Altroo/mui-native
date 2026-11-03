package com.altroo.muinativehost

internal data class PortalDecision(val presented: Boolean, val reason: String)
internal fun portalDecision(active: Boolean, attached: Boolean, containerFound: Boolean, sameWindow: Boolean, cycle: Boolean, hasBounds: Boolean, supportedContainer: Boolean = true): PortalDecision = when {
  !active -> PortalDecision(false, "inactive")
  !attached -> PortalDecision(false, "detached")
  !containerFound -> PortalDecision(false, "unavailable-container")
  !supportedContainer -> PortalDecision(false, "unsupported-container")
  !sameWindow -> PortalDecision(false, "different-window")
  cycle -> PortalDecision(false, "container-cycle")
  !hasBounds -> PortalDecision(false, "empty-container")
  else -> PortalDecision(true, "presented")
}
internal data class PortalLinear(val a: Double = 1.0, val b: Double = 0.0, val c: Double = 0.0, val d: Double = 1.0) {
  // A parent's transform multiplies the already-composed child transform on the left.
  fun child(child: PortalLinear) = PortalLinear(a*child.a+c*child.b, b*child.a+d*child.b, a*child.c+c*child.d, b*child.c+d*child.d)
}
