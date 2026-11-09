// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Private normalized View programme, parsed only on ordinary conversion.
#pragma once
#include <folly/dynamic.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <array>
#include <stdexcept>
#include <string_view>
namespace altroo::owned_channel {
inline constexpr std::array<std::string_view, 130> styleKeys{"alignContent","alignItems","alignSelf","aspectRatio","backfaceVisibility","backgroundColor","backgroundImage","backgroundPosition","backgroundRepeat","backgroundSize","borderBlockColor","borderBlockEndColor","borderBlockStartColor","borderBottomColor","borderBottomEndRadius","borderBottomLeftRadius","borderBottomRightRadius","borderBottomStartRadius","borderBottomWidth","borderColor","borderCurve","borderEndColor","borderEndEndRadius","borderEndStartRadius","borderEndWidth","borderLeftColor","borderLeftWidth","borderRadius","borderRightColor","borderRightWidth","borderStartColor","borderStartEndRadius","borderStartStartRadius","borderStartWidth","borderStyle","borderTopColor","borderTopEndRadius","borderTopLeftRadius","borderTopRightRadius","borderTopStartRadius","borderTopWidth","borderWidth","bottom","boxShadow","boxSizing","color","columnGap","cursor","direction","display","elevation","end","experimental_backgroundImage","experimental_backgroundPosition","experimental_backgroundRepeat","experimental_backgroundSize","filter","flex","flexBasis","flexDirection","flexGrow","flexShrink","flexWrap","gap","height","inset","insetBlock","insetBlockEnd","insetBlockStart","insetInline","insetInlineEnd","insetInlineStart","isolation","justifyContent","left","margin","marginBlock","marginBlockEnd","marginBlockStart","marginBottom","marginEnd","marginHorizontal","marginInline","marginInlineEnd","marginInlineStart","marginLeft","marginRight","marginStart","marginTop","marginVertical","maxHeight","maxWidth","minHeight","minWidth","mixBlendMode","opacity","outlineColor","outlineOffset","outlineStyle","outlineWidth","overflow","padding","paddingBlock","paddingBlockEnd","paddingBlockStart","paddingBottom","paddingEnd","paddingHorizontal","paddingInline","paddingInlineEnd","paddingInlineStart","paddingLeft","paddingRight","paddingStart","paddingTop","paddingVertical","pointerEvents","position","right","rowGap","shadowColor","shadowOffset","shadowOpacity","shadowRadius","start","top","transform","transformOrigin","width","zIndex"};
inline folly::dynamic nativeProfile() {
  using F = facebook::react::ReactNativeFeatureFlags;
  return folly::dynamic::object("schema", 1.0)("rn", "0.88.1")
#ifdef ANDROID
    ("platform", "android")
#else
    ("platform", "ios")
#endif
    ("styleKeys", "a7c54eb9011d822990f62b846cc6f333e1fbce23343e2426611925edcacac578")
    ("nativeCSSParsing", F::enableNativeCSSParsing())
    ("cppPropsIteratorSetter", F::enableCppPropsIteratorSetter())
    ("accumulatedRawPropsAndroid", F::enableAccumulatedUpdatesInRawPropsAndroid())
    ("exclusivePropsAndroid", F::enableExclusivePropsUpdateAndroid())
    ("propsReconciliationAndroid", F::enablePropsUpdateReconciliationAndroid());
}
inline void requireStyleMap(const folly::dynamic &value) {
  if (!value.isObject() || value.size() > styleKeys.size())
    throw std::invalid_argument("Owned programme requires a bounded normalized View map");
  for (const auto &item : value.items()) {
    if (!item.first.isString())
      throw std::invalid_argument("Owned programme requires string style keys");
    const auto &key = item.first.getString();
    bool allowed = false;
    for (const auto candidate : styleKeys) if (candidate == key) { allowed = true; break; }
    if (!allowed) throw std::invalid_argument("Unsupported owned View style key: " + key);
  }
}
inline bool fullProgramme(const folly::dynamic &programme) {
  if (programme.isNull()) return false;
  if (!programme.isObject() || programme.size() != 4 ||
      !programme.count("schema") || !programme.at("schema").isNumber() ||
      programme.at("schema").asDouble() != 1.0 || !programme.count("profile") ||
      !programme.count("normal") || !programme.count("last"))
    throw std::invalid_argument("Unsupported owned programme schema");
  if (programme.at("profile") != nativeProfile())
    throw std::invalid_argument("Owned programme native parsing profile mismatch");
  requireStyleMap(programme.at("normal"));
  requireStyleMap(programme.at("last"));
  return true;
}
} // namespace altroo::owned_channel
