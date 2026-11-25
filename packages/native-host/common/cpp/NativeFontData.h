// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Immutable typed font operations. No parsing or caller-owned data in commits.
#pragma once
#include <react/renderer/attributedstring/TextAttributes.h>
#include <array>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>
namespace altroo::text_fonts {
using namespace facebook::react;
inline constexpr std::uint8_t legacyFields = 31;
inline constexpr std::uint8_t alignmentField = 32;
inline constexpr std::uint8_t allFields = legacyFields | alignmentField;
enum class CssAlignment : std::uint8_t { Native, Left, Right, Start, End };
struct State { TextAttributes attributes; std::uint8_t blocked{}; CssAlignment cssAlignment{}; };
struct Step { State state; std::uint8_t owns{}; };
struct Binding { std::string owner; std::string key; std::vector<Step> steps; };
struct Bank { std::string key; State base; std::array<Step, 8> cases; Step ordinary; std::optional<Binding> parent; };
struct Presentation { Binding binding; State ordinary; std::uint8_t alignmentDirections{}; };
inline std::optional<TextAlignment> emittedAlignment(const State &state, std::uint8_t directions) {
  if (state.cssAlignment == CssAlignment::Native) return state.attributes.alignment;
  const bool cssRTL = (directions & 1) != 0;
  const bool paragraphRTL = (directions & 2) != 0;
  const bool physicalLeft = state.cssAlignment == CssAlignment::Left ||
      (state.cssAlignment == CssAlignment::Start && !cssRTL) ||
      (state.cssAlignment == CssAlignment::End && cssRTL);
  // RN's native left/right values follow the paragraph direction on mobile.
  return physicalLeft != paragraphRTL ? TextAlignment::Left : TextAlignment::Right;
}
inline void copyFields(TextAttributes &target, const TextAttributes &source, std::uint8_t mask) {
  if (mask & 1) target.fontFamily = source.fontFamily;
  if (mask & 2) target.fontWeight = source.fontWeight;
  if (mask & 4) target.fontStyle = source.fontStyle;
  if (mask & 8) target.fontVariant = source.fontVariant;
  if (mask & 16) target.fontVariationSettings = source.fontVariationSettings;
  if (mask & alignmentField) target.alignment = source.alignment;
}
inline bool equalFields(const TextAttributes &a, const TextAttributes &b, std::uint8_t mask) {
  return (!(mask & 1) || a.fontFamily == b.fontFamily) &&
    (!(mask & 2) || a.fontWeight == b.fontWeight) &&
    (!(mask & 4) || a.fontStyle == b.fontStyle) &&
    (!(mask & 8) || a.fontVariant == b.fontVariant) &&
    (!(mask & 16) || a.fontVariationSettings == b.fontVariationSettings) &&
    (!(mask & alignmentField) || a.alignment == b.alignment);
}
inline State apply(State state, const Step &step) {
  copyFields(state.attributes, step.state.attributes, step.owns);
  if (step.owns & alignmentField) state.cssAlignment = step.state.cssAlignment;
  state.blocked = (state.blocked & ~step.owns) | step.state.blocked;
  return state;
}
inline State applySteps(State state, const std::vector<Step> &steps) {
  for (const auto &step : steps) state = apply(std::move(state), step);
  return state;
}
} // namespace altroo::text_fonts
