/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
#import "AltrooMUIManagedTextInput.h"

@implementation AltrooMUIManagedTextField
- (void)deleteBackward {
  id delegate = self.textInputDelegate;
  dispatch_block_t completed = nil;
  if (self.window.isKeyWindow && self.editable && !self.hasText && self.isFirstResponder && !self.markedTextRange && [delegate conformsToProtocol:@protocol(AltrooNativeInputDeleteObserver)])
    completed = [(id<AltrooNativeInputDeleteObserver>)delegate nativeInputPrepareDeleteBackward:self];
  // Finish UIKit/RN editing before the added event can author new text/focus.
  [super deleteBackward];
  if (completed) completed();
}
@end
@implementation AltrooMUIManagedTextView
- (void)deleteBackward {
  id delegate = self.textInputDelegate;
  dispatch_block_t completed = nil;
  if (self.window.isKeyWindow && self.editable && !self.hasText && self.isFirstResponder && !self.markedTextRange && [delegate conformsToProtocol:@protocol(AltrooNativeInputDeleteObserver)])
    completed = [(id<AltrooNativeInputDeleteObserver>)delegate nativeInputPrepareDeleteBackward:self];
  // Finish UIKit/RN editing before the added event can author new text/focus.
  [super deleteBackward];
  if (completed) completed();
}
@end
