// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include "StructuralComponentName.h"
#include <type_traits>
#include <react/renderer/components/AltrooMuiNativeHostSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
namespace altroo::owned_channel {
using namespace facebook::react;
class ConversionShadowNode final : public ConcreteViewShadowNode<AltrooStructuralViewName, AltrooMUIStructuralViewProps> {
 public: using ConcreteViewShadowNode::ConcreteViewShadowNode;
};
static_assert(std::is_same_v<ConversionShadowNode::ConcreteProps, AltrooMUIStructuralViewProps>);
using ConversionDescriptor = ConcreteComponentDescriptor<ConversionShadowNode>;
}
