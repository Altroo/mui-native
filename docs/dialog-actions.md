# Native DialogActions

This contract is available in source builds. Published previews retain their earlier implementation until the next release.

DialogActions renders a native footer with eight-point padding, centered actions and end alignment. Its `disableSpacing`, classes, theme defaults, root/spacing overrides, variants and `sx` follow the pinned Material UI 9.5.0 contract.

```tsx
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

<DialogActions>
  <Button onClick={keepEditing}>Cancel</Button>
  <Button onClick={saveChanges}>Save</Button>
</DialogActions>;
```

## Layout and styling

Native spacing uses Yoga column gaps in place of browser sibling margins, preserving caller-owned hosts, children, refs and state. The default gap is eight points; `disableSpacing` removes it. An explicit native gap uses `columnGap`. Browser margin/gap arithmetic and native gap arithmetic differ.

The footer uses native zero flex for its nonshrinking automatic-basis default. Later `sx={{ flex: 1 }}` or native `style={{ flex: 1 }}` can fill available parent space. Native numeric flex remains a React Native layout value.

Root and spacing classes compose separately from style selection. A declared custom-root `ownerState` retains its identity for styling, while component classes use generated state. The constructor predicate and override resolver run at their original stages. Missing fields, changing getters and explicitly nullable private owner metadata retain the pinned observations; original DialogActions throws for null/undefined owner metadata in its constructor. Ordinary spacing changes use `disableSpacing`.

Supported incoming and descendant class selectors use the existing physical style scope. Participating native descendants receive the rules owned by the row, and Portal ownership follows actual native containment. This also restores selector propagation for the existing CardActions row. Arbitrary browser selector grammar is outside this finite native mechanism.

## Roots, themes and imports

The ref targets a native View. Native View attributes and events are forwarded. Custom native roots must forward props, style, children and their View ref, consuming supplied class and owner metadata before forwarding native props. The existing `component="div"` alias remains supported.

A declared native `as` takes precedence over `component`; an explicitly present undefined `as` selects the default View. A declared complete native theme, including a Material-scoped theme, styles the root locally. Defaults and descendant theme context retain the provider context. Browser roots and HTML refs are outside the native contract.

Use the Material root, `@mui/material/DialogActions`, or the scoped native equivalent. Utility classes and `getDialogActionsUtilityClass` are also available from `DialogActions/dialogActionsClasses`, honoring the canonical class-name generator. The deep component entry is scoped to this component, its types and class helpers. Earlier native previews exported unrelated layout components there; import those components from the Material root or their own paths.

## Verification

The maintained reference producer checks sixteen integrity-verified original observations. Component and strict consumer checks cover defaults, classes, styling, declared roots/refs, explicit undefined values, local themes and class augmentation. The shared action-row regressions exercise incoming and descendant selectors.

The catalog's Layout & surfaces > Dialog actions scene retains one footer and saved counter across spacing, theme, native direction and sizing changes. Native collectors require gaps of 8, 16, 16, 0 and 8, an eight-point logical end inset, whole child containment and vertical centering. Both `sx` and native-style sizing must grow the measured footer, and resetting must restore its baseline height. Expected size changes participate in the settling predicate.

The source passes strict installed-package consumers, both native builds and six DialogActions executions: normal, enlarged and restored/preview on each platform. CardActions also passes six regression executions after restoring its selector scope. Source-map contents and bundle identities remain unchanged across the native runs. Normal and RTL screenshots were reviewed against the pinned original layout rules; this does not establish pixel or font equivalence.

At Android font scale 1.0, the measured footer grows from about 60.2 to 173.7 points through both styling paths and returns to 60.2 points. Enlarged runs establish retained geometry and touch behavior; the fixed-width sample actions truncate their text at the largest iOS category. They do not certify accessible large-text presentation. Native actions retain their larger touch targets than the browser reference.

Complete viewport/custom-root matrices, large-text presentation, physical accessibility usability and optimized release performance remain separate gates. This footer work does not complete Dialog or Modal lifecycle integration. No full MUI compatibility claim is made.
