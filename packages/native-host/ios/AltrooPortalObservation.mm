/* RN clipping-mask geometry follows RCTViewComponentView 0.88.1.
 * Copyright (c) Meta Platforms, Inc. and affiliates. MIT; see native-rendering provenance. */
#import "AltrooPortalObservation.h"
#include <algorithm>
#include <cmath>

AltrooObservedRect AltrooIntersectObservedRect(AltrooObservedRect a, AltrooObservedRect b) {
  double left = std::max(a.x,b.x), top = std::max(a.y,b.y);
  return {left,top,std::min(a.x+a.width,b.x+b.width)-left,std::min(a.y+a.height,b.y+b.height)-top};
}
bool AltrooCanObserveView(UIView *view) {
  if (!view.window) return false;
  for (UIView *current = view; current; current = current.superview) if (current.hidden) return false;
  return true;
}
std::optional<AltrooObservedRect> AltrooObserveRect(UIView *view, CGRect bounds) {
  if (!view.window) return std::nullopt;
  for (UIView *current = view; current; current = current.superview) {
    if (!CATransform3DIsAffine(current.layer.transform) || !CATransform3DIsAffine(current.layer.sublayerTransform)) return std::nullopt;
    auto t = CATransform3DGetAffineTransform(current.layer.transform);
    if (std::abs(t.a*t.d-t.b*t.c) < 1e-10) return std::nullopt;
  }
  CGRect rect = [view convertRect:bounds toView:view.window];
  if (!std::isfinite(rect.origin.x) || !std::isfinite(rect.origin.y) || !std::isfinite(rect.size.width) || !std::isfinite(rect.size.height)) return std::nullopt;
  return AltrooObservedRect{rect.origin.x,rect.origin.y,rect.size.width,rect.size.height};
}
AltrooObservedClip AltrooObserveClippingParents(UIView *view) {
  AltrooObservedClip result;
  auto include = [&](UIView *node, CGRect bounds) {
    // A zero-area clipping line stays empty even if a rotation would give its AABB area.
    if (bounds.size.width <= 0 || bounds.size.height <= 0) bounds.size = CGSizeZero;
    auto rect = AltrooObserveRect(node,bounds);
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
  CGRect keyboard = window.keyboardLayoutGuide.layoutFrame;
  // Keep the host's existing guide configuration. Floating keyboards do not form a rectangle
  // spanning the viewport; docked keyboards and the hidden safe-area guide do.
  if (keyboard.size.width > 0 && keyboard.size.height > 0 &&
      CGRectGetMinX(keyboard) <= CGRectGetMinX(safe) && CGRectGetMaxX(keyboard) >= CGRectGetMaxX(safe) &&
      CGRectGetMaxY(keyboard) >= CGRectGetMaxY(safe)) {
    safe.size.height = std::max<CGFloat>(0,std::min(CGRectGetMaxY(safe),CGRectGetMinY(keyboard))-safe.origin.y);
  }
  return {safe.origin.x,safe.origin.y,safe.size.width,safe.size.height};
}
