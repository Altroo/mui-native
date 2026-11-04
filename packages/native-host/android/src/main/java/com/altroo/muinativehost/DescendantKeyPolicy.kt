/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
package com.altroo.muinativehost

internal val descendantNavigationKeys = setOf(
  "Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "Backspace", "PageUp", "PageDown", "Home", "End", "Enter",
)

/** Boundary commands must inspect the actual known editor, before native defaults. */
internal fun descendantCaretEligible(key: String, start: Int?, end: Int?, length: Int? = null) = when (key) {
  "ArrowLeft" -> start == 0 && end == 0
  "Backspace" -> length == 0 && start == 0 && end == 0
  else -> true
}

internal data class DescendantPhysicalKey(val device: Int, val code: Int, val downTime: Long)
/** Stable for one physical press, distinct across devices and replacement downs. */
internal fun DescendantPhysicalKey.sequenceToken() = "$device:$code:$downTime"
internal data class DescendantKeyDecision<T>(val consumed: Boolean, val target: T? = null)

/**
 * A native down claims its whole physical sequence. Closing a popup must not
 * send the matching up/repeat to a newly focused editor or its default action.
 * Targets hold weak View references in the adapter; the policy owns no Views.
 */
internal class DescendantKeyPolicy<T> {
  private data class Held<T>(val downTime: Long, val target: T, var dispatchable: Boolean = true)
  private val held = mutableMapOf<Pair<Int, Int>, Held<T>>()
  val hasHeldKeys: Boolean get() = held.isNotEmpty()

  fun contains(key: DescendantPhysicalKey): Boolean =
    held[key.device to key.code]?.downTime == key.downTime
  fun targetFor(key: DescendantPhysicalKey): T? =
    held[key.device to key.code]?.takeIf { it.downTime == key.downTime }?.target

  fun dispatch(
    key: DescendantPhysicalKey,
    down: Boolean,
    repeat: Boolean,
    canceled: Boolean,
    candidate: T?,
    stillCurrent: (T) -> Boolean,
  ): DescendantKeyDecision<T> {
    val physical = key.device to key.code
    val previous = held[physical]
    if (previous?.downTime == key.downTime) {
      if (!down) held.remove(physical)
      if (canceled || !stillCurrent(previous.target)) previous.dispatchable = false
      return DescendantKeyDecision(true, previous.target.takeIf { previous.dispatchable })
    }
    // An orphan repeat/up cannot acquire a different owner. A fresh down
    // replaces a stale sequence for this physical key, not another device.
    if (!down || repeat) return DescendantKeyDecision(false)
    held.remove(physical)
    if (canceled || candidate == null) return DescendantKeyDecision(false)
    held[physical] = Held(key.downTime, candidate)
    return DescendantKeyDecision(true, candidate)
  }

  fun clear() = held.clear()
}
