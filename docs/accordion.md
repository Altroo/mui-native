# Native Accordion

`Accordion`, `AccordionSummary`, `AccordionDetails` and `AccordionActions` compose native views, the shared ButtonBase activation host and the retained Collapse transition. This guide describes the development source. Published `0.0.8-prealpha.0` includes the earlier subset recorded in the [changelog](../CHANGELOG.md).

```tsx
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Button,
} from '@altroo/mui-native';
import ExpandMore from '@altroo/mui-native-icons/ExpandMore';

<Accordion defaultExpanded>
  <AccordionSummary id="delivery-summary" aria-controls="delivery-body" expandIcon={<ExpandMore />}>
    Delivery instructions
  </AccordionSummary>
  <AccordionDetails>Leave with reception.</AccordionDetails>
  <AccordionActions>
    <Button>Save</Button>
  </AccordionActions>
</Accordion>;
```

The example uses the optional `@altroo/mui-native-icons` package for its decorative indicator. Registered Metro routing also accepts these imports from `@mui/material` and their component/class-helper subpaths. Follow the [installation guide](installation.md) and rebuild the native application for the existing ButtonBase hosts. This is a library composition; the catalog supplies only example data and application state.

## Expansion and events

Use `defaultExpanded` for initial uncontrolled state, or `expanded` with `onChange(event, nextExpanded)` for application-owned state. Independent panels do not enforce single expansion. Applications can implement that policy with one selected panel ID, as the catalog example does.

Summary activation uses the shared native ButtonBase touch and keyboard transport. Root-slot activation callbacks run first, then Accordion changes/proposes expansion and invokes `onChange`, then the authored Summary callback runs. Preventing the activation event inside a root-slot callback does not cancel that source-defined order. Native `onPress` is an alias for `onClick`; providing both selects `onPress` at that level. Root props merge generated defaults, authored props and root-slot props in that order, including explicitly present `undefined` values. ARIA and ripple overrides follow the same source-defined priority; ButtonBase applies its own disabled default afterward.

The first nonempty child must be a valid summary element. Use `AccordionSummary` directly; wrapping it in a Fragment is unsupported. The expansion context wraps only that summary. Nested body accordions own their own state.

## Retention, slots and refs

The body remains mounted while collapsed by default, preserving local editor state. `slotProps.transition.unmountOnExit` opts into removal after exit; the next expansion remounts it. The default transition receives `in={expanded}` and `timeout="auto"`; explicit transition slot props can override those values. Its remaining props follow [Collapse](collapse.md).

Accordion exposes `root`, `heading`, `transition` and `region` slots. Summary exposes `root`, `content` and `expandIconWrapper`. Slot props accept objects or owner-state callbacks. Native root/slot refs use React Native View instances, with composed cleanup. Custom summary roots must implement the ButtonBase activation/ref/style contract; a plain layout View does not provide keyboard activation.

`component` and a slot's `as`/`component` change its native terminal while retaining the named constructor. Replacing a slot through `slots` transfers styling to that constructor: it receives the selected raw `sx`, native styles and owner state. An explicit `slots.root={ButtonBase}` also replaces Summary's constructor. Root-slot refs attach before the forwarded ref, and both receive cleanup.

Summary `id` and `aria-controls` map to the region's native ID and `aria-labelledby`. Explicit region slot props replace those defaults. Summary exposes native expanded/disabled accessibility state. Complete VoiceOver/TalkBack behavior and heading semantics still require a device matrix.

## Styling and boundaries

Native theme defaults, variants, named slot overrides, supported state selectors, `sx` and native `style` compose through the existing styling system. Root-slot `sx` replaces component `sx`; native styles apply last. `disableGutters` prevents expanded summary height/content-margin growth and outer expansion margins. `square`, `variant` and `elevation` flow through the native Paper root. Actions use end alignment and optional spacing.

Accordion and Summary compose the original utility identifiers with supplied class maps and className. Generated and authored slot tokens match supported native self selectors; custom roots receive composed className metadata. Summary focus classes activate with the actual native focus-visible state. Utility helpers read the canonical class-name generator live, global state names stay fixed, and exported maps retain their module-load names. The class interfaces support augmentation without adding unimplemented runtime slots.

Panels derive rounded edges and expansion margins from actual native sibling order and type. The divider follows MUI's separator rules, including adjacent expanded panels sharing the same generated root styles. Paper/Box terminals and transparent ref-forwarding wrappers retain their own final CSS and inline precedence.

Outer margins, Summary minimum height/content margins, icon rotation and separator opacity/color use theme transition timing. Rapid reversal continues from the presented value; reduced motion applies the endpoint. Changing gutters preserves Summary content state and refs. A theme `focusVisible` policy replaces the default Summary focus background.

External browser stylesheets, HTML element roots and DOM refs require native equivalents. The native API includes Paper-compatible polymorphic roots; native refs intentionally differ from DOM refs. First-frame paint, broader grouping/motion and screen-reader matrices, and calibrated release performance remain completion gates. No full compatibility or completion claim is made.

## AccordionActions

`AccordionActions` is a native View row for caller-owned actions. It keeps the original root and spacing class names, merges `classes` and `className`, and selects the spacing class and theme override only while `disableSpacing` is false. Theme default props, variants, supported self selectors in `sx` or `styled`, and native inline styles use the shared styling system. The canonical class-name generator affects live component names; global state names stay fixed and the class map is set when its module loads.

The row uses an eight-unit native column gap to preserve existing child hosts, margins, refs and state. This adapts the browser's sibling margin rule without adding wrappers or rewriting child props. `disableSpacing` removes that default gap, while native inline styles can set their own dimensions. The row follows its actual native layout direction. A custom native root receives the composed class metadata and must forward its native props, style, children and View ref.

Run `node scripts/reference/accordion-actions.mjs --check` for the six pinned source observations and the focused AccordionActions tests for root props, refs, class selectors and native style precedence. The installed consumer checks root and deep imports, class augmentation, native events and explicit undefined options.

The [iOS native gap check](../tests/native/ios/RootLayoutCatalogUITests.swift) passed on an iPhone 18 Pro simulator at actual OS font scale 1.0. The five stages measured 8, 16, 16, 0 and 8 points between the actual action buttons as the sample changed theme styling, native direction and spacing. The row reversed order in RTL. A real tap increased the Save note counter, which remained at one, and the custom View ref stayed attached through the changes and restoration. Android API 37 passed the same five stages at actual OS font scales 1.0 and 2.0. The driver verified the retained row and both action Views, observed them as immediate native siblings after Fabric flattening, and confirmed the result of a real tap. The original apps were restored. The same iOS layout and touch assertions passed at the largest OS text setting (actual font scale 3.571), with the original setting restored. These scenarios cover selected layout and touch; screen reader traversal, visual polish at the largest settings and performance remain separate.

## Validation

The [pinned source record](../upstream/accordion.json) fingerprints MIT-licensed Material UI 9.5.0. `node scripts/reference/accordion.mjs` integrity-checks the original runtime and regenerates the comparison fixtures. `node scripts/reference/accordion-style-programmes.mjs --check` verifies the generated original constructor CSS and its [provenance](../upstream/accordion-style-programmes.json). The focused native tests cover its controlled/uncontrolled defaults, slot overrides, callback ordering and utility identifiers, plus native activation, retention and composition. The [consumer fixture](../fixtures/native-consumer/accordion.tsx) covers root/deep imports and native type boundaries.

Scoped checks on the existing iPhone 18 Pro / iOS 27 and Android API 37 emulator exercise a real note editor whose state is owned inside the body, controlled panel switching, action activation and disabled interaction. The Android scenario compares actual/native natural heights and retained editor identity. The iOS scenario waits for transition receipts and proves optional unmounting by changing local help state, closing, then requiring it to reset after reopening. Accessibility absence alone is insufficient proof of unmounting.

The maintained scenarios are [Android](../tests/native/android/AccordionScenario.java) and [iOS](../tests/native/ios/AccordionCatalogUITests.swift). Prepare the existing generated Android project with `node scripts/native-catalog/android-accordion.mjs prepare PROJECT`, build/install its test APK, then run `node scripts/native-catalog/android-accordion.mjs run SERIAL OUTPUT` with the Android SDK tools available. The runner targets that explicit device, retains native receipts/screenshots and restores only the catalog. Add the maintained Swift file to the catalog UI test target to run `AccordionCatalogUITests` on an existing simulator.

The maintained iOS scenario also checks actual Summary content/icon positions when an authored parent switches RTL, retaining body state and restoring LTR. Normal and largest accessibility text sizes pass, including payment/footer bounds and visible-control description/trait audits. These automated audits complement touch checks; VoiceOver traversal is verified separately below. Renderer regressions cover interruption, reduced motion, constructor replacement and state/ref retention when gutters change. Fresh tarball consumers compile native root/deep imports and strict polymorphic/optional contracts.

The [14 November VoiceOver evidence](../compatibility/evidence/native-accordion-voiceover-ios-2026-11-14.json) records six passing Release cases: the main spoken-traversal scenario, its independent input control, and dark-mode/RTL regressions at normal and largest accessibility text sizes. On iOS27, `testVoiceOverTraversalAndActivation` uses [Apple's VoiceOver service](https://developer.apple.com/documentation/xcuiautomation/xcuivoiceoverservice) to traverse the actual spoken elements. A target-specific double tap selects payment exactly once. Returning through the closed delivery interval must exclude its editor/actions; the disabled Return panel must remain collapsed. The catalog uses the native Material `ExpandMore` icon so a decorative text glyph cannot enter the Summary label. The collectors restore the original app and text size; VoiceOver tests restore its prior setting.

The standalone [Pressable control](../tests/native/fixtures/PressableVoiceOverProbe.tsx), registered as an Expo entry for `PressableVoiceOverProbeUITests`, first qualifies that input on stock React Native Pressable. The owned host must then activate once while retaining the stock counter. An unavailable stock driver is reported as a skipped qualification; an owned-host failure after successful stock input fails the test. The retained result has one passing control case and no skips. Roles and disabled traits use native accessibility queries alongside the captured speech.

The isolated [motion fixture](../tests/native/fixtures/AccordionMotionProbe.tsx) can be registered as an Expo entry beneath `apps/native-catalog`. Build the UI test target in `Release` with `ENTRY_FILE` selecting that entry, Swift `-O` and C optimization `s`, then select `AccordionMotionProbeUITests` from the maintained Swift file. Its default and forwarding-root cases sample public native bounds during the transition and compare the final native accessibility frame. Receipts require production JavaScript and actual font scale 1. Summary height, content offset and rotated icon bounds must contain intermediate values. This is geometry evidence; paint timing and performance deadlines remain separate.

The isolated [grouping fixture](../tests/native/fixtures/AccordionGroupingProbe.tsx) uses the same Release entry setup with `AccordionGroupingProbeUITests`. Default and opaque forwarding roots each pass five native stages: initial siblings, keyed reordering, insertion of real leading/trailing View boundaries, boundary removal and original order restoration. Public native bounds verify `:first-of-type` and `:last-of-type` styling; native tags and Summary-local counters verify retention. Rows are memoized so a pure reorder does not depend on rerendering their owner styles. These settled measurements do not establish first-paint timing or corner/separator paint.

The [recorded grouping regression](../compatibility/evidence/native-accordion-grouping-paint-ios-2026-11-14.json) exposes a remaining first-frame defect. Both Release endpoint cases pass, but six qualified display frames across default/forwarded roots retain the prior sibling styles after reorder or boundary changes. Independent mode/stage bars establish which geometry was expected; the capture covers all ten cases. In the [reorder frame](assets/accordion-grouping-stale-frame.png), C/A/B retain approximately100/80/48points before settling to80/48/100. The subsequent check below addresses this recorded geometry regression; the earlier endpoint checks alone did not establish paint correctness.

For flat bordered panels, set `elevation={0}` explicitly; `shadowOpacity: 0` alone does not remove Android elevation. Source, renderer and emulator checks do not establish full physical-device accessibility, visual or release-performance behavior.

The [native selector-case check](../compatibility/evidence/native-accordion-selector-cases-ios-2026-11-14.json) runs the same ten marked stages with retained default Paper and forwarded Box roots. Both Release cases pass. The collector requires actual owned native hosts, an active resolver with zero errors, and nonzero native attempts/changed candidates. The recording contains108qualified complete-group frames with zero invalid geometry frames. Native selection uses prepared first/last cases before layout; refs and local counters remain attached through reorder and boundary changes. This is recorded geometry evidence. Separator/source-class paint, cache-cascade refresh, conditional text timing, exact animation-start timing, Android runtime and calibrated performance remain open. Conditional text metrics or direction use an ordinary-only table on the same host so eligibility changes preserve state and refs. A conditional text color alone preserves the independent native View cases; its inherited text paint timing remains separately scoped.

Retained native case tables refresh with stylesheet cache epochs. The [cache regressions](../tests/accordion-structural-host.test.tsx) expire a foreign emitter and require Paper/Box presentation and all eight encoded cases to update together, preserving refs, local state and source callback counts. Further checks re-evaluate conditional-text eligibility and keep genuine inline getter observations stable. These are renderer and installed-package checks; the recorded native paint matrix remains separately scoped above.

The [separator regression](../compatibility/evidence/native-accordion-separator-regression-ios-2026-11-14.json) records eight stale-separator frames despite two passing endpoint tests. The [parent-selector correction](../compatibility/evidence/native-accordion-parent-separators-ios-2026-11-14.json) repeats all ten default/forwarded stages with zero invalid separator frames in 104 qualified complete groups. It requires actual owned panel and ornament hosts, matching native capability, healthy resolver activity and retained native tags/counters. Both optimized native cases pass, and the Android native change compiles offline. Android runtime and expanded adjacency are not established by this recording.

The ornament selects its immediate source root's prepared positional cases before layout. A stable owner token verifies that relationship without reading app callbacks or a mutable latest-render registry. An intervening native wrapper, a mismatched owner or an older native binary retains ordinary styling. Renderer and exact-resolver controls cover those fallback boundaries; no ancestor position is guessed. Expanded source-class adjacency, conditional inherited text, animation-start timing and calibrated performance remain completion gates.

A direct View root (`slotProps={{ root: { as: View } }}`) and an opaque root forwarding to View refresh retained CSS when a foreign stylesheet cache expires. The direct root also refreshes all eight native cases. Regression checks require the new color while preserving the native ref, local Summary counter and source callbacks observed once. Known Paper/Box terminals keep their own prepared refresh boundary, so unrelated cache commits do not replay their style override callbacks.

The [stock View parity check](../compatibility/evidence/native-accordion-stock-view-parity-ios-2026-11-14.json) applies React Native's pinned mounting predicates on owned-node creation and cloning. The exact-source differential test covers property combinations and resets. Native iOS and Android builds pass, and the updated iOS grouping recording has 122 qualified complete groups with zero invalid separator frames.

The VoiceOver collector now requires Payment's native expanded accessibility value and hit-test visibility before navigating. Two owned-host runs and the ordinary-host control pass the same eight-step refocus bound, exactly-once activation, hidden-body traversal and disabled-panel assertions. This qualifies the synchronized scenario. Earlier unsynchronized trials failed after activation; their cause and immediate-navigation behavior remain open. Diagnostic query timings do not measure app responsiveness. The remaining paint, platform and performance gates are still required.

The owned JS host preserves stock View ID/ARIA alias precedence and resets text ancestry without an additional native wrapper. The [wrapper parity check](../compatibility/evidence/native-accordion-view-wrapper-ios-2026-11-14.json) compares the actual pinned stock wrapper, including false, zero and empty-string values, native props, exact refs and programme identity. Existing grouping and synchronized VoiceOver scenarios pass on the updated Release bundle; the recording contains 95 qualified complete groups with zero invalid separator frames. These native replays do not separately measure every alias or text-ancestry case.

The [expanded adjacency regression](../compatibility/evidence/native-accordion-expanded-adjacency-regression-ios-2026-11-14.json) records four stale separator frames across default and forwarded roots when a real View is inserted before the middle panel and removed. Both native endpoint cases pass, but the recording has 111 qualified complete groups and exposes the delayed peer update. Matching emitted CSS classes, a changed middle class and retained root tags/counters are exercised. The source opacity is deliberately overridden to make display suppression visible. The follow-up recording below tests the correction of this scenario.

The [v2 peer-adjacency check](../compatibility/evidence/native-accordion-peer-adjacency-ios-2026-11-14.json) repeats those ten stages with immutable native CSS peer identities and sixteen prepared ornament cases. Both Release cases pass; 86 qualified complete groups contain zero invalid separator frames. Native known-peer identity overrides stale JavaScript observations. An unknown peer accepts only an observation bound to its surface, source host, parent and previous logical sibling. Replacement invalidates that observation while retaining native positional selection. The native Android changes compile offline; Android runtime is not established by this record.

Arbitrary noncooperating custom peers remain a limitation: an unknown matching replacement can reveal a separator until observed, while a same-host CSS change can retain a stale observation. The recording closes the reproduced default/forwarded insertion/removal scenario, not universal first-frame CSS adjacency. Conditional inherited text, transition timing, wider native/accessibility matrices and calibrated Release performance still prevent full Accordion completion.

The [root-motion geometry check](../compatibility/evidence/native-accordion-root-motion-ios-2026-11-14.json) adds four Release cases across default and forwarded roots. Normal expansion measures both root margins alongside Summary/content/icon motion. The separate [reorder fixture](../tests/native/fixtures/AccordionRootMarginProbe.tsx) moves one retained keyed View around an expanded panel, checks the first endpoint, returns until native margins are intermediate, then reverses. Native placement qualifies each phase; two directional intermediate samples prevent an endpoint snap from passing as reversal. Root and boundary tags, root height and the body-local counter remain retained. This verifies bounded native geometry, while exact painted-frame/start timing and performance remain open.
