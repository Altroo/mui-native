# Card native contract

Card provides a native Paper-backed surface with the pinned Material UI 9.5.0 Card API. This guide describes version `0.0.8-prealpha.0`; see the [changelog](../CHANGELOG.md) for released package contents. CardContent, CardActions and CardActionArea have separate contracts and are not completed by this surface.

```tsx
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

<Card raised sx={{ p: 2 }}>
  <Typography>Account details</Typography>
</Card>;
```

## Surface and elevation

The default root is a native View. Card retains Paper's native props, events, text inheritance, variants and refs, and adds `raised`, which defaults to false. Its base surface clips overflow. A native component can replace the root through `component`; `component="div"` is the supported web host alias. Other browser elements, browser events and DOM refs are outside the native contract.

`raised` initially chooses elevation 8, but an explicit inherited `elevation` prop follows it in the source spread order. `<Card raised elevation={0}>` therefore uses elevation 0. An own `elevation={undefined}` reaches Paper's default resolution, including a configured `MuiPaper.defaultProps.elevation`. `MuiCard` defaults are resolved before that boundary. Outlined Paper keeps its outlined paint even when the resolved elevation is 8.

Selected native roots retain their declared required and discriminated props, compatible native host refs, cleanup-returning callback refs and native styles/events. Native View style arrays remain additional mobile inputs. As with the original public overloads, ordinary object spreads retain TypeScript's structural assignment boundary; a ref-less custom component remains responsible for the host and props it forwards.

## Classes, defaults and styles

Card exports `cardClasses`, `getCardUtilityClass`, `CardClasses`, `CardClassKey`, `CardOwnProps`, `CardProps`, `CardTypeMap` and the source `CardPropsColorOverrides` interface. The runtime class vocabulary contains root only. Class augmentation does not create another rendered slot, and the retained color-override interface does not introduce a native Card color prop. Card classes and Paper classes remain separate.

`MuiCard.defaultProps`, root style overrides, variants and `sx` use the shared native theme and source ordering. Callback evaluation follows Card before Paper; effective CSS order is Paper, Card, an outer styled layer and genuine native inline declarations. An absent style permits Paper's configured default style, while an explicitly supplied empty native style blocks that default. Enumerable override callbacks still resolve according to the source policy even when their slot's CSS is unused.

The canonical className generator facade participates in Box and Card. The default class objects capture their module-load values; later configuration affects dynamic utility generation according to the source lifecycle. Other families' generators remain separate integration work.

## Reserved custom-root inputs

When a custom root's public props accept native-compatible `theme`, `ownerState` or `as`, those inputs retain their styled meanings instead of becoming ordinary host data. A complete explicit native Theme selects Card's styling layer; the inner Paper still uses its provider theme. Raw browser/scoped-envelope theme objects are outside this native Theme boundary.

An authored `ownerState` replaces the Card root callback state with the exact supplied value. It is not nested inside an internally constructed state object. Preserve its identity when callbacks depend on getters or references. Source null/undefined behavior remains visible to callbacks rather than being silently replaced.

A native-compatible `as` redirects the styled Card root and bypasses Paper. The selected alternate root must forward the native host ref and eligible native style. Paper default props and Paper default native styles do not reach that alternate host. Genuine native styles supplied to Card still apply. These reserved inputs are consumed by the styled layer rather than forwarded as business props.

The original package has a separate React development frozen-props failure for an explicit styled theme. Production source observations establish the supported explicit-theme semantics here; this guide does not claim that development-only failure as a native requirement.

## Verification boundary

The source contract has original/native exact-optional consumer fixtures, runtime regressions, integrity-checked original references and independent review. Public root/deep imports retain one implementation and native theme context. The installed-package pipeline includes a separate strict Card consumer.

The thirteen-state native scene and its three permanent reserved-input probes pass at normal and enlarged OS text sizes on iOS and Android development builds. The checks cover retained counters/refs, physical geometry, inherited text, selected native paint and the reserved-input distinctions. iOS uses composited element images; Android checks raw retained-View samples and native opacity separately. These finite observations do not certify physical accessibility, broader viewport/RTL/font matrices, calibrated GPU shadow/clipping behavior, arbitrary font shaping or optimized performance. Card is at the 75% evidence stage, which is not a fraction of code written. See [validation](validation.md#2026-11-07-finite-native-card-contracts), the [reproduction guide](native-catalog-testing.md#card-finite-native-scene) and [Paper](paper.md) for the inherited surface and backend boundaries.
