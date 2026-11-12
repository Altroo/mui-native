# Native ButtonGroup

This implementation is included in `0.0.8-prealpha.0`. It composes the existing native Button/ButtonBase hosts and shares source-facing group defaults and position contexts. The initial scoped iPhone and Android emulator checks cover layout, wrapped state, disabled touch, loading, dynamic children and native refs. The expanded checks also cover actual focus callbacks, live custom themes, nested geometry, physical Portal destinations and retained text/counter state on both native platforms. Physical accessibility/performance and complete device matrices remain pending.

```tsx
import { Button, ButtonGroup } from '@mui/material';

<ButtonGroup variant="outlined" size="small" aria-label="Document actions">
  <Button onClick={save}>Save</Button>
  <Button onClick={duplicate}>Duplicate</Button>
  <Button color="error" onClick={remove}>
    Delete
  </Button>
</ButtonGroup>;
```

Original root/deep imports, class helpers and the two group contexts route to the same native instances. `@mui/material/ButtonGroup`, `ButtonGroup/buttonGroupClasses`, `ButtonGroup/ButtonGroupContext` and `ButtonGroup/ButtonGroupButtonContext` have direct-package counterparts under `@altroo/mui-native`. Web continues using original MUI.

## Defaults and composition

Explicit Button props win over group context, which wins over Button theme defaults. Missing and explicitly undefined child props inherit; explicit false values remain false. Group defaults include color, disabled state, elevation/ripple settings, full width, size and variant. A custom wrapper can render a Button normally; the implementation does not invoke custom components or clone props into them.

The group filters non-element children with React's valid-child semantics. Arrays flatten; a fragment remains one positioned group child. Buttons inside that fragment receive its shared first/middle/last context, matching the original source. A single valid child has no position class. Disabled/loading activation remains owned by each native ButtonBase host. When a disabled group supplies the original Mui-disabled class, native pointer targeting stays blocked even if a child explicitly sets disabled=false; the explicit property and keyboard eligibility retain their source semantics.

The default root is a native View. The source `div` alias selects that same View. Custom native roots retain required props, discriminated-union branches and their actual ref type. Optional own props accept explicit undefined with exactOptionalPropertyTypes enabled. The classes interface remains open to declaration merging; runtime utility names retain the original fifteen slots and twelve global state identifiers. DOM refs and other HTML roots require migration. Native IDs, test IDs, ARIA labels and role props map through the native root, without adding an extra host around it.

## Group styling

Horizontal/vertical layout, joined corners, outlined overlap, text/contained dividers, palette colors and contained elevation follow the group contract. Buttons retain native minimum touch height. Full-width groups use the available parent width; both native platform checks compare the group against its actual parent bounds.

Defaults, overrides, variants and sx resolve through the shared native style engine. Participating Button roots expose group/position tokens to their ancestor sheets, preserving selector specificity before native inline styles. Root declarations stay on the actual group root. Grouped/first/middle/last override keys apply only to matching children, including override-local variants and callback/array layers. Variant callbacks receive the original merged owner-state arguments; root variants retain their existing order. Child inline native styles apply last; a simple child sx rule has lower specificity than a grouped selector.

Nested roots consume the outer group sheets. A Portal retains the logical group's public defaults and position, while descendant styles and inherited text follow the actual physical destination. Window placement clears source-ancestor styles; ordinary custom containers acquire their destination group sheets, including a different sibling group. Container text scopes preserve color, relative font metrics and native inline text values. Circular/self-container destinations remain inactive. Inline disablePortal keeps ordinary ancestry.

The shared theme includes all twenty-five original elevation tokens, custom concrete shadow layers and opt-in focus-visible outlines. Contained buttons resolve focus/hover/pressed/disabled shadows through the same cascade, with native inline style precedence. Concrete number, px, rem and percentage shape radii resolve through the shared style engine. Android before API 28 uses a diagnosed numeric elevation fallback; unsupported shadow/radius expressions are diagnosed rather than presented as verified CSS support. These are source contracts; platform paint and interaction still require the native checks below.

The owned Android interactive host also invalidates retained drawing layers on a live native direction change. This fixes the pinned React Native border-path cache while preserving the same native view, refs and action state. Rebuild the Android application to pick up this native change. Arbitrary custom roots and ordinary external React Native Views retain their own paint behavior.

The source implementation now retains committed insertion history through [native style caches](native-style-cache.md). Controlled original-browser sequences and native renderer regressions cover equal-specificity results after warm-up, unmount, theme replacement, reset and independent caches. Current device and performance validation of this cache increment remains an explicit gate in [#127](https://github.com/Altroo/mui-native/issues/127). Arbitrary DOM selectors, external global stylesheets, pseudo-elements, CSS transition timing and custom browser layout roots are not established by this increment.

## Callback preparation after 0.0.8

Source after `0.0.8-prealpha.0` resolves the group's theme overrides, variants and sx at its owning styled root. Child state and focus styling reuse those prepared sheets. Named slots resolve in the original `for-in` callback/getter order before their selected CSS is scoped to descendants; inherited slots are retained, and unused slot CSS getters remain unread. Callbacks receive the same theme object consumed by the group.

A native direction override can replace constructor-owned joining geometry while retaining the resolved theme/sx phases. Same-root ancestor and wrapper sheets keep their original order. The shared Emotion insertion-history gate in [#127](https://github.com/Altroo/mui-native/issues/127) remains open.

For cross-platform named overrides, return style objects or arrays directly. The established native extension for recursive named-slot and variant-array callbacks is retained. Original 9.5.0 does not evaluate a second function nested under a named `grouped` override; the reference records that boundary separately from supported deferred root callbacks.

The [preparation reference](../upstream/button-group-preparation.json) records three-button mount, child-only update and group-property update sequences, in ordinary and StrictMode trees, plus inherited getters and deferred arguments. The native software regressions match original callback counts and order; they do not establish physical-device timing or calibrated performance. Reproduce the original observations with:

```sh
node scripts/reference/button-group-preparation.mjs prepare
# Serve .cache/button-group-preparation-reference locally and capture
# window.buttonGroupPreparationObservations through a browser.
node scripts/reference/button-group-preparation.mjs record /path/to/observations.json
```

## Native direction and readable labels

The native default root follows the nearest `RtlProvider`, including the provider installed by `ThemeProvider`. An authored `sx.direction` or native `style.direction` can override the root; native `direction: 'inherit'` follows its physical parent. Nested groups resolve their own provider default. Grouped corner, divider and overlap rules follow the resulting native direction, including when a child uses the opposite direction. Inline corner, border and margin shorthands replace earlier computed specific edges on both the group and its Buttons. Authored native style objects are preserved.

This is a native adaptation. On the web, DOM direction, the theme/provider and Emotion's RTL processing are independent settings. The [retained original reference](../upstream/button-group-rtl.json) exercises those controls separately using the pinned official RTL plugin. It records 33 geometry cases and seven logical text-alignment cases; those finite cases do not establish arbitrary CSS support. Generated group geometry accounts separately for global native edge swapping and Android's local RTL border paint. Authored native inline edges keep React Native's semantics.

Authored React Native `Text` and `Typography` labels keep independent native text roots, so `allowFontScaling` and `maxFontSizeMultiplier` remain effective and can change without remounting label state. Literal-only labels keep their ordinary shared text root. Mixed authored/literal labels use a wrapping native row with baseline alignment; exact browser paragraph wrapping is not promised. Logical `textAlign: 'start' | 'end'` resolves against the participating native direction, including a physical Portal destination.

## Evidence and remaining work

The [source record](../upstream/button-group.json) pins MIT Material UI 9.5.0. Fifty-one original-browser baseline cases cover context/default priority, filtered children and fragments, classes, variants, positions, disabled/loading state, authored overrides and scoped selectors, shorthand resets and actual hover input. Pointer-event observations preserve the inherited disabled class even when a child explicitly sets disabled=false. Every case mounts with a fresh Emotion cache, shared with the original MUI instance, so earlier cases cannot affect its insertion order. Additional retained observations cover all global utility states, custom-root filtering, nested and live composition, callback arguments, two named-slot variant cases, seven focus configurations, three ordinary Portal placements, two cross-group destinations and four physical text inheritance cases. Shared-cache and class-registration observations are retained in the [cache reference](../tests/fixtures/mui-button-group-cache-9.5.0.json); see the [native cache guide](native-style-cache.md) for the source API and its limits.

The [baseline contract tests](../tests/button-group.test.tsx), [closure regressions](../tests/button-group-closure.test.tsx) and [physical Portal composition tests](../tests/group-portal-style-ownership.test.tsx) compare native context, state, colors, grouping and text against those observations. The Portal regressions include mounted state preservation, nested update stability, live destination changes, lease cleanup and self-container recovery. The [consumer fixture](../fixtures/native-consumer/button-group.tsx) checks root/deep imports, augmentation, required custom props and native ref boundaries. The [strict optional fixture](../fixtures/native-consumer/button-group-exact-optional.tsx) additionally checks explicit undefined, union roots, mergeable classes, callable return types and public contexts. These source checks do not certify device behavior or full MUI compatibility.

The remaining work is separated by evidence type:

| Gate                  | Remaining verification                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local native behavior | Expanded scenes and normal-size LTR/RTL reading checks pass. The iOS reading scene also passes both global directions at text scales 1.0 and 3.571. Android actual-border raster checks reproduce and correct the live RTL cache defect. Its reading scene now passes both global directions at text scales 1.0 and 2.0 with current native glyph receipts. |
| Styling boundary      | Repeatable cross-component updates against a shared original Emotion cache ([#127](https://github.com/Altroo/mui-native/issues/127)), plus the documented finite native selector/unit policy. Arbitrary CSS/global styles are not established.                                                                                                              |
| Performance           | The [iOS optimized two-action workload](performance-button-group.md) now has native correctness, CPU and peak-memory evidence. Input latency, scrolling, Android workloads and representative physical measurements remain open.                                                                                                                            |
| Physical validation   | Screen-reader usability and physical keyboard/IME behavior on supported devices.                                                                                                                                                                                                                                                                            |
| Delivery              | Packed consumers and source lint/type checks cover the documented interfaces. Native evidence is limited to the recorded scenes and profiles; unit tests do not establish release readiness.                                                                                                                                                                |

The exhaustive queue for existing partial families is in the [completion plan](completion-plan.md). Publication does not complete the remaining acceptance gates.

## iOS reading matrix

The maintained reading scene passed four iPhone 18 Pro simulator/iOS 27.0 profiles: normal OS text scale 1.0 and largest scale 3.571, each with the global LTR and RTL layout host. Each profile checks seven phases: local LTR and RTL horizontal layout, both vertical directions, restored horizontal layout, live text-policy changes and restored policies. All 28 phase records retain complete source text, actual glyph metrics and native parent/group/action/label bounds.

The tests require the requested scale, current source text and policy-sized glyphs before positioning the complete group and waiting for stable native frames. Glyph endpoints must fit their actual label and touch-root bounds. The normal pair completed in 214.101 seconds and the largest pair in 418.909 seconds; these are test execution times, not library latency measurements. Both runs restored and verified the original application and normal OS text setting.

Follow the [profile-specific iOS instructions](native-catalog-testing.md#buttongroup-reading-profiles). The mixed-label case checks retained state and authored label frames; the text Portal checks its independent font and text. Those narrower checks do not prove complete mixed-literal glyph layout or screen-reader usability. The iOS and Android results cover their documented emulator profiles; Android optimized workloads remain open.

## Android reading matrix

The maintained reading scene passed four Android API 37 emulator profiles: normal text scale 1.0 and enlarged scale 2.0, each with global LTR and RTL. The 28 phase records retain 84 repeated native action observations, complete current text and glyph geometry, actual border-layer corner samples, live policy changes and retained counters. All 68 navigation and control touches resolved within their intended native targets; 36 screenshots include the four pre-navigation frames.

The collector waits for native scrolling, actual frame commits and matching current `onTextLayout` receipts. This avoids sampling a moving navigation target or retaining an uncapped glyph receipt after restoring the capped policy. The normal LTR/RTL runs completed in 34.162/47.319 seconds; enlarged LTR/RTL completed in 31.986/27.500 seconds. These are test execution times, not input or rendering latency. All four runs used matching source, compiled collector, APK and Metro bundle identities; the original app and test APKs, normal OS text setting and owned reverse mappings were restored and verified.

Follow the [Android reading instructions](native-catalog-testing.md#reading-direction-and-system-text-size), retaining native reports and screenshots together. The mixed-label check covers retained state and authored frames; the text Portal check covers its independent font and text. These checks do not establish full mixed-literal shaping, TalkBack usability, physical keyboard/IME behavior, Android release performance or complete platform coverage. The existing evidence stage remains unchanged.

## Reproducing the scoped native checks

The catalog's **Groups** scene exercises horizontal/vertical layouts, full width, a stateful wrapped action, loading, group disabling and dynamic child removal. The iPhone scenario checks actual native parent/group endpoints, touch heights, visible touch centers and the measured root ref. Its maintained test is [ButtonGroupCatalogUITests.swift](../tests/native/ios/ButtonGroupCatalogUITests.swift).

For an existing generated Android catalog project, prepare the maintained runner, build/install its app and test APKs, then select the existing device explicitly:

```sh
node scripts/native-catalog/android-popper.mjs prepare --project "$ANDROID_PROJECT"
node scripts/native-catalog/android-popper.mjs run --scenario button-group --serial "$ANDROID_SERIAL" --output .cache/button-group-device-run
```

The [Android scenario](../tests/native/android/ButtonGroupScenario.java) and [strict collector](../scripts/native-catalog/android-button-group-report.mjs) require fourteen stages, fourteen baseline bounds samples, five physical Portal measurements and eight screenshots. Native focus ownership, destination glyph colors/fonts and same-container state retention are asserted before a run passes. Failed or incomplete evidence cannot pass acceptance. A fresh Android 37 debug app may request local-network access before reaching Metro; complete that platform prompt before starting instrumentation. The runner does not grant permissions or change device settings.

If Xcode stalls during verbose simulator diagnostic collection after a completed test, use its documented `-collect-test-diagnostics never` option. This keeps test result bundles and screenshot attachments enabled while avoiding that extra diagnostic collection. Incomplete result bundles do not count as passing evidence.
