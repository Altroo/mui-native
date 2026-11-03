// Copyright (c) 2026 Altroo and contributors
// SPDX-License-Identifier: MIT
#pragma once
#import <QuartzCore/CATransform3D.h>
#include <cmath>

// RN's uniform scale also scales Z, so CATransform3DIsAffine rejects ordinary
// native 2D content. Accept an independent, invertible Z scale while requiring
// an affine XY plane. Keep perspective, tilt and singular conversions invalid.
inline bool AltrooHasPlanarTransform(CATransform3D t) {
  const CGFloat values[] = {t.m11,t.m12,t.m13,t.m14,t.m21,t.m22,t.m23,t.m24,
    t.m31,t.m32,t.m33,t.m34,t.m41,t.m42,t.m43,t.m44};
  for (CGFloat value : values) if (!std::isfinite(value)) return false;
  if (t.m13 != 0 || t.m14 != 0 || t.m23 != 0 || t.m24 != 0 ||
      t.m31 != 0 || t.m32 != 0 || t.m34 != 0 || t.m43 != 0 || t.m44 != 1) return false;
  const CGFloat determinant = t.m11*t.m22-t.m12*t.m21;
  return std::isfinite(determinant) && std::abs(determinant) >= 1e-10 && std::abs(t.m33) >= 1e-10;
}
