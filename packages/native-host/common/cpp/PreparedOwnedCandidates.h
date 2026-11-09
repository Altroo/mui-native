// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private generated-host constructor proof, not a production CSS API.
#pragma once
#include <memory>
#include "GeneratedConversion.h"

#include <react/renderer/core/RawProps.h>
#include <stdexcept>
#include <utility>

namespace altroo::owned_adapter_proof {
using namespace facebook::react;
struct PreparedViewCandidates {
  std::shared_ptr<const AltrooMUIStructuralViewProps> normal;
  std::shared_ptr<const AltrooMUIStructuralViewProps> last;
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
