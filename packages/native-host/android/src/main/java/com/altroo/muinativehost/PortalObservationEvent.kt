package com.altroo.muinativehost

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/** Geometry is replaceable state, unlike activation/key events. Keep only the newest snapshot. */
internal class PortalObservationEvent(surface: Int, tag: Int, private val data: WritableMap) : Event<PortalObservationEvent>(surface, tag) {
  private val order = ++sequence
  override fun getEventName() = "topPortalObservation"
  override fun getEventData() = data
  override fun canCoalesce() = true
  override fun coalesce(otherEvent: Event<*>?): Event<*> = if (otherEvent is PortalObservationEvent && otherEvent.order > order) otherEvent else this
  // RN RawEvent::Category::Continuous, pinned alongside Event.kt in source provenance.
  override fun getEventCategory() = 4
  private companion object { var sequence = 0L }
}
