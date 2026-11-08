// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#import "AltrooStructuralObserverProvider.h"
#include "AltrooStructuralObserver.h"

@implementation AltrooStructuralObserverProvider
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::AltrooStructuralObserver>(
      params.jsInvoker);
}
@end
