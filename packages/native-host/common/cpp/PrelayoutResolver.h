// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Controlled View selection with stock generated-paragraph origin; no Portal projection.
#pragma once
#include "AltrooStructuralViewShadowNode.h"
#include "GeneratedParagraphOrigin.h"
#include <cmath>
#include <limits>
#include <memory>
#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/components/view/ViewShadowNode.h>
#include <stdexcept>
#include <string_view>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace facebook::react {
// Own exported component-name arrays; Portal projection boundaries must not
// become ordinary siblings merely because their nodes are View-kind.
extern const char AltrooPortalHostName[];
extern const char AltrooPortalCanvasName[];
} // namespace facebook::react

#ifdef ANDROID
namespace facebook::react {
// RN0.88.1's Android prefab omits the class header but exports this canonical
// component-name symbol. ConcreteShadowNode::Handle() uses its address, not
// string equality. The exact declaration/definition/descriptor are ABI-pinned.
extern const char AndroidHorizontalScrollContentViewShadowNodeComponentName[];
} // namespace facebook::react
#endif

namespace altroo::prelayout {
using namespace facebook::react;
namespace yoga = facebook::yoga;
// Yoga resolves a physical bottom declaration through Bottom, Vertical, then
// All. Reading the direct Bottom slot alone loses valid padding shorthand.
// Preserve the original unit here; percentage resolution still belongs to Yoga.
inline yoga::Style::Length bottomPadding(const yoga::Style &style) {
  const auto bottom = style.padding(yoga::Edge::Bottom);
  if (!bottom.isUndefined()) return bottom;
  const auto vertical = style.padding(yoga::Edge::Vertical);
  return vertical.isUndefined() ? style.padding(yoga::Edge::All) : vertical;
}
using SharedNode = std::shared_ptr<const ShadowNode>;
struct Counts {
  std::size_t scanned{};
  std::size_t targets{};
  std::size_t changedTargets{};
  std::size_t participatingParents{};
  std::size_t siblingChecks{};
  // Explicit calls below. RN may additionally clone Yoga-owned children.
  std::size_t requestedClones{};
};
struct Decision {
  Tag tag;
  bool lastChild;
  float bottom;
  bool changed;
};
struct Result {
  RootShadowNode::Unshared root;
  Counts counts;
  std::vector<Decision> decisions;
};
namespace detail {
inline constexpr std::size_t maxDepth = 128;
inline constexpr std::size_t maxNodes = 20000;
struct Choice {
  bool last;
};
struct Plan {
  Counts counts;
  std::unordered_map<const ShadowNode *, Choice> changed;
  std::unordered_set<const ShadowNodeFamily *> families;
  std::unordered_set<Tag> tags;
  std::unordered_map<const ShadowNode *, const ShadowNode *> lastElements;
  SurfaceId surface;
  std::vector<Decision> decisions;
};
inline bool controlledView(const ShadowNode &node) {
  // Core RTTI may be duplicated across Android DSOs. The registry's canonical
  // component handle identifies View without accepting other View-kind nodes.
  return node.getComponentHandle() == ViewShadowNode::Handle() ||
         dynamic_cast<const AltrooStructuralViewShadowNode *>(&node) != nullptr;
}
// Native host-element contract: ordinary View-kind descriptors count even if
// hidden or flattened. FormsView describes mounting, not logical elementhood.
// RawText/virtual Text lack ViewKind. Root and known projection/virtual
// boundaries are excluded without casts. Third-party descriptors must declare
// truthful traits; this does not infer arbitrary Portal/custom projections.
inline bool elementSibling(const ShadowNode &node) {
  const auto &traits = node.getTraits();
  if (traits.check(ShadowNodeTraits::Trait::RootNodeKind)) return false;
  const auto handle = node.getComponentHandle();
  if (handle == ComponentHandle(AltrooPortalHostName) ||
      handle == ComponentHandle(AltrooPortalCanvasName)) return false;
  const auto name = node.getComponentName();
  // RN0.88.1 VirtualView's name array is header-local; comparing its local
  // address cannot reliably exclude the registered descriptor across DSOs.
  if (!name || std::string_view(name) == "VirtualView") return false;
  return traits.check(ShadowNodeTraits::Trait::ViewKind);
}
// Android's horizontal ScrollView has a distinct final ViewProps content
// parent. This adds only its canonical handle; sibling classification stays
// separately bounded. RN owns its ScrollViewState and RTL layout.
inline bool controlledParent(const ShadowNode &node) {
  if (controlledView(node) ||
      node.getComponentHandle() == RootShadowNode::Handle())
    return true;
#ifdef ANDROID
  return node.getComponentHandle() ==
         ComponentHandle(AndroidHorizontalScrollContentViewShadowNodeComponentName);
#else
  return false;
#endif
}
// Validate the entire candidate before cloning anything. No old tree writes,
// cached native tags, callbacks, per-frame work, or out-of-tree accepted reads.
inline void scan(const SharedNode &node, const ShadowNode *parent,
                 std::size_t depth, Plan &plan) {
  if (!node)
    throw std::invalid_argument("Null candidate child");
  if (depth > maxDepth || ++plan.counts.scanned > maxNodes)
    throw std::length_error("Private prelayout probe tree budget exceeded");
  if (node->getSurfaceId() != plan.surface || node->getTag() <= 0)
    throw std::invalid_argument("Candidate surface/tag mismatch");
  if (!plan.families.insert(node->getFamilyShared().get()).second ||
      !plan.tags.insert(node->getTag()).second)
    throw std::invalid_argument("Duplicate candidate family/tag");
  if (const auto *target =
          dynamic_cast<const AltrooStructuralViewShadowNode *>(node.get())) {
    ++plan.counts.targets;
    if (!parent)
      throw std::invalid_argument("Probe requires a parent");
    // Classify the actual sibling region once per parent. Retain the last
    // element pointer so N targets never rescan suffixes. Physical children,
    // generated paragraphs and their Core text/props are never removed.
    auto [region, inserted] = plan.lastElements.try_emplace(parent, nullptr);
    if (inserted) {
      ++plan.counts.participatingParents;
      if (!controlledParent(*parent))
        throw std::invalid_argument(
            "Probe requires a controlled View/root parent");
      const auto &siblings = parent->getChildren();
      if (siblings.size() > maxNodes)
        throw std::length_error("Sibling classification budget exceeded");
      std::size_t remainingRawLeaves = maxNodes - siblings.size();
      for (const auto &sibling : siblings) {
        ++plan.counts.siblingChecks;
        if (!sibling) throw std::invalid_argument("Null candidate sibling");
        const auto role = altroo::generated_text_origin::classifyParagraph(
            *sibling, remainingRawLeaves);
        if (role == altroo::generated_text_origin::ParagraphRole::GeneratedLiteral) {
          remainingRawLeaves -= sibling->getChildren().size();
          continue;
        }
        if (role == altroo::generated_text_origin::ParagraphRole::NotParagraph &&
            !elementSibling(*sibling))
          throw std::invalid_argument(
              "Probe requires an ordinary native host-element sibling");
        region->second = sibling.get();
      }
    }
    const bool last = region->second == node.get();
    const auto &props = target->getConcreteProps();
    if (!props.prepared)
      throw std::invalid_argument("Owned host requires ordinary prepared props");
    if (props.prepared->programme == altroo::owned_transport_proof::Programme::Numeric &&
        (!std::isfinite(props.normalPaddingBottom) ||
        !std::isfinite(props.lastPaddingBottom) ||
        props.normalPaddingBottom < 0 || props.lastPaddingBottom < 0 ||
        props.normalPaddingBottom > std::numeric_limits<float>::max() ||
        props.lastPaddingBottom > std::numeric_limits<float>::max()))
      throw std::invalid_argument(
          "Padding candidates must fit finite nonnegative Yoga float");
    // Yoga StyleLength::points encodes float, including on iOS where RN Float
    // is CGFloat/double. Ordinary in-range Double rounding is intentional.
    const auto &chosen = last ? props.prepared->candidates.last : props.prepared->candidates.normal;
    const auto selectedBottom = bottomPadding(chosen->yogaStyle);
    const float bottom = selectedBottom.isPoints() ? selectedBottom.value().unwrap() : 0;
    const bool changed = props.selectedLast != last;
    plan.decisions.push_back({node->getTag(), last, bottom, changed});
    if (changed) {
      plan.changed.emplace(node.get(), Choice{last});
      ++plan.counts.changedTargets;
    }
  }
  const auto &children = node->getChildren();
  for (std::size_t index = 0; index < children.size(); ++index)
    scan(children[index], node.get(), depth + 1, plan);
}
struct Rewritten {
  SharedNode node;
  std::shared_ptr<ShadowNode> mutableClone;
};
inline Rewritten rewrite(const SharedNode &node, Plan &plan) {
  const auto &children = node->getChildren();
  std::shared_ptr<std::vector<SharedNode>> newChildren;
  for (std::size_t index = 0; index < children.size(); ++index) {
    auto child = rewrite(children[index], plan);
    if (child.node != children[index]) {
      if (!newChildren)
        newChildren = std::make_shared<std::vector<SharedNode>>(children);
      (*newChildren)[index] = std::move(child.node);
    }
  }
  Props::Shared newProps;
  const auto choice = plan.changed.find(node.get());
  if (choice != plan.changed.end()) {
    const auto &target =
        static_cast<const AltrooStructuralViewShadowNode &>(*node);
    newProps = altroo::owned_transport_proof::select(
        std::static_pointer_cast<const altroo::owned_transport_proof::OwnedProps>(target.getProps()),
        choice->second.last);
  }
  if (!newProps && !newChildren)
    return {node, nullptr};
  std::shared_ptr<const std::vector<SharedNode>> immutableChildren =
      newChildren;
  // Use RN's ordinary clone/reference-transfer policy. Do not toggle global
  // runtime-reference flags or manually mutate an accepted ShadowNode.
  auto cloned = node->clone({.props = newProps, .children = immutableChildren});
  if (!cloned || cloned->getFamilyShared() != node->getFamilyShared() ||
      cloned->getTag() != node->getTag() ||
      cloned->getSurfaceId() != node->getSurfaceId() ||
      cloned->getComponentHandle() != node->getComponentHandle())
    throw std::logic_error("RN clone changed candidate identity");
  ++plan.counts.requestedClones;
  return {cloned, std::move(cloned)};
}
} // namespace detail

// Call from a separately owned willCommit adapter, before layoutIfNeeded.
// Generated stock paragraphs are ignored only for logical element selection.
// Explicit Paragraphs still count; physical trees stay intact. Portal logical
// parent/order projection and custom non-host projection boundaries remain unsupported.
inline Result resolve(const RootShadowNode::Unshared &candidate) {
  if (!candidate)
    throw std::invalid_argument("Candidate root is required");
  detail::Plan plan{{}, {}, {}, {}, {}, candidate->getSurfaceId(), {}};
  detail::scan(candidate, nullptr, 0, plan);
  if (plan.changed.empty())
    return {candidate, plan.counts, std::move(plan.decisions)};
  auto rewritten = detail::rewrite(candidate, plan);
  auto root = std::dynamic_pointer_cast<RootShadowNode>(rewritten.mutableClone);
  if (!root)
    throw std::logic_error("Resolved candidate root type changed");
  return {std::move(root), plan.counts, std::move(plan.decisions)};
}
} // namespace altroo::prelayout
