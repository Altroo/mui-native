# Native AccordionDetails

AccordionDetails is the existing one-root content wrapper from pinned MIT Material UI 9.5.0. Its default padding is `theme.spacing(1, 2, 2)`: top 8, horizontal 16 and bottom 16 authored units with default spacing. A native View replaces the browser div. Expansion, region ownership, summary interaction and transition state belong to Accordion and its other parts.

```tsx
import AccordionDetails from '@mui/material/AccordionDetails';

<AccordionDetails
  accessibilityLabel="Account details"
  sx={{ '&.MuiAccordionDetails-root': { paddingTop: 1 } }}
  style={{ padding: 0 }}
>
  Account content
</AccordionDetails>;
```

The root accepts the actual React Native ViewProps surface, native StyleProp, ViewInstance refs and existing native component replacement. Native layout, touch, responder and accessibility events retain their native types and original event objects. The wrapper does not add an activation handler, expansion state or an error state. The original Details declaration uses a broad ref fallback. Native Details declares ViewInstance refs, and styled preserves an already declared target ref while retaining its existing unknown fallback for untyped targets. This type correction does not close the broader styled polymorphism contract.

## Imports and classes

Shared web/native imports use `@mui/material` or `@mui/material/AccordionDetails`. The canonical entry exposes AccordionDetails, AccordionDetailsProps, AccordionDetailsClasses, AccordionDetailsClassKey, accordionDetailsClasses and getAccordionDetailsUtilityClass. Root and canonical native values share identity.

The existing native-only `@altroo/mui-native/AccordionDetails/accordionDetailsClasses` alias remains available. Pinned original 9.5.0 ships the internal class file but does not export that package subpath. Use canonical named imports in shared code.

Only `root` is a runtime Details slot. Original utility identifiers and authored root classes participate in the supported self-selector cascade. They do not create a browser stylesheet. The canonical class-name generator configures live root names and native self selectors. Global state names stay fixed, and the exported class map reflects its module-load configuration. Canonical type augmentation remains available:

```tsx
import type { AccordionDetailsClassKey } from '@mui/material/AccordionDetails';

declare module '@mui/material/AccordionDetails' {
  interface AccordionDetailsClasses {
    contributorSlot?: string | undefined;
  }
}

export const key: AccordionDetailsClassKey = 'contributorSlot';
```

Augmentation extends the type vocabulary; it does not add a rendered slot or synthesize a class value. Runtime classes remain the pinned root vocabulary.

## Defaults, callbacks and native inline styles

MuiAccordionDetails defaults resolve against genuine caller props before prepared styled CSS is applied. Absent or explicit undefined style receives its default; null suppresses that inline default. Explicit undefined remains accepted for classes, className, sx, component and style. A styled wrapper does not manufacture an authored style merely because it prepared CSS for this root.

The default className/style replacement policy and opt-in `components.mergeClassNameAndStyle` policy come from the existing DefaultPropsProvider contract. The opt-in flag concatenates class tokens and shallow-merges plain style objects. Native arrays and registered styles retain the native adapter's ordered composition and edge precedence.

The source ordering is base padding, theme overrides/variants and sx, with selector specificity preserved. Genuine native inline style applies after that CSS cascade. Native padding/margin, border, gap and flex shorthands clear computed longhands that would otherwise defeat the inline declaration. Specific fields inside the authored native array remain subject to React Native precedence, including when a later authored shorthand exists.

Theme override callbacks see composed root classes and original authored/default style values and presence. Variant predicate/style callbacks use the original merged owner values when they collide with styled-root props. Prepared native style descriptors do not leak into these public callback arguments. Emotion-generated hash classes are browser artifacts and are excluded from native class metadata; MUI and authored identifiers remain available.

A native custom root receives composed className metadata, native attributes/events, its native ref and computed style. It does not receive ownerState, sx or classes as private styling payloads. The original as-based root spy verifies styled metadata filtering; native `component` is an existing adapter extension, not a new browser as API. String DOM roots and HTML refs are not accepted on native.

The native text scope stays on the same root and preserves keyed child identity, React 19 ref cleanup, supported literal/raw native text inheritance and CSS text-metric provenance. Arbitrary internals of external components still follow React Native inheritance unless they participate through library Box/Typography scopes. Details does not add another physical View around its content.

## Evidence and remaining exits

The retained [reference fixture](../tests/fixtures/mui-accordion-details-9.5.0.json) executes 14 actual original root/default/callback cases, 12 styled/default cases, 19 utility observations and one original forwarded-root spy. [Provenance](../upstream/accordion-details.json) retains archive integrity, file and MIT license hashes for the three pinned packages. The spy observes forwarded ref arguments; SSR does not attach a DOM ref or measure browser geometry.

[Runtime tests](../tests/accordion-details.test.tsx) cover the native adapter, including before-fix regressions, inline precedence, class specificity, defaults, callback arguments, events, a retained keyed child, live theme changes and native ref cleanup. The [strict consumers](../fixtures/accordion-details-consumer) check emitted native declarations and the original package through its real public exports, including canonical augmentation, styled inference, exact optional props, native versus HTML refs and source-only/native-only counterexamples.

```sh
node scripts/reference/accordion-details.mjs --check
node scripts/reference/check-accordion-details-consumer.mjs
pnpm exec jest --runInBand --runTestsByPath tests/accordion-details.test.tsx tests/accordion.test.tsx
```

The existing Accordion native scenario passes two iOS integration tests with this dedicated Details root, including retained body edits through expansion and collapse. Fresh installed-package checks also pass the isolated strict Details consumer and canonical root/helper identities. The direct [iOS scenario](../tests/native/ios/AccordionDetailsCatalogUITests.swift) passes standalone/custom-root padding, live theme/spacing/class/default/inline changes, native touch events and retained child/ref identity at baseline and actual largest OS text (fontScale 3.571). Its separate typography case passes native font/line-height geometry and actual glyph alignment through authored 20-to-24-to-20 changes and RTL-to-LTR restoration. Pixel ink establishes horizontal placement independently of cached line-event positions. Native Fabric can keep a painted/test-tagged View while mounting its children as physical siblings, so instrumentation must retain real parent/frame evidence rather than assume every logical child is a native descendant.

The direct [Android baseline text record](../compatibility/evidence/native-text-alignment-android-2026-11-06.json) passes three states on API 37 at native OS fontScale 1: authored 20-dp LTR, 24-dp RTL and restored 20-dp LTR. Twelve Text observations across stock/custom roots match native font sizes, inherited line heights and measured frames; the same four Text leaves retain identity throughout. All six root observations retain attached=1, cleaned=0 and sameRoot=true ref leases. A real child action and bubbling native event preserve the counter at 1 after restoration. Twelve glyph-ink records from six PNGs verify logical-start paint, meaningful opposite blank space and bounded native advance; cached line-event x values do not determine the result. Source, driver, backend, license and PNG hashes accompany the actual report, with no PNG binaries included.

This Android observation uses ReactTextView's TextView backend and the recorded runtime source snapshot. The prepared-layout backend, enlarged Android OS text, wider Details theme/spacing/class/inline and event profiles, physical Portal text inheritance, TalkBack and optimized performance remain open. The authored 20-to-24 sizing does not represent an OS accessibility-scale change or full Typography validation. An earlier Android attempt was blocked by a System UI ANR overlay; the record contains the subsequent completed run.

Source and Jest checks do not certify renderer paint, real event dispatch, accessibility trees or physical VoiceOver/TalkBack, optimized-build performance or published-package installation. This source increment does not promote compatibility percentages or complete the broader Accordion, provider, styling, renderer or device gates.
