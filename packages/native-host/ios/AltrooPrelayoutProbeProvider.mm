// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#import "AltrooPrelayoutProbeProvider.h"
#include "AltrooPrelayoutProbe.h"
@implementation AltrooPrelayoutProbeProvider
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::AltrooPrelayoutProbe>(
      params.jsInvoker);
}
@end
