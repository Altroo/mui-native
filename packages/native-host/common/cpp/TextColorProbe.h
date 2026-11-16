// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Opt-in ordinary-conversion diagnostic. No production commit or rendering work.
#pragma once
#include "AltrooTextColorMarker.h"
#include <react/renderer/graphics/Color.h>
namespace altroo::text_color {
inline folly::dynamic runTextColorProbe(const PropsParserContext &context,
    const std::shared_ptr<const ContextContainer> &container) {
  using D = folly::dynamic;
  std::size_t checks = 0;
  auto require = [&](bool value, const char *message) {
    ++checks; if (!value) throw std::logic_error(message);
  };
  auto reject = [&](auto action) {
    bool rejected = false;
    try { action(); } catch (const std::invalid_argument &) { rejected = true; }
    require(rejected, "Malformed text color data must reject before use");
  };
  const bool css = owned_channel::nativeProfile().at("nativeCSSParsing").asBool();
  const D blue = css ? D("#0000ff") : D(int64_t{4278190335LL});
  const D red = css ? D("#ff0000") : D(int64_t{4294901760LL});
  const D binding = D::object("schema", 1)("profile", owned_channel::nativeProfile())
      ("owner", "source")("key", "palette")("ordinary", blue);
  ColorMarkerComponentDescriptor descriptor({{}, container, {}});
  auto clone = [&](const std::shared_ptr<const ColorMarkerProps> &source, D raw) {
    return std::static_pointer_cast<const ColorMarkerProps>(descriptor.cloneProps(context, source, RawProps(std::move(raw))));
  };
  auto empty = clone(nullptr, D::object("colorProgramme", nullptr));
  require(!empty->prepared, "Initial explicit null remains inactive");
  auto active = clone(empty, D::object("colorProgramme", binding));
  require(active->prepared && active->prepared->owner == "source" && active->prepared->key == "palette", "Actual descriptor prepares source identity");
  require(blueFromColor(active->prepared->ordinary) == 255 && redFromColor(active->prepared->ordinary) == 0, "Exact native parser prepares blue");
  auto omitted = clone(active, D::object("nativeID", "unchanged-text"));
  require(omitted->prepared == active->prepared, "Omitted payload reuses immutable prepared data");
  auto changed = binding; changed["ordinary"] = red;
  auto replaced = clone(omitted, D::object("colorProgramme", changed));
  require(redFromColor(replaced->prepared->ordinary) == 255 && blueFromColor(replaced->prepared->ordinary) == 0, "Replacement prepares red");
  require(blueFromColor(active->prepared->ordinary) == 255, "Replacement leaves prior props untouched");
  auto cleared = clone(replaced, D::object("colorProgramme", nullptr));
  require(!cleared->prepared && cleared->colorProgramme.isNull(), "Explicit null clears the payload and prepared identity");
  require(!clone(cleared, D::object())->prepared, "Omitted payload after clear stays inactive");
  auto reset = binding; reset["owner"] = ""; reset["key"] = ""; reset["ordinary"] = nullptr;
  auto ordinary = clone(cleared, D::object("colorProgramme", reset));
  require(ordinary->prepared && !ordinary->prepared->ordinary && ordinary->prepared->owner.empty(), "Ordinary-only absent native color remains an explicit reset");
  auto forged = clone(active, D::object("effectName", "forged")("effectProps", D::object("x", 1)));
  require(forged->effectName.empty() && forged->effectProps.isNull(), "Metadata cannot create a text effect");
  for (const auto &schema : {D(true), D("1"), D(2), D(nullptr)}) {
    auto bad = binding; bad["schema"] = schema;
    reject([&]{ (void)clone(active, D::object("colorProgramme", bad)); });
  }
  auto wrong = binding; wrong["profile"]["rn"] = "stale";
  reject([&]{ (void)clone(active, D::object("colorProgramme", wrong)); });
  auto incomplete = binding; incomplete["key"] = "";
  reject([&]{ (void)clone(active, D::object("colorProgramme", incomplete)); });
  auto extra = binding; extra["extra"] = 1;
  reject([&]{ (void)clone(active, D::object("colorProgramme", extra)); });
  auto longOwner = binding; longOwner["owner"] = std::string(257, 'x');
  reject([&]{ (void)clone(active, D::object("colorProgramme", longOwner)); });
  auto longKey = binding; longKey["key"] = std::string(4097, 'x');
  reject([&]{ (void)clone(active, D::object("colorProgramme", longKey)); });
  D colors = D::array(); for (int i = 0; i < 8; ++i) colors.push_back(i & 2 ? red : blue);
  D bank = D::object("key", "palette")("colors", colors)("ordinary", blue)("parent", nullptr);
  auto palette = prepareColorBank(context, bank);
  require(!palette->parent && blueFromColor(palette->ordinary) == 255, "Root palette keeps explicit absence of a parent binding");
  for (int i = 0; i < 8; ++i)
    require((i & 2) ? redFromColor(palette->colors[i]) == 255 : blueFromColor(palette->colors[i]) == 255, "Finite colors retain every selector case");
  bank["parent"] = D::object("owner", "parent")("key", "parent-palette");
  require(prepareColorBank(context, bank)->parent->owner == "parent", "Explicit inherited parent identity is prepared");
  auto badParent = bank; badParent["parent"]["extra"] = 1;
  reject([&]{ (void)prepareColorBank(context, badParent); });
  auto shortBank = bank; shortBank["colors"].pop_back();
  reject([&]{ (void)prepareColorBank(context, shortBank); });
  auto missing = bank; missing.erase("ordinary");
  reject([&]{ (void)prepareColorBank(context, missing); });
  return D::object("schema", 1)("checks", int64_t(checks))
      ("ordinaryConversionOnly", true)("mountedOrDrawnProved", false);
}
} // namespace altroo::text_color
