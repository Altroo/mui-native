#pragma once
#include <react/renderer/components/AltrooMuiNativeHostSpec/ShadowNodes.h>
#include <AltrooPortalShadowNodes.h>
namespace facebook::react {
using AltrooMUIInteractiveViewComponentDescriptor=ConcreteComponentDescriptor<AltrooMUIInteractiveViewShadowNode>;
using AltrooMUINativePickerComponentDescriptor=ConcreteComponentDescriptor<AltrooMUINativePickerShadowNode>;
}
