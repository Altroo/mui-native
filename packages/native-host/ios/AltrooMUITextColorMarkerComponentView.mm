// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#import "AltrooMUITextColorMarkerComponentView.h"
#include "AltrooTextColorMarker.h"
using namespace facebook::react;
@implementation AltrooMUITextColorMarkerComponentView
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<AltrooTextColorMarkerComponentDescriptor>();
}
@end
