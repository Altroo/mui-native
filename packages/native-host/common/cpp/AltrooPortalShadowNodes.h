/* Portal measurement boundaries adapt React Native's MIT-licensed modal shadow traits.
 * Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE. */
#pragma once
#include <react/renderer/components/AltrooMuiNativeHostSpec/Props.h>
#include <react/renderer/components/AltrooMuiNativeHostSpec/EventEmitters.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
namespace facebook::react {
extern const char AltrooPortalHostName[];
extern const char AltrooPortalCanvasName[];
class AltrooPortalHostShadowNode final : public ConcreteViewShadowNode<AltrooPortalHostName, AltrooMUIPortalHostProps, AltrooMUIPortalHostEventEmitter> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  static ShadowNodeTraits BaseTraits() {
    auto traits=ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::RootNodeKind);
    traits.set(ShadowNodeTraits::Trait::Unstable_uncullableView);
    return traits;
  }
  Transform getTransform() const override;
};
class AltrooPortalCanvasShadowNode final : public ConcreteViewShadowNode<AltrooPortalCanvasName, AltrooMUIPortalCanvasProps> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  static ShadowNodeTraits BaseTraits() {
    auto traits=ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::Unstable_uncullableView);
    return traits;
  }
  Transform getTransform() const override;
};
using AltrooPortalHostComponentDescriptor=ConcreteComponentDescriptor<AltrooPortalHostShadowNode>;
using AltrooPortalCanvasComponentDescriptor=ConcreteComponentDescriptor<AltrooPortalCanvasShadowNode>;
}
