# Native Accordion

`Accordion`, `AccordionSummary`, `AccordionDetails` and `AccordionActions` compose native views, the shared ButtonBase activation host and the retained Collapse transition. They are development implementations after `0.0.7-prealpha.0`; the published preview does not include them yet.

```tsx
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Button,
  Typography,
} from '@altroo/mui-native';

<Accordion defaultExpanded>
  <AccordionSummary
    id="delivery-summary"
    aria-controls="delivery-body"
    expandIcon={<Typography>⌄</Typography>}
  >
    Delivery instructions
  </AccordionSummary>
  <AccordionDetails>Leave with reception.</AccordionDetails>
  <AccordionActions>
    <Button>Save</Button>
  </AccordionActions>
</Accordion>;
```

Registered Metro routing also accepts these imports from `@mui/material` and their component/class-helper subpaths. Follow the [installation guide](installation.md) and rebuild the native application for the existing ButtonBase hosts. This is a library composition; the catalog supplies only example data and application state.

## Expansion and events

Use `defaultExpanded` for initial uncontrolled state, or `expanded` with `onChange(event, nextExpanded)` for application-owned state. Independent panels do not enforce single expansion. Applications can implement that policy with one selected panel ID, as the catalog example does.

Summary activation uses the shared native ButtonBase touch and keyboard transport. Root-slot activation callbacks run first, then Accordion changes/proposes expansion and invokes `onChange`, then the authored Summary callback runs. Preventing the activation event inside a root-slot callback does not cancel that source-defined order. Native `onPress` is an alias for `onClick`; providing both selects `onPress` at that level. Root props merge generated defaults, authored props and root-slot props in that order, including explicitly present `undefined` values. ARIA and ripple overrides follow the same source-defined priority; ButtonBase applies its own disabled default afterward.

The first nonempty child must be a valid summary element. Use `AccordionSummary` directly; wrapping it in a Fragment is unsupported. The expansion context wraps only that summary. Nested body accordions own their own state.

## Retention, slots and refs

The body remains mounted while collapsed by default, preserving local editor state. `slotProps.transition.unmountOnExit` opts into removal after exit; the next expansion remounts it. The default transition receives `in={expanded}` and `timeout="auto"`; explicit transition slot props can override those values. Its remaining props follow [Collapse](collapse.md).

Accordion exposes `root`, `heading`, `transition` and `region` slots. Summary exposes `root`, `content` and `expandIconWrapper`. Slot props accept objects or owner-state callbacks. Native root/slot refs use React Native View instances, with composed cleanup. Custom summary roots must implement the ButtonBase activation/ref/style contract; a plain layout View does not provide keyboard activation.

Summary `id` and `aria-controls` map to the region's native ID and `aria-labelledby`. Explicit region slot props replace those defaults. Summary exposes native expanded/disabled accessibility state. Complete VoiceOver/TalkBack behavior and heading semantics still require a device matrix.

## Styling and boundaries

Native theme defaults, variants, named slot overrides, supported state selectors, `sx` and native `style` compose through the existing styling system. Root-slot `sx` replaces component `sx`; native styles apply last. `disableGutters` prevents expanded summary height/content-margin growth and outer expansion margins. `square`, `variant` and `elevation` flow through the native Paper root. Actions use end alignment and optional spacing.

Utility-class helpers preserve the pinned identifier vocabulary. Arbitrary browser CSS classes, HTML element roots and DOM refs require native equivalents. Browser sibling pseudo-elements, automatic first/last sibling rounding, CSS margin animation and animated icon rotation are not implemented. Native grouping/animation policies, inherited Paper/polymorphic contracts, physical accessibility, RTL/font matrices and calibrated performance remain open. No full compatibility or completion claim is made.

## AccordionActions

`AccordionActions` is a native View row for caller-owned actions. It keeps the original root and spacing class names, merges `classes` and `className`, and selects the spacing class and theme override only while `disableSpacing` is false. Theme default props, variants, supported self selectors in `sx` or `styled`, and native inline styles use the shared styling system. The canonical class-name generator affects live component names; global state names stay fixed and the class map is set when its module loads.

The row uses an eight-unit native column gap to preserve existing child hosts, margins, refs and state. This adapts the browser's sibling margin rule without adding wrappers or rewriting child props. `disableSpacing` removes that default gap, while native inline styles can set their own dimensions. The row follows its actual native layout direction. A custom native root receives the composed class metadata and must forward its native props, style, children and View ref.

Run `node scripts/reference/accordion-actions.mjs --check` for the six pinned source observations and the focused AccordionActions tests for root props, refs, class selectors and native style precedence. The installed consumer checks root and deep imports, class augmentation, native events and explicit undefined options.

The [iOS native gap check](../tests/native/ios/RootLayoutCatalogUITests.swift) passed on an iPhone 18 Pro simulator at actual OS font scale 1.0. The five stages measured 8, 16, 16, 0 and 8 points between the actual action buttons as the sample changed theme styling, native direction and spacing. The row reversed order in RTL. A real tap increased the Save note counter, which remained at one, and the custom View ref stayed attached through the changes and restoration. Android API 37 passed the same five stages at actual font scale 1.0. The driver verified the retained row and both action Views, observed them as immediate native siblings after Fabric flattening, and confirmed the result of a real tap. The original apps were restored. The same iOS layout and touch assertions passed at the largest OS text setting (actual font scale 3.571), with the original setting restored. These scenarios cover selected layout and touch; enlarged Android text, screen reader traversal and performance remain separate.

## Validation

The [pinned source record](../upstream/accordion.json) fingerprints MIT-licensed Material UI 9.5.0. `node scripts/reference/accordion.mjs` integrity-checks the original runtime and regenerates the comparison fixtures. The focused native tests cover its controlled/uncontrolled defaults, slot overrides, callback ordering and utility identifiers, plus native activation, retention and composition. The [consumer fixture](../fixtures/native-consumer/accordion.tsx) covers root/deep imports and native type boundaries.

Scoped checks on the existing iPhone 18 Pro / iOS 27 and Android API 37 emulator exercise a real note editor whose state is owned inside the body, controlled panel switching, action activation and disabled interaction. The Android scenario compares actual/native natural heights and retained editor identity. The iOS scenario waits for transition receipts and proves optional unmounting by changing local help state, closing, then requiring it to reset after reopening. Accessibility absence alone is insufficient proof of unmounting.

The maintained scenarios are [Android](../tests/native/android/AccordionScenario.java) and [iOS](../tests/native/ios/AccordionCatalogUITests.swift). Prepare the existing generated Android project with `node scripts/native-catalog/android-accordion.mjs prepare PROJECT`, build/install its test APK, then run `node scripts/native-catalog/android-accordion.mjs run SERIAL OUTPUT` with the Android SDK tools available. The runner targets that explicit device, retains native receipts/screenshots and restores only the catalog. Add the maintained Swift file to the catalog UI test target to run `AccordionCatalogUITests` on an existing simulator.

For flat bordered panels, set `elevation={0}` explicitly; `shadowOpacity: 0` alone does not remove Android elevation. Source, renderer and emulator checks do not establish full physical-device accessibility, visual or release-performance behavior.
