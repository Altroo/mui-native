#import "AltrooMUIInteractiveViewComponentView.h"
#import <react/renderer/components/AltrooMuiNativeHostSpec/ComponentDescriptors.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/EventEmitters.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/Props.h>
#import <react/renderer/components/AltrooMuiNativeHostSpec/RCTComponentViewHelpers.h>
#import <React/RCTConversions.h>
using namespace facebook::react;

@interface AltrooMUIInteractiveViewComponentView () <RCTAltrooMUIInteractiveViewViewProtocol>
@end
@implementation AltrooMUIInteractiveViewComponentView {
  NSSet<NSString *> *_managedKeys;
  NSMutableSet<NSNumber *> *_pressedKeys;
  NSInteger _nativeTabIndex;
  BOOL _allowKeyboardFocus;
  BOOL _requestingFocus;
  BOOL _focusReported;
  BOOL _focusOnAttach;
  BOOL _releasingFocus;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AltrooMUIInteractiveViewComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const AltrooMUIInteractiveViewProps>();
    _managedKeys = [NSSet set]; _pressedKeys = [NSMutableSet set];
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<AltrooMUIInteractiveViewProps const>(props);
  _nativeTabIndex = next.nativeTabIndex;
  _allowKeyboardFocus = next.nativeFocusable;
  if (!_allowKeyboardFocus) { _focusOnAttach = NO; [self resignFirstResponder]; [self setNeedsFocusUpdate]; }
  NSMutableSet *keys = [NSMutableSet set];
  for (const auto &key : next.managedKeys) [keys addObject:RCTNSStringFromString(key)];
  _managedKeys = keys;
  [super updateProps:props oldProps:oldProps];
}
- (BOOL)canBecomeFirstResponder { return _allowKeyboardFocus && !_releasingFocus; }
- (BOOL)canBecomeFocused { return _allowKeyboardFocus && !_releasingFocus && (_nativeTabIndex >= 0 || _requestingFocus || self.focused); }
- (void)reportFocus:(BOOL)focused {
  if (_focusReported == focused) return;
  _focusReported = focused;
  if (!_eventEmitter) return;
  const auto &emitter = static_cast<const AltrooMUIInteractiveViewEventEmitter &>(*_eventEmitter);
  if (focused) emitter.onMUIFocus({.target = (int)self.tag});
  else emitter.onMUIBlur({.target = (int)self.tag});
}
- (BOOL)becomeFirstResponder {
  BOOL result = [super becomeFirstResponder];
  if (result) [self reportFocus:self.isFirstResponder || self.focused];
  return result;
}
- (BOOL)resignFirstResponder {
  BOOL result = [super resignFirstResponder];
  if (result) { [_pressedKeys removeAllObjects]; [self reportFocus:self.isFirstResponder || self.focused]; }
  return result;
}
- (void)didUpdateFocusInContext:(UIFocusUpdateContext *)context withAnimationCoordinator:(UIFocusAnimationCoordinator *)coordinator {
  [super didUpdateFocusInContext:context withAnimationCoordinator:coordinator];
  if (context.nextFocusedView == self || context.previouslyFocusedView == self) {
    if (context.nextFocusedView != self) { _releasingFocus = NO; [_pressedKeys removeAllObjects]; }
    [self reportFocus:self.isFirstResponder || self.focused];
  }
}
- (void)focus {
  if (!_allowKeyboardFocus) return;
  if (!self.window) { _focusOnAttach = YES; return; }
  _focusOnAttach = NO; _releasingFocus = NO;
  _requestingFocus = YES;
  [self becomeFirstResponder];
  UIFocusSystem *system = [UIFocusSystem focusSystemForEnvironment:self];
  [system requestFocusUpdateToEnvironment:self]; [system updateFocusIfNeeded];
  _requestingFocus = NO;
}
- (void)blur {
  _focusOnAttach = NO; _releasingFocus = YES; [_pressedKeys removeAllObjects];
  [self resignFirstResponder];
  UIFocusSystem *system = [UIFocusSystem focusSystemForEnvironment:self];
  if (self.focused) {
    id<UIFocusEnvironment> next = self.superview ?: self.window;
    if (next) [system requestFocusUpdateToEnvironment:next];
    [system updateFocusIfNeeded];
  }
  if (!self.focused) _releasingFocus = NO;
  [self reportFocus:self.isFirstResponder || self.focused];
}
- (void)didMoveToWindow { [super didMoveToWindow]; if (self.window && _focusOnAttach) [self focus]; }
- (void)setPressed:(BOOL)pressed { /* iOS feedback is owned by the native pressable's style. */ }
- (void)setHotspot:(double)x y:(double)y { /* Android ripple command; no iOS hotspot. */ }
- (void)handleCommand:(NSString const *)name args:(NSArray const *)args { RCTAltrooMUIInteractiveViewHandleCommand(self,name,args); }
- (NSString *)keyName:(UIKey *)key {
  switch (key.keyCode) {
    case UIKeyboardHIDUsageKeyboardReturnOrEnter: case UIKeyboardHIDUsageKeypadEnter: return @"Enter";
    case UIKeyboardHIDUsageKeyboardSpacebar: return @" ";
    case UIKeyboardHIDUsageKeyboardTab: return @"Tab";
    case UIKeyboardHIDUsageKeyboardEscape: return @"Escape";
    case UIKeyboardHIDUsageKeyboardUpArrow: return @"ArrowUp";
    case UIKeyboardHIDUsageKeyboardDownArrow: return @"ArrowDown";
    case UIKeyboardHIDUsageKeyboardLeftArrow: return @"ArrowLeft";
    case UIKeyboardHIDUsageKeyboardRightArrow: return @"ArrowRight";
    case UIKeyboardHIDUsageKeyboardHome: return @"Home";
    case UIKeyboardHIDUsageKeyboardEnd: return @"End";
    case UIKeyboardHIDUsageKeyboardDeleteOrBackspace: return @"Backspace";
    case UIKeyboardHIDUsageKeyboardDeleteForward: return @"Delete";
    default: {
      NSString *characters = key.characters;
      if (!characters.length || [characters characterAtIndex:0] < 32) characters = key.charactersIgnoringModifiers;
      return characters.length ? characters : @"Unidentified";
    }
  }
}
- (NSString *)codeName:(UIKey *)key name:(NSString *)name {
  if (key.keyCode >= UIKeyboardHIDUsageKeyboardA && key.keyCode <= UIKeyboardHIDUsageKeyboardZ)
    return [NSString stringWithFormat:@"Key%c",(int)('A' + key.keyCode - UIKeyboardHIDUsageKeyboardA)];
  if (key.keyCode >= UIKeyboardHIDUsageKeyboard1 && key.keyCode <= UIKeyboardHIDUsageKeyboard9)
    return [NSString stringWithFormat:@"Digit%d",(int)(1 + key.keyCode - UIKeyboardHIDUsageKeyboard1)];
  if (key.keyCode == UIKeyboardHIDUsageKeyboard0) return @"Digit0";
  if (key.keyCode == UIKeyboardHIDUsageKeypadEnter) return @"NumpadEnter";
  return [name isEqualToString:@" "] ? @"Space" : name;
}
- (BOOL)ownsKey:(NSString *)key {
  if ([key isEqualToString:@"Enter"] || [key isEqualToString:@" "]) return YES;
  UIView *view = self;
  while (view) {
    if ([view isKindOfClass:AltrooMUIInteractiveViewComponentView.class] &&
        [((AltrooMUIInteractiveViewComponentView *)view)->_managedKeys containsObject:key]) return YES;
    view = view.superview;
  }
  return NO;
}
- (void)emitKey:(UIKey *)key down:(BOOL)down repeat:(BOOL)repeat {
  if (!_eventEmitter) return;
  NSString *name = [self keyName:key];
  const auto &emitter = static_cast<const AltrooMUIInteractiveViewEventEmitter &>(*_eventEmitter);
  const std::string value = RCTStringFromNSString(name), code = RCTStringFromNSString([self codeName:key name:name]);
  UIKeyModifierFlags flags = key.modifierFlags;
  bool alt = (flags & UIKeyModifierAlternate) != 0, ctrl = (flags & UIKeyModifierControl) != 0;
  bool meta = (flags & UIKeyModifierCommand) != 0, shift = (flags & UIKeyModifierShift) != 0;
  if (down) emitter.onMUIKeyDown({.key=value,.code=code,.altKey=alt,.ctrlKey=ctrl,.metaKey=meta,.shiftKey=shift,.repeat=(bool)repeat,.isComposing=false,.isCanceled=false});
  else emitter.onMUIKeyUp({.key=value,.code=code,.altKey=alt,.ctrlKey=ctrl,.metaKey=meta,.shiftKey=shift,.repeat=false,.isComposing=false,.isCanceled=false});
}
- (NSSet<UIPress *> *)nonActivatingPresses:(NSSet<UIPress *> *)presses {
  NSMutableSet *remaining = [NSMutableSet set];
  for (UIPress *press in presses) {
    NSString *key = press.key ? [self keyName:press.key] : nil;
    if (![key isEqualToString:@"Enter"] && ![key isEqualToString:@" "]) [remaining addObject:press];
  }
  return remaining;
}
- (void)pressesBegan:(NSSet<UIPress *> *)presses withEvent:(UIPressesEvent *)event {
  if (_releasingFocus || !_allowKeyboardFocus) { NSSet *remaining = [self nonActivatingPresses:presses]; if (remaining.count) [super pressesBegan:remaining withEvent:event]; return; }
  if (!self.isFirstResponder && !self.focused) { [super pressesBegan:presses withEvent:event]; return; }
  NSMutableSet *unhandled = [NSMutableSet set];
  for (UIPress *press in presses) {
    UIKey *key = press.key;
    if (!key) { [unhandled addObject:press]; continue; }
    NSNumber *code = @(key.keyCode);
    BOOL repeat = [_pressedKeys containsObject:code]; [_pressedKeys addObject:code];
    [self emitKey:key down:YES repeat:repeat];
    if (![self ownsKey:[self keyName:key]]) [unhandled addObject:press];
  }
  if (unhandled.count) [super pressesBegan:unhandled withEvent:event];
}
- (void)pressesChanged:(NSSet<UIPress *> *)presses withEvent:(UIPressesEvent *)event {
  if (_releasingFocus || !_allowKeyboardFocus) { NSSet *remaining = [self nonActivatingPresses:presses]; if (remaining.count) [super pressesChanged:remaining withEvent:event]; return; }
  if (!self.isFirstResponder && !self.focused) { [super pressesChanged:presses withEvent:event]; return; }
  NSMutableSet *unhandled = [NSMutableSet set];
  for (UIPress *press in presses) {
    if (!press.key) { [unhandled addObject:press]; continue; }
    [self emitKey:press.key down:YES repeat:YES];
    if (![self ownsKey:[self keyName:press.key]]) [unhandled addObject:press];
  }
  if (unhandled.count) [super pressesChanged:unhandled withEvent:event];
}
- (void)pressesEnded:(NSSet<UIPress *> *)presses withEvent:(UIPressesEvent *)event {
  if (_releasingFocus || !_allowKeyboardFocus) { NSSet *remaining = [self nonActivatingPresses:presses]; if (remaining.count) [super pressesEnded:remaining withEvent:event]; return; }
  if (!self.isFirstResponder && !self.focused) { [super pressesEnded:presses withEvent:event]; return; }
  NSMutableSet *unhandled = [NSMutableSet set];
  for (UIPress *press in presses) {
    if (!press.key) { [unhandled addObject:press]; continue; }
    [_pressedKeys removeObject:@(press.key.keyCode)]; [self emitKey:press.key down:NO repeat:NO];
    if (![self ownsKey:[self keyName:press.key]]) [unhandled addObject:press];
  }
  if (unhandled.count) [super pressesEnded:unhandled withEvent:event];
}
- (void)pressesCancelled:(NSSet<UIPress *> *)presses withEvent:(UIPressesEvent *)event {
  for (UIPress *press in presses) if (press.key) [_pressedKeys removeObject:@(press.key.keyCode)];
  [super pressesCancelled:presses withEvent:event];
}
- (void)prepareForRecycle {
  [self resignFirstResponder]; [_pressedKeys removeAllObjects]; _focusReported = NO;
  _managedKeys = [NSSet set]; _nativeTabIndex = 0; _allowKeyboardFocus = NO; _focusOnAttach = NO; _releasingFocus = NO;
  [super prepareForRecycle];
}
@end
