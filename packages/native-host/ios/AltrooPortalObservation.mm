// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
/* RN clipping-mask geometry follows RCTViewComponentView 0.88.1.
 * Copyright (c) Meta Platforms, Inc. and affiliates. MIT; see native-rendering provenance. */
#import "AltrooPortalObservation.h"
#import "AltrooPortalPlanarTransform.h"
#import <React/RCTViewComponentView.h>
#include <algorithm>
#include <cmath>

AltrooObservedRect AltrooIntersectObservedRect(AltrooObservedRect a, AltrooObservedRect b) {
  double left = std::max(a.x,b.x), top = std::max(a.y,b.y);
  return {left,top,std::min(a.x+a.width,b.x+b.width)-left,std::min(a.y+a.height,b.y+b.height)-top};
}
UIWindow *AltrooObservationWindow(UIView *view) {
  return [view isKindOfClass:UIWindow.class] ? (UIWindow *)view : view.window;
}
bool AltrooCanObserveView(UIView *view) {
  if (!AltrooObservationWindow(view)) return false;
  for (UIView *current = view; current; current = current.superview) if (current.hidden) return false;
  return true;
}
std::optional<AltrooObservedRect> AltrooObserveRect(UIView *view, CGRect bounds, UIView *relativeTo, CGPoint origin, bool clipping) {
  if (clipping && (bounds.size.width <= 0 || bounds.size.height <= 0)) bounds.size = CGSizeZero;
  // Viewport/window rectangles can originate from UIWindow itself, whose .window
  // can be nil. Use one window rule for observation and coordinate conversion.
  UIWindow *window = AltrooObservationWindow(view);
  if (!window) return std::nullopt;
  for (UIView *current = view; current; current = current.superview) {
    if (!AltrooHasPlanarTransform(current.layer.transform) || !AltrooHasPlanarTransform(current.layer.sublayerTransform)) return std::nullopt;
  }
  CGRect rect = [view convertRect:bounds toView:relativeTo ?: window];
  rect.origin.x -= origin.x; rect.origin.y -= origin.y;
  if (!std::isfinite(rect.origin.x) || !std::isfinite(rect.origin.y) || !std::isfinite(rect.size.width) || !std::isfinite(rect.size.height)) return std::nullopt;
  return AltrooObservedRect{rect.origin.x,rect.origin.y,rect.size.width,rect.size.height};
}
AltrooObservedClip AltrooObserveClippingParents(UIView *view, UIView *relativeTo, CGPoint origin) {
  AltrooObservedClip result;
  auto include = [&](UIView *node, CGRect bounds) {
    // A zero-area clipping line stays empty even if a rotation would give its AABB area.
    if (bounds.size.width <= 0 || bounds.size.height <= 0) bounds.size = CGSizeZero;
    auto rect = AltrooObserveRect(node,bounds,relativeTo,origin);
    if (!rect) { result.valid = false; return; }
    result.rect = result.rect ? AltrooIntersectObservedRect(*result.rect,*rect) : *rect;
  };
  for (UIView *current = view.superview; current && ![current isKindOfClass:UIWindow.class]; current = current.superview) {
    if (current.clipsToBounds) include(current,current.bounds);
    CALayer *mask = current.layer.mask;
    if (mask) {
      // RN's pinned createMaskLayer creates an origin-zero shape mask with a view-space path.
      // Reject other masks rather than claiming their unknown painted boundary is rectangular.
      if (![mask isKindOfClass:CAShapeLayer.class] || !CATransform3DIsIdentity(mask.transform) ||
          !CGRectEqualToRect(mask.bounds,CGRectZero) || !CGPointEqualToPoint(mask.position,CGPointZero) || !((CAShapeLayer *)mask).path) return {false,std::nullopt};
      include(current,CGPathGetPathBoundingBox(((CAShapeLayer *)mask).path));
    }
    if (!result.valid) return result;
  }
  return result;
}
AltrooObservedRect AltrooObserveViewport(UIWindow *window) {
  CGRect safe = UIEdgeInsetsInsetRect(window.bounds,window.safeAreaInsets);
  safe.size.width = std::max<CGFloat>(0,safe.size.width); safe.size.height = std::max<CGFloat>(0,safe.size.height);
  // UIWindow's guide can remain empty while its controller's root view tracks
  // the keyboard. A layout guide's frame belongs to its owning view; convert
  // it into this window's coordinates before intersecting the safe viewport.
  UIView *keyboardOwner = nil;
  // A full-screen presentation can detach the underlying controller's view.
  // Prefer the connected full-window root, or an attached presented root.
  for (UIViewController *controller = window.rootViewController; controller; controller = controller.presentedViewController) {
    UIView *candidate = controller.viewIfLoaded;
    if (candidate.window == window) { keyboardOwner = candidate; break; }
  }
  keyboardOwner = keyboardOwner ?: window;
  CGRect keyboard = [keyboardOwner convertRect:keyboardOwner.keyboardLayoutGuide.layoutFrame toView:window];
  // Keep the host's existing guide configuration. Floating keyboards do not form a rectangle
  // spanning the viewport; docked keyboards and the hidden safe-area guide do.
  if (keyboard.size.width > 0 && keyboard.size.height > 0 &&
      CGRectGetMinX(keyboard) <= CGRectGetMinX(safe) && CGRectGetMaxX(keyboard) >= CGRectGetMaxX(safe) &&
      CGRectGetMaxY(keyboard) >= CGRectGetMaxY(safe)) {
    safe.size.height = std::max<CGFloat>(0,std::min(CGRectGetMaxY(safe),CGRectGetMinY(keyboard))-safe.origin.y);
  }
  return {safe.origin.x,safe.origin.y,safe.size.width,safe.size.height};
}

// RN implements this selector; this declaration does not add a native method.
@interface RCTViewComponentView (AltrooPositioningContentSurface)
- (UIView *)currentContainerView;
@end

// This prefixed category reads protected RN layout metrics through its declaring class.
// It adds no ivars, swizzle, global feature flag or private reflection.
@interface RCTViewComponentView (AltrooPositioningMetrics)
- (CGRect)altrooPositioningPaddingFrame;
- (CGRect)altrooPositioningFrame;
- (BOOL)altrooPositioningSwapsInsets;
@end
@implementation RCTViewComponentView (AltrooPositioningMetrics)
- (CGRect)altrooPositioningFrame { const auto frame = _layoutMetrics.frame; return CGRectMake(frame.origin.x,frame.origin.y,frame.size.width,frame.size.height); }
- (BOOL)altrooPositioningSwapsInsets { return _layoutMetrics.wasLeftAndRightSwapped; }
- (CGRect)altrooPositioningPaddingFrame {
  const auto frame = _layoutMetrics.getPaddingFrame();
  return CGRectMake(frame.origin.x,frame.origin.y,std::max<CGFloat>(0,frame.size.width),std::max<CGFloat>(0,frame.size.height));
}
@end
CGRect AltrooPositionPaddingFrame(UIView *view) {
  if ([view isKindOfClass:RCTViewComponentView.class]) return [(RCTViewComponentView *)view altrooPositioningPaddingFrame];
  for (UIView *owner = view.superview; owner; owner = owner.superview) {
    if ([owner isKindOfClass:RCTViewComponentView.class] && [(RCTViewComponentView *)owner currentContainerView] == view)
      return [owner convertRect:[(RCTViewComponentView *)owner altrooPositioningPaddingFrame] toView:view];
  }
  return CGRectMake(0,0,view.bounds.size.width,view.bounds.size.height);
}

CGRect AltrooPositionLayoutFrame(UIView *view) { return [view isKindOfClass:RCTViewComponentView.class] ? [(RCTViewComponentView *)view altrooPositioningFrame] : view.frame; }
bool AltrooPositionSwapsInsets(UIView *view) { return [view isKindOfClass:RCTViewComponentView.class] && [(RCTViewComponentView *)view altrooPositioningSwapsInsets]; }
