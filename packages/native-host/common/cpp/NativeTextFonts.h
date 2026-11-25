// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Prepare stock font and alignment attributes during ordinary prop conversion.
#pragma once
#include "NativeTextMetrics.h"
#include "NativeFontData.h"
#include <react/renderer/attributedstring/TextAttributes.h>
#include <react/renderer/attributedstring/conversions.h>
#include <array>
#include <memory>
#include <optional>
#include <vector>
namespace altroo::text_fonts {
using namespace facebook::react;
inline std::uint8_t fieldMask(const folly::dynamic &value) {
  if (!value.isNumber() || !std::isfinite(value.asDouble()) || value.asDouble() < 0 ||
      value.asDouble() > allFields || std::trunc(value.asDouble()) != value.asDouble())
    throw std::invalid_argument("Invalid native font field mask");
  return static_cast<std::uint8_t>(value.asDouble());
}
inline State prepareState(const PropsParserContext &context, const folly::dynamic &value, bool baseline = false) {
  if (!value.isObject() || value.size() != 2 || !value.count("values") || !value.count("blocked") ||
      !value.at("values").isArray() ||
      (value.at("values").size() != 5 && value.at("values").size() != 6))
    throw std::invalid_argument("Invalid native font state");
  State result; result.blocked = fieldMask(value.at("blocked"));
  const auto &values = value.at("values");
  if (values.size() == 5 && (result.blocked & alignmentField))
    throw std::invalid_argument("Legacy font state contains an alignment barrier");
  for (std::size_t index = 0; index < values.size(); ++index) {
    const auto &entry = values[index];
    if (entry.isNull()) continue;
    if (result.blocked & (1u << index)) throw std::invalid_argument("Blocked font field carries data");
    if (index == 3 && entry.isArray()) {
      if (entry.size() > 4096) throw std::invalid_argument("Native font variant exceeds budget");
      std::size_t bytes = 0;
      for (const auto &item : entry) {
        if (!item.isString() || item.getString().size() > 16384 - bytes)
          throw std::invalid_argument("Invalid processed font variant");
        bytes += item.getString().size();
      }
    } else if (!entry.isString() || entry.getString().size() > 16384)
      throw std::invalid_argument("Invalid processed native font value");
  }
  if (!values[0].isNull()) result.attributes.fontFamily = values[0].getString();
  if (!values[1].isNull()) {
    FontWeight weight{}; fromRawValue(context, RawValue(values[1]), weight);
    result.attributes.fontWeight = weight;
  }
  if (!values[2].isNull()) {
    FontStyle style{}; fromRawValue(context, RawValue(values[2]), style);
    result.attributes.fontStyle = style;
  }
  if (!values[3].isNull()) {
    FontVariant variant{}; fromRawValue(context, RawValue(values[3]), variant);
    result.attributes.fontVariant = variant;
  }
  if (!values[4].isNull()) result.attributes.fontVariationSettings = values[4].getString();
  if (values.size() == 6 && !values[5].isNull()) {
    const auto &text = values[5].getString();
    if (text == "css-left") result.cssAlignment = CssAlignment::Left;
    else if (text == "css-right") result.cssAlignment = CssAlignment::Right;
    else if (text == "css-start") result.cssAlignment = CssAlignment::Start;
    else if (text == "css-end") result.cssAlignment = CssAlignment::End;
    else {
      if (text != "auto" && text != "left" && text != "right" && text != "start" &&
          text != "end" && text != "center" && text != "justify")
        throw std::invalid_argument("Invalid native text alignment");
      TextAlignment alignment{}; fromRawValue(context, RawValue(values[5]), alignment);
      result.attributes.alignment = alignment;
    }
  }
  // Legacy baselines leave actual native alignment untouched.
  if (baseline && values.size() == 5) result.blocked |= alignmentField;
  return result;
}
inline Step prepareStep(const PropsParserContext &context, const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 3 || !value.count("owns") || !value.count("values") || !value.count("blocked"))
    throw std::invalid_argument("Invalid native font operation");
  const auto owns = fieldMask(value.at("owns"));
  auto state = prepareState(context, folly::dynamic::object("values", value.at("values"))("blocked", value.at("blocked")));
  if (value.at("values").size() == 5 && (owns & alignmentField))
    throw std::invalid_argument("Legacy font step owns text alignment");
  if (state.blocked & ~owns) throw std::invalid_argument("Unowned font barrier");
  return {std::move(state), owns};
}
inline std::vector<Step> prepareSteps(const PropsParserContext &context, const folly::dynamic &value) {
  if (!value.isArray() || value.size() > 128) throw std::invalid_argument("Native font path exceeds budget");
  std::vector<Step> result; result.reserve(value.size());
  for (const auto &entry : value) result.push_back(prepareStep(context, entry));
  return result;
}
inline Binding prepareBinding(const PropsParserContext &context, const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 3 || !value.count("owner") || !value.count("key") || !value.count("steps"))
    throw std::invalid_argument("Invalid native font source binding");
  return {text_metrics::identity(value.at("owner"), 256), text_metrics::identity(value.at("key"), 4096), prepareSteps(context, value.at("steps"))};
}
inline std::shared_ptr<const Bank> prepareBank(const PropsParserContext &context, const folly::dynamic &value) {
  if (!value.isObject() || value.size() != 5 || !value.count("key") || !value.count("base") ||
      !value.count("ordinary") || !value.count("cases") || !value.at("cases").isArray() ||
      value.at("cases").size() != 8 || !value.count("parent"))
    throw std::invalid_argument("Invalid native font bank");
  auto result = std::make_shared<Bank>(); result->key = text_metrics::identity(value.at("key"), 4096);
  result->base = prepareState(context, value.at("base"), true); result->ordinary = prepareStep(context, value.at("ordinary"));
  for (std::size_t index = 0; index < 8; ++index) result->cases[index] = prepareStep(context, value.at("cases")[index]);
  if (!value.at("parent").isNull()) result->parent = prepareBinding(context, value.at("parent"));
  return result;
}
inline std::shared_ptr<const Presentation> preparePresentation(const PropsParserContext &context, const folly::dynamic &value) {
  if (value.isNull()) return nullptr;
  if (!value.isObject() || value.size() != (value.count("alignmentDirections") ? 7 : 6) || !value.count("schema") || !value.at("schema").isNumber() ||
      value.at("schema").asDouble() != 1 || !value.count("profile") || value.at("profile") != owned_channel::nativeProfile() ||
      !value.count("owner") || !value.count("key") || !value.count("steps") || !value.count("ordinary"))
    throw std::invalid_argument("Invalid native font presentation");
  Binding binding{text_metrics::identity(value.at("owner"), 256, true), text_metrics::identity(value.at("key"), 4096, true), prepareSteps(context, value.at("steps"))};
  if (binding.owner.empty() != binding.key.empty()) throw std::invalid_argument("Incomplete native font binding");
  auto ordinary = prepareState(context, value.at("ordinary"), true);
  const bool hasAlignment = value.at("ordinary").at("values").size() == 6;
  if (ordinary.cssAlignment != CssAlignment::Native || hasAlignment != (value.count("alignmentDirections") != 0))
    throw std::invalid_argument("Invalid ordinary text alignment");
  const std::uint8_t directions = hasAlignment ? fieldMask(value.at("alignmentDirections")) : 0;
  if (directions > 3) throw std::invalid_argument("Invalid native text directions");
  return std::make_shared<const Presentation>(Presentation{std::move(binding), std::move(ordinary), directions});
}
} // namespace altroo::text_fonts
