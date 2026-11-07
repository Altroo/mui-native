# Box native contract

Box retains the finite Material UI 9.5.0 surface contract using a native View. The root package, canonical Box subpath and retained layout aliases share one implementation. This guide distinguishes software behavior from native device and performance gates; it does not certify the entire browser or native compatibility surface.

```tsx
import Box from '@mui/material/Box';

<Box sx={{ p: 2, bgcolor: 'background.paper' }} style={{ paddingTop: 0 }}>
  Native content
</Box>;
```

This guide describes unpublished development after `0.0.7-prealpha.0`. See the [changelog](../CHANGELOG.md) for released package contents.

## Props and roots

The default native root is View. `component="div"` is the supported web host alias. Other strings are rejected by native types and diagnosed in development; provide a native component for another root. Eligible native View props/events retain their normal React Native payloads. Custom roots retain declared required/discriminated props and compatible native View refs. TypeScript cannot inspect the host returned by a structurally compatible ref-less wrapper; its author owns native rendering and forwarding.

Box owns children/sx/ref and component selection. ClassName/style types follow the selected native root, retaining its declared requirements. Native View style arrays accept native text/layout values. Fresh unrecognized native fields are rejected. Known custom-root requirements remain checked in direct calls and expanded objects; the original structural/default overload accepts some missing-root-prop spreads. Ordinary default-root and extra custom-root object spreads keep structural assignment, as with the existing native Paper contract. The exposed native type-map helpers model native roots rather than DOM element/ref types. An explicit BoxProps<Custom> alias retains its known custom component instead of the original alias's arbitrary ElementType replacement. Existing layout and canonical subpath exports remain available, including the additive Stack, CardContent and dialog imports.

Custom native roots should forward the actual host ref and native style. Generated className is metadata for the finite native styling rules, and should be consumed before spreading props onto a native host. It is not a native external-stylesheet implementation. Genuine native styles and cleanup-returning callback refs keep their existing semantics. Opaque roots remain responsible for any final native style composition they append.

The reserved as/theme/sx props follow Box filtering. A root that declares a compatible native as prop can redirect its final native host; an explicitly undefined as falls back to View. Prefer component for concrete root/ref inference. Reserved inputs are not forwarded as business data. Box has no slots, slotProps or classes prop of its own. A custom-root data prop with one of the remaining names still follows that root's declaration.

## Source 9.5 styling behavior

The pinned createBox does not consume top-level system props. Put spacing/palette/layout system values in sx. A declared custom-root p/m prop is forwarded as data, not converted into styling. This follows 9.5 source; it is not an implementation of older Box system-prop behavior.

Box also does not read `theme.components.MuiBox` defaults, styleOverrides or variants. It does not consume DefaultPropsProvider entries under that name. Anonymous styled preparation skips component configuration; explicitly named styled wrappers retain their own existing configuration path.

Sx object/function/array and responsive values use the current shared resolver. Material scope selection, public classes, participating styled/ancestor descendant rules and native inline precedence use existing root/style/text scopes. Sx spacing numbers follow theme.spacing; native style lengths use React Native units. An authored native shorthand resets overlapping computed CSS longhands. Native text still inherits through Box without adding a layout wrapper around every child; fragments, keyed children, state and forwarded host refs remain stable under the existing text contract.

Supported finite selectors/styles are described by the shared native styling engine. General Emotion serialization, arbitrary CSS selectors/pseudos, DOM/browser wrapping/layout, CSS-variable themes, external stylesheets, browser refs/events and unsupported CSS declarations remain outside this Box contract.

## Themes and native adaptation

Normal providers, scoped Material providers and valid explicit native Theme overrides retain their selected theme/callback identity. A custom root's reserved theme override must be a complete native Theme, normally created with createTheme; the host never receives it as business data. Native internals require resolved typography/palette/breakpoint/spacing fields. Raw web/scoped-envelope theme objects are rejected by native consumer types rather than treated as native themes.

There is a retained source distinction: in web createBox, explicitly null/undefined theme under a scoped provider makes sx callbacks observe the raw engine envelope. That envelope cannot drive native text/layout. For this unsupported override the native adapter emits one specific development diagnostic and retains the selected native scope. Omit theme or pass a complete native Theme. This is a documented native adaptation; it is not verified web-envelope parity. The diagnostic is deduplicated and suppressed in production.

Theme/class augmentation is checked through the public declaration entrypoints in paired consumer fixtures. The native Theme stays the canonical shared System theme; this component does not add another theme/context engine.

## Classes and generator lifecycle

Box exports boxClasses, BoxClasses and BoxClassKey. The pinned runtime vocabulary contains root only; declaration augmentation does not create runtime slots. The caller class precedes the generated root class, and generated tokens bind the native style scope. Native View receives native props; custom roots receive the public class metadata.

The canonical `@mui/material/className` facade exposes unstable_ClassNameGenerator.configure/generate/reset. Configuration participates in Box and Card roots, including existing native wrappers that delegate to Box. Other families' utility generators remain separate integration work. This is not a claim of global class-name configuration parity.

As upstream, boxClasses and the default root vocabulary capture module-load values, and Box captures the generator method once. Configure/reset changes that method's active transform; replacing the object method or mutating boxClasses later does not reconstruct an imported Box. Configure before component-module loading using a separate setup module when an application needs that lifecycle. Prefer idempotent transformations; the utility vocabulary and rendered default root name each pass through the upstream generator path.

## Reference and remaining verification

`node scripts/reference/box.mjs --check` verifies pinned package/license/source bytes and original SSR observations. `node scripts/reference/check-box-consumer.mjs` checks emitted native declarations and the real original public package with exact optional properties. Runtime regressions cover class/import identity, filtering, no invented defaults/system props, native events/refs/cleanup, styling/ancestor/text inheritance and source/native theme boundaries.

The maintained eleven-state scene now has scoped iOS/Android development-build evidence for default, custom and styled roots at normal and enlarged text sizes. It exercises real counters, retained refs, inherited Copy text, physical RTL spacing, style priority, reset and restoration; see the [recorded validation](validation.md#2026-11-07-finite-native-box-contracts). Wider native matrices, physical accessibility and optimized Box performance remain separate gates. Passing software/type/reference checks alone does not promote a support percentage. The stock RN 0.88.1 mixed physical/logical RTL margin limitation remains a backend boundary; Box does not install a JavaScript engine workaround. Package/archive validation remains part of integration, independently of this scoped source work.
