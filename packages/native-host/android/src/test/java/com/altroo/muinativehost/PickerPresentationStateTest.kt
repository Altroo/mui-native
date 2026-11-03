package com.altroo.muinativehost

// Runs with JavaExec and Kotlin's standard checks. No Android runtime or test dependency.
fun main() {
  val state = PickerPresentationState()
  fun gate(session: String = "first", active: Boolean = true, attached: Boolean = true,
    visible: Boolean = true, resumed: Boolean = true, count: Int = 2, valid: Boolean = true) =
    state.gate(active, session, attached, visible, resumed, valid, count)
  check(gate(attached = false) == PickerGate.DETACHED)
  check(gate() == PickerGate.READY)
  // Clearing an already-presented list must be terminal, not an empty reload.
  check(gate(count = 0) == PickerGate.UNAVAILABLE)
  state.consume("first", "first")
  check(gate() == PickerGate.CONSUMED)
  // Reattachment/resync before the queued native OnDismiss must not reopen it.
  check(gate(attached = false) == PickerGate.DETACHED)
  check(gate() == PickerGate.CONSUMED)
  check(gate(active = false) == PickerGate.INACTIVE)
  check(gate() == PickerGate.READY)
  // A fresh background request is rejected even when the window is still visible.
  check(gate(session = "background", resumed = false) == PickerGate.BACKGROUND)
  state.consume("background", "background")
  check(gate(session = "background") == PickerGate.CONSUMED)
  check(gate(session = "replacement") == PickerGate.READY)
  state.consume("replacement", "replacement")
  state.consume("background", "replacement")
  check(gate(session = "replacement") == PickerGate.CONSUMED)
  check(gate(active = false) == PickerGate.INACTIVE)
  check(gate(visible = false) == PickerGate.UNAVAILABLE)
  check(gate(valid = false) == PickerGate.UNAVAILABLE)
  check(gate(session = "") == PickerGate.DETACHED)
  println("Native picker JVM policy: 16 lifecycle assertions passed; no Android UI executed.")
}
