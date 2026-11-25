// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Controlled View selection with stock generated-paragraph origin; no Portal projection.
#pragma once
#include "AltrooStructuralViewShadowNode.h"
#include "GeneratedParagraphOrigin.h"
#include "AltrooTextColorMarker.h"
#include <react/renderer/components/text/ParagraphShadowNode.h>
#include <react/renderer/components/text/TextShadowNode.h>
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
  std::uint8_t facts;
};
struct Region {
  const ShadowNode *last{};
  std::unordered_map<const ShadowNode *, const ShadowNode *> previous;
  std::unordered_map<ComponentHandle, const ShadowNode *> first;
  std::unordered_map<ComponentHandle, const ShadowNode *> lastOfType;
};
struct ColorSource {
  std::string owner;
  std::shared_ptr<const altroo::text_color::ColorBank> bank;
  SharedColor selected;
  const ColorSource *parent;
};
struct MetricSource {
  std::string owner;
  std::shared_ptr<const altroo::text_metrics::Bank> bank;
  std::optional<altroo::text_metrics::State> selected;
};
struct FontSource {
  std::string owner;
  std::shared_ptr<const altroo::text_fonts::Bank> bank;
  altroo::text_fonts::State selected;
};
struct TextChange {
  bool hasColor{};
  SharedColor color{};
  std::uint8_t fontMask{};
  TextAttributes fonts;
  bool hasMetrics{};
  std::array<altroo::text_metrics::Number, 3> metrics{};
};
struct Plan {
  Counts counts;
  std::unordered_map<const ShadowNode *, Choice> changed;
  std::unordered_set<const ShadowNodeFamily *> families;
  std::unordered_set<Tag> tags;
  std::unordered_map<const ShadowNode *, Region> lastElements;
  SurfaceId surface;
  std::vector<Decision> decisions;
  std::unordered_map<const ShadowNode *, TextChange> textChanges;
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
// Only the owned parent-projected ornament is outside source element order.
// A caller's ordinary View/nativeID cannot impersonate this private role.
inline bool ornament(const ShadowNode &node) {
  const auto *owned = dynamic_cast<const AltrooStructuralViewShadowNode *>(&node);
  if (!owned) return false;
  const auto &props = owned->getConcreteProps();
  return props.prepared && props.prepared->parentSelector &&
      props.nativeId == "altroo:accordion-before:v1:";
}
inline ComponentHandle selectorType(const ShadowNode &node) {
  return controlledView(node) ? ViewShadowNode::Handle() : node.getComponentHandle();
}
inline const Region &regionFor(const ShadowNode *parent, Plan &plan) {
  auto [entry, inserted] = plan.lastElements.try_emplace(parent);
  if (!inserted) return entry->second;
  ++plan.counts.participatingParents;
  const auto &siblings = parent->getChildren();
  if (siblings.size() > maxNodes)
    throw std::length_error("Sibling classification budget exceeded");
  std::size_t remainingRawLeaves = maxNodes - siblings.size();
  const ShadowNode *previous = nullptr;
  for (const auto &sibling : siblings) {
    ++plan.counts.siblingChecks;
    if (!sibling) throw std::invalid_argument("Null candidate sibling");
    if (ornament(*sibling)) continue;
    const auto role = altroo::generated_text_origin::classifyParagraph(*sibling, remainingRawLeaves);
    if (role == altroo::generated_text_origin::ParagraphRole::GeneratedLiteral) {
      remainingRawLeaves -= sibling->getChildren().size();
      continue;
    }
    if (role == altroo::generated_text_origin::ParagraphRole::NotParagraph &&
        !elementSibling(*sibling))
      throw std::invalid_argument("Probe requires an ordinary native host-element sibling");
    auto &region = entry->second;
    region.previous.emplace(sibling.get(), previous);
    previous = sibling.get();
    region.last = sibling.get();
    const auto type = selectorType(*sibling);
    region.first.try_emplace(type, sibling.get());
    region.lastOfType[type] = sibling.get();
  }
  return entry->second;
}
inline std::uint8_t selectorFacts(const ShadowNode &subject, const ShadowNode *parent,
                                  Plan &plan) {
  const auto &region = regionFor(parent, plan);
  const auto type = selectorType(subject);
  const auto first = region.first.find(type), last = region.lastOfType.find(type);
  return (region.last == &subject ? 1 : 0) |
      (first != region.first.end() && first->second == &subject ? 2 : 0) |
      (last != region.lastOfType.end() && last->second == &subject ? 4 : 0);
}
inline const ShadowNode *previousFor(const ShadowNode &subject, const ShadowNode *parent, Plan &plan) {
  const auto &region = regionFor(parent, plan);
  const auto found = region.previous.find(&subject);
  return found == region.previous.end() ? nullptr : found->second;
}
inline std::optional<bool> nativePeerMatch(const ShadowNode &subject, const ShadowNode *previous) {
  if (!previous) return false;
  const auto *current = dynamic_cast<const AltrooStructuralViewShadowNode *>(&subject);
  if (!current || !current->getConcreteProps().prepared || !current->getConcreteProps().prepared->peer) return std::nullopt;
  const auto &self = *current->getConcreteProps().prepared->peer;
  if (!self.expanded) return false;
  bool eligible = false;for (const auto &token : self.classes) eligible = eligible || token.eligible;
  if (!eligible) return false;
  const auto *prior = dynamic_cast<const AltrooStructuralViewShadowNode *>(previous);
  if (!prior || !prior->getConcreteProps().prepared || !prior->getConcreteProps().prepared->peer) return std::nullopt;
  const auto &peer = *prior->getConcreteProps().prepared->peer;
  if (!peer.expanded) return false;
  for (const auto &token : self.classes) if (token.eligible)
    for (const auto &candidate : peer.classes)
      if (token.cacheKey == candidate.cacheKey && token.css == candidate.css) return true;
  return false;
}
inline bool observedPeerMatch(const altroo::owned_transport_proof::PreparedData &prepared,
    const ShadowNode &subject, const ShadowNode &parent, const ShadowNode *previous) {
  const auto &value = prepared.observation;
  return value && value->surface == subject.getSurfaceId() && value->subject == subject.getTag() &&
      value->parent == parent.getTag() && value->previous == (previous ? previous->getTag() : 0) && value->expanded;
}
// Validate the entire candidate before cloning anything. No old tree writes,
// cached native tags, callbacks, per-frame work, or out-of-tree accepted reads.
inline void scan(const SharedNode &node, const ShadowNode *parent,
                 const ShadowNode *grandparent, std::size_t depth, Plan &plan,
                 const ColorSource *inheritedColor = nullptr,
                 const MetricSource *inheritedMetrics = nullptr,
                 const FontSource *inheritedFonts = nullptr) {
  if (!node)
    throw std::invalid_argument("Null candidate child");
  if (depth > maxDepth || ++plan.counts.scanned > maxNodes)
    throw std::length_error("Private prelayout probe tree budget exceeded");
  if (node->getSurfaceId() != plan.surface || node->getTag() <= 0)
    throw std::invalid_argument("Candidate surface/tag mismatch");
  if (!plan.families.insert(node->getFamilyShared().get()).second ||
      !plan.tags.insert(node->getTag()).second)
    throw std::invalid_argument("Duplicate candidate family/tag");
  std::optional<ColorSource> ownColor;
  const ColorSource *color = inheritedColor;
  std::optional<MetricSource> ownMetrics;
  const MetricSource *metrics = inheritedMetrics;
  std::optional<FontSource> ownFonts;
  const FontSource *fonts = inheritedFonts;
  if (const auto *target =
          dynamic_cast<const AltrooStructuralViewShadowNode *>(node.get())) {
    if (target->getConcreteProps().prepared &&
        target->getConcreteProps().prepared->programme == altroo::owned_transport_proof::Programme::PeerOnly) {
      // Peer carriers remain part of physical order; only selector consumers
      // require a style choice or a native runtime lease.
    } else {
      ++plan.counts.targets;
      if (!parent)
        throw std::invalid_argument("Probe requires a parent");
      const auto &props = target->getConcreteProps();
      if (!props.prepared)
        throw std::invalid_argument("Owned host requires ordinary prepared props");
      const bool structural = props.prepared->candidates.structural();
      const bool projected = props.prepared->parentSelector;
      const ShadowNode *subject = projected ? parent : node.get();
      const ShadowNode *subjectParent = projected ? grandparent : parent;
      // Only the exact source-owned immediate parent can supply pseudo facts.
      // Opaque roots may nest children in another View; retain ordinary presentation
      // at that boundary rather than applying the inner wrapper's position.
      const auto *source = projected
          ? dynamic_cast<const AltrooStructuralViewShadowNode *>(subject) : nullptr;
      const bool matchingOwner = source && source->getConcreteProps().prepared &&
          !props.prepared->owner.empty() &&
          !source->getConcreteProps().prepared->parentSelector &&
          source->getConcreteProps().prepared->owner == props.prepared->owner;
      const bool selectable = subjectParent && (!projected || matchingOwner) &&
          (controlledParent(*subjectParent) || (structural && elementSibling(*subjectParent)));
      if (!selectable && !structural)
        throw std::invalid_argument("Probe requires a controlled View/root parent");
      const auto ordinary = props.prepared->candidates.ordinaryIndex();
      std::uint8_t facts = selectable ? selectorFacts(*subject, subjectParent, plan) : ordinary;
      if (selectable && props.prepared->candidates.count() == 16) {
        const auto *previous = previousFor(*subject, subjectParent, plan);
        const auto match = nativePeerMatch(*subject, previous);
        // Unknown identity uses an explicitly bound observation. A new peer
        // cannot inherit a stale true from another sibling or parent.
        const bool expanded = match.has_value() ? *match : observedPeerMatch(*props.prepared, *subject, *subjectParent, previous);
        if (expanded) facts |= 8;
      }
      if (!structural) facts &= 1;
      if (!projected && !props.prepared->owner.empty()) {
        // Only an authored color blocks outer authority. Explicit inherit on
        // a nested root keeps the finite source chain, with the same facts.
        const bool barrier = (props.prepared->textColorBarriers & (1u << facts)) != 0;
        if (barrier) color = nullptr;
        if (props.prepared->textColors) {
          const auto &bank = props.prepared->textColors;
          const ColorSource *parentColor = nullptr;
          // Physical proximity cannot cross a passive authored text scope.
          // Resolve only the exact parent source bound during ordinary render.
          if (!barrier && bank->parent)
            for (auto source = inheritedColor; source; source = source->parent)
              if (source->owner == bank->parent->owner && source->bank->key == bank->parent->key) {
                parentColor = source;
                break;
              }
          const auto selected = parentColor ? parentColor->selected
              : (facts < 8 ? bank->colors[facts] : bank->ordinary);
          ownColor.emplace(ColorSource{props.prepared->owner, bank, selected, parentColor});
          color = &*ownColor;
        }
      }
      if (!projected && !props.prepared->owner.empty() && props.prepared->textMetrics) {
        const auto &bank = props.prepared->textMetrics;
        std::optional<altroo::text_metrics::State> base = bank->base;
        // An exact nearest source is mandatory. A passive path is already
        // prepared in the binding; unrelated physical ancestors are not guessed.
        if (bank->parent && inheritedMetrics && inheritedMetrics->selected &&
            bank->parent->owner == inheritedMetrics->owner && bank->parent->key == inheritedMetrics->bank->key)
          base = altroo::text_metrics::applySteps(*inheritedMetrics->selected, bank->parent->steps);
        auto selected = base ? altroo::text_metrics::apply(*base, facts < 8 ? bank->cases[facts] : bank->ordinary) : std::nullopt;
        ownMetrics.emplace(MetricSource{props.prepared->owner, bank, std::move(selected)});
        metrics = &*ownMetrics;
      }
      if (!projected && !props.prepared->owner.empty() && props.prepared->textFonts) {
        const auto &bank = props.prepared->textFonts;
        auto base = bank->base;
        if (bank->parent && inheritedFonts && bank->parent->owner == inheritedFonts->owner &&
            bank->parent->key == inheritedFonts->bank->key)
          base = altroo::text_fonts::applySteps(inheritedFonts->selected, bank->parent->steps);
        ownFonts.emplace(FontSource{props.prepared->owner, bank,
          altroo::text_fonts::apply(std::move(base), facts < 8 ? bank->cases[facts] : bank->ordinary)});
        fonts = &*ownFonts;
      }
      const bool last = facts != ordinary && (facts & 1);
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
      const auto &chosen = facts == ordinary ? props.prepared->unselected
                                       : props.prepared->candidates.at(facts);
      const auto selectedBottom = bottomPadding(chosen->yogaStyle);
      const float bottom = selectedBottom.isPoints() ? selectedBottom.value().unwrap() : 0;
      const bool changed = props.selectedCase != facts;
      plan.decisions.push_back({node->getTag(), last, bottom, changed});
      if (changed) {
        plan.changed.emplace(node.get(), Choice{facts});
        ++plan.counts.changedTargets;
      }
    }
  }
  const auto &children = node->getChildren();
  const auto *paragraph = dynamic_cast<const ParagraphShadowNode *>(node.get());
  const auto *text = dynamic_cast<const TextShadowNode *>(node.get());
  if (paragraph || text) {
    const altroo::text_color::ColorBinding *binding = nullptr;
    const altroo::text_metrics::Presentation *metricBinding = nullptr;
    const altroo::text_fonts::Presentation *fontBinding = nullptr;
    for (const auto &child : children) {
      const auto *marker = dynamic_cast<const altroo::text_color::ColorMarkerShadowNode *>(child.get());
      if (!marker) continue;
      if (!marker->getChildren().empty()) throw std::invalid_argument("Text presentation marker must be empty");
      const auto &props = marker->getConcreteProps();
      if (props.prepared) {
        if (binding) throw std::invalid_argument("Duplicate native text color binding");
        binding = props.prepared.get();
      }
      if (props.fonts) {
        if (fontBinding) throw std::invalid_argument("Duplicate native font binding");
        fontBinding = props.fonts.get();
      }
      if (props.metrics) {
        if (metricBinding) throw std::invalid_argument("Duplicate native text metric binding");
        metricBinding = props.metrics.get();
      }
    }
    TextChange change;
    const auto &current = paragraph ? paragraph->getConcreteProps().textAttributes : text->getConcreteProps().textAttributes;
    if (binding) {
      // COW props may retain selected values when React sends no style delta.
      auto selected = binding->ordinary;
      for (auto source = color; source; source = source->parent)
        if (binding->owner == source->owner && binding->key == source->bank->key) {
          selected = source->selected;
          break;
        }
      if (current.foregroundColor != selected) { change.hasColor = true; change.color = std::move(selected); }
    }
    if (metricBinding) {
      auto selected = metricBinding->ordinary;
      if (metrics && metrics->selected && metricBinding->binding.owner == metrics->owner &&
          metricBinding->binding.key == metrics->bank->key) {
        const auto value = altroo::text_metrics::applySteps(*metrics->selected, metricBinding->binding.steps);
        if (value) {
          const std::array<std::size_t, 3> fields{0, 1, 3};
          for (std::size_t index = 0; index < 3; ++index)
            if (!(metricBinding->resets & (1u << index))) selected[index] = index == 1
                ? altroo::text_metrics::emittedHeight((*value)[1]) : (*value)[fields[index]];
        }
      }
      if (!altroo::text_metrics::equal(current.fontSize, altroo::text_metrics::attribute(selected[0])) ||
          !altroo::text_metrics::equal(current.lineHeight, altroo::text_metrics::attribute(selected[1])) ||
          !altroo::text_metrics::equal(current.letterSpacing, altroo::text_metrics::attribute(selected[2]))) {
        change.hasMetrics = true; change.metrics = std::move(selected);
      }
    }
    if (fontBinding) {
      // Ordinary emitted props are retained independently of selected COW props.
      // Opaque native leaves stay owned by their original RN conversion.
      auto selected = fontBinding->ordinary;
      const auto managed = static_cast<std::uint8_t>(altroo::text_fonts::allFields & ~selected.blocked);
      if (fonts && fontBinding->binding.owner == fonts->owner && fontBinding->binding.key == fonts->bank->key) {
        const auto inherited = altroo::text_fonts::applySteps(fonts->selected, fontBinding->binding.steps);
        const auto inheritedFields = static_cast<std::uint8_t>(managed & ~inherited.blocked);
        altroo::text_fonts::copyFields(selected.attributes, inherited.attributes, inheritedFields);
        if (inheritedFields & altroo::text_fonts::alignmentField)
          selected.attributes.alignment = altroo::text_fonts::emittedAlignment(inherited, fontBinding->alignmentDirections);
      }
      if (!altroo::text_fonts::equalFields(current, selected.attributes, managed)) {
        change.fontMask = managed;
        change.fonts = std::move(selected.attributes);
      }
    }
    if (change.hasColor || change.hasMetrics || change.fontMask) plan.textChanges.emplace(node.get(), std::move(change));
  }
  for (std::size_t index = 0; index < children.size(); ++index)
    scan(children[index], node.get(), parent, depth + 1, plan, color, metrics, fonts);
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
        choice->second.facts);
  }
  const auto textChoice = plan.textChanges.find(node.get());
  if (textChoice != plan.textChanges.end()) {
    // Clone the stock concrete props and every ancestor through Paragraph.
    // RN then regenerates its own attributed string, measurement and state.
    if (const auto *paragraph = dynamic_cast<const ParagraphShadowNode *>(node.get())) {
      auto props = std::make_shared<ParagraphProps>(paragraph->getConcreteProps());
      const auto &change = textChoice->second;
      if (change.hasColor) props->textAttributes.foregroundColor = change.color;
      if (change.fontMask) altroo::text_fonts::copyFields(props->textAttributes, change.fonts, change.fontMask);
      if (change.hasMetrics) {
        props->textAttributes.fontSize = altroo::text_metrics::attribute(change.metrics[0]);
        props->textAttributes.lineHeight = altroo::text_metrics::attribute(change.metrics[1]);
        props->textAttributes.letterSpacing = altroo::text_metrics::attribute(change.metrics[2]);
      }
      props->seal();
      newProps = std::move(props);
    } else if (const auto *text = dynamic_cast<const TextShadowNode *>(node.get())) {
      auto props = std::make_shared<TextProps>(text->getConcreteProps());
      const auto &change = textChoice->second;
      if (change.hasColor) props->textAttributes.foregroundColor = change.color;
      if (change.fontMask) altroo::text_fonts::copyFields(props->textAttributes, change.fonts, change.fontMask);
      if (change.hasMetrics) {
        props->textAttributes.fontSize = altroo::text_metrics::attribute(change.metrics[0]);
        props->textAttributes.lineHeight = altroo::text_metrics::attribute(change.metrics[1]);
        props->textAttributes.letterSpacing = altroo::text_metrics::attribute(change.metrics[2]);
      }
      props->seal();
      newProps = std::move(props);
    } else throw std::logic_error("Text color target changed type");
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
  detail::Plan plan{{}, {}, {}, {}, {}, candidate->getSurfaceId(), {}, {}};
  detail::scan(candidate, nullptr, nullptr, 0, plan);
  if (plan.changed.empty() && plan.textChanges.empty())
    return {candidate, plan.counts, std::move(plan.decisions)};
  auto rewritten = detail::rewrite(candidate, plan);
  auto root = std::dynamic_pointer_cast<RootShadowNode>(rewritten.mutableClone);
  if (!root)
    throw std::logic_error("Resolved candidate root type changed");
  return {std::move(root), plan.counts, std::move(plan.decisions)};
}
} // namespace altroo::prelayout
