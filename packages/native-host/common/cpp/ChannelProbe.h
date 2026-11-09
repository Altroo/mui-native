// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Callable with a live ordinary RN PropsParserContext. Compiling is not running.
#pragma once
#include "OwnedPropsTransport.h"
#include <react/renderer/graphics/Color.h>
namespace altroo::owned_channel {
inline folly::dynamic runChannelProbe(const facebook::react::PropsParserContext &context,
    const std::shared_ptr<const facebook::react::ContextContainer> &container) {
  using namespace facebook::react;
  using namespace altroo::owned_transport_proof;
  using D = folly::dynamic;
  std::size_t checks = 0;
  auto require = [&](bool value, const char *message) {
    ++checks;
    if (!value) throw std::logic_error(message);
  };
  auto reject = [&](auto action) {
    bool rejected = false;
    try { action(); } catch (const std::invalid_argument &) { rejected = true; }
    require(rejected, "Malformed owned programme must reject");
  };
  auto envelope = [](D normal, D last) {
    return D::object("schema", 1)("profile", nativeProfile())
        ("normal", std::move(normal))("last", std::move(last));
  };
  OwnedDescriptor descriptor({{}, container, {}});
  auto clone = [&](const OwnedProps::Shared &source, D raw) {
    return std::static_pointer_cast<const OwnedProps>(
        descriptor.cloneProps(context, source, RawProps(std::move(raw))));
  };
  D normal = D::object("paddingBottom", 16.0)("backgroundColor", int64_t{4278190335LL})
      ("transform", D::array(D::object("translateX", 7.0)));
  D last = D::object("paddingBottom", nullptr)("backgroundColor", nullptr)("transform", nullptr);
  D programme = envelope(normal, last);
  D current = D::object("nativeID", "channel-current")("testID", "channel-test")
      ("accessibilityLabel", "channel-label")("opacity", 0.4)
      ("paddingBottom", 20.0)("backgroundColor", int64_t{4294901760LL})
      ("transform", D::array(D::object("scale", 2.0)))("ownedProgramme", programme);
  auto first = clone(nullptr, current);
  D jsProgramme = programme; jsProgramme["schema"] = 1.0;
  auto jsWire = clone(nullptr, D::object("ownedProgramme", jsProgramme));
  require(jsWire->yogaStyle.padding(facebook::yoga::Edge::Bottom).isPoints() &&
      jsWire->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 16,
      "JSI dynamicFromValue Double schema1 is accepted");
  auto bottom = first->yogaStyle.padding(facebook::yoga::Edge::Bottom);
  require(bottom.isPoints() && bottom.value().unwrap() == 16, "Authored normal16 points");
  require(redFromColor(first->backgroundColor) == 0 && greenFromColor(first->backgroundColor) == 0 &&
      blueFromColor(first->backgroundColor) == 255 && alphaFromColor(first->backgroundColor) == 255,
      "Authored normal complete blue RGBA");
  Transform expected;
  expected.operations.push_back({TransformOperationType::Translate,
      ValueUnit(7, UnitType::Point), ValueUnit(0, UnitType::Point), ValueUnit(0, UnitType::Point)});
  require(first->transform == expected, "Exact identity matrix plus processed Translate7 operation");
  require(first->nativeId == "channel-current" && first->opacity == static_cast<Float>(0.4),
      "Current non-style values survive");
  auto selected = select(first, true);
  require(selected->yogaStyle.padding(facebook::yoga::Edge::Bottom).isUndefined() &&
      !selected->backgroundColor && selected->transform == Transform::Identity(), "Last null resets");
  require(select(selected, true) == selected, "Same selection identity");
  auto update = clone(selected, D::object("nativeID", "channel-next")("opacity", 0.7));
  require(update->selectedLast && update->nativeId == "channel-next" &&
      update->opacity == static_cast<Float>(0.7), "Ordinary current values and selection retained");
  require(update->prepared->unselected->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 20,
      "Ordinary update uses unselected baseline20");
  require(select(update, false)->transform == expected, "Omitted programme retains full normal candidate");
  D next = envelope(D::object("paddingBottom", 12.0)("backgroundColor", nullptr)("transform", nullptr),
      D::object("paddingBottom", 32.0));
  auto replaced = clone(update, D::object("ownedProgramme", next));
  require(replaced->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 32 &&
      select(replaced, false)->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 12,
      "Full replacement changes both candidates");
  require(!select(replaced, false)->backgroundColor && select(replaced, false)->transform == Transform::Identity(),
      "Replacement resets do not retain prior selected blue/translate");
  auto empty = clone(replaced, D::object("ownedProgramme", envelope(D::object(), D::object())));
  require(empty->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 20 &&
      redFromColor(empty->backgroundColor) == 255 && greenFromColor(empty->backgroundColor) == 0 &&
      blueFromColor(empty->backgroundColor) == 0 && alphaFromColor(empty->backgroundColor) == 255,
      "Omitted candidate keys fall back to unselected authored baseline");
  auto numeric = clone(replaced, D::object("ownedProgramme", nullptr)
      ("normalPaddingBottom", 5.0)("lastPaddingBottom", 9.0));
  require(numeric->prepared->programme == Programme::Numeric &&
      numeric->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 9 &&
      select(numeric, false)->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 5,
      "Explicit null restores numeric mode");
  auto defaults = clone(numeric, D::object("normalPaddingBottom", nullptr)("lastPaddingBottom", nullptr));
  require(defaults->normalPaddingBottom == 16 && defaults->lastPaddingBottom == 24 &&
      defaults->yogaStyle.padding(facebook::yoga::Edge::Bottom).value().unwrap() == 24, "Numeric reset defaults");
  reject([&] { (void)clone(replaced, D::object("ownedProgramme", D::object())); });
  D wrongProfile = programme; wrongProfile["profile"]["rn"] = "stale";
  reject([&] { (void)clone(replaced, D::object("ownedProgramme", wrongProfile)); });
  D wrongKey = programme; wrongKey["normal"]["nativeID"] = "not-style";
  reject([&] { (void)clone(replaced, D::object("ownedProgramme", wrongKey)); });
  require(replaced->prepared->unselected->ownedProgramme == next &&
      first->prepared->unselected->ownedProgramme == programme, "Prior sealed revisions unchanged after failure");
  require(first->prepared->candidates.normal->ownedProgramme.isNull() &&
      first->prepared->candidates.last->ownedProgramme.isNull(), "Candidate leaves do not duplicate envelope");
#ifdef RN_SERIALIZABLE_STATE
  for (const auto &props : {first, selected, update, replaced, numeric, defaults}) {
    require(!props->rawProps.count("ownedProgramme"), "Android physical raw payload excludes envelope");
    require(!props->getDiffProps(nullptr).count("ownedProgramme"), "Android typed diff excludes envelope");
  }
  auto diff = select(replaced, false)->getDiffProps(replaced.get());
  // BEGIN SUPPORTED TYPED DIFF ORACLE
  const auto updateDiff = update->getDiffProps(selected.get());
  // Android HostPlatformViewProps does not serialize paddingBottom.
  // Yoga padding remains independently asserted above and in raw cases below.
  require(diff == D::object("backgroundColor", 0)("transform", D::array()) &&
      !diff.count("paddingBottom") &&
      updateDiff == D::object("nativeID", "channel-next")
          ("opacity", static_cast<double>(static_cast<Float>(0.7))),
      "Exact supported paint resets and current non-style typed diff, without Yoga padding");
  // END SUPPORTED TYPED DIFF ORACLE
#endif
  D androidRawPayloads = nullptr;
#ifdef RN_SERIALIZABLE_STATE
  // This is RN's exact fallback predicate in ConcreteComponentDescriptor.
  // All-true Props2.0 can skip raw initialization; Fabric uses our typed diff.
  const bool corePreparedRaw = !(ReactNativeFeatureFlags::enableExclusivePropsUpdateAndroid() &&
      ReactNativeFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid() &&
      ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid());
  androidRawPayloads = D::object("schema", 1)("observedCoreRawPrepared", corePreparedRaw)
      ("expectedFabricTypedDiffPath", ReactNativeFeatureFlags::enablePropsUpdateReconciliationAndroid())
      ("cases", D::object())("diffs", D::object());
  if (corePreparedRaw) {
    require(first->rawProps.count("nativeID") && first->rawProps.at("nativeID") == "channel-current" &&
        first->rawProps.count("testID") && first->rawProps.at("testID") == "channel-test" &&
        first->rawProps.count("accessibilityLabel") && first->rawProps.at("accessibilityLabel") == "channel-label" &&
        first->rawProps.count("opacity") && first->rawProps.at("opacity") == 0.4,
        "Initial physical payload retains native non-style props and opacity");
    require(update->rawProps.count("nativeID") && update->rawProps.at("nativeID") == "channel-next" &&
        update->rawProps.count("testID") && update->rawProps.at("testID") == "channel-test" &&
        update->rawProps.count("accessibilityLabel") && update->rawProps.at("accessibilityLabel") == "channel-label" &&
        update->rawProps.count("opacity") && update->rawProps.at("opacity") == 0.7,
        "Ordinary update retains current and omitted physical native fields");
    auto clear = clone(update, D::object("nativeID", nullptr)("testID", nullptr)
        ("accessibilityLabel", nullptr)("opacity", nullptr));
    for (const auto *key : {"nativeID", "testID", "accessibilityLabel", "opacity"})
      require(clear->rawProps.count(key) && clear->rawProps.at(key).isNull(),
          "Physical null reset sentinel survives ordinary conversion");
    require(empty->rawProps.count("backgroundColor") &&
        empty->rawProps.at("backgroundColor") == int64_t{4294901760LL},
        "Missing current candidate key restores authored baseline red");
    D lastOnly = envelope(D::object("paddingBottom", 16.0),
        D::object("paddingBottom", 24.0)("backgroundColor", int64_t{4278190335LL})
          ("transform", D::array(D::object("translateX", 7.0))));
    auto branchNormal = clone(nullptr, D::object("ownedProgramme", lastOnly));
    auto branchLast = select(branchNormal, true);
    for (const auto *key : {"backgroundColor", "transform"})
      require(branchNormal->rawProps.count(key) && branchNormal->rawProps.at(key).isNull(),
          "First pair's missing normal key explicitly restores native default");
    auto noPaint = clone(branchLast, D::object("ownedProgramme", envelope(
        D::object("paddingBottom", 12.0), D::object("paddingBottom", 32.0))));
    auto numericNoPaint = clone(branchLast, D::object("ownedProgramme", nullptr));
    for (const auto &candidate : {noPaint, select(noPaint, false), numericNoPaint, select(numericNoPaint, false)})
      for (const auto *key : {"backgroundColor", "transform"})
        require(candidate->rawProps.count(key) && candidate->rawProps.at(key).isNull(),
            "Removed prior candidate paint emits physical null for replacement/numeric mode");
    // Snapshot actual constructed native payloads, not a mounted View or paint.
    androidRawPayloads["cases"] = D::object("initial", first->rawProps)
        ("ordinaryUpdate", update->rawProps)("explicitClear", clear->rawProps)
        ("missingKeyRestoration", empty->rawProps)("inPairMissingNormal", branchNormal->rawProps)
        ("inPairPaintedLast", branchLast->rawProps)
        ("replacementNormal", select(noPaint, false)->rawProps)("replacementLast", noPaint->rawProps)
        ("numericNormal", select(numericNoPaint, false)->rawProps)("numericLast", numericNoPaint->rawProps);
    androidRawPayloads["diffs"] = D::object("replacement", noPaint->getDiffProps(branchLast.get()));
  }
#endif
  std::weak_ptr<const PreparedData> weak;
  { auto temporary = clone(nullptr, current); weak = temporary->prepared;
    auto retained = select(temporary, true); temporary.reset();
    require(!weak.expired(), "Selected wrapper owns immutable full pair"); }
  require(weak.expired(), "No wrapper/data/pair ownership cycle");
  return D::object("schema", 1)("checks", int64_t(checks))("nativeProfile", nativeProfile())
      ("ordinaryConversionOnly", true)("mountedOrDrawnProved", false)
      ("androidRawPayloads", std::move(androidRawPayloads));
}
} // namespace altroo::owned_channel
