# Native CircularProgress

This source-build contract replaces the earlier ActivityIndicator prototype with a native View and SVG circle renderer. Published previews keep their earlier behavior until a future release. Scoped native integration verification passes on iOS and Android at normal, enlarged and restored text sizes. This guide does not claim complete MUI compatibility.

```tsx
import CircularProgress from '@mui/material/CircularProgress';

<CircularProgress aria-label="Loading results" />;
<CircularProgress variant="determinate" value={75} enableTrackSlot />;
<CircularProgress variant="determinate" min={20} max={80} value={50} size={48} />;
```

## Values and appearance

The default size is 40 points, thickness is 3.6 units and the internal SVG coordinate space is 44 units. Numeric sizes are native points. Supported string units resolve through native styling, including inherited `em` sizes. The value defaults to `min`, or zero when `min` is omitted. Determinate progress uses the supplied range, a clockwise arc and the original minus-90-degree starting rotation. Values and drawing geometry follow the original calculation rather than silently clamping them.

`color` supports the standard palette names, `inherit` and declared palette augmentation. `enableTrackSlot` adds the background track using the theme's activated opacity. `disableShrink` keeps the indeterminate stroke length fixed while its outer rotation continues. Both options remain independent of the determinate range.

Indeterminate rotation and dash growth use native Animated drivers with the original 1.4-second cycle. Reduced-motion policy comes from the theme's motion configuration and, in system mode, the native OS preference. Preference changes stop or resume native motion without reexecuting user overrides, variants or `sx` callbacks. These are native animations, not a browser or WebView renderer.

Determinate dash-offset updates and matching native numeric/angle transform lists use the theme transition factory. Supported transform strings also enter this interpolation path. Disabling transitions cancels running drivers. A duration-only change leaves the current driver intact and applies to the next target. Changing from indeterminate to determinate takes the original static position immediately. Perspective, percentage translations, matrix decomposition and differently ordered transform lists retain their native values; their general CSS interpolation remains unfinished styling work.

## Styling and imports

Root, SVG, track and circle keep their separate `MuiCircularProgress` named styling stages. Root override callbacks receive the generated SVG child; authored children remain in owner state. Variant predicate and style callbacks preserve the original merged-prop precedence. The same generated element is rendered after styling, with its presentation attributes prepared before callbacks run. Theme defaults, root variants, supported class selectors, `sx`, genuine callback arguments and owner state follow the pinned source order. Circle inline geometry takes precedence over named styles. The root supports native style arrays and native View attributes and events. SVG paint inheritance is resolved before crossing the native peer boundary.

The captured classes are `root`, `determinate`, `indeterminate`, `colorPrimary`, `colorSecondary`, `svg`, `track`, `circle` and `circleDisableShrink`. Utilities follow the current canonical class-name generator. Class-interface augmentation extends declarations without inventing rendered slots.

Use the Material root, `@mui/material/CircularProgress`, or `@altroo/mui-native/CircularProgress`. The `CircularProgress/circularProgressClasses` entry supplies the default class map and named helpers. Color and variant augmentation remain available through the component entry. Custom variant declarations do not automatically add drawing behavior.

Earlier native previews accidentally exposed unrelated feedback components from the deep entry. Import those from their own paths or the Material root. Browser element attributes, DOM refs, arbitrary browser hosts and full CSS are outside the current native contract.

## Accessibility and refs

The outer ref identifies the same native View through value, theme and motion updates. Its native measurement and focus-related methods remain the React Native View contract. SVG slots are internal and do not add accessibility elements.

Determinate progress exposes its supplied range through native accessibility values. On iOS, unlabelled values use correctly localized relative-percentage text, including ranges with nonzero or negative minima; this bypasses a percentage-conversion defect in the pinned native peer. Authored `aria-valuetext` or native accessibility text takes precedence. Android retains the original numeric minimum, maximum and current value. Invalid, nonfinite or inverted ranges retain source diagnostics and drawing calculations, but withhold impossible native numeric counters. Authored accessibility text is preserved. Indeterminate progress has no generated numeric range. Supply a meaningful accessible label for the surrounding loading operation.

## Verification and remaining work

The maintained producer records 34 original observations from integrity-verified MIT Material/System/Utils 9.5.0 packages. Coverage includes source defaults, classes, slot callback order, original root attributes, geometry, warnings, authored precedence and owner mutation. Separate regressions exercise OS preference changes, transition cancellation/interruption, actual SVG Group paint binding and the retained public ref.

The Layout & surfaces > Circular progress catalog scene uses public imports and tests quarter progress, three-quarter progress, a custom range, track removal, paused motion and restoration. Native checks require actual measured hosts and screenshots; Android also reads the native accessibility range. All six development-build profiles pass on the existing iPhone 18 Pro/iOS 27 and Android API 37 emulators. Both retain one measured 64-point View through all six states, and numeric/native announcements match independently known values. The iOS test compares percentage values while tolerating Unicode percent spacing between the app and test runner. Android waits for the actual native SVG dash offset to reach 95.190 or 31.730 before capture, rather than treating a React state update as completed paint.

Physical screen-reader usability, complete inherited styling, general transform interpolation, RTL/custom-theme matrices, low-end/release-build performance and the complete integration matrix remain open. A source fixture or simulator screenshot alone does not certify those gates.

Actual pixel checks pass across all six profiles and 14 captures per profile. Loading changes both orientation and dash length; fixed-stroke loading rotates at a stable length; paused frames remain static. The three-quarter determinate arc has approximately three times the quarter arc paint, custom ranges preserve that geometry and restoration returns to the baseline. Arc quadrants match the original MUI screenshots under the catalog theme. Native rasterization is an adaptation, not a pixel-identical browser-rendering claim.
