// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Parse bounded color data during ordinary prop conversion, never in a commit.
#pragma once
#include "OwnedProgramme.h"
#include <react/renderer/components/view/conversions.h>
#include <react/renderer/core/propsConversions.h>
#include <array>
#include <memory>
#include <optional>
namespace altroo::text_color {
using namespace facebook::react;
inline SharedColor prepareColor(const PropsParserContext &context, const folly::dynamic &value) {
  SharedColor result;
  if (!value.isNull()) {
    fromRawValue(context.contextContainer, context.surfaceId, RawValue(value), result);
    if (!result) throw std::invalid_argument("Invalid native text color");
  }
  return result;
}
struct ColorParent final { std::string owner; std::string key; };
struct ColorBank final {
  std::string key;
  std::array<SharedColor, 8> colors;
  SharedColor ordinary;
  std::optional<ColorParent> parent;
};
inline std::shared_ptr<const ColorBank> prepareColorBank(
    const PropsParserContext &context, const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 4 || !value.count("key") ||
      !value.at("key").isString() || value.at("key").getString().empty() ||
      value.at("key").getString().size() > 4096 || !value.count("colors") ||
      !value.at("colors").isArray() || value.at("colors").size() != 8 || !value.count("ordinary") || !value.count("parent"))
    throw std::invalid_argument("Invalid bounded native text color bank");
  auto result = std::make_shared<ColorBank>();
  result->key = value.at("key").getString();
  result->ordinary = prepareColor(context, value.at("ordinary"));
  const auto &parent = value.at("parent");
  if (!parent.isNull()) {
    if (!parent.isObject() || parent.size() != 2 || !parent.count("owner") ||
        !parent.at("owner").isString() || parent.at("owner").getString().empty() || parent.at("owner").getString().size() > 256 ||
        !parent.count("key") || !parent.at("key").isString() || parent.at("key").getString().empty() || parent.at("key").getString().size() > 4096)
      throw std::invalid_argument("Invalid native parent color binding");
    result->parent = ColorParent{parent.at("owner").getString(), parent.at("key").getString()};
  }
  for (std::size_t index = 0; index < 8; ++index)
    result->colors[index] = prepareColor(context, value.at("colors")[index]);
  return result;
}
struct ColorBinding final {
  std::string owner;
  std::string key;
  SharedColor ordinary;
};
inline std::shared_ptr<const ColorBinding> prepareColorBinding(
    const PropsParserContext &context, const folly::dynamic &value) {
  if (value.isNull()) return nullptr;
  if (!value.isObject() || value.size() != 5 || !value.count("schema") ||
      !value.at("schema").isNumber() || value.at("schema").asDouble() != 1 || !value.count("profile") ||
      value.at("profile") != owned_channel::nativeProfile() || !value.count("owner") ||
      !value.at("owner").isString() || value.at("owner").getString().size() > 256 ||
      !value.count("key") || !value.at("key").isString() ||
      value.at("key").getString().size() > 4096 || !value.count("ordinary"))
    throw std::invalid_argument("Invalid bounded native text color binding");
  auto result = std::make_shared<ColorBinding>();
  result->owner = value.at("owner").getString();
  result->key = value.at("key").getString();
  if (result->owner.empty() != result->key.empty())
    throw std::invalid_argument("Incomplete native text color owner");
  result->ordinary = prepareColor(context, value.at("ordinary"));
  return result;
}
} // namespace altroo::text_color
