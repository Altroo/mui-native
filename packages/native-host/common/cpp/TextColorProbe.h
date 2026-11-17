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
  // Exercise the actual marker descriptor, including omitted/replaced/reset
  // metric props. These controls run only in this opt-in conversion diagnostic.
  const auto colorChecks = checks;
  const D step = D::array(2, .5, 2, 0, 0, 0, 0, 0, 16, 16);
  D path = D::array(); path.push_back(step);
  const D metricBinding = D::object("schema", 1)("profile", owned_channel::nativeProfile())
      ("owner", "source")("key", "metrics")("steps", path)
      ("ordinary", D::array(8, 12, 0))("resets", 0);
  auto metricActive = clone(empty, D::object("metricProgramme", metricBinding));
  require(metricActive->metrics && metricActive->metrics->binding.owner == "source", "Actual descriptor prepares metrics");
  require(metricActive->metrics->binding.steps.size() == 1, "Actual descriptor prepares passive path");
  auto metricOmitted = clone(metricActive, D::object("nativeID", "retained"));
  require(metricOmitted->metrics == metricActive->metrics, "Omitted metric payload reuses preparation");
  auto metricChanged = metricBinding; metricChanged["ordinary"][0] = 9;
  auto metricReplaced = clone(metricOmitted, D::object("metricProgramme", metricChanged));
  require(metricReplaced->metrics->ordinary[0] == 9 && metricActive->metrics->ordinary[0] == 8, "Replacement never mutates accepted data");
  auto metricCleared = clone(metricReplaced, D::object("metricProgramme", nullptr));
  require(!metricCleared->metrics && !clone(metricCleared, D::object())->metrics, "Explicit clear survives omitted update");
  auto metricReset = metricBinding; metricReset["owner"] = ""; metricReset["key"] = "";
  metricReset["ordinary"] = D::array(nullptr, nullptr, nullptr); metricReset["resets"] = 7;
  auto resetMetrics = clone(metricActive, D::object("metricProgramme", metricReset));
  require(resetMetrics->metrics->resets == 7 && !resetMetrics->metrics->ordinary[0], "Ordinary null reset survives typed preparation");
  auto preparedStep = altroo::text_metrics::prepareStep(step);
  auto selectedMetrics = altroo::text_metrics::apply(altroo::text_metrics::State{24, 36, 1.5, 0}, preparedStep);
  require(selectedMetrics && selectedMetrics->at(0) == 12 && selectedMetrics->at(1) == 18, "Native operations match relative CSS contract");
  for (const auto &badSchema : {D(true), D("1"), D(2), D(nullptr)}) {
    auto bad = metricBinding; bad["schema"] = badSchema;
    reject([&]{ (void)clone(metricActive, D::object("metricProgramme", bad)); });
  }
  for (const auto &mask : {D(-1), D(8), D(1.00000001)}) {
    auto bad = metricBinding; bad["resets"] = mask;
    reject([&]{ (void)clone(metricActive, D::object("metricProgramme", bad)); });
  }
  for (const int index : {0, 2, 4, 6}) {
    auto bad = step; bad[index] = 1.00000001;
    reject([&]{ (void)altroo::text_metrics::prepareStep(bad); });
  }
  for (const int index : {1, 3, 5, 8, 9}) {
    auto bad = step; bad[index] = -1;
    reject([&]{ (void)altroo::text_metrics::prepareStep(bad); });
  }
  // Validate signs before conversion: Android Float can underflow a negative
  // double to signed zero, which must not legalize an invalid source value.
  for (const int index : {1, 3, 5, 9}) {
    auto bad = step; bad[index] = -1e-100;
    reject([&]{ (void)altroo::text_metrics::prepareStep(bad); });
  }
  auto negativeOrdinary = metricBinding; negativeOrdinary["ordinary"][0] = -1e-100;
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", negativeOrdinary)); });
  auto tooLong = metricBinding;
  for (int i = 0; i < 128; ++i) tooLong["steps"].push_back(step);
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", tooLong)); });
  auto wrongMetricProfile = metricBinding; wrongMetricProfile["profile"]["rn"] = "stale";
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", wrongMetricProfile)); });
  auto extraMetric = metricBinding; extraMetric["extra"] = 1;
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", extraMetric)); });
  auto partialMetric = metricBinding; partialMetric["key"] = "";
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", partialMetric)); });
  D metricCases = D::array(); for (int i = 0; i < 8; ++i) metricCases.push_back(step);
  D metricBank = D::object("key", "metrics")("base", D::array(24, 36, 1.5, 0))
      ("cases", metricCases)("ordinary", step)("parent", nullptr);
  require(altroo::text_metrics::prepareBank(metricBank)->cases.size() == 8, "Exact eight metric cases prepared");
  metricBank["parent"] = D::object("owner", "parent")("key", "parent-metrics")("steps", path);
  require(altroo::text_metrics::prepareBank(metricBank)->parent->steps.size() == 1, "Parent operation path prepared");
  metricBank["cases"].pop_back();
  reject([&]{ (void)altroo::text_metrics::prepareBank(metricBank); });
  const D natural = D::array(0, 0, 6, 0, 2, 0, 0, 0, 16, 16);
  require(altroo::text_metrics::prepareStep(natural)[2] == 6, "Natural height is a prepared semantic operation");
  const auto naturalState = altroo::text_metrics::apply(altroo::text_metrics::State{24, 64, 4, 0}, altroo::text_metrics::prepareStep(natural));
  require(naturalState && naturalState->at(1) == -1 && !naturalState->at(2), "Natural height removes the inherited ratio");
#ifdef ANDROID
  require(altroo::text_metrics::emittedHeight(naturalState->at(1)) == -1, "Android natural uses UNSET");
#else
  require(altroo::text_metrics::emittedHeight(naturalState->at(1)) == 0, "iOS natural removes paragraph constraints");
#endif
  auto naturalBinding = metricBinding; naturalBinding["steps"] = D::array(); naturalBinding["steps"].push_back(natural);
  require(clone(metricActive, D::object("metricProgramme", naturalBinding))->metrics->binding.steps[0][2] == 6, "Actual descriptor retains natural semantics");
  require(altroo::text_metrics::prepareState(D::array(16, -1, nullptr, 0))[1] == -1, "Canonical semantic state accepts natural height");
  for (const auto value : {-0.5, -1e-100})
    reject([&]{ (void)altroo::text_metrics::prepareState(D::array(16, value, nullptr, 0)); });
  auto badNatural = natural; badNatural[4] = 0;
  reject([&]{ (void)altroo::text_metrics::prepareStep(badNatural); });
  auto unknownHeight = natural; unknownHeight[2] = 7;
  reject([&]{ (void)altroo::text_metrics::prepareStep(unknownHeight); });
  auto ordinaryNatural = metricBinding; ordinaryNatural["ordinary"][1] = -1;
#ifdef ANDROID
  require(clone(metricActive, D::object("metricProgramme", ordinaryNatural))->metrics->ordinary[1] == -1, "Android ordinary UNSET remains physical");
#else
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", ordinaryNatural)); });
#endif
  auto tinyHeight = metricBinding; tinyHeight["ordinary"][1] = -1e-100;
  reject([&]{ (void)clone(metricActive, D::object("metricProgramme", tinyHeight)); });
  return D::object("schema", 1)("checks", int64_t(colorChecks))("metricChecks", int64_t(checks - colorChecks))

      ("ordinaryConversionOnly", true)("mountedOrDrawnProved", false);
}
} // namespace altroo::text_color
