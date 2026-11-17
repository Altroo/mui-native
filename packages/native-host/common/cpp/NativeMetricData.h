// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Prepared numeric data and pure evaluation, independent of raw props parsing.
#pragma once
#include <react/renderer/graphics/Float.h>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <memory>
#include <optional>
#include <string>
#include <vector>
namespace altroo::text_metrics {
using facebook::react::Float;
using Number = std::optional<Float>;
using State = std::array<Number, 4>;
using Step = std::array<Float, 10>;
struct Binding final { std::string owner; std::string key; std::vector<Step> steps; };
struct Bank final {
  std::string key; State base; std::array<Step, 8> cases; Step ordinary;
  std::optional<Binding> parent;
};
struct Presentation final {
  Binding binding;
  std::array<Number, 3> ordinary;
  std::uint8_t resets;
};
inline std::optional<State> apply(const State &before, const Step &step) {
  const auto fontMode = int(step[0]), heightMode = int(step[2]), ratioMode = int(step[4]), spacingMode = int(step[6]);
  const Number font = fontMode == 0 ? before[0] : fontMode == 1 ? Number(step[1])
      : fontMode == 2 ? Number(before[0].value_or(step[8]) * step[1]) : std::nullopt;
  const Float effective = font.value_or(step[9]);
  const Number height = heightMode == 0 ? before[1] : heightMode == 1 ? Number(step[3])
      : heightMode == 2 ? (before[2] ? Number(*before[2] * effective) : before[1])
      : heightMode == 5 ? std::nullopt : Number(step[3] * effective);
  const Number ratio = ratioMode == 0 ? before[2] : ratioMode == 1 ? Number(step[5]) : std::nullopt;
  const Number spacing = spacingMode == 0 ? before[3] : spacingMode == 1 ? Number(step[7])
      : spacingMode == 2 ? Number(step[7] * effective) : std::nullopt;
  State result{font, height, ratio, spacing};
  for (std::size_t i = 0; i < 4; ++i)
    if (result[i] && (!std::isfinite(*result[i]) || (i < 3 && *result[i] < 0))) return std::nullopt;
  return result;
}
inline std::optional<State> applySteps(State value, const std::vector<Step> &steps) {
  for (const auto &step : steps) {
    auto next = altroo::text_metrics::apply(value, step); if (!next) return std::nullopt; value = *next;
  }
  return value;
}
inline Float attribute(const Number &value) { return value.value_or(std::numeric_limits<Float>::quiet_NaN()); }
inline bool equal(Float a, Float b) { return a == b || (std::isnan(a) && std::isnan(b)); }
} // namespace altroo::text_metrics
