package com.altroo.muinativehost

/** Keep opposing edges when rectangles are disjoint; zero-clamping loses overflow distance. */
internal data class PortalObservationRect(val x: Double = 0.0, val y: Double = 0.0, val width: Double = 0.0, val height: Double = 0.0) {
  fun intersect(other: PortalObservationRect): PortalObservationRect {
    val left = maxOf(x, other.x); val top = maxOf(y, other.y)
    return PortalObservationRect(left, top, minOf(x + width, other.x + other.width) - left, minOf(y + height, other.y + other.height) - top)
  }
  fun scale(density: Double) = PortalObservationRect(x / density, y / density, width / density, height / density)
}

/** Map native clip corners, but do not turn an empty local line into a rotated visible AABB. */
internal fun portalObservedBounds(left: Double, top: Double, right: Double, bottom: Double, clipping: Boolean, map: (Double,Double) -> Pair<Double,Double>): PortalObservationRect {
  if (clipping && (right <= left || bottom <= top)) {
    val point = map(left,top)
    return PortalObservationRect(point.first,point.second,0.0,0.0)
  }
  val points = listOf(map(left,top),map(right,top),map(left,bottom),map(right,bottom))
  val minX = points.minOf { it.first }; val minY = points.minOf { it.second }
  return PortalObservationRect(minX,minY,points.maxOf { it.first }-minX,points.maxOf { it.second }-minY)
}
