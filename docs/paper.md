# Paper

`Paper` provides the existing Material surface contract on a native View. The finite software reference is Material UI 9.5.0. This page records source behavior, native adaptations and the finite native checks below. Complete web compatibility remains unverified.

```tsx
import Paper from '@altroo/mui-native/Paper';
import { Typography } from '@altroo/mui-native';

<Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
  <Typography>Account details</Typography>
</Paper>;
```

The package root exports the same `Paper`, `paperClasses`, `getPaperUtilityClass` and public props/classes/type-map types as the canonical native subpath. Existing additive Box, Stack, Typography and Card imports from the Paper subpath remain available.

This guide describes unpublished development after `0.0.7-prealpha.0`. See the [changelog](../CHANGELOG.md) for released package contents.

## Source software contract

- Defaults are `component="div"`, `elevation={1}`, `square={false}` and `variant="elevation"`. `MuiPaper.defaultProps`, the existing class/style merge option and explicit undefined use the shared default resolver.
- `children`, `classes`, `className`, `elevation`, `square`, `variant` and `sx` follow the source owner-state contract. The variant union supports declaration augmentation. Native View props, events and styles are additional mobile inputs.
- The 29 utility classes comprise root, rounded, outlined, elevation and elevation0 through elevation24. Active overrides are selected in source order: root, variant, rounded when applicable, then elevationN. All enumerable override callbacks resolve using the shared source policy, including unused slots. Ordinary unused CSS is not applied. The helper reads the canonical class-name generator live for nonstate slots. Global state identifiers stay fixed and the exported class map retains its module-load names.
- Theme variants, source callback owner/root arguments, scoped Material themes, styled root/class/descendant sheets and sx use the existing shared CSS cascade. Genuine native style arrays keep final precedence. Custom roots receive the generated class string; native View uses the same internal class tokens without forwarding browser class props.
- Non-square roots use the theme shape radius. Square roots add no radius declaration. Non-elevation variants add no shadow declaration. These absence rules preserve authored styling rather than injecting zero resets.
- Outlined surfaces use the source one-point solid divider border. Elevation surfaces select the exact corresponding theme shadow token, including all 25 default values and supported custom layers. The existing native shadow adapter retains its diagnosed legacy Android elevation approximation before API28; it is not a browser paint equivalence claim.
- Shadow access follows source order: development diagnoses the requested slot; production observes an active elevation only. The selected value is captured for both source callback metadata and native output, without repeating its table or index accessor. Static CSS literals avoid unused theme-token reads; default and explicit sx retain their existing lookup behavior. The native direct-theme argument extension retains eager function/array snapshots; static embedded variants resolve that snapshot after the existing first variants read, without introducing Proxy presence traps. The legacy adapter uses a local descriptor overlay of that captured index, leaving the caller theme and unrelated depths untouched.
- Dark elevation surfaces use the original logarithmic overlay alpha and rounding. A typed native `backgroundImage` constant-white gradient preserves the surface background underneath, without an extra View, pointer target or remounted child. Software checks compare all 25 payloads through the actual RN0.88.1 gradient processor with the original CSS strings. Native image properties, aliases and explicit resets retain precedence.
- Forwarded native refs, callback-ref cleanup, retained children, native events and inherited text metrics use the existing root/text/style scopes. Card continues to consume the extracted Paper with its existing overflow and authored-style behavior.

## Native roots and customization

`component="div"` maps to View. Other roots must be native React components; required and discriminated custom props and native ref types remain checked. DOM refs/elements and unrecognized host aliases are not mobile roots. A ref-less custom component is responsible for rendering a compatible native host and forwarding relevant props.

```tsx
import { forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Paper from '@altroo/mui-native/Paper';

const Surface = forwardRef<ViewInstance, ViewProps & { tracking: string }>(
  ({ tracking, ...props }, ref) => <View {...props} nativeID={tracking} ref={ref} />,
);

<Paper component={Surface} tracking="account" elevation={3} />;
```

Opaque custom roots keep control of their final native style composition. Paper does not rewrite their implementation or install a React Native monkey patch.

## Finite native verification

The maintained [catalog scene](../apps/native-catalog/PaperContractExample.tsx) passes its 33 states at normal and enlarged OS text sizes on the existing Android API37 emulator and iPhone18Pro/iOS27 simulator. Each run keeps stock and custom roots mounted, touches both counters once, traverses all 25 dark elevations, switches shape/outline/direction, applies explicit native resets and restores the defaults. The first raw touch fields remain captured while later scroll events bubble normally.

Android verifies actual retained native root/text/control instances, SP-converted text, independent bounds, border/radius properties and text-excluded `View.draw` interior samples. iOS verifies forwarded-ref/child lifetime, current accessibility geometry, composited element screenshots, rounded/square cutouts, the outlined edge and scaled counter ink. Neither method establishes every pixel, calibrated GPU shadows, physical accessibility or optimized-build performance. See [validation](validation.md#2026-11-07-finite-native-paper-contracts) and [reproduction instructions](native-catalog-testing.md#paper-finite-native-scene).

The separate [optimized iOS simulator pilot](performance-paper.md#exploratory-optimized-simulator-pilot) compares 100 Paper and native View roots for hot mounting, eight retained updates and matched scroll cycles in both mode orders. Its whole-app CPU/memory observations cover normal text and LTR only; Android, physical-device, input-latency, frame and calibrated performance remain separate gates.

## Explicit boundaries

The shared CSS grammar still determines supported declarations, selectors and responsive values. Arbitrary CSS background-image authoring, browser custom properties including private `--Paper-shadow`/`--Paper-overlay` overrides, CSS-variable color-scheme themes, general Emotion serialization, web box-shadow transitions and modular CSS layers are separate work. Paper supplies concrete default shadow/overlay payloads and source callback metadata; it does not add another CSS engine. Genuine native `style.backgroundImage` remains available through RN's public typed API.

Development diagnostics identify unavailable shadow indices. Full web propTypes behavior, browser tags/attributes/ref objects, browser layout/wrapping, physical accessibility services, calibrated native shadow/gradient equivalence, representative performance beyond the recorded simulator pilot and the wider device/version/density matrix remain separate gates. Existing stock RN0.88.1 mixed physical/logical RTL geometry limitations are not fixed by this component.

## Reproduce the finite reference

`node scripts/reference/paper.mjs --check` verifies cached package integrity, source bytes, MIT licenses and retained original SSR observations. The [fixture](../tests/fixtures/mui-paper-9.5.0.json) retains 32 root cases, 25 dark overlays four callback traces, eight indexed-shadow observations, two table-accessor observations and twelve original CSS-versus-sx lookup observations. [Provenance](../upstream/paper.json) identifies original source and the installed native gradient path. `tests/paper-contract.test.tsx` and the paired strict consumer fixtures cover the documented software boundary. These results are independent of device execution and do not promote a compatibility percentage.
