// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private adapter follows RN0.88.1 MIT ViewProps/descriptor contracts.
// Adapted generated diff logic: Copyright (c) Meta Platforms, Inc. and affiliates.
#pragma once
#include "PreparedOwnedCandidates.h"
#include "OwnedProgramme.h"
#if defined(__ANDROID__) && defined(RN_SERIALIZABLE_STATE)
#include "OwnedBackgroundPayload.h"
#endif
#include <cmath>
#ifdef RN_SERIALIZABLE_STATE
#include <react/renderer/core/DynamicPropsUtilities.h>
#endif
#include <react/renderer/core/propsConversions.h>
#include <string>
#include <type_traits>

namespace altroo::owned_transport_proof {
using namespace facebook::react;
using Generated = AltrooMUIStructuralViewProps;
using GeneratedShared = std::shared_ptr<const Generated>;
using Pair = altroo::owned_adapter_proof::PreparedViewCandidates;

#ifdef RN_SERIALIZABLE_STATE
// Native raw payloads have a separate lifetime/meaning from typed props.
// Raw1.0 replaces incoming raw props; Props1.5 accumulates them; Props2.0 can
// skip raw preparation entirely. Merge ONLY existing native core output here,
// never materialize RawProps/JSI or infer values from typed fields.
struct PhysicalPayloads final {
  folly::dynamic baseline;
  std::array<folly::dynamic, 8> cases;
};
inline void clearMissingPhysicalKeys(folly::dynamic &target,
                                     const folly::dynamic &known) {
  for (const auto &item : known.items()) {
    const auto &key = item.first.getString();
    if (key != "ownedProgramme" && !target.count(key)) target[key] = nullptr;
  }
}
inline PhysicalPayloads physicalPayloads(const Generated &baseline, const Pair &pair,
                                        const PhysicalPayloads *previous) {
  auto current = mergeDynamicProps(previous ? previous->baseline : folly::dynamic::object(),
                                  baseline.rawProps, NullValueStrategy::Override);
  current.erase("ownedProgramme");
  std::array<folly::dynamic, 8> cases;
  for (std::size_t index = 0; index < cases.size(); ++index) {
    cases[index] = mergeDynamicProps(current, pair.at(index)->rawProps,
                                    NullValueStrategy::Override);
    cases[index].erase("ownedProgramme");
  }
  // Every branch must remove fields owned by any current or previous branch.
  // Use the complete union before mutating maps, independent of loop order.
  folly::dynamic known = folly::dynamic::object();
  for (const auto &value : cases)
    for (const auto &item : value.items()) known[item.first] = nullptr;
  if (previous)
    for (const auto &value : previous->cases)
      for (const auto &item : value.items()) known[item.first] = nullptr;
  for (auto &value : cases) clearMissingPhysicalKeys(value, known);
  clearMissingPhysicalKeys(current, known);
  return {std::move(current), std::move(cases)};
}
#endif

#if defined(__ANDROID__) && defined(RN_SERIALIZABLE_STATE)
// Complete native mount props are independent of speculative state history.
// Preallocation may have consumed an earlier branch before the first commit.
struct MountPayloads final {
  std::array<folly::dynamic, 8> cases;
  folly::dynamic ordinary;
};
inline folly::dynamic completeMountPayload(const GeneratedShared &selected,
    const GeneratedShared &baseline, const Pair &pair,
    const GeneratedShared &previousBaseline, const Pair *previousCandidates,
    const MountPayloads *previous) {
  auto result = selected->getDiffProps(nullptr);
  // The generated typed diff preserves platform removals under every supported
  // raw-prop mode, including the Props2 path with an empty rawProps carrier.
  const auto fillMissing = [&](const GeneratedShared &other) {
    const auto delta = selected->getDiffProps(other.get());
    for (const auto &item : delta.items())
      if (!result.count(item.first)) result[item.first] = item.second;
  };
  fillMissing(baseline);
  if (previousBaseline) fillMissing(previousBaseline);
  // Full current values win over partial nested deltas (for example a11y).
  for (std::uint8_t index = 0; index < 8; ++index) fillMissing(pair.at(index));
  if (previousCandidates)
    for (std::uint8_t index = 0; index < 8; ++index)
      fillMissing(previousCandidates->at(index));
  // Core's typed Android diff omits these three supported background vectors.
  // Serialize actual typed values, including an ordinary baseline restored
  // after the programme is removed. Aliases never enter the physical payload.
  const auto appendBackground = [&](const char *key, auto member, auto serialize) {
    const auto nonempty = [&](const GeneratedShared &value) {
      return value && !(value.get()->*member).empty();
    };
    bool known = nonempty(selected) || nonempty(baseline) || nonempty(previousBaseline) ||
        (previous && previous->ordinary.count(key));
    for (std::uint8_t index = 0; index < 8; ++index) {
      known = known || nonempty(pair.at(index)) ||
          (previousCandidates && nonempty(previousCandidates->at(index))) ||
          (previous && previous->cases[index].count(key));
    }
    if (known) result[key] = serialize(selected.get()->*member);
  };
  appendBackground("backgroundSize", &Generated::backgroundSize,
                   altroo::owned_background::backgroundSize);
  appendBackground("backgroundPosition", &Generated::backgroundPosition,
                   altroo::owned_background::backgroundPosition);
  appendBackground("backgroundRepeat", &Generated::backgroundRepeat,
                   altroo::owned_background::backgroundRepeat);
  result.erase("ownedProgramme");
  if (previous) {
    for (const auto &value : previous->cases) clearMissingPhysicalKeys(result, value);
    clearMissingPhysicalKeys(result, previous->ordinary);
  }
  // The programme owns styles only. IDs, accessibility state and events keep
  // their ordinary prop path; replaying those setters can have side effects.
  folly::dynamic styles = folly::dynamic::object();
  for (const auto &item : result.items())
    for (const auto key : altroo::owned_channel::styleKeys)
      if (key == item.first.getString()) {
        styles[item.first] = item.second;
        break;
      }
  return styles;
}
inline MountPayloads mountPayloads(const GeneratedShared &baseline, const Pair &pair,
    const GeneratedShared &previousBaseline, const Pair *previousCandidates,
    const MountPayloads *previous) {
  if (!pair.normal || !pair.last)
    throw std::invalid_argument("Complete generated mount candidates required");
  std::array<folly::dynamic, 8> cases;
  for (std::uint8_t index = 0; index < 8; ++index)
    cases[index] = completeMountPayload(pair.at(index), baseline, pair, previousBaseline, previousCandidates, previous);
  return {std::move(cases),
      completeMountPayload(baseline, baseline, pair, previousBaseline, previousCandidates, previous)};
}
#endif

// BEGIN OWNERSHIP
// These leaves have the FINAL generated type and cannot be OwnedProps wrappers.
// The graph is wrapper -> data -> generated leaves, never data -> wrapper.
enum class Programme { Numeric, ExplicitPair };
struct PreparedData final {
  const GeneratedShared unselected;
  const Pair candidates;
  const Programme programme;
  const bool parentSelector;
  const std::string owner;
#ifdef RN_SERIALIZABLE_STATE
  const PhysicalPayloads physical;
#if defined(__ANDROID__)
  const MountPayloads mount;
#endif
  static PhysicalPayloads checkedPhysical(const GeneratedShared &current, const Pair &pair,
                                           const PreparedData *previous) {
    if (!current || !pair.normal || !pair.last)
      throw std::invalid_argument("Complete current generated props required");
    return physicalPayloads(*current, pair, previous ? &previous->physical : nullptr);
  }
#endif
  PreparedData(GeneratedShared current, Pair pair, Programme kind,
               [[maybe_unused]] const PreparedData *previous = nullptr,
               bool parent = false, std::string identity = {})
      : unselected(std::move(current)), candidates(std::move(pair)), programme(kind),
        parentSelector(parent), owner(std::move(identity))
#ifdef RN_SERIALIZABLE_STATE
      , physical(checkedPhysical(unselected, candidates, previous))
#if defined(__ANDROID__)
      , mount(mountPayloads(unselected, candidates, previous ? previous->unselected : nullptr,
                            previous ? &previous->candidates : nullptr,
                            previous ? &previous->mount : nullptr))
#endif
#endif
  {
    if (!unselected || !candidates.normal || !candidates.last)
      throw std::invalid_argument("Complete current generated props required");
    unselected->seal();
    for (std::uint8_t index = 0; index < 8; ++index) candidates.at(index)->seal();
  }
};
using DataShared = std::shared_ptr<const PreparedData>;

class OwnedProps final : public ViewProps {
  static const Generated &chosen(const DataShared &data, std::uint8_t facts) {
    if (!data) throw std::invalid_argument("Prepared owned data required");
    return *(facts == 8 ? data->unselected : data->candidates.at(facts));
  }
 public:
  using Shared = std::shared_ptr<const OwnedProps>;
  const double normalPaddingBottom{16};
  const double lastPaddingBottom{24};
  const DataShared prepared;
  const bool selectedLast{false};
  const std::uint8_t selectedCase{0};
  OwnedProps() = default;
  // ConcreteComponentDescriptor prepares its parser through this ordinary
  // View constructor. The actual descriptor override below is the only path
  // that prepares a structural programme. Unprepared props fail selection.
  OwnedProps(const PropsParserContext &context, const OwnedProps &source,
             const RawProps &raw)
      : ViewProps(context, source, raw),
        normalPaddingBottom(convertRawProp(context, raw, "normalPaddingBottom",
                                           source.normalPaddingBottom, 16.0)),
        lastPaddingBottom(convertRawProp(context, raw, "lastPaddingBottom",
                                         source.lastPaddingBottom, 24.0)) {}
  OwnedProps(DataShared data, std::uint8_t facts)
      : ViewProps(chosen(data, facts)),
        normalPaddingBottom(data->unselected->normalPaddingBottom),
        lastPaddingBottom(data->unselected->lastPaddingBottom),
        prepared(std::move(data)), selectedLast(facts & 1), selectedCase(facts) {
#ifdef RN_SERIALIZABLE_STATE
    // Physical payload is complete and already has explicit removals. This
    // copy is native data only; candidate switching never parses/merges JS.
    rawProps = facts == 8 ? prepared->physical.baseline : prepared->physical.cases[facts];
#endif
  }
#ifdef RN_SERIALIZABLE_STATE
  ComponentName getDiffPropsImplementationTarget() const override {
    return "AltrooMUIStructuralView";
  }
  folly::dynamic getDiffProps(const Props *previous) const override {
    // Both objects are the owned descriptor's type, as with RN's generated
    // getDiffProps. Pass a real ViewProps base to the platform View diff. Never
    // cast this manual wrapper to the final generated Props class.
    const auto *old = previous ? static_cast<const OwnedProps *>(previous) : nullptr;
    if (this == old) return folly::dynamic::object();
    auto result = ViewProps::getDiffProps(previous);
    const double oldNormal = old ? old->normalPaddingBottom : 16;
    const double oldLast = old ? old->lastPaddingBottom : 24;
    if (normalPaddingBottom != oldNormal &&
        !(std::isnan(normalPaddingBottom) && std::isnan(oldNormal)))
      result["normalPaddingBottom"] = normalPaddingBottom;
    if (lastPaddingBottom != oldLast &&
        !(std::isnan(lastPaddingBottom) && std::isnan(oldLast)))
      result["lastPaddingBottom"] = lastPaddingBottom;
    return result;
  }
#endif
};
static_assert(std::is_base_of_v<ViewProps, OwnedProps>);
static_assert(!std::is_base_of_v<Generated, OwnedProps>);
static_assert(!HasIteratorSetterCtor<OwnedProps>);

inline GeneratedShared baselineForUpdate(const OwnedProps::Shared &source) {
  if (!source) return nullptr;
  if (!source->prepared)
    throw std::invalid_argument("Unprepared programme source rejected");
  return source->prepared->unselected;
}
inline OwnedProps::Shared wrap(DataShared data, std::uint8_t facts) {
  auto result = std::make_shared<OwnedProps>(std::move(data), facts);
  result->seal();
  return result;
}
// Commit-side operation: native copies/ownership only, no parsing/context/JSI.
inline OwnedProps::Shared select(const OwnedProps::Shared &current, std::uint8_t facts) {
  if (!current || !current->prepared)
    throw std::invalid_argument("Current owned programme required");
  if (facts > 8) throw std::invalid_argument("Invalid owned selector facts");
  if (current->selectedCase == facts) return current;
  return wrap(current->prepared, facts);
}
// END OWNERSHIP

#if defined(__ANDROID__) && defined(RN_SERIALIZABLE_STATE)
struct MountStateData final {
  OwnedProps::Shared selected;
  MountStateData() = default;
  explicit MountStateData(OwnedProps::Shared value) : selected(std::move(value)) {
    if (!selected || !selected->prepared)
      throw std::invalid_argument("Prepared owned mount state required");
  }
  MountStateData(const MountStateData &, folly::dynamic) {
    throw std::invalid_argument("Owned mount state is not platform-writable");
  }
  folly::dynamic getDynamic() const {
    if (!selected || !selected->prepared)
      throw std::logic_error("Unprepared owned mount state");
    const auto &payload = selected->selectedCase == 8 ? selected->prepared->mount.ordinary
        : selected->prepared->mount.cases[selected->selectedCase];
    return folly::dynamic::object("schema", 1)("selectedProps", payload);
  }
};
using OwnedStateData = MountStateData;
#else
using OwnedStateData = StateData;
#endif
class OwnedShadowNode final : public ConcreteViewShadowNode<
    AltrooStructuralViewName, OwnedProps, ViewEventEmitter, OwnedStateData> {
  using Base = ConcreteViewShadowNode<
      AltrooStructuralViewName, OwnedProps, ViewEventEmitter, OwnedStateData>;
 public:
  using Base::Base;
#if defined(__ANDROID__) && defined(RN_SERIALIZABLE_STATE)
  static MountStateData initialStateData(const Props::Shared &props,
      const ShadowNodeFamily::Shared &, const ComponentDescriptor &) {
    return MountStateData(std::static_pointer_cast<const OwnedProps>(props));
  }
  OwnedShadowNode(const ShadowNode &source, const ShadowNodeFragment &fragment)
      : Base(source, fragment) {
    // Resolve state from this clone's actual props, including clones with an
    // explicit state fragment. Never publish a prior speculative selection.
    // RN0.88.1's convenience shared-props accessor returns a temporary by
    // reference. Retain a value from the stable base props accessor instead.
    const auto selected = std::static_pointer_cast<const OwnedProps>(getProps());
    if (getStateData().selected != selected)
      setStateData(MountStateData(selected));
  }
#endif
};
static_assert(std::is_same_v<OwnedShadowNode::ConcreteProps, OwnedProps>);
static_assert(!std::is_same_v<OwnedShadowNode, altroo::owned_channel::ConversionShadowNode>);
class OwnedDescriptor final : public ConcreteComponentDescriptor<OwnedShadowNode> {
  altroo::owned_channel::ConversionDescriptor converter_;
  using ConverterCore = altroo::owned_channel::ConversionDescriptor;
  GeneratedShared convertCurrent(const PropsParserContext &context,
      const OwnedProps::Shared &source, RawProps raw) const {
    auto result = converter_.ConverterCore::cloneProps(
        context, baselineForUpdate(source), std::move(raw));
    return std::static_pointer_cast<const Generated>(result);
  }
  OwnedProps::Shared finish(GeneratedShared baseline, Pair pair, Programme kind,
                            const OwnedProps::Shared &source, bool parent = false, std::string owner = {}) const {
    // Structural programmes begin from their genuine ordinary presentation.
    // A failed/unsupported native selection must not pin the renderer to case0.
    const std::uint8_t initial = pair.structural() ? 8 : (source && source->selectedLast ? 1 : 0);
    return wrap(std::make_shared<const PreparedData>(std::move(baseline),
        std::move(pair), kind, source ? source->prepared.get() : nullptr, parent, std::move(owner)), initial);
  }
 public:
  explicit OwnedDescriptor(const ComponentDescriptorParameters &parameters)
      : ConcreteComponentDescriptor(parameters), converter_(parameters) {}
  Props::Shared cloneProps(const PropsParserContext &context,
      const Props::Shared &source, RawProps raw) const override {
    // RN descriptor/family ownership supplies this exact Props type. This is
    // the same static-type precondition used by ConcreteComponentDescriptor.
    auto current = std::static_pointer_cast<const OwnedProps>(source);
    if (current && current->prepared &&
        current->prepared->programme == Programme::ExplicitPair &&
        current->prepared->unselected->ownedProgramme.isNull())
      throw std::invalid_argument("Legacy C++ pair requires explicit replacement");
    // Generated conversion retains omitted envelope data and resets explicit
    // null. Always start from unselected current props, never COW-selected CSS.
    auto baseline = convertCurrent(context, current, std::move(raw));
    if (altroo::owned_channel::fullProgramme(baseline->ownedProgramme)) {
      if (baseline->ownedProgramme.at("schema").asDouble() == 2.0) {
        auto cases = altroo::owned_adapter_proof::prepareStructural(
            converter_, context, baseline, baseline->ownedProgramme.at("cases"));
        const bool parent = baseline->ownedProgramme.count("basis") != 0;
        auto owner = baseline->ownedProgramme.count("owner")
            ? baseline->ownedProgramme.at("owner").getString() : std::string{};
        return finish(std::move(baseline), std::move(cases), Programme::ExplicitPair, current, parent, std::move(owner));
      }
      auto normal = baseline->ownedProgramme.at("normal");
      auto last = baseline->ownedProgramme.at("last");
      // Candidate generated leaves need no duplicate programme and must never
      // publish it through Android raw/diff mount paths.
      normal["ownedProgramme"] = nullptr;
      last["ownedProgramme"] = nullptr;
      auto pair = altroo::owned_adapter_proof::prepare(converter_, context, baseline,
          RawProps(std::move(normal)), RawProps(std::move(last)));
      return finish(std::move(baseline), std::move(pair), Programme::ExplicitPair, current);
    }
    return numericFromBaseline(context, std::move(baseline), current);
  }
  OwnedProps::Shared replaceNumeric(const PropsParserContext &context,
      const OwnedProps::Shared &source, RawProps raw) const {
    auto baseline = convertCurrent(context, source, std::move(raw));
    if (!baseline->ownedProgramme.isNull())
      throw std::invalid_argument("Explicit numeric replacement must clear ownedProgramme");
    return numericFromBaseline(context, std::move(baseline), source);
  }
 private:
  OwnedProps::Shared numericFromBaseline(const PropsParserContext &context,
      GeneratedShared baseline, const OwnedProps::Shared &source) const {
    auto normal = folly::dynamic::object("paddingBottom", baseline->normalPaddingBottom);
    auto last = folly::dynamic::object("paddingBottom", baseline->lastPaddingBottom);
    auto pair = altroo::owned_adapter_proof::prepare(converter_, context, baseline,
        RawProps(std::move(normal)), RawProps(std::move(last)));
    return finish(std::move(baseline), std::move(pair), Programme::Numeric, source);
  }
 public:
  // Private C++ handoff for an already current, normalized full pair. No new JS
  // ABI is invented. Caller must supply BOTH replacements on each such update.
  OwnedProps::Shared replaceExplicit(const PropsParserContext &context,
      const OwnedProps::Shared &source, RawProps current,
      RawProps normal, RawProps last) const {
    auto baseline = convertCurrent(context, source, std::move(current));
    auto pair = altroo::owned_adapter_proof::prepare(converter_, context, baseline,
        std::move(normal), std::move(last));
    return finish(std::move(baseline), std::move(pair), Programme::ExplicitPair, source);
  }
};
} // namespace altroo::owned_transport_proof
