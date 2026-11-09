// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Cold node/descriptor/provider switch: never mix generated and owned families.
#pragma once
#include "OwnedPropsTransport.h"
namespace facebook::react {
using AltrooStructuralViewShadowNode = altroo::owned_transport_proof::OwnedShadowNode;
using AltrooStructuralViewComponentDescriptor = altroo::owned_transport_proof::OwnedDescriptor;
}
