package com.altroo.muinativehost

internal enum class PickerGate { INACTIVE, DETACHED, CONSUMED, BACKGROUND, UNAVAILABLE, READY }

// Pure presentation policy, shared by all Android dialog/lifecycle entry points.
internal class PickerPresentationState {
  private var closedSession = ""
  fun consume(session: String, currentSession: String) {
    // A queued old OnDismiss must never unconsume a newer closed presentation.
    if (session == currentSession) closedSession = session
  }
  fun gate(active: Boolean, session: String, attached: Boolean, visible: Boolean,
    resumed: Boolean, validOptions: Boolean, optionCount: Int): PickerGate {
    if (!active) { closedSession = ""; return PickerGate.INACTIVE }
    if (session.isEmpty() || !attached) return PickerGate.DETACHED
    if (closedSession == session) return PickerGate.CONSUMED
    if (!resumed) return PickerGate.BACKGROUND
    if (!visible || !validOptions || optionCount == 0) return PickerGate.UNAVAILABLE
    return PickerGate.READY
  }
}
