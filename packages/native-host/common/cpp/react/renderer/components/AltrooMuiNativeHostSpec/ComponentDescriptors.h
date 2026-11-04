#pragma once
#include <react/renderer/components/AltrooMuiNativeHostSpec/ShadowNodes.h>
#include <AltrooPortalShadowNodes.h>
#include <AltrooNativeTextInputDescriptor.h>
namespace facebook::react {
using AltrooMUIInteractiveViewComponentDescriptor=ConcreteComponentDescriptor<AltrooMUIInteractiveViewShadowNode>;
using AltrooMUINativePickerComponentDescriptor=ConcreteComponentDescriptor<AltrooMUINativePickerShadowNode>;
}
