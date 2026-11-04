# Native Collapse

`Collapse` changes the height or width of one retained native subtree. Root and `@mui/material/Collapse` imports resolve through the native compatibility layer; web applications retain original MUI. It is included starting with `0.0.7-prealpha.0`; use matching package versions and the native build described in [installation](installation.md).

```tsx
import { Button, Collapse, Typography } from '@mui/material';

<Button onClick={() => setOpen((value) => !value)}>Details</Button>
<Collapse in={open} timeout="auto">
  <Typography>Retained content</Typography>
</Collapse>
```

Source implements both orientations, numeric/phase/auto timeouts, appear/enter/exit controls, mount/unmount policy, all six lifecycle callbacks, custom end listeners, reduced motion, collapsed sizes, defaults, sx, theme overrides and three named slots. Refs and callback nodes are native `ViewInstance` handles. The `muiSupportAuto` marker and utility-name helpers are exported. React 19 callback-ref cleanup composes across root and wrapper slots.

## Layout and slots

While clipped, one absolute wrapper supplies natural content measurements. It returns to normal layout when expanded so content can grow naturally. Initial native appearance waits for layout. Auto duration uses the measured height or width and the theme's `getAutoHeightDuration`. No second offscreen content tree is mounted. Horizontal content needs an intrinsic or explicit width; percentage collapsed sizing requires a measurable containing block.

Use `slots.root`, `slots.wrapper` and `slots.wrapperInner` with corresponding `slotProps`. Custom slots must forward their native ref, style and layout callback. A ref-only wrapper can also supply public geometry through the root layout event. Custom slot elements receive the current transition ownerState. As in the pinned MUI implementation, slot-prop callbacks receive the base owner state before transition state is added. Use state theme overrides or the custom slot's ownerState for phase styling.

Numeric sizes are native points. Strings use the native length resolver, including px/rem and supported percentages. CSS selectors and DOM component strings require native styles, sx, theme overrides and native ref-forwarding components. Utility names identify slots. Callback nodes cannot mutate `HTMLElement.style`.

## Motion and validation

Layout dimensions use Animated's JavaScript driver because its opacity/transform native driver cannot animate height or width. Progress survives interrupted phases; retired completion is rejected and reduced motion stops active work. This is an implementation choice, not a measured performance claim. Physical devices, screen readers, complete font/RTL combinations and calibrated release performance remain validation gates.

`node scripts/reference/collapse.mjs --check` reproduces integrity-checked MUI 9.5 lifecycle, ref, deadline, auto-size, slot/default, class and reduced-motion observations. Native contract tests separately cover measurement, hidden interaction/accessibility, interruption, ref cleanup and slot replacement. Device and installed-consumer evidence belongs in [validation](validation.md) after verification. [Source provenance](../upstream/collapse.json) preserves the licensed reference.
