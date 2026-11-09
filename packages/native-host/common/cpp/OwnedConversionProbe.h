// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Linked constructor probe only. This is not a renderer or a CSS evaluator.
#pragma once
#include "PreparedOwnedCandidates.h"
#include <cmath>
#include <folly/json.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/graphics/Color.h>

namespace altroo::owned_adapter_proof {
inline folly::dynamic runConversionProbe(const PropsParserContext &context,
                                         const std::shared_ptr<const ContextContainer> &container) {
  auto require = [](bool ok, const char *message) {
    if (!ok) throw std::logic_error(message);
  };
  altroo::owned_channel::ConversionDescriptor descriptor({{}, container, {}});
  auto baselinePayload = folly::dynamic::object
      ("nativeID", "owned-props-baseline")("opacity", 0.4)
      ("normalPaddingBottom", 9.0)("lastPaddingBottom", 11.0)
      ("paddingBottom", 20.0)("backgroundColor", int64_t{4294901760LL})
      ("transform", folly::dynamic::array(folly::dynamic::object("scale", 2.0)));
  auto baseline = std::static_pointer_cast<const AltrooMUIStructuralViewProps>(
      descriptor.cloneProps(context, nullptr, RawProps(std::move(baselinePayload))));
  require(baseline != nullptr, "Owned baseline exists");
  baseline->seal();
  require(std::abs(baseline->opacity - 0.4) < 0.0001, "Baseline opacity parsed");
  require(baseline->normalPaddingBottom == 9 && baseline->lastPaddingBottom == 11,
          "Generated custom fields parsed");
  require(redFromColor(baseline->backgroundColor) == 255 &&
          greenFromColor(baseline->backgroundColor) == 0 &&
          blueFromColor(baseline->backgroundColor) == 0 &&
          alphaFromColor(baseline->backgroundColor) == 255, "Exact processed red parsed");
  const auto baselineNativeId = baseline->nativeId;
  const auto baselineOpacity = baseline->opacity;
  const auto baselineNormal = baseline->normalPaddingBottom;
  const auto baselineLast = baseline->lastPaddingBottom;
  const auto baselineYoga = baseline->yogaStyle;
  const auto baselineColor = baseline->backgroundColor;
  const auto baselineTransform = baseline->transform;
  Transform expectedBaselineTransform;
  expectedBaselineTransform.operations.push_back({TransformOperationType::Scale,
      ValueUnit(2, UnitType::Point), ValueUnit(2, UnitType::Point), ValueUnit(2, UnitType::Point)});
  require(baseline->transform == expectedBaselineTransform,
          "Exact baseline scale transform parsed");
  auto normal = folly::dynamic::object("paddingBottom", 16.0)
      ("backgroundColor", int64_t{4278190335LL})
      ("transform", folly::dynamic::array(folly::dynamic::object("translateX", 7.0)));
  // Native null reset tokens are already processed input, not raw JS styles.
  auto last = folly::dynamic::object("paddingBottom", nullptr)
      ("backgroundColor", nullptr)("transform", nullptr);
  auto pair = prepare(descriptor, context, baseline,
                      RawProps(std::move(normal)), RawProps(std::move(last)));
  require(pair.normal != pair.last && pair.normal != baseline && pair.last != baseline,
          "Distinct retained generated props");
  require(pair.normal->nativeId == baseline->nativeId &&
          pair.last->nativeId == baseline->nativeId &&
          pair.normal->normalPaddingBottom == 9 && pair.normal->lastPaddingBottom == 11 &&
          pair.last->normalPaddingBottom == 9 && pair.last->lastPaddingBottom == 11 &&
          pair.normal->opacity == baseline->opacity && pair.last->opacity == baseline->opacity,
          "Non-style and generated fields preserved");
  const auto normalBottom = pair.normal->yogaStyle.padding(facebook::yoga::Edge::Bottom);
  require(normalBottom.isPoints() && normalBottom.value().unwrap() == 16,
          "Normal point padding parsed");
  require(pair.last->yogaStyle.padding(facebook::yoga::Edge::Bottom).isUndefined(),
          "Native padding removal resets typed field");
  require(blueFromColor(pair.normal->backgroundColor) == 255 &&
          redFromColor(pair.normal->backgroundColor) == 0 &&
          greenFromColor(pair.normal->backgroundColor) == 0 &&
          alphaFromColor(pair.normal->backgroundColor) == 255 && !pair.last->backgroundColor,
          "Color selection and removal parsed");
  Transform expectedNormalTransform;
  expectedNormalTransform.operations.push_back({TransformOperationType::Translate,
      ValueUnit(7, UnitType::Point), ValueUnit(0, UnitType::Point), ValueUnit(0, UnitType::Point)});
  require(pair.normal->transform == expectedNormalTransform &&
          pair.last->transform == Transform::Identity(), "Transform and removal parsed");
  auto requireBaselineUnchanged = [&] {
    require(baseline->nativeId == baselineNativeId && baseline->opacity == baselineOpacity &&
            baseline->normalPaddingBottom == baselineNormal &&
            baseline->lastPaddingBottom == baselineLast && baseline->yogaStyle == baselineYoga &&
            baseline->backgroundColor == baselineColor && baseline->transform == baselineTransform,
            "Complete finite unselected baseline unchanged");
  };
  requireBaselineUnchanged();
  auto retained = select(pair, true);
  pair = {};
  require(retained->nativeId == "owned-props-baseline", "Selected props own lifetime");
  auto percent = prepare(descriptor, context, baseline,
      RawProps(folly::dynamic::object("paddingBottom", "10%")), RawProps());
  const auto percentBottom = percent.normal->yogaStyle.padding(facebook::yoga::Edge::Bottom);
  require(percentBottom.isPercent() && percentBottom.value().unwrap() == 10,
          "Native percentage survives conversion");
  require(percent.last->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 20,
          "Omitted style preserves unselected baseline");
  requireBaselineUnchanged();
  folly::dynamic result = folly::dynamic::object("schema", 1)("linkedConstructorProbe", true)
      ("generatedPropsType", "AltrooMUIStructuralViewProps")
      ("iteratorSetter", ReactNativeFeatureFlags::enableCppPropsIteratorSetter())
      ("nativeCSSParsing", ReactNativeFeatureFlags::enableNativeCSSParsing())
      ("exclusiveAndroid", ReactNativeFeatureFlags::enableExclusivePropsUpdateAndroid())
      ("accumulatedAndroid", ReactNativeFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid())
      ("reconciliationAndroid", ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid())
      ("typedChecksPassed", true)("nativePaintClaim", false);
#ifdef RN_SERIALIZABLE_STATE
  // Retain actual raw and typed-diff outputs. Assertions on mounting-path
  // eligibility belong to the platform-specific installed test, not this flag.
  result["androidSerializableState"] = true;
  result["lastRawProps"] = retained->rawProps;
  result["lastDiffProps"] = retained->getDiffProps(baseline.get());
  result["ownedDiffTarget"] = retained->getDiffPropsImplementationTarget();
#else
  result["androidSerializableState"] = false;
#endif
  return result;
}
} // namespace altroo::owned_adapter_proof
