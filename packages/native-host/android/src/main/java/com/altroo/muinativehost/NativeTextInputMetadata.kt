/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import com.facebook.react.common.mapbuffer.MapBuffer

/** Value snapshots compare complete attributed text and paragraph metadata.
 * ReadableMapBuffer.equals compares its backing buffer, including unrelated
 * parent fields, so nested buffers need structural snapshots instead. */
internal data class NativeTextInputMetadata(val attributes: List<MetadataEntry>, val paragraph: List<MetadataEntry>)
internal data class MetadataEntry(val key: Int, val type: MapBuffer.DataType, val value: Any)
private class MetadataLimit : RuntimeException()
private class MetadataBudget(var remaining: Int = 512) {
  fun take(count: Int) { remaining -= count; if (remaining < 0) throw MetadataLimit() }
}
private fun snapshot(buffer: MapBuffer, depth: Int, budget: MetadataBudget): List<MetadataEntry> {
  if (depth > 16) throw MetadataLimit()
  budget.take(buffer.count)
  return buffer.map { entry ->
    val value: Any = when (entry.type) {
      MapBuffer.DataType.BOOL -> entry.booleanValue
      MapBuffer.DataType.INT -> entry.intValue
      MapBuffer.DataType.LONG -> entry.longValue
      MapBuffer.DataType.DOUBLE -> entry.doubleValue
      MapBuffer.DataType.STRING -> entry.stringValue.also { if (it.length > 4096) throw MetadataLimit() }
      MapBuffer.DataType.MAP -> snapshot(entry.mapBufferValue, depth + 1, budget)
      MapBuffer.DataType.INT_BUFFER -> entry.intBufferValue.also { budget.take(it.size) }.toList()
      MapBuffer.DataType.DOUBLE_BUFFER -> entry.doubleBufferValue.also { budget.take(it.size) }.toList()
      MapBuffer.DataType.MAP_BUFFER_LIST -> entry.mapBufferListValue.let { values ->
        budget.take(values.size); values.map { snapshot(it, depth + 1, budget) }
      }
    }
    MetadataEntry(entry.key, entry.type, value)
  }.sortedBy { it.key }
}
/** Compare complete layout metadata for plain value-prop text only. The hash
 * and string are content, not layout. Child/attachment fragments take the
 * stock path; they cannot be normalized as an acknowledgement of a plain edit.
 * RN's initial empty state may omit base attributes, so a completed plain-text
 * update supplies the layout that the subsequent native edit actually used. */
internal fun textInputMetadata(state: MapBuffer?, viewTag: Int): NativeTextInputMetadata? {
  if (state == null || state.count != 4 || (0..3).any { !state.contains(it) } ||
      state.getType(0) != MapBuffer.DataType.MAP || state.getType(1) != MapBuffer.DataType.MAP ||
      state.getType(2) != MapBuffer.DataType.INT || state.getType(3) != MapBuffer.DataType.INT) return null
  val attributed = state.getMapBuffer(0)
  if (attributed.count != 4 || listOf(0, 1, 2, 4).any { !attributed.contains(it) }) return null
  val text = attributed.getString(1)
  if (text.length > 4096) return null
  val fragments = attributed.getMapBuffer(2)
  return try {
    val budget = MetadataBudget()
    val attributes = snapshot(attributed.getMapBuffer(4), 0, budget)
    if (text.isEmpty()) {
      if (fragments.count != 0) return null
    } else {
      if (fragments.count != 1 || !fragments.contains(0)) return null
      val fragment = fragments.getMapBuffer(0)
      if (fragment.any { it.key !in setOf(0, 1, 2, 5) } || !fragment.contains(0) || !fragment.contains(1) || !fragment.contains(5) ||
          fragment.getString(0) != text || fragment.getInt(1) != viewTag ||
          (fragment.contains(2) && fragment.getBoolean(2)) ||
          snapshot(fragment.getMapBuffer(5), 0, budget) != attributes) return null
    }
    NativeTextInputMetadata(attributes, snapshot(state.getMapBuffer(1), 0, budget))
  } catch (_: MetadataLimit) { null }
}
