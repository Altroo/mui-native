/* Stock View traits adapt MIT-licensed React Native 0.88.1 ViewShadowNode.cpp.
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * See NOTICE and packages/native-host/structural-observation-baseline.json.
 * Native adapter: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
#pragma once
#include <react/renderer/components/view/ViewShadowNode.h>
#include <react/renderer/components/view/HostPlatformViewTraitsInitializer.h>
#include <react/renderer/components/view/primitives.h>

namespace altroo::owned_view_traits {
using namespace facebook::react;
namespace yoga = facebook::yoga;
// The generic View-like base forces a mounting boundary. Match stock View's
// prop-derived flattening on creation and every clone, preserving other traits.
inline void initialize(const ViewProps &viewProps, ShadowNodeTraits &traits) noexcept {
  auto hasBorder = [&]() {
    for (auto edge : yoga::ordinals<yoga::Edge>()) {
      if (viewProps.yogaStyle.border(edge).isDefined()) {
        return true;
      }
    }
    return false;
  };

  bool formsStackingContext = !viewProps.collapsable ||
      viewProps.pointerEvents == PointerEventsMode::BoxOnly ||
      viewProps.pointerEvents == PointerEventsMode::None ||
      !viewProps.nativeId.empty() || viewProps.accessible ||
      viewProps.opacity != 1.0 || viewProps.transform != Transform{} ||
      (viewProps.zIndex.has_value() &&
       viewProps.yogaStyle.positionType() != yoga::PositionType::Static) ||
      viewProps.yogaStyle.display() == yoga::Display::None ||
      viewProps.getClipsContentToBounds() || viewProps.events.bits.any() ||
      isColorMeaningful(viewProps.shadowColor) ||
      viewProps.accessibilityElementsHidden ||
      viewProps.accessibilityViewIsModal ||
      viewProps.importantForAccessibility != ImportantForAccessibility::Auto ||
      viewProps.removeClippedSubviews || viewProps.cursor != Cursor::Auto ||
      !viewProps.filter.empty() ||
      viewProps.mixBlendMode != BlendMode::Normal ||
      viewProps.isolation == Isolation::Isolate ||
      HostPlatformViewTraitsInitializer::formsStackingContext(viewProps) ||
      !viewProps.accessibilityOrder.empty();

  bool formsView = formsStackingContext ||
      isColorMeaningful(viewProps.backgroundColor) || hasBorder() ||
      !viewProps.testId.empty() || !viewProps.boxShadow.empty() ||
      !viewProps.backgroundImage.empty() ||
      HostPlatformViewTraitsInitializer::formsView(viewProps) ||
      viewProps.outlineWidth > 0;

  if (formsView) {
    traits.set(ShadowNodeTraits::Trait::FormsView);
  } else {
    traits.unset(ShadowNodeTraits::Trait::FormsView);
  }

  if (formsStackingContext) {
    traits.set(ShadowNodeTraits::Trait::FormsStackingContext);
  } else {
    traits.unset(ShadowNodeTraits::Trait::FormsStackingContext);
  }

  if (!viewProps.collapsableChildren) {
    traits.set(ShadowNodeTraits::Trait::ChildrenFormStackingContext);
  } else {
    traits.unset(ShadowNodeTraits::Trait::ChildrenFormStackingContext);
  }
}
} // namespace altroo::owned_view_traits
