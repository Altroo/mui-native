/* Root mounting and touch isolation adapt React Native's MIT-licensed native modal host.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE and provenance. */
#import "AltrooMUIPortalHostComponentView.h"
#import "AltrooMUIInteractiveViewComponentView.h"
#import "AltrooMUIStructuralViewComponentView.h"
#import "AltrooMUIPortalCanvasComponentView.h"
#import "AltrooPortalLogicalParent.h"
#import "AltrooPortalClipping.h"
#import "AltrooPortalObservation.h"
#import "AltrooPortalShadowNodes.h"
#import <React/RCTSurfaceTouchHandler.h>
#import <UIKit/UIKit.h>
#include <cmath>
#import <react/renderer/components/AltrooMuiNativeHostSpec/EventEmitters.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/Props.h>
using namespace facebook::react;
// Pinned RN 0.88 content surface. Guard the selector rather than bypass styled hit testing.
@interface RCTViewComponentView (AltrooPortalContentSurface)
- (UIView *)currentContainerView;
@end
@class AltrooMUIPortalHostComponentView;
@interface AltrooPortalRoot : RCTViewComponentView <AltrooPortalLogicalParent>
@property(nonatomic, weak) UIView *portalSource;
@property(nonatomic) double portalLayer;
@property(nonatomic) NSUInteger portalOrder;
@end
@implementation AltrooPortalRoot
- (UIResponder *)nextResponder { return self.portalSource ?: [super nextResponder]; }
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
  UIView *hit = [super hitTest:point withEvent:event];
  return hit == self ? nil : hit;
}
@end
static NSUInteger AltrooPortalOrder = 0;
static void AltrooOrderPortalRoots(UIView *surface) {
  NSMutableArray<NSNumber *> *slots = [NSMutableArray new];
  NSMutableArray<AltrooPortalRoot *> *roots = [NSMutableArray new];
  [surface.subviews enumerateObjectsUsingBlock:^(UIView *view, NSUInteger index, BOOL *stop) {
    if ([view isKindOfClass:AltrooPortalRoot.class]) { [slots addObject:@(index)]; [roots addObject:(AltrooPortalRoot *)view]; }
  }];
  [roots sortUsingComparator:^NSComparisonResult(AltrooPortalRoot *a, AltrooPortalRoot *b) {
    if (a.portalLayer != b.portalLayer) return a.portalLayer < b.portalLayer ? NSOrderedAscending : NSOrderedDescending;
    return a.portalOrder < b.portalOrder ? NSOrderedAscending : a.portalOrder == b.portalOrder ? NSOrderedSame : NSOrderedDescending;
  }];
  // Match both drawing and UIKit's reverse-subview hit testing, preserving ordinary sibling slots.
  [slots enumerateObjectsUsingBlock:^(NSNumber *slot, NSUInteger index, BOOL *stop) {
    UIView *desired = roots[index]; NSUInteger destination = slot.unsignedIntegerValue;
    if (surface.subviews[destination] != desired) [surface exchangeSubviewAtIndex:destination withSubviewAtIndex:[surface.subviews indexOfObjectIdenticalTo:desired]];
  }];
}
static UIView *AltrooDispatchRoot(UIView *view) {
  for (UIView *current = view; current; current = current.superview) {
    for (UIGestureRecognizer *recognizer in current.gestureRecognizers) {
      if ([recognizer isKindOfClass:RCTSurfaceTouchHandler.class]) return current;
    }
  }
  return nil;
}
struct AltrooPortalMatrix { CGPoint origin; CGFloat a,b,c,d; };
static AltrooPortalMatrix AltrooWindowMatrix(UIView *view) {
  UIWindow *window = AltrooObservationWindow(view);
  if (!window) return {CGPointZero,1,0,0,1};
  CGPoint origin = [view convertPoint:CGPointZero toView:window];
  CGPoint horizontal = [view convertPoint:CGPointMake(1,0) toView:window];
  CGPoint vertical = [view convertPoint:CGPointMake(0,1) toView:window];
  return {origin,horizontal.x-origin.x,horizontal.y-origin.y,vertical.x-origin.x,vertical.y-origin.y};
}
@interface AltrooPortalTick : NSObject
@property(nonatomic, weak) AltrooMUIPortalHostComponentView *owner;
- (void)tick:(CADisplayLink *)link;
@end
@interface AltrooMUIPortalHostComponentView ()
- (void)syncPortal;
- (AltrooMUIPortalHostEventEmitter::OnPortalObservationPosition)positionForPopup:(UIView *)popup anchor:(UIView *)anchor viewport:(AltrooObservedRect)viewport document:(AltrooObservedRect)document;
@end
@implementation AltrooPortalTick
- (void)tick:(CADisplayLink *)link { [self.owner syncPortal]; }
@end
@implementation AltrooMUIPortalHostComponentView {
  AltrooPortalRoot *_root;
  RCTSurfaceTouchHandler *_touchHandler;
  CADisplayLink *_displayLink;
  AltrooPortalTick *_tick;
  NSString *_revision;
  NSInteger _containerTag;
  double _layer;
  BOOL _active;
  BOOL _syncing;
  BOOL _pendingDetach;
  __weak RCTViewComponentView *_mountedTarget;
  NSArray *_lastLayout;
  NSString *_observationRevision;
  NSInteger _observedTag;
  NSInteger _popperTag;
  NSInteger _arrowTag;
  BOOL _observationOnly;
  std::vector<int> _boundaryTags;
  NSArray *_lastObservation;
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const AltrooMUIPortalHostProps>();
    _root = [AltrooPortalRoot new]; _root.portalSource = self;
    _root.backgroundColor = UIColor.clearColor; _root.accessibilityViewIsModal = NO;
    _revision = @""; _observationRevision = @"";
  }
  return self;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<AltrooPortalHostComponentDescriptor>(); }
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index { [_root insertSubview:child atIndex:index]; }
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index { [child removeFromSuperview]; }
- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps {
  const auto &next = static_cast<const AltrooMUIPortalHostProps &>(*props);
  _active = next.active; _revision = [NSString stringWithUTF8String:next.revision.c_str()]; _containerTag = next.containerTag; _layer = next.layer;
  _arrowTag = next.arrowTag; _popperTag = next.popperTag; _observationOnly = next.observationOnly; _boundaryTags = next.boundaryTags;
  _observedTag = next.observedTag; _observationRevision = [NSString stringWithUTF8String:next.observationRevision.c_str()];
  [super updateProps:props oldProps:oldProps]; [self syncPortal];
}
- (void)didMoveToWindow { [super didMoveToWindow]; [self syncPortal]; }
- (void)didMoveToSuperview { [super didMoveToSuperview]; [self syncPortal]; }
- (void)layoutSubviews { [super layoutSubviews]; [self syncPortal]; }
- (void)stopTracking { [_displayLink invalidate]; _displayLink = nil; _tick = nil; }
- (void)startTracking {
  if (_displayLink) return;
  _tick = [AltrooPortalTick new]; _tick.owner = self;
  _displayLink = [CADisplayLink displayLinkWithTarget:_tick selector:@selector(tick:)];
  [_displayLink addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
}
- (void)setOwnDispatch:(BOOL)own {
  if (own && !_touchHandler) { _touchHandler = [RCTSurfaceTouchHandler new]; [_touchHandler attachToView:_root]; }
  if (!own && _touchHandler) { [_touchHandler detachFromView:_root]; _touchHandler = nil; }
}
- (void)detachRoot {
  if (_pendingDetach) return;
  RCTViewComponentView *target = _mountedTarget;
  if (!target) { [_root removeFromSuperview]; return; }
  if (AltrooPortalClipsSubviews(target)) {
    _pendingDetach = YES; _root.hidden = YES;
    AltrooPortalRoot *oldRoot = _root;
    __weak AltrooMUIPortalHostComponentView *weakSelf = self;
    // Wait until RN finishes enumerating its clipping collection. Do not reparent before cleanup.
    dispatch_async(dispatch_get_main_queue(), ^{
      AltrooRemovePortalRoot(target,oldRoot);
      AltrooMUIPortalHostComponentView *owner = weakSelf;
      if (owner) { owner->_mountedTarget = nil; owner->_pendingDetach = NO; [owner syncPortal]; }
    });
  } else { AltrooRemovePortalRoot(target,_root); _mountedTarget = nil; }
}
- (void)emitPresented:(BOOL)presented reason:(NSString *)reason target:(UIView *)target dispatchRoot:(UIView *)dispatchRoot {
  auto matrix = AltrooWindowMatrix(target), root = AltrooWindowMatrix(dispatchRoot);
  // Surface touch handlers optionally publish a page-space offset, e.g. nested surfaces.
  for (UIGestureRecognizer *recognizer in dispatchRoot.gestureRecognizers) {
    if ([recognizer isKindOfClass:RCTSurfaceTouchHandler.class]) {
      CGPoint offset = ((RCTSurfaceTouchHandler *)recognizer).viewOriginOffset;
      root.origin.x -= root.a*offset.x + root.c*offset.y;
      root.origin.y -= root.b*offset.x + root.d*offset.y;
      break;
    }
  }
  CGFloat width = target ? target.bounds.size.width : 0, height = target ? target.bounds.size.height : 0;
  NSArray *signature = @[_revision, @(presented), reason, @(matrix.origin.x), @(matrix.origin.y), @(width), @(height), @(matrix.a), @(matrix.b), @(matrix.c), @(matrix.d), @(root.origin.x), @(root.origin.y), @(root.a), @(root.b), @(root.c), @(root.d)];
  if (!_eventEmitter) return;
  if ([_lastLayout isEqualToArray:signature]) { [self emitObservation:presented reason:reason]; return; }
  _lastLayout = signature;
  auto emitter = std::static_pointer_cast<const AltrooMUIPortalHostEventEmitter>(_eventEmitter);
  emitter->onPortalLayout({.revision = std::string(_revision.UTF8String), .presented = static_cast<bool>(presented), .reason = std::string(reason.UTF8String), .x = matrix.origin.x, .y = matrix.origin.y, .width = width, .height = height, .rootX = root.origin.x, .rootY = root.origin.y, .rootA = root.a, .rootB = root.b, .rootC = root.c, .rootD = root.d, .a = matrix.a, .b = matrix.b, .c = matrix.c, .d = matrix.d});
  [self emitObservation:presented reason:reason];
}
- (void)emitObservation:(BOOL)presented reason:(NSString *)portalReason {
  if (_observationRevision.length == 0) { _lastObservation = nil; return; }
  if (!_eventEmitter) return;
  UIView *anchor = _observedTag > 0 ? [self.window viewWithTag:_observedTag] : nil;
  BOOL anchorAvailable = presented && anchor && anchor.window == self.window && AltrooCanObserveView(anchor);
  auto anchorRect = anchorAvailable ? AltrooObserveRect(anchor,anchor.bounds) : std::nullopt;
  auto reference = anchorAvailable ? AltrooObserveClippingParents(anchor) : AltrooObservedClip{};
  UIView *popup = _popperTag > 0 ? [self.window viewWithTag:_popperTag] : nil;
  BOOL popupAvailable = presented && popup && popup.window == self.window && AltrooCanObserveView(popup);
  auto popper = presented ? AltrooObserveClippingParents(popupAvailable ? popup : _root) : AltrooObservedClip{};
  auto viewport = presented ? AltrooObserveViewport(self.window) : AltrooObservedRect{};
  CGRect windowBounds = presented ? self.window.bounds : CGRectZero;
  AltrooObservedRect document = {windowBounds.origin.x,windowBounds.origin.y,windowBounds.size.width,windowBounds.size.height};
  BOOL valid = presented && reference.valid && popper.valid && (!anchorAvailable || anchorRect.has_value());
  NSString *reason = !presented ? portalReason : !valid ? @"unsupported-geometry" : _observedTag > 0 && !anchorAvailable ? @"unavailable-anchor" : @"observed";
  auto rectSignature = [](auto rect) { return @[@(rect.x),@(rect.y),@(rect.width),@(rect.height)]; };
  auto position = [self positionForPopup:popupAvailable ? popup : nil anchor:anchorAvailable ? anchor : nil viewport:viewport document:document];
  NSMutableArray *positionSignature = [NSMutableArray arrayWithArray:@[@(position.popperTag),@(position.available),@(position.anchorAvailable),
    rectSignature(position.reference),rectSignature(position.popper),rectSignature(position.referenceClip),@(position.referenceClip.present),
    rectSignature(position.popperClip),@(position.popperClip.present),rectSignature(position.viewport),rectSignature(position.window),
    rectSignature(position.arrow),@(position.arrow.tag),@(position.arrow.available),@(position.arrow.leftRightSwapped),@(position.arrow.parentWidth),@(position.arrow.parentHeight),@(position.arrow.clientLeft),@(position.arrow.clientTop),@(position.leftRightSwapped),rectSignature(position.containing),@(position.containing.a),@(position.containing.b),@(position.containing.c),@(position.containing.d)]];
  for (const auto &boundary : position.boundaries) [positionSignature addObject:@[@(boundary.tag),@(boundary.available),rectSignature(boundary)]];
  NSArray *signature = @[_revision,_observationRevision,@(_observedTag),@(valid),@(anchorAvailable),reason,
    rectSignature(anchorRect.value_or(AltrooObservedRect{})),@(reference.rect.has_value()),rectSignature(reference.rect.value_or(AltrooObservedRect{})),
    @(popper.rect.has_value()),rectSignature(popper.rect.value_or(AltrooObservedRect{})),rectSignature(viewport),rectSignature(document),positionSignature];
  if ([_lastObservation isEqualToArray:signature]) return;
  _lastObservation = signature;
  auto anchorValue = anchorRect.value_or(AltrooObservedRect{}), referenceValue = reference.rect.value_or(AltrooObservedRect{}), popperValue = popper.rect.value_or(AltrooObservedRect{});
  auto emitter = std::static_pointer_cast<const AltrooMUIPortalHostEventEmitter>(_eventEmitter);
  AltrooMUIPortalHostEventEmitter::OnPortalObservation event = {.position=position,.revision=std::string(_revision.UTF8String), .observationRevision=std::string(_observationRevision.UTF8String), .observedTag=static_cast<int>(_observedTag),
    .presented=static_cast<bool>(valid), .anchorAvailable=static_cast<bool>(anchorAvailable && anchorRect.has_value()), .reason=std::string(reason.UTF8String),
    .anchor={.x=anchorValue.x,.y=anchorValue.y,.width=anchorValue.width,.height=anchorValue.height},
    .referenceClip={.present=reference.rect.has_value(),.x=referenceValue.x,.y=referenceValue.y,.width=referenceValue.width,.height=referenceValue.height},
    .popperClip={.present=popper.rect.has_value(),.x=popperValue.x,.y=popperValue.y,.width=popperValue.width,.height=popperValue.height},
    .viewport={.x=viewport.x,.y=viewport.y,.width=viewport.width,.height=viewport.height},
    .window={.x=document.x,.y=document.y,.width=document.width,.height=document.height}};
  auto rectangle = [](auto rect) -> folly::dynamic { return folly::dynamic::object("x",rect.x)("y",rect.y)("width",rect.width)("height",rect.height); };
  auto clip = [&](auto value) { auto payload = rectangle(value); payload["present"] = value.present; return payload; };
  folly::dynamic payload = folly::dynamic::object("revision",event.revision)("observationRevision",event.observationRevision)("observedTag",event.observedTag)
    ("presented",event.presented)("anchorAvailable",event.anchorAvailable)("reason",event.reason)
    ("anchor",rectangle(event.anchor))("referenceClip",clip(event.referenceClip))("popperClip",clip(event.popperClip))
    ("viewport",rectangle(event.viewport))("window",rectangle(event.window));
  auto localBoundaries = folly::dynamic::array();
  for (const auto &boundary : event.position.boundaries) { auto value = rectangle(boundary); value["tag"] = boundary.tag; value["available"] = boundary.available; localBoundaries.push_back(std::move(value)); }
  auto containing = rectangle(event.position.containing); containing["a"] = event.position.containing.a; containing["b"] = event.position.containing.b; containing["c"] = event.position.containing.c; containing["d"] = event.position.containing.d;
  auto arrow = rectangle(event.position.arrow); arrow["tag"]=event.position.arrow.tag;arrow["available"]=event.position.arrow.available;arrow["leftRightSwapped"]=event.position.arrow.leftRightSwapped;
  arrow["parentWidth"]=event.position.arrow.parentWidth;arrow["parentHeight"]=event.position.arrow.parentHeight;arrow["clientLeft"]=event.position.arrow.clientLeft;arrow["clientTop"]=event.position.arrow.clientTop;
  payload["position"] = folly::dynamic::object("popperTag",event.position.popperTag)("available",event.position.available)("anchorAvailable",event.position.anchorAvailable)("leftRightSwapped",event.position.leftRightSwapped)("arrow",std::move(arrow))
    ("reference",rectangle(event.position.reference))("popper",rectangle(event.position.popper))
    ("referenceClip",clip(event.position.referenceClip))("popperClip",clip(event.position.popperClip))
    ("viewport",rectangle(event.position.viewport))("window",rectangle(event.position.window))("containing",std::move(containing))("boundaries",std::move(localBoundaries));
  emitter->dispatchUniqueEvent("portalObservation",std::move(payload));
}
- (AltrooMUIPortalHostEventEmitter::OnPortalObservationPosition)positionForPopup:(UIView *)popup anchor:(UIView *)anchor viewport:(AltrooObservedRect)viewport document:(AltrooObservedRect)document {
  AltrooMUIPortalHostEventEmitter::OnPortalObservationPosition value{};
  value.popperTag = static_cast<int>(_popperTag); value.arrow.tag = static_cast<int>(_arrowTag); value.containing.a = 1; value.containing.d = 1;
  UIView *parent = popup.superview;
  if (!parent || parent.window != self.window) return value;
  CGRect padding = AltrooPositionPaddingFrame(parent);
  auto parentRect = AltrooObserveRect(parent,padding);
  if (!parentRect) return value;
  CGPoint origin = [parent convertPoint:padding.origin toView:self.window];
  CGPoint horizontal = [parent convertPoint:CGPointMake(padding.origin.x+1,padding.origin.y) toView:self.window];
  CGPoint vertical = [parent convertPoint:CGPointMake(padding.origin.x,padding.origin.y+1) toView:self.window];
  double a = horizontal.x-origin.x, b = horizontal.y-origin.y, c = vertical.x-origin.x, d = vertical.y-origin.y;
  if (std::abs(a*d-b*c) < 1e-10) return value;
  auto reference = anchor ? AltrooObserveRect(anchor,anchor.bounds,parent,padding.origin) : std::nullopt;
  auto referenceClip = anchor ? AltrooObserveClippingParents(anchor,parent,padding.origin) : AltrooObservedClip{};
  auto popperClip = AltrooObserveClippingParents(popup,parent,padding.origin);
  auto localViewport = AltrooObserveRect(self.window,CGRectMake(viewport.x,viewport.y,viewport.width,viewport.height),parent,padding.origin,true);
  auto localWindow = AltrooObserveRect(self.window,CGRectMake(document.x,document.y,document.width,document.height),parent,padding.origin,true);
  value.available = referenceClip.valid && popperClip.valid && localViewport.has_value() && localWindow.has_value();
  value.anchorAvailable = reference.has_value();
  auto assign = [](auto &destination,AltrooObservedRect rect) { destination.x=rect.x;destination.y=rect.y;destination.width=rect.width;destination.height=rect.height; };
  assign(value.reference,reference.value_or(AltrooObservedRect{}));
  assign(value.popper,{0,0,popup.bounds.size.width,popup.bounds.size.height});
  assign(value.referenceClip,referenceClip.rect.value_or(AltrooObservedRect{}));value.referenceClip.present=referenceClip.rect.has_value();
  assign(value.popperClip,popperClip.rect.value_or(AltrooObservedRect{}));value.popperClip.present=popperClip.rect.has_value();
  assign(value.viewport,localViewport.value_or(AltrooObservedRect{}));assign(value.window,localWindow.value_or(AltrooObservedRect{}));
  value.containing={.x=origin.x,.y=origin.y,.width=padding.size.width,.height=padding.size.height,.a=a,.b=b,.c=c,.d=d};
  value.leftRightSwapped = AltrooPositionSwapsInsets(popup);
  UIView *arrow = _arrowTag > 0 ? [self.window viewWithTag:_arrowTag] : nil;
  if (arrow && arrow.window == self.window && [arrow isDescendantOfView:popup]) {
    CGRect frame = AltrooPositionLayoutFrame(arrow), arrowPadding = AltrooPositionPaddingFrame(arrow.superview);
    value.arrow={.tag=static_cast<int>(_arrowTag),.available=true,.leftRightSwapped=AltrooPositionSwapsInsets(arrow),.x=frame.origin.x,.y=frame.origin.y,.width=frame.size.width,.height=frame.size.height,
      .parentWidth=arrowPadding.size.width,.parentHeight=arrowPadding.size.height,.clientLeft=arrowPadding.origin.x,.clientTop=arrowPadding.origin.y};
  }
  for (int tag : _boundaryTags) {
    UIView *boundary = [self.window viewWithTag:tag];
    auto rect = boundary && boundary.window == self.window ? AltrooObserveRect(boundary,AltrooPositionPaddingFrame(boundary),parent,padding.origin,true) : std::nullopt;
    AltrooMUIPortalHostEventEmitter::OnPortalObservationPositionBoundaries item{};item.tag=tag;item.available=rect.has_value();assign(item,rect.value_or(AltrooObservedRect{}));value.boundaries.push_back(item);
  }
  return value;
}
- (void)syncPortal {
  if (_syncing || _pendingDetach) return; _syncing = YES;
  @try {
    if (_observationOnly) {
      [self detachRoot]; [self setOwnDispatch:NO];
      BOOL ready = _active && self.window;
      if (ready) [self startTracking]; else [self stopTracking];
      [self emitObservation:ready reason:ready ? @"observing" : @"inactive"]; return;
    }
    UIView *target = _containerTag == 0 ? self.window : [self.window viewWithTag:_containerTag];
    // UIWindow.window need not return the window itself. Accept the default window
    // by identity while retaining the window check for application-supplied views.
    BOOL sameWindow = AltrooObservationWindow(target) == self.window;
    BOOL cycle = target == self || [target isDescendantOfView:_root];
    // The owned structural root inherits the ordinary native View content surface.
    BOOL regular = target &&
      ([target class] == RCTViewComponentView.class ||
       [target isKindOfClass:AltrooMUIInteractiveViewComponentView.class] ||
       [target isKindOfClass:AltrooMUIPortalCanvasComponentView.class] ||
       [target isKindOfClass:AltrooMUIStructuralViewComponentView.class]);
    BOOL supported = regular && AltrooPortalSupportsContainer((RCTViewComponentView *)target) && !AltrooPortalClipsSubviews((RCTViewComponentView *)target);
    UIView *surface = _containerTag == 0 ? target : supported && [target respondsToSelector:@selector(currentContainerView)] ? [(RCTViewComponentView *)target currentContainerView] : nil;
    UIView *dispatchRoot = _containerTag == 0 ? _root : AltrooDispatchRoot(surface);
    NSString *reason = !_active ? @"inactive" : !self.window ? @"detached" : !target ? @"unavailable-container" : !sameWindow ? @"different-window" : cycle ? @"container-cycle" : !surface ? @"unsupported-container" : CGRectIsEmpty(surface.bounds) ? @"empty-container" : !dispatchRoot ? @"missing-dispatch-root" : @"presented";
    BOOL presented = [reason isEqualToString:@"presented"];
    if (!presented) {
      [self detachRoot]; [self setOwnDispatch:NO];
      if (!_active || !self.window) [self stopTracking]; else [self startTracking];
      [self emitPresented:NO reason:reason target:nil dispatchRoot:nil]; return;
    }
    if (_root.superview != surface && (_mountedTarget || _root.superview)) {
      [self detachRoot];
      if (_pendingDetach) { [self emitPresented:NO reason:@"pending-container-cleanup" target:nil dispatchRoot:nil]; return; }
    }
    _root.hidden = NO; [self setOwnDispatch:_containerTag == 0]; _root.portalLayer = _layer;
    if (_root.superview != surface) { [_root removeFromSuperview]; _root.portalOrder = ++AltrooPortalOrder; [surface addSubview:_root]; _mountedTarget = _containerTag == 0 ? nil : (RCTViewComponentView *)target; }
    _root.frame = surface.bounds; _root.layer.zPosition = 0; AltrooOrderPortalRoots(surface);
    [self startTracking]; [self emitPresented:YES reason:reason target:surface dispatchRoot:dispatchRoot];
  } @finally { _syncing = NO; }
}
- (void)prepareForRecycle {
  [self stopTracking]; [self detachRoot]; [self setOwnDispatch:NO];
  _lastLayout = nil; _lastObservation = nil; _observationRevision = @""; _observedTag = 0; _popperTag = 0; _arrowTag = 0; _boundaryTags.clear(); _observationOnly = NO; _active = NO; _revision = @""; _containerTag = 0; _layer = 0;
  [super prepareForRecycle];
}
- (void)dealloc {
  [self stopTracking]; [self setOwnDispatch:NO];
  RCTViewComponentView *target = _mountedTarget; AltrooPortalRoot *root = _root;
  if (target && !_pendingDetach) {
    root.hidden = YES;
    dispatch_async(dispatch_get_main_queue(), ^{ AltrooRemovePortalRoot(target,root); });
  } else if (!_pendingDetach) [root removeFromSuperview];
}
@end
