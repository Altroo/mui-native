// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private generated-host constructor proof, not a production CSS API.
#pragma once
#include <memory>
#include <vector>
#include <cstdint>
#include "GeneratedConversion.h"

#include <react/renderer/core/RawProps.h>
#include <stdexcept>
#include <utility>

namespace altroo::owned_adapter_proof {
using namespace facebook::react;
struct PreparedViewCandidates {
  std::shared_ptr<const AltrooMUIStructuralViewProps> normal;
  std::shared_ptr<const AltrooMUIStructuralViewProps> last;
  // Bits: last-child=1, first-of-type=2, last-of-type=4. Legacy pairs
  // keep their two-leaf storage and ignore the added structural facts.
  std::vector<std::shared_ptr<const AltrooMUIStructuralViewProps>> cases{};
  bool structural() const { return !cases.empty(); }
  std::size_t count() const { return structural() ? cases.size() : 8; }
  std::uint8_t ordinaryIndex() const { return static_cast<std::uint8_t>(count()); }
  const std::shared_ptr<const AltrooMUIStructuralViewProps> &at(std::uint8_t facts) const {
    if (facts >= count()) throw std::invalid_argument("Invalid owned selector facts");
    const auto &value = structural() ? cases[facts] : (facts & 1 ? last : normal);
    if (!value) throw std::invalid_argument("Owned style candidate is missing");
    return value;
  }
};
// Consume already normalized native payloads on RN's ordinary props-conversion
// thread. The baseline must be unselected current props, not the previous COW
// selection. Inputs must include native removal sentinels needed when switching
// candidates; the constructor cannot infer them from omitted keys. No RawProps,
// JSI/runtime or descriptor survives in the returned pair.
inline PreparedViewCandidates
prepare(const altroo::owned_channel::ConversionDescriptor &descriptor,
        const PropsParserContext &context,
        const std::shared_ptr<const AltrooMUIStructuralViewProps> &unselectedBaseline,
        RawProps normalPayload, RawProps lastPayload) {
  using CoreDescriptor = altroo::owned_channel::ConversionDescriptor;
  // Use the exact core descriptor implementation, including its parser/iterator
  // choice and Android initializeDynamicProps path. Do not implement a second
  // serializer or mutate only the typed fields via setProp.
  auto normal = descriptor.CoreDescriptor::cloneProps(
      context, unselectedBaseline, std::move(normalPayload));
  auto last = descriptor.CoreDescriptor::cloneProps(context, unselectedBaseline,
                                                    std::move(lastPayload));
  if (!normal || !last)
    throw std::logic_error("Core View descriptor returned no candidate props");
  // CoreDescriptor is statically bound to the owned generated Props type. No
  // cross-DSO RTTI or arbitrary custom descriptor/host cast is involved.
  auto typedNormal = std::static_pointer_cast<const AltrooMUIStructuralViewProps>(normal);
  auto typedLast = std::static_pointer_cast<const AltrooMUIStructuralViewProps>(last);
  typedNormal->seal();
  typedLast->seal();
  return {std::move(typedNormal), std::move(typedLast)};
}
// Ordinary conversion only. Equal normalized maps share a sealed leaf; the
// commit hook selects ownership and never runs a parser or reads JavaScript.
inline PreparedViewCandidates prepareStructural(
    const altroo::owned_channel::ConversionDescriptor &descriptor,
    const PropsParserContext &context,
    const std::shared_ptr<const AltrooMUIStructuralViewProps> &baseline,
    const folly::dynamic &payloads) {
  using CoreDescriptor = altroo::owned_channel::ConversionDescriptor;
  if (!payloads.isArray() || (payloads.size() != 8 && payloads.size() != 16))
    throw std::invalid_argument("Owned structural programme requires eight or sixteen cases");
  PreparedViewCandidates result;
  result.cases.resize(payloads.size());
  for (std::size_t index = 0; index < result.cases.size(); ++index) {
    for (std::size_t prior = 0; prior < index; ++prior)
      if (payloads[index] == payloads[prior]) {
        result.cases[index] = result.cases[prior];
        break;
      }
    if (result.cases[index]) continue;
    auto payload = payloads[index];
    payload["ownedProgramme"] = nullptr;
    auto value = descriptor.CoreDescriptor::cloneProps(
        context, baseline, RawProps(std::move(payload)));
    if (!value) throw std::logic_error("Core View descriptor returned no candidate props");
    auto typed = std::static_pointer_cast<const AltrooMUIStructuralViewProps>(value);
    typed->seal();
    result.cases[index] = std::move(typed);
  }
  result.normal = result.cases[0];
  result.last = result.cases[1];
  return result;
}
inline std::shared_ptr<const AltrooMUIStructuralViewProps>
select(const PreparedViewCandidates &candidates, bool isLast) {
  auto selected = isLast ? candidates.last : candidates.normal;
  if (!selected)
    throw std::invalid_argument("Owned style proof candidate is missing");
  // Retain ownership even if the caller releases the pair after selection.
  // This operation does not parse values, call JS or change either candidate.
  return selected;
}
} // namespace altroo::owned_adapter_proof
