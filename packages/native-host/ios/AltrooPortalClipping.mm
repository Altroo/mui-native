/* Clipped child bookkeeping follows React Native's MIT-licensed RCTViewComponentView.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE and native-rendering provenance. */
#import "AltrooPortalClipping.h"
#import <objc/runtime.h>
#import <react/renderer/components/view/ViewProps.h>
using namespace facebook::react;
static NSMutableArray<UIView *> *AltrooTrackedSubviews(RCTViewComponentView *view) {
  // Metadata may be cached; the array must be read each time because RN replaces it on toggles.
  static Ivar ivar = class_getInstanceVariable(RCTViewComponentView.class, "_reactSubviews");
  if (!ivar || ivar_getTypeEncoding(ivar)[0] != '@') return nil;
  id value = object_getIvar(view, ivar);
  return [value isKindOfClass:NSMutableArray.class] ? value : nil;
}
BOOL AltrooPortalSupportsContainer(RCTViewComponentView *view) { return AltrooTrackedSubviews(view) != nil; }
BOOL AltrooPortalClipsSubviews(RCTViewComponentView *view) {
  const auto props = std::dynamic_pointer_cast<const ViewProps>([view props]);
  return props && props->removeClippedSubviews;
}
void AltrooRemovePortalRoot(RCTViewComponentView *view, UIView<RCTComponentViewProtocol> *root) {
  if (AltrooPortalClipsSubviews(view)) {
    NSMutableArray<UIView *> *tracked = AltrooTrackedSubviews(view);
    NSUInteger index = tracked ? [tracked indexOfObjectIdenticalTo:root] : NSNotFound;
    if (index != NSNotFound) { [view unmountChildComponentView:root index:index]; return; }
  }
  [root removeFromSuperview];
}
