# Native CardActions

The CardActions contract described here is available in source builds. Published previews retain their earlier subset until the next release.

CardActions renders a native action row with eight-point padding and spacing. Its familiar `disableSpacing`, `classes`, `className`, `sx`, theme defaults and root/spacing overrides are available through the Material root and original component imports.

```tsx
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';

<CardActions>
  <Button size="small">Share</Button>
  <Button size="small">Save</Button>
</CardActions>;
```

## Spacing and styling

The `MuiCardActions-root` class is always active. `MuiCardActions-spacing` and the theme's spacing override apply while `disableSpacing` is false. An explicit undefined value inherits a theme default; explicit false restores spacing. The class map and `getCardActionsUtilityClass` are exported from the component entry and `CardActions/cardActionsClasses`, and honor the shared class-name generator.

Native spacing uses Yoga's `columnGap` in place of the browser sibling-margin rule. This keeps existing child hosts, refs and state intact without cloning action elements or inserting action wrappers. `disableSpacing` removes the default gap. For an explicit native gap, set `columnGap` through `sx`, a theme override or native `style`. Native gap and browser margin/gap arithmetic are different; this is a native layout adaptation, not complete CSS equivalence. The row follows its actual native layout direction.

Theme defaults, root/spacing overrides, variants, supported self selectors and `sx` participate in the shared styling pipeline. Native inline styles keep their usual final precedence. Native text children inherit supported text styling through the shared text scope.

## Native roots and refs

The forwarded ref targets a native View instance. Native View attributes and events are forwarded. The existing `component="div"` alias also renders a View. A custom native component must forward its native props, children, style and View ref, and consume the supplied class/owner metadata rather than spreading it onto a native host. Browser element refs and arbitrary DOM roots are outside the native contract. A declared native `as` prop retains the earlier Box-backed precedence over `component`; an explicitly present undefined `as` selects the default View.

When a custom native root declares an `ownerState` prop, its authored object selects named styles and is kept by identity. The component still composes its classes from its generated state, matching the original spread order. A declared complete native `theme` prop styles this root locally, including a Material-scoped theme; provider defaults and descendant theme context remain with the provider. Reserved theme/as metadata is consumed before the native root renders.

Earlier native prototypes re-exported unrelated layout components from `@mui/material/CardActions`. That deep entry is now scoped to CardActions, its class helpers and types. Import other components from the Material root or their own component paths.

## Validation

Run `node scripts/reference/card-actions.mjs --check` for the integrity-checked Material UI 9.5.0 observations, including reserved inputs, and `pnpm exec jest --runInBand tests/card-actions-contract.test.tsx` for native defaults, classes, styling, root aliases and retained children. The isolated installed consumer checks original/scoped imports, native refs, explicit undefined options and class augmentation.

The catalog's Layout & surfaces > Card actions example exercises an actual action, spacing, theme and native direction changes while retaining the row and child state. The iPhone 18 Pro simulator passed five stages at actual OS font scale 1.0 and at the largest text category, then passed a normal-size preview after restoration. Android API 37 passed the same five stages at actual font scales 1.0 and 2.0 and again after normal-size restoration. Each sequence measured gaps of 8, 16, 16, 0 and 8 points, checked the eight-point native start inset, preserved the root ref and retained the saved count through the changes.

The Android reader requires full child rectangles inside the row, actual native ancestry or immediate flattened siblings, committed controls and one retained root tag. Earlier reports from the wrong Metro bundle remain failed evidence; switching the QA build to port 8082 loaded the reviewed catalog. Screenshots were reviewed separately. These are finite development-build checks: complete viewport/custom-root matrices, physical accessibility usability and optimized release performance remain open. No full MUI compatibility or released-version claim is made.
