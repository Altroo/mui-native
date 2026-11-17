// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Bounded numeric preparation only; no CSS strings, callbacks or raw parsing in commits.
#pragma once
#include "OwnedProgramme.h"
#include "NativeMetricData.h"
#include <react/renderer/graphics/Float.h>
#include <array>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <utility>
#include <limits>
#include <memory>
#include <optional>
#include <string>
#include <vector>
namespace altroo::text_metrics {
using namespace facebook::react;
inline Float scalar(const folly::dynamic &value) {
  if (!value.isNumber() || !std::isfinite(value.asDouble()) ||
      std::abs(value.asDouble()) > std::numeric_limits<Float>::max())
    throw std::invalid_argument("Invalid native metric scalar");
  return static_cast<Float>(value.asDouble());
}
inline Number nullable(const folly::dynamic &value, bool nonnegative = false) {
  if (value.isNull()) return std::nullopt;
  const auto number = scalar(value);
  if (nonnegative && value.asDouble() < 0) throw std::invalid_argument("Negative native text metric");
  return number;
}
inline std::string identity(const folly::dynamic &value, std::size_t limit, bool empty = false) {
  if (!value.isString() || value.getString().size() > limit || (!empty && value.getString().empty()))
    throw std::invalid_argument("Invalid native metric identity");
  return value.getString();
}
inline Step prepareStep(const folly::dynamic &value) {
  if (!value.isArray() || value.size() != 10) throw std::invalid_argument("Invalid native metric operation");
  Step result; for (std::size_t i = 0; i < 10; ++i) result[i] = scalar(value[i]);
  for (const auto index : {0, 2, 4, 6}) {
    const Float maximum = index == 2 ? 5 : index == 4 ? 2 : 3;
    if (std::trunc(value[index].asDouble()) != value[index].asDouble() || result[index] < 0 || result[index] > maximum)
      throw std::invalid_argument("Invalid native metric opcode");
  }
  if (value[1].asDouble() < 0 || value[3].asDouble() < 0 || value[5].asDouble() < 0 || result[8] <= 0 || value[9].asDouble() < 0)
    throw std::invalid_argument("Invalid native metric basis");
  return result;
}
inline std::vector<Step> prepareSteps(const folly::dynamic &value) {
  if (!value.isArray() || value.size() > 128) throw std::invalid_argument("Native metric path exceeds budget");
  std::vector<Step> result; result.reserve(value.size());
  for (const auto &step : value) result.push_back(prepareStep(step));
  return result;
}
inline Binding prepareBinding(const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 3 || !value.count("owner") || !value.count("key") || !value.count("steps"))
    throw std::invalid_argument("Invalid native metric parent binding");
  return {identity(value.at("owner"), 256), identity(value.at("key"), 4096), prepareSteps(value.at("steps"))};
}
inline State prepareState(const folly::dynamic &value) {
  if (!value.isArray() || value.size() != 4) throw std::invalid_argument("Invalid native metric state");
  return {nullable(value[0], true), nullable(value[1], true), nullable(value[2], true), nullable(value[3])};
}
inline std::shared_ptr<const Bank> prepareBank(const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 5 || !value.count("key") || !value.count("base") ||
      !value.count("cases") || !value.at("cases").isArray() || value.at("cases").size() != 8 ||
      !value.count("ordinary") || !value.count("parent")) throw std::invalid_argument("Invalid native metric bank");
  auto result = std::make_shared<Bank>();
  result->key = identity(value.at("key"), 4096); result->base = prepareState(value.at("base"));
  result->ordinary = prepareStep(value.at("ordinary"));
  for (std::size_t i = 0; i < 8; ++i) result->cases[i] = prepareStep(value.at("cases")[i]);
  if (!value.at("parent").isNull()) result->parent = prepareBinding(value.at("parent"));
  return result;
}
inline std::shared_ptr<const Presentation> preparePresentation(const folly::dynamic &value) {
  if (value.isNull()) return nullptr;
  if (!value.isObject() || value.size() != 7 || !value.count("schema") || !value.at("schema").isNumber() ||
      value.at("schema").asDouble() != 1 || !value.count("profile") || value.at("profile") != owned_channel::nativeProfile() ||
      !value.count("owner") || !value.count("key") || !value.count("steps") || !value.count("ordinary") ||
      !value.at("ordinary").isArray() || value.at("ordinary").size() != 3 || !value.count("resets"))
    throw std::invalid_argument("Invalid native metric presentation");
  const auto resets = scalar(value.at("resets"));
  if (resets < 0 || resets > 7 || std::trunc(value.at("resets").asDouble()) != value.at("resets").asDouble()) throw std::invalid_argument("Invalid native metric reset mask");
  Binding binding{identity(value.at("owner"), 256, true), identity(value.at("key"), 4096, true), prepareSteps(value.at("steps"))};
  if (binding.owner.empty() != binding.key.empty()) throw std::invalid_argument("Incomplete native metric source");
  return std::make_shared<const Presentation>(Presentation{std::move(binding),
    {nullable(value.at("ordinary")[0], true), nullable(value.at("ordinary")[1], true), nullable(value.at("ordinary")[2])},
    static_cast<std::uint8_t>(resets)});
}
} // namespace altroo::text_metrics
