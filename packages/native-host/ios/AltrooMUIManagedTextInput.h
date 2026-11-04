/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
#import <React/RCTUITextField.h>
#import <React/RCTUITextView.h>
NS_ASSUME_NONNULL_BEGIN
/** Observe the public editing operation, not an ambiguous empty replacement. */
@protocol AltrooNativeInputDeleteObserver <NSObject>
- (nullable dispatch_block_t)nativeInputPrepareDeleteBackward:(UIView *)source;
@end
@interface AltrooMUIManagedTextField : RCTUITextField
@end
@interface AltrooMUIManagedTextView : RCTUITextView
@end
NS_ASSUME_NONNULL_END
