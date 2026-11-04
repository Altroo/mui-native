/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import com.facebook.react.common.mapbuffer.MapBuffer

/** Pure values exercise the protocol without Android/JNI or a mirrored serializer. */
private class MetadataBuffer(vararg entries: Pair<Int, Any>) : MapBuffer {
  private val values = entries.toMap().toSortedMap()
  override val count get() = values.size
  override fun contains(key: Int) = values.containsKey(key)
  override fun getKeyOffset(key: Int) = values.keys.indexOf(key)
  override fun entryAt(offset: Int): MapBuffer.Entry = Entry(values.keys.elementAt(offset))
  override fun iterator(): Iterator<MapBuffer.Entry> = values.keys.map { Entry(it) }.iterator()
  private fun value(key: Int) = values.getValue(key)
  override fun getType(key: Int) = when (value(key)) {
    is Boolean -> MapBuffer.DataType.BOOL
    is Int -> MapBuffer.DataType.INT
    is Long -> MapBuffer.DataType.LONG
    is Double -> MapBuffer.DataType.DOUBLE
    is String -> MapBuffer.DataType.STRING
    is MapBuffer -> MapBuffer.DataType.MAP
    is IntArray -> MapBuffer.DataType.INT_BUFFER
    is DoubleArray -> MapBuffer.DataType.DOUBLE_BUFFER
    is List<*> -> MapBuffer.DataType.MAP_BUFFER_LIST
    else -> error("Unsupported test value")
  }
  override fun getBoolean(key: Int) = value(key) as Boolean
  override fun getInt(key: Int) = value(key) as Int
  override fun getLong(key: Int) = value(key) as Long
  override fun getDouble(key: Int) = value(key) as Double
  override fun getString(key: Int) = value(key) as String
  override fun getMapBuffer(key: Int) = value(key) as MapBuffer
  override fun getIntBuffer(key: Int) = value(key) as IntArray
  override fun getDoubleBuffer(key: Int) = value(key) as DoubleArray
  override fun getMapBufferList(key: Int) = (value(key) as List<*>).map { it as MapBuffer }
  private inner class Entry(override val key: Int) : MapBuffer.Entry {
    override val type get() = getType(key)
    override val booleanValue get() = getBoolean(key)
    override val intValue get() = getInt(key)
    override val longValue get() = getLong(key)
    override val doubleValue get() = getDouble(key)
    override val stringValue get() = getString(key)
    override val mapBufferValue get() = getMapBuffer(key)
    override val intBufferValue get() = getIntBuffer(key)
    override val doubleBufferValue get() = getDoubleBuffer(key)
    override val mapBufferListValue get() = getMapBufferList(key)
  }
}
private fun attributed(attributes: MapBuffer, text: String = "", tag: Int = 7, fragmentAttributes: MapBuffer = attributes, attachment: Boolean = false): MapBuffer =
  MetadataBuffer(0 to text.hashCode(), 1 to text,
    2 to if (text.isEmpty()) MetadataBuffer() else MetadataBuffer(0 to MetadataBuffer(0 to text, 1 to tag, 2 to attachment, 5 to fragmentAttributes)),
    4 to attributes)
private fun state(attributes: MapBuffer, paragraph: MapBuffer = MetadataBuffer(0 to 1), counter: Int = 0) =
  MetadataBuffer(0 to attributes, 1 to paragraph, 2 to 123, 3 to counter)
fun main() {
  var assertions = 0
  fun expect(value: Boolean) { check(value); assertions++ }
  fun profile(value: MapBuffer) = textInputMetadata(value, 7)
  val font = MetadataBuffer(0 to "System", 1 to 16.0)
  val baseline = profile(state(attributed(font)))
  expect(baseline != null)
  expect(baseline == profile(state(attributed(font), counter = 8)))
  expect(baseline == profile(state(attributed(MetadataBuffer(1 to 16.0, 0 to "System")))))
  expect(baseline == profile(state(attributed(font, text = "x"))))
  expect(baseline != profile(state(attributed(MetadataBuffer(0 to "System", 1 to 18.0)))))
  expect(baseline != profile(state(attributed(font), paragraph = MetadataBuffer(0 to 2))))
  expect(baseline != profile(state(attributed(MetadataBuffer(0 to "System", 1 to 16)))))
  expect(profile(state(attributed(font, text = "x", tag = 8))) == null)
  expect(profile(state(attributed(font, text = "x", attachment = true))) == null)
  expect(profile(state(attributed(font, text = "x", fragmentAttributes = MetadataBuffer(1 to "bold")))) == null)
  // Even an empty styled child retains fragment metadata and takes the stock path.
  val richEmpty = MetadataBuffer(0 to 0, 1 to "", 2 to MetadataBuffer(0 to MetadataBuffer(0 to "", 1 to 8, 5 to font)), 4 to font)
  expect(profile(state(richEmpty)) == null)
  val ints = intArrayOf(1, 2); val doubles = doubleArrayOf(1.5, -0.0)
  val arrays = state(attributed(MetadataBuffer(0 to ints, 1 to doubles, 2 to listOf(MetadataBuffer(0 to true, 1 to 9L)))))
  val frozen = profile(arrays)
  expect(frozen != null)
  ints[0] = 3
  expect(frozen != profile(arrays))
  ints[0] = 1; doubles[0] = 2.5
  expect(frozen != profile(arrays))
  doubles[0] = 1.5
  expect(frozen == profile(arrays))
  expect(textInputMetadata(null, 7) == null)
  expect(profile(MetadataBuffer()) == null)
  expect(profile(MetadataBuffer(0 to attributed(font), 1 to font, 2 to 0)) == null)
  expect(profile(state(attributed(MetadataBuffer(0 to "x".repeat(4097))))) == null)
  expect(profile(state(attributed(MetadataBuffer(0 to IntArray(513))))) == null)
  var nested: MapBuffer = MetadataBuffer(0 to "")
  repeat(18) { nested = MetadataBuffer(0 to nested) }
  expect(profile(state(attributed(nested))) == null)
  println("Native text-input metadata JVM policy: $assertions equivalence/bounds assertions passed; no UI executed.")
}
