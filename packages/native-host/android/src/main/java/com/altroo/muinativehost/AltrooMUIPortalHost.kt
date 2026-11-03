/* Native root touch dispatch adapts React Native's MIT-licensed ReactModalHostView.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE and provenance.
 * Native adaptation copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
package com.altroo.muinativehost

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.uimanager.JSPointerDispatcher
import com.facebook.react.uimanager.JSTouchDispatcher
import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.RootView
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.TouchTargetHelper
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import java.lang.ref.WeakReference

/** A logical zero-sized host; native children live in a sibling root in the same window. */
class AltrooMUIPortalHost(context: ThemedReactContext) : ViewGroup(context) {
  var active = false
  var revision = ""
  var containerTag = 0
  var layer = 0.0
  var observedTag = 0
  var popperTag = 0
  var arrowTag = 0
  var observationOnly = false
  var boundaryTags: List<Int> = emptyList()
  var observationRevision = ""
  private var lastObservation: List<Any?>? = null
  private var overlay: PortalContainer = PortalWindowRoot(context, this)
  private var mountedTarget: WeakReference<ViewGroup>? = null
  private var pendingDetach = false
  private val containerManager = ReactViewManager()
  private var observer: ViewTreeObserver? = null
  private var disposed = false
  private var syncing = false
  private var lastLayout: List<Any>? = null
  private val preDraw = ViewTreeObserver.OnPreDrawListener { syncPortal(); true }
  init { setWillNotDraw(true); isFocusable = false; clipChildren = true; clipToPadding = true }
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) = Unit
  // React owns logical children through the manager. Android framework traversal
  // must see this ViewGroup's real empty child list: the overlay is a sibling,
  // and exposing its children here crashes accessibility coordinate conversion.
  // Read the live overlay list, including direct Fabric reparent/removal changes.
  internal fun addReactChild(child: View, index: Int) { overlay.addView(child, index) }
  internal fun reactChildCount(): Int = overlay.childCount
  internal fun reactChildAt(index: Int): View? = overlay.getChildAt(index)
  internal fun removeReactChildAt(index: Int) { overlay.removeViewAt(index) }
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    disposed = false
    syncPortal()
  }
  override fun onDetachedFromWindow() {
    observer?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDraw); observer = null
    detach(); emit(false, "detached", null)
    super.onDetachedFromWindow()
  }
  private fun startTracking() {
    if (observer?.isAlive == true) return
    observer = rootView.viewTreeObserver.also { it.addOnPreDrawListener(preDraw) }
  }
  private fun stopTracking() {
    observer?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDraw); observer = null
  }
  private fun isBelow(view: View, ancestor: View): Boolean {
    var current: View? = view
    while (current != null) { if (current === ancestor) return true; current = current.parent as? View }
    return false
  }
  private fun detach() {
    if (pendingDetach) return
    val target = mountedTarget?.get() ?: overlay.parent as? ViewGroup ?: return
    val oldRoot = overlay
    fun remove() {
      if (target is ReactViewGroup) {
        val index = (0 until containerManager.getChildCount(target)).firstOrNull { containerManager.getChildAt(target,it) === oldRoot }
        if (index != null) containerManager.removeViewAt(target,index)
        else if (oldRoot.parent === target) target.removeView(oldRoot)
      } else if (oldRoot.parent === target) target.removeView(oldRoot)
      if (mountedTarget?.get() === target) mountedTarget = null
    }
    if (target is ReactViewGroup && target.removeClippedSubviews) {
      // RN may currently be enumerating its clipping array. Keep index bookkeeping intact.
      pendingDetach = true; oldRoot.visibility = View.INVISIBLE
      Handler(Looper.getMainLooper()).post { remove(); pendingDetach = false; if (!disposed) syncPortal() }
    } else remove()
  }
  fun syncPortal() {
    if (disposed || syncing || pendingDetach) return
    syncing = true
    try {
      if (observationOnly) {
        detach()
        val ready = active && isAttachedToWindow
        if (ready) startTracking() else stopTracking()
        emitObservation(ready,if (ready) "observing" else "inactive")
        return
      }
      val windowRoot = rootView as? ViewGroup
      val target = if (containerTag == 0) windowRoot else windowRoot?.findViewById<View>(containerTag) as? ViewGroup
      val decision = portalDecision(active, isAttachedToWindow, target != null, target?.windowToken == windowToken,
        target === this || (target != null && isBelow(target, overlay)), target != null && target.width > 0 && target.height > 0, containerTag == 0 || (target is ReactViewGroup && !target.removeClippedSubviews))
      if (!decision.presented || target == null) {
        detach(); if (!active || !isAttachedToWindow) stopTracking() else startTracking()
        emit(false, decision.reason, null); return
      }
      startTracking()
      if (mountedTarget?.get()?.let { it !== target } == true) {
        detach()
        if (pendingDetach) { emit(false,"pending-container-cleanup",null); return }
      }
      val ownDispatch = containerTag == 0
      if ((overlay is PortalWindowRoot) != ownDispatch) {
        val old = overlay
        detach()
        overlay = if (ownDispatch) PortalWindowRoot(context as ThemedReactContext, this) else PortalContainer(context as ThemedReactContext, this)
        while (old.childCount > 0) { val child = old.getChildAt(0); old.removeViewAt(0); overlay.addView(child) }
      }
      overlay.visibility = View.VISIBLE
      overlay.id = id
      overlay.portalLayer = layer
      if (overlay.parent !== target) { detach(); overlay.portalOrder = ++portalInsertionOrder; target.addView(overlay, ViewGroup.LayoutParams(target.width, target.height)); mountedTarget = WeakReference(target) }
      if (overlay.width != target.width || overlay.height != target.height) {
        overlay.measure(MeasureSpec.makeMeasureSpec(target.width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(target.height, MeasureSpec.EXACTLY))
      }
      overlay.layout(0, 0, target.width, target.height)
      val slots = (0 until target.childCount).filter { target.getChildAt(it) is PortalContainer }
      val ordered = slots.map { target.getChildAt(it) as PortalContainer }.sortedWith(compareBy<PortalContainer> { it.portalLayer }.thenBy { it.portalOrder })
      // Exchange only portal slots, retaining all ordinary React child positions.
      if (slots.indices.any { target.getChildAt(slots[it]) !== ordered[it] }) {
        val allChildren = (0 until target.childCount).map { target.getChildAt(it) }.toMutableList()
        slots.forEachIndexed { index, slot -> allChildren[slot] = ordered[index] }
        // Reorder without detaching: existing focus, IME and gestures must survive layer changes.
        allChildren.forEach { target.bringChildToFront(it) }
      }
      emit(true, "presented", target)
    } finally { syncing = false }
  }
  private fun emit(presented: Boolean, reason: String, target: View?) {
    val density = resources.displayMetrics.density.toDouble()
    val origin = IntArray(2); target?.getLocationInWindow(origin)
    // Compose public View.matrix values instead of requiring API 29 transformMatrixToGlobal.
    var linear = PortalLinear()
    var current: View? = target
    val values = FloatArray(9)
    while (current != null) {
      current.matrix.getValues(values)
      linear = PortalLinear(values[0].toDouble(), values[3].toDouble(), values[1].toDouble(), values[4].toDouble()).child(linear)
      current = current.parent as? View
    }
    var dispatchRoot: View? = if (containerTag == 0) overlay else target
    while (dispatchRoot != null && dispatchRoot !is RootView) dispatchRoot = dispatchRoot.parent as? View
    val rootOrigin = IntArray(2); dispatchRoot?.getLocationInWindow(rootOrigin)
    var rootLinear = PortalLinear(); var rootCurrent = dispatchRoot
    while (rootCurrent != null) {
      rootCurrent.matrix.getValues(values)
      rootLinear = PortalLinear(values[0].toDouble(),values[3].toDouble(),values[1].toDouble(),values[4].toDouble()).child(rootLinear)
      rootCurrent = rootCurrent.parent as? View
    }
    val x = origin[0] / density; val y = origin[1] / density
    val width = (target?.width ?: 0) / density; val height = (target?.height ?: 0) / density
    val signature = listOf(revision, presented, reason, x, y, width, height, linear.a, linear.b, linear.c, linear.d, rootOrigin[0], rootOrigin[1], rootLinear)
    if (signature == lastLayout) { emitObservation(presented, reason); return }
    lastLayout = signature
    val data = Arguments.createMap().apply {
      putString("revision", revision); putBoolean("presented", presented); putString("reason", reason)
      putDouble("x", x); putDouble("y", y); putDouble("width", width); putDouble("height", height)
      putDouble("rootX", rootOrigin[0]/density); putDouble("rootY", rootOrigin[1]/density)
      putDouble("rootA",rootLinear.a);putDouble("rootB",rootLinear.b);putDouble("rootC",rootLinear.c);putDouble("rootD",rootLinear.d)
      putDouble("a", linear.a); putDouble("b", linear.b); putDouble("c", linear.c); putDouble("d", linear.d)
    }
    val react = context as ThemedReactContext
    UIManagerHelper.getEventDispatcher(react)?.dispatchEvent(HostEvent(UIManagerHelper.getSurfaceId(react), id, "topPortalLayout", data))
    emitObservation(presented, reason)
  }
  private fun emitObservation(presented: Boolean, portalReason: String) {
    if (observationRevision.isEmpty()) { lastObservation = null; return }
    val anchor = if (observedTag > 0 && isAttachedToWindow) rootView.findViewById<View>(observedTag) else null
    val anchorAvailable = presented && anchor != null && anchor.isAttachedToWindow && anchor.isShown && anchor.windowToken == windowToken
    val anchorRect = if (anchorAvailable) portalWindowRect(anchor!!) else null
    val reference = if (anchorAvailable) portalClippingParents(anchor!!) else PortalClippingResult(true, null)
    val popup = if (popperTag > 0 && isAttachedToWindow) rootView.findViewById<View>(popperTag) else null
    val popupAvailable = presented && popup != null && popup.isAttachedToWindow && popup.isShown && popup.windowToken == windowToken
    val popper = if (presented) portalClippingParents(if (popupAvailable) popup!! else overlay) else PortalClippingResult(true, null)
    val bounds = if (presented) portalWindowBounds(this) else PortalWindowBounds(PortalObservationRect(), PortalObservationRect())
    val valid = presented && reference.valid && popper.valid && (!anchorAvailable || anchorRect != null)
    val reason = if (!presented) portalReason else if (!valid) "unsupported-transform" else if (observedTag > 0 && !anchorAvailable) "unavailable-anchor" else "observed"
    val position = position(popup?.takeIf { popupAvailable },anchor?.takeIf { anchorAvailable },bounds)
    val signature = listOf(revision,observationRevision,observedTag,valid,anchorAvailable,reason,anchorRect,reference.rect,popper.rect,bounds,position.toString())
    if (signature == lastObservation) return
    lastObservation = signature
    val density = resources.displayMetrics.density.toDouble()
    fun rect(value: PortalObservationRect?) = Arguments.createMap().apply {
      val scaled = (value ?: PortalObservationRect()).scale(density)
      putDouble("x",scaled.x); putDouble("y",scaled.y); putDouble("width",scaled.width); putDouble("height",scaled.height)
    }
    fun clip(value: PortalObservationRect?) = rect(value).apply { putBoolean("present",value != null) }
    val data = Arguments.createMap().apply {
      putString("revision",revision); putString("observationRevision",observationRevision); putInt("observedTag",observedTag)
      putBoolean("presented",valid); putBoolean("anchorAvailable",anchorAvailable && anchorRect != null); putString("reason",reason)
      putMap("anchor",rect(anchorRect)); putMap("referenceClip",clip(reference.rect)); putMap("popperClip",clip(popper.rect))
      putMap("viewport",rect(bounds.viewport)); putMap("window",rect(bounds.window)); putMap("position",position)
    }
    val react = context as ThemedReactContext
    UIManagerHelper.getEventDispatcher(react)?.dispatchEvent(PortalObservationEvent(UIManagerHelper.getSurfaceId(react), id, data))
  }
  private fun position(popup: View?, anchor: View?, bounds: PortalWindowBounds): com.facebook.react.bridge.WritableMap {
    val density = resources.displayMetrics.density.toDouble()
    val frame = popup?.let { portalPositionFrame(it) }
    val reference = if (frame != null && anchor != null) portalWindowRect(anchor,relative=frame.fromWindow) else null
    val referenceClip = if (frame != null && anchor != null) portalClippingParents(anchor,frame.fromWindow) else PortalClippingResult(true,null)
    val popperClip = if (frame != null) portalClippingParents(popup,frame.fromWindow) else PortalClippingResult(true,null)
    val viewport = frame?.let { portalMapWindowRect(bounds.viewport,it.fromWindow) }
    val document = frame?.let { portalMapWindowRect(bounds.window,it.fromWindow) }
    val boundaryValues = boundaryTags.map { tag ->
      val view = if (isAttachedToWindow) rootView.findViewById<View>(tag) else null
      val rect = if (frame != null && view != null && view.windowToken == windowToken && view.isAttachedToWindow) portalWindowRect(view,if (view is ReactViewGroup) PortalPaddingBox.bounds(view) else android.graphics.Rect(0,0,view.width,view.height),clipping=true,relative=frame.fromWindow) else null
      Pair(tag,rect)
    }
    fun rect(value: PortalObservationRect?) = Arguments.createMap().apply {
      val scaled = (value ?: PortalObservationRect()).scale(density)
      putDouble("x",scaled.x);putDouble("y",scaled.y);putDouble("width",scaled.width);putDouble("height",scaled.height)
    }
    fun clip(value: PortalObservationRect?) = rect(value).apply { putBoolean("present",value != null) }
    val matrix = FloatArray(9); frame?.toWindow?.getValues(matrix)
    val containing = rect(frame?.let { PortalObservationRect(matrix[2].toDouble(),matrix[5].toDouble(),it.width,it.height) }).apply {
      putDouble("a",if(frame != null) matrix[0].toDouble() else 1.0);putDouble("b",matrix[3].toDouble());putDouble("c",matrix[1].toDouble());putDouble("d",if(frame != null) matrix[4].toDouble() else 1.0)
    }
    fun swapped(view: View?) = view?.layoutDirection == View.LAYOUT_DIRECTION_RTL && com.facebook.react.modules.i18nmanager.I18nUtil.instance.doLeftAndRightSwapInRTL(context)
    val arrow = if (arrowTag > 0 && isAttachedToWindow) rootView.findViewById<View>(arrowTag) else null
    val arrowAvailable = arrow != null && arrow.isAttachedToWindow && arrow.windowToken == windowToken && popup != null && isBelow(arrow,popup)
    val arrowParent = if (arrowAvailable) arrow?.parent as? View else null
    val arrowPadding = if (arrowParent is ReactViewGroup) PortalPaddingBox.bounds(arrowParent) else android.graphics.Rect(0,0,arrowParent?.width ?: 0,arrowParent?.height ?: 0)
    val arrowValue = rect(if (arrowAvailable) PortalObservationRect(arrow!!.left.toDouble(),arrow.top.toDouble(),arrow.width.toDouble(),arrow.height.toDouble()) else null).apply {
      putInt("tag",arrowTag);putBoolean("available",arrowAvailable);putBoolean("leftRightSwapped",swapped(arrow))
      putDouble("parentWidth",maxOf(0,arrowPadding.width())/density);putDouble("parentHeight",maxOf(0,arrowPadding.height())/density)
      putDouble("clientLeft",arrowPadding.left/density);putDouble("clientTop",arrowPadding.top/density)
    }
    return Arguments.createMap().apply {
      putBoolean("leftRightSwapped",swapped(popup));putMap("arrow",arrowValue)
      putInt("popperTag",popperTag);putBoolean("available",frame != null && referenceClip.valid && popperClip.valid);putBoolean("anchorAvailable",reference != null)
      putMap("reference",rect(reference));putMap("popper",rect(popup?.let { PortalObservationRect(0.0,0.0,it.width.toDouble(),it.height.toDouble()) }))
      putMap("referenceClip",clip(referenceClip.rect));putMap("popperClip",clip(popperClip.rect));putMap("viewport",rect(viewport));putMap("window",rect(document));putMap("containing",containing)
      putArray("boundaries",Arguments.createArray().apply { boundaryValues.forEach { (tag,value) -> pushMap(rect(value).apply { putInt("tag",tag);putBoolean("available",value != null) }) } })
    }
  }
  fun dispose() {
    disposed = true
    observer?.takeIf { it.isAlive }?.removeOnPreDrawListener(preDraw); observer = null
    detach(); lastLayout = null; lastObservation = null
  }
}

/** No focus request, Dialog or new window. Empty regions fall through to the app root. */
private var portalInsertionOrder = 0L
// RN 0.88.1's own roots still use this flag; the generated feature flags have
// no replacement for it. Keep pointer delivery consistent with those roots.
@Suppress("DEPRECATION")
private fun portalPointerEventsEnabled() = com.facebook.react.config.ReactFeatureFlags.dispatchPointerEvents
private open class PortalContainer(protected val react: ThemedReactContext, source: View) : ReactViewGroup(react), PortalLogicalParent {
  private val sourceReference = WeakReference(source)
  override val portalSource: View? get() = sourceReference.get()
  var portalLayer = 0.0
  var portalOrder = 0L
  init { isFocusable = false; isFocusableInTouchMode = false; pointerEvents = PointerEvents.BOX_NONE; clipChildren = false; clipToPadding = false }
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val focused = findFocus()
    if (focused != null && event.action in listOf(KeyEvent.ACTION_DOWN,KeyEvent.ACTION_UP)) {
      val key = interactiveKeyName(event)
      val owner = logicalKeySequenceOwner(focused,event) ?: logicalKeyOwner(focused,key)
      if (owner != null && owner.dispatchDescendantKey(event,focused)) return true
    }
    return super.dispatchKeyEvent(event)
  }
}
private class PortalWindowRoot(react: ThemedReactContext, source: View) : PortalContainer(react,source), RootView {
  private val touch = JSTouchDispatcher(this)
  private val pointer = if (portalPointerEventsEnabled()) JSPointerDispatcher(this) else null
  private val coords = FloatArray(2)
  private var ownsGesture = false
  private val dispatcher get() = UIManagerHelper.getEventDispatcher(react)
  init { isFocusable = false; isFocusableInTouchMode = false; pointerEvents = PointerEvents.BOX_NONE; clipChildren = false; clipToPadding = false }
  private fun hasTarget(event: MotionEvent): Boolean = TouchTargetHelper.findTargetTagAndCoordinatesForTouch(event.x, event.y, this, coords, null) != id
  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (event.actionMasked == MotionEvent.ACTION_DOWN) ownsGesture = hasTarget(event)
    if (!ownsGesture) return false
    val consumed = super.dispatchTouchEvent(event)
    if (event.actionMasked == MotionEvent.ACTION_UP || event.actionMasked == MotionEvent.ACTION_CANCEL) ownsGesture = false
    return consumed
  }
  override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
    dispatcher?.let { touch.handleTouchEvent(event, it, react); pointer?.handleMotionEvent(event, it, true) }
    return super.onInterceptTouchEvent(event)
  }
  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    dispatcher?.let { touch.handleTouchEvent(event, it, react); pointer?.handleMotionEvent(event, it, false) }
    super.onTouchEvent(event); return true
  }
  override fun dispatchHoverEvent(event: MotionEvent): Boolean = if (hasTarget(event)) super.dispatchHoverEvent(event) else false
  override fun onInterceptHoverEvent(event: MotionEvent): Boolean { dispatcher?.let { pointer?.handleMotionEvent(event, it, true) }; return super.onInterceptHoverEvent(event) }
  override fun onHoverEvent(event: MotionEvent): Boolean { dispatcher?.let { pointer?.handleMotionEvent(event, it, false) }; return super.onHoverEvent(event) }
  @OptIn(UnstableReactNativeAPI::class)
  override fun onChildStartedNativeGesture(childView: View?, ev: MotionEvent) { dispatcher?.let { touch.onChildStartedNativeGesture(ev, it, react); pointer?.onChildStartedNativeGesture(childView, ev, it) } }
  override fun onChildEndedNativeGesture(childView: View, ev: MotionEvent) { dispatcher?.let { touch.onChildEndedNativeGesture(ev, it) }; pointer?.onChildEndedNativeGesture() }
  override fun requestDisallowInterceptTouchEvent(disallowIntercept: Boolean) = Unit
  override fun handleException(t: Throwable) { react.reactApplicationContext.handleException(RuntimeException(t)) }
}
