// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Empty TextEffect-derived nodes carry immutable color provenance. Stock RN
// recurses them without an attachment; an empty marker emits no text fragment.
#pragma once
#include "NativeTextColors.h"
#include "NativeTextMetrics.h"
#include <react/renderer/components/AltrooMuiNativeHostSpec/ShadowNodes.h>
#include <react/renderer/components/text/TextEffectShadowNode.h>
#include <react/renderer/components/view/conversions.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/propsConversions.h>
#include <array>
#include <memory>
#include <stdexcept>
#include <string>

#include "StructuralComponentName.h"
namespace altroo::text_color {
using namespace facebook::react;
class ColorMarkerProps final : public TextEffectProps {
 public:
  ColorMarkerProps() = default;
  ColorMarkerProps(const PropsParserContext &context, const ColorMarkerProps &source,
                   const RawProps &rawProps)
      : TextEffectProps(context, source, rawProps),
        colorProgramme(convertRawProp(context, rawProps, "colorProgramme",
                                      source.colorProgramme, folly::dynamic(nullptr))),
        prepared(colorProgramme == source.colorProgramme
                     ? source.prepared : prepareColorBinding(context, colorProgramme)),
        metricProgramme(convertRawProp(context, rawProps, "metricProgramme", source.metricProgramme, folly::dynamic(nullptr))),
        metrics(metricProgramme == source.metricProgramme ? source.metrics : altroo::text_metrics::preparePresentation(metricProgramme)) {
    // This is metadata only, including for forged/legacy raw props.
    effectName.clear();
    effectProps = nullptr;
  }
  folly::dynamic colorProgramme{nullptr};
  std::shared_ptr<const ColorBinding> prepared;
  folly::dynamic metricProgramme{nullptr};
  std::shared_ptr<const altroo::text_metrics::Presentation> metrics;
#ifdef RN_SERIALIZABLE_STATE
  ComponentName getDiffPropsImplementationTarget() const override {
    return "AltrooMUITextColorMarker";
  }
  folly::dynamic getDiffProps(const Props *previous) const override {
    const auto *before = previous ? static_cast<const ColorMarkerProps *>(previous) : nullptr;
    auto result = folly::dynamic::object();
    if (!before || colorProgramme != before->colorProgramme)
      result["colorProgramme"] = colorProgramme;
    if (!before || metricProgramme != before->metricProgramme)
      result["metricProgramme"] = metricProgramme;
    return result;
  }
#endif
};
// Own fields use classic prop preparation even with the global iterator flag.
static_assert(!HasIteratorSetterCtor<ColorMarkerProps>);
// The owned name has one canonical address across autolinking and the host
// library. The Props base remains TextEffectProps for stock BaseText traversal.
class ColorMarkerShadowNode final : public ConcreteShadowNode<
    AltrooTextColorMarkerName, TextEffectShadowNode, ColorMarkerProps,
    TextEffectEventEmitter> {
 public:
  using ConcreteShadowNode::ConcreteShadowNode;
};
using ColorMarkerComponentDescriptor = ConcreteComponentDescriptor<ColorMarkerShadowNode>;
} // namespace altroo::text_color
namespace facebook::react {
using AltrooTextColorMarkerComponentDescriptor = altroo::text_color::ColorMarkerComponentDescriptor;
}
