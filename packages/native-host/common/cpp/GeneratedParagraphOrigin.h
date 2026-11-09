// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Reserved first-party origin for stock paragraphs created by System's normalizer.
// This is a public-prop convention, not authentication. No RTTI or registry is used.
#pragma once
#include <react/renderer/core/ShadowNode.h>
#include <cstddef>
#include <stdexcept>
#include <string_view>

namespace facebook::react {
// Exact RN0.88.1 exported name declarations. ConcreteShadowNode::Handle() is
// this canonical address; comparing display-name strings would admit impostors.
extern const char ParagraphComponentName[];
extern const char RawTextComponentName[];
} // namespace facebook::react

namespace altroo::generated_text_origin {
inline constexpr std::string_view nativeIDPrefix = "altroo:generated-paragraph:v1:";
inline constexpr std::string_view reservedStem = "altroo:generated-paragraph:";
inline constexpr std::size_t maximumSuffixBytes = 1024;
enum class ParagraphRole { NotParagraph, ExplicitElement, GeneratedLiteral };

inline bool reserved(std::string_view value) noexcept {
  return value.starts_with(reservedStem);
}
inline ParagraphRole classifyParagraph(const facebook::react::ShadowNode &node,
                                       std::size_t rawChildBudget) {
  const auto &props = node.getProps();
  if (!props) throw std::invalid_argument("Sibling props are required");
  const std::string_view nativeID = props->nativeId;
  const bool marked = reserved(nativeID);
  if (node.getComponentHandle() !=
      facebook::react::ComponentHandle(facebook::react::ParagraphComponentName)) {
    if (marked)
      throw std::invalid_argument("Reserved generated-text marker requires canonical Paragraph");
    return ParagraphRole::NotParagraph;
  }
  if (!marked) return ParagraphRole::ExplicitElement;
  if (!nativeID.starts_with(nativeIDPrefix) ||
      nativeID.size() <= nativeIDPrefix.size() ||
      nativeID.size() - nativeIDPrefix.size() > maximumSuffixBytes)
    throw std::invalid_argument("Generated-text marker version or suffix is unsupported");
  // A System flush contains joined primitive text, not inline Text/View attachments.
  // Empty runs are elided in JS; a marker on an empty or non-RawText shape is invalid.
  const auto &children = node.getChildren();
  if (children.empty() || children.size() > rawChildBudget)
    throw std::invalid_argument("Generated paragraph requires bounded Core RawText leaves");
  for (const auto &child : children) {
    if (!child ||
        child->getComponentHandle() !=
            facebook::react::ComponentHandle(facebook::react::RawTextComponentName) ||
        !child->getChildren().empty() || !child->getProps() ||
        reserved(child->getProps()->nativeId))
      throw std::invalid_argument("Generated paragraph contains unsupported text children");
  }
  return ParagraphRole::GeneratedLiteral;
}
} // namespace altroo::generated_text_origin
