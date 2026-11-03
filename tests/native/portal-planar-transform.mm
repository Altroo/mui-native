// Copyright (c) 2026 Altroo and contributors
// SPDX-License-Identifier: MIT
#include "../../packages/native-host/ios/AltrooPortalPlanarTransform.h"
#include <cstdio>
#include <limits>

int main() {
  int failures = 0, checks = 0;
  auto check = [&](const char *name, CATransform3D transform, bool expected) {
    ++checks;
    if (AltrooHasPlanarTransform(transform) != expected) {
      std::fprintf(stderr, "FAIL %s\n", name); ++failures;
    }
  };
  check("identity", CATransform3DIdentity, true);
  check("native uniform scale", CATransform3DMakeScale(.92,.92,.92), true);
  check("rotate and native uniform scale", CATransform3DScale(CATransform3DMakeRotation(.1,0,0,1),.92,.92,.92), true);
  check("reflection", CATransform3DMakeScale(-1,1,1), true);
  check("planar translation", CATransform3DMakeTranslation(17,-9,0), true);
  check("singular XY", CATransform3DMakeScale(0,1,1), false);
  check("singular Z conversion", CATransform3DMakeScale(1,1,0), false);
  check("X tilt", CATransform3DMakeRotation(.1,1,0,0), false);
  check("Y tilt", CATransform3DMakeRotation(.1,0,1,0), false);
  auto perspective = CATransform3DIdentity; perspective.m34 = -.002;
  check("perspective", perspective, false);
  auto zTranslation = CATransform3DMakeTranslation(0,0,5);
  check("Z translation", zTranslation, false);
  auto invalid = CATransform3DIdentity; invalid.m41 = std::numeric_limits<CGFloat>::quiet_NaN();
  check("NaN translation", invalid, false);
  invalid = CATransform3DIdentity; invalid.m33 = std::numeric_limits<CGFloat>::infinity();
  check("infinite Z scale", invalid, false);
  invalid = CATransform3DIdentity; invalid.m11 = std::numeric_limits<CGFloat>::infinity();
  check("infinite XY scale", invalid, false);
  std::printf("%d planar-transform checks, %d failures\n", checks, failures);
  return failures ? 1 : 0;
}
