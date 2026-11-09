// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Transport shapes follow React Native 0.88.1, Copyright Meta Platforms, Inc.
// and affiliates, MIT.
#pragma once
#include <charconv>
#include <cmath>
#include <folly/dynamic.h>
#include <limits>
#include <react/renderer/graphics/BackgroundPosition.h>
#include <react/renderer/graphics/BackgroundRepeat.h>
#include <react/renderer/graphics/BackgroundSize.h>
#include <stdexcept>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace altroo::owned_background {
namespace detail {
inline folly::dynamic valueUnit(const facebook::react::ValueUnit &value) {
  using facebook::react::UnitType;
  if (!std::isfinite(value.value))
    throw std::invalid_argument("Unsupported background length/percentage");
  switch (value.unit) {
  case UnitType::Point:
    // Float -> double is exact. Android reads double and converts back to
    // float.
    return static_cast<double>(value.value);
  case UnitType::Percent: {
    char buffer[64];
    const auto result = std::to_chars(buffer, buffer + sizeof(buffer),
                                      value.value, std::chars_format::general,
                                      std::numeric_limits<float>::max_digits10);
    if (result.ec != std::errc{})
      throw std::runtime_error("Cannot serialize background percentage");
    std::string text(buffer, result.ptr);
    text += '%';
    return text;
  }
  case UnitType::Undefined:
  default:
    throw std::invalid_argument("Unsupported background unit");
  }
}
inline folly::dynamic sizeAxis(
    const std::variant<std::monostate, facebook::react::ValueUnit> &value) {
  if (std::holds_alternative<std::monostate>(value))
    return "auto";
  return valueUnit(std::get<facebook::react::ValueUnit>(value));
}
inline const char *repeatStyle(facebook::react::BackgroundRepeatStyle value) {
  using facebook::react::BackgroundRepeatStyle;
  switch (value) {
  case BackgroundRepeatStyle::Repeat:
    return "repeat";
  case BackgroundRepeatStyle::Space:
    return "space";
  case BackgroundRepeatStyle::Round:
    return "round";
  case BackgroundRepeatStyle::NoRepeat:
    return "no-repeat";
  default:
    throw std::invalid_argument("Unsupported background repeat");
  }
}
} // namespace detail

// Canonical processed arrays only. No experimental aliases or shorthand replay.
// RN0.88.1 Android's size parser does not accept keyword strings. Preserving
// cover/contain here does not promise physical Android support for those
// values.
inline folly::dynamic
backgroundSize(const std::vector<facebook::react::BackgroundSize> &values) {
  using facebook::react::BackgroundSizeKeyword;
  folly::dynamic result = folly::dynamic::array;
  for (const auto &value : values) {
    if (const auto *keyword = std::get_if<BackgroundSizeKeyword>(&value)) {
      switch (*keyword) {
      case BackgroundSizeKeyword::Cover:
        result.push_back("cover");
        break;
      case BackgroundSizeKeyword::Contain:
        result.push_back("contain");
        break;
      default:
        throw std::invalid_argument("Unsupported background size keyword");
      }
    } else {
      const auto &size =
          std::get<facebook::react::BackgroundSizeLengthPercentage>(value);
      folly::dynamic item = folly::dynamic::object;
      item["x"] = detail::sizeAxis(size.x);
      item["y"] = detail::sizeAxis(size.y);
      result.push_back(std::move(item));
    }
  }
  return result;
}
inline folly::dynamic backgroundPosition(
    const std::vector<facebook::react::BackgroundPosition> &values) {
  folly::dynamic result = folly::dynamic::array;
  for (const auto &value : values) {
    folly::dynamic item = folly::dynamic::object;
    if (value.top)
      item["top"] = detail::valueUnit(*value.top);
    if (value.left)
      item["left"] = detail::valueUnit(*value.left);
    if (value.right)
      item["right"] = detail::valueUnit(*value.right);
    if (value.bottom)
      item["bottom"] = detail::valueUnit(*value.bottom);
    result.push_back(std::move(item));
  }
  return result;
}
inline folly::dynamic
backgroundRepeat(const std::vector<facebook::react::BackgroundRepeat> &values) {
  folly::dynamic result = folly::dynamic::array;
  for (const auto &value : values) {
    folly::dynamic item = folly::dynamic::object;
    item["x"] = detail::repeatStyle(value.x);
    item["y"] = detail::repeatStyle(value.y);
    result.push_back(std::move(item));
  }
  return result;
}
} // namespace altroo::owned_background
