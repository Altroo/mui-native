// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#import "AltrooMUIStructuralViewComponentView.h"
#include "AltrooStructuralViewShadowNode.h"
using namespace facebook::react;
@implementation AltrooMUIStructuralViewComponentView
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const altroo::owned_transport_proof::OwnedProps>();
  }
  return self;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AltrooStructuralViewComponentDescriptor>();
}
@end
