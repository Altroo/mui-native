// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
#pragma once
#include "OwnedProgramme.h"
#include "GeneratedParagraphOrigin.h"
#include <folly/json.h>
#include <string>
namespace altroo::owned_channel {
// Immutable parser/capability metadata only. Never constructs the style runtime,
// accesses UIManager, registers hooks or reports mutable owner/generation state.
inline std::string structuralStyleMetadata() {
  return folly::toJson(folly::dynamic::object("schema", 1.0)
      ("service", "owned-structural-style")
      ("host", "AltrooMUIStructuralView")
      ("hostABI", "owned-view-programme-v1")
      ("errorNotification", "async-once-per-generation-v1")
      ("ownedProgrammeProfile", nativeProfile())
      ("structuralCases", "first-last-of-type-v1")
      ("generatedTextOrigin", folly::dynamic::object("schema", 1.0)
          ("nativeIDPrefix", std::string(generated_text_origin::nativeIDPrefix))));
}
} // namespace altroo::owned_channel
