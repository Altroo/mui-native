package com.altroo.muinativehost

import android.content.Context
import android.graphics.Matrix
import android.graphics.Rect
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.roundToInt

/** Public View transforms, valid on API 24 too. Preserve subpixel descendant positions. */
internal fun portalWindowMatrix(view: View): Matrix? {
  val ancestors = mutableListOf<View>(); var current: View? = view
  while (current != null) { ancestors.add(current); current = current.parent as? View }
  val matrix = Matrix(); val values = FloatArray(9)
  for (node in ancestors.asReversed()) {
    node.matrix.getValues(values)
    if (values[6] != 0f || values[7] != 0f || values[8] != 1f) return null
    val parent = node.parent as? View
    matrix.preTranslate((node.left - (parent?.scrollX ?: 0)).toFloat(), (node.top - (parent?.scrollY ?: 0)).toFloat())
    matrix.preConcat(node.matrix)
    if (node === ancestors.last()) {
      val origin = floatArrayOf(0f, 0f); matrix.mapPoints(origin)
      val reported = IntArray(2); node.getLocationInWindow(reported)
      matrix.postTranslate((reported[0] - origin[0].roundToInt()).toFloat(), (reported[1] - origin[1].roundToInt()).toFloat())
    }
  }
  matrix.getValues(values)
  return if (values.all { it.isFinite() } && kotlin.math.abs(values[0]*values[4]-values[1]*values[3]) > 1e-10) matrix else null
}
internal fun portalWindowRect(view: View, rect: Rect = Rect(0, 0, view.width, view.height), clipping: Boolean = false, relative: Matrix? = null): PortalObservationRect? {
  val window = portalWindowMatrix(view) ?: return null
  val matrix = if (relative == null) window else Matrix().apply { setConcat(relative,window) }
  return portalObservedBounds(rect.left.toDouble(),rect.top.toDouble(),rect.right.toDouble(),rect.bottom.toDouble(),clipping) { x,y ->
    val point = floatArrayOf(x.toFloat(),y.toFloat()); matrix.mapPoints(point)
    Pair(point[0].toDouble(),point[1].toDouble())
  }
}
internal data class PortalClippingResult(val valid: Boolean, val rect: PortalObservationRect?)
internal fun portalClippingParents(view: View, relative: Matrix? = null): PortalClippingResult {
  var current = view.parent as? View; var result: PortalObservationRect? = null
  fun include(node: View, bounds: Rect): Boolean {
    val rect = portalWindowRect(node, bounds, clipping = true, relative = relative) ?: return false
    result = result?.intersect(rect) ?: rect
    return true
  }
  while (current != null) {
    val node = current
    val explicit = node.clipBounds
    if (explicit != null && !include(node, explicit)) return PortalClippingResult(false, null)
    if (node is ViewGroup) {
      if (node.clipChildren && !include(node, Rect(0, 0, node.width, node.height))) return PortalClippingResult(false, null)
      if (node.clipToPadding && (node.paddingLeft != 0 || node.paddingTop != 0 || node.paddingRight != 0 || node.paddingBottom != 0) &&
        !include(node, Rect(node.paddingLeft, node.paddingTop, node.width-node.paddingRight, node.height-node.paddingBottom))) return PortalClippingResult(false, null)
    }
    // RN draws this clip even when its optional public clipBounds synchronization flag is off.
    if (node is ReactViewGroup && (node.overflow != "visible" || node.getTag(com.facebook.react.R.id.filter) != null) &&
      !include(node, PortalPaddingBox.bounds(node))) return PortalClippingResult(false, null)
    current = node.parent as? View
  }
  return PortalClippingResult(true, result)
}
internal data class PortalWindowBounds(val viewport: PortalObservationRect, val window: PortalObservationRect)
internal fun portalWindowBounds(view: View): PortalWindowBounds {
  val root = view.rootView
  val screen = IntArray(2); root.getLocationOnScreen(screen)
  val window = IntArray(2); root.getLocationInWindow(window)
  val offsetX = screen[0]-window[0]; val offsetY = screen[1]-window[1]
  val visible = Rect(); root.getWindowVisibleDisplayFrame(visible)
  var viewport = PortalObservationRect((visible.left-offsetX).toDouble(), (visible.top-offsetY).toDouble(), visible.width().toDouble(), visible.height().toDouble())
  var document = PortalObservationRect(window[0].toDouble(), window[1].toDouble(), root.width.toDouble(), root.height.toDouble())
  if (Build.VERSION.SDK_INT >= 30) {
    val metrics = (view.context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).currentWindowMetrics
    val bounds = metrics.bounds
    document = PortalObservationRect((bounds.left-offsetX).toDouble(), (bounds.top-offsetY).toDouble(), bounds.width().toDouble(), bounds.height().toDouble())
    val insets = metrics.windowInsets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime())
    val usable = PortalObservationRect(document.x+insets.left, document.y+insets.top, document.width-insets.left-insets.right, document.height-insets.top-insets.bottom)
    viewport = viewport.intersect(usable)
  }
  val clipped = viewport.intersect(document)
  return PortalWindowBounds(PortalObservationRect(clipped.x,clipped.y,maxOf(0.0,clipped.width),maxOf(0.0,clipped.height)), document)
}

internal data class PortalPositionFrame(val toWindow: Matrix, val fromWindow: Matrix, val width: Double, val height: Double)
internal fun portalPositionFrame(popper: View): PortalPositionFrame? {
  val parent = popper.parent as? View ?: return null
  val padding = if (parent is ReactViewGroup) PortalPaddingBox.bounds(parent) else Rect(0,0,parent.width,parent.height)
  val forward = portalWindowMatrix(parent) ?: return null
  // Yoga absolute offsets begin at the padding box; ViewGroup scrolling shifts child coordinates.
  forward.preTranslate((padding.left-parent.scrollX).toFloat(),(padding.top-parent.scrollY).toFloat())
  val inverse = Matrix(); if (!forward.invert(inverse)) return null
  return PortalPositionFrame(forward,inverse,maxOf(0,padding.width()).toDouble(),maxOf(0,padding.height()).toDouble())
}
internal fun portalMapWindowRect(rect: PortalObservationRect, matrix: Matrix): PortalObservationRect =
  portalObservedBounds(rect.x,rect.y,rect.x+rect.width,rect.y+rect.height,true) { x,y ->
    val point = floatArrayOf(x.toFloat(),y.toFloat()); matrix.mapPoints(point); Pair(point[0].toDouble(),point[1].toDouble())
  }
