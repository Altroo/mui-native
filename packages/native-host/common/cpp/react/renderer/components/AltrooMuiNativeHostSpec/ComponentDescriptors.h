// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include <react/renderer/components/AltrooMuiNativeHostSpec/ShadowNodes.h>
#include <AltrooPortalShadowNodes.h>
#include <AltrooStructuralViewShadowNode.h>
#include <AltrooNativeTextInputDescriptor.h>
namespace facebook::react {
using AltrooMUIInteractiveViewComponentDescriptor=ConcreteComponentDescriptor<AltrooMUIInteractiveViewShadowNode>;
using AltrooMUINativePickerComponentDescriptor=ConcreteComponentDescriptor<AltrooMUINativePickerShadowNode>;
}
