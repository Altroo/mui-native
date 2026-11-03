package com.altroo.muinativehost

// Real attachment-gate and affine-order checks without Android UI or another test dependency.
fun main() {
  fun gate(active: Boolean = true, attached: Boolean = true, found: Boolean = true, same: Boolean = true, cycle: Boolean = false, bounds: Boolean = true, supported: Boolean = true) = portalDecision(active, attached, found, same, cycle, bounds, supported)
  check(gate().presented)
  check(gate(active=false).reason == "inactive")
  check(gate(attached=false).reason == "detached")
  check(gate(found=false).reason == "unavailable-container")
  check(gate(same=false).reason == "different-window")
  check(gate(cycle=true).reason == "container-cycle")
  check(gate(bounds=false).reason == "empty-container")
  check(gate(supported=false).reason == "unsupported-container")
  // A missing/unsupported container must not fall back to a different window.
  check(!gate(found=false, same=true).presented)
  check(!gate(supported=false, bounds=true).presented)
  // An inactive/detached portal never proceeds to a stale target.
  check(gate(active=false, found=false, cycle=true).reason == "inactive")
  check(gate(attached=false, found=false).reason == "detached")
  fun same(actual: PortalLinear, expected: PortalLinear) {
    check(kotlin.math.abs(actual.a-expected.a) < 1e-10 && kotlin.math.abs(actual.b-expected.b) < 1e-10 && kotlin.math.abs(actual.c-expected.c) < 1e-10 && kotlin.math.abs(actual.d-expected.d) < 1e-10)
  }
  val scale = PortalLinear(a=2.0,d=3.0)
  val rotate = PortalLinear(a=0.0,b=1.0,c=-1.0,d=0.0)
  same(rotate.child(scale), PortalLinear(a=0.0,b=2.0,c=-3.0,d=0.0))
  same(scale.child(rotate), PortalLinear(a=0.0,b=3.0,c=-2.0,d=0.0))
  same(PortalLinear().child(scale), scale)
  same(rotate.child(PortalLinear()), rotate)
  same(rotate.child(rotate), PortalLinear(a=-1.0,b=0.0,c=0.0,d=-1.0))
  println("Native portal JVM policy: 17 attachment/affine assertions passed; no Android UI executed.")
}
