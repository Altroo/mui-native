# Native ListItemIcon

ListItemIcon is the existing one-root icon wrapper from pinned MIT Material UI 9.5.0. It reserves theme spacing, supplies the action foreground, and follows its nearest row alignment. It preserves caller-owned Icon, SvgIcon, text and custom content; it does not implement those separate components.

This page describes development work after `0.0.7-prealpha.0`. Source and type checks do not update the published package or certify native geometry, accessibility or optimized performance.

```tsx
import { ListItem, ListItemIcon, ListItemText } from '@mui/material';
import Notifications from '@mui/icons-material/NotificationsNoneRounded';
import { listItemIconClasses as classes } from '@mui/material/ListItemIcon';

<ListItem alignItems="flex-start">
  <ListItemIcon sx={{ [`&.${classes.alignItemsFlexStart}`]: { marginTop: '12px' } }}>
    <Notifications />
  </ListItemIcon>
  <ListItemText
    primary="Shipment notifications"
    secondary="Receive an update when your order leaves the warehouse."
  />
</ListItem>;
```

The existing native compatibility configuration routes canonical MUI imports to native packages. Web continues to use original MUI. Prefer individual icon imports to the full catalog barrel.

## Wrapper contract

| Surface            | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base style         | `minWidth: theme.spacing(4.5)`, action.active foreground and flexShrink: 0. The default reservation is 36 authored units with the default spacing scale. A flex-start row adds marginTop: 8. Native View row flow preserves the source inline-flex default for multiple children. Authored sx or native style can request a column; browser inline formatting outside flex rows is not introduced.                                                                                                              |
| Context/defaults   | MuiListItemIcon defaults use the shared provider. Alignment comes from the nearest ListItem/ListItemButton; a List alone does not invent alignment. Changes retain the same native host and caller child state. Prepared outer CSS is separated before default resolution: absent/undefined native style can select the default, explicit null suppresses it, and genuine style values reach ownerState callbacks without generated arrays. The original styled sx consumption policy is retained.              |
| classes/className  | root and alignItemsFlexStart compose with authored slot classes and className in source order. Active class accessors retain source truthiness-then-append reads. ClassName whitespace is preserved in custom-root metadata. Tokens participate in finite self selectors; native View receives no CSS-only props. External stylesheets are not rendered.                                                                                                                                                        |
| Styling            | Root and active alignment overrides precede component variants and sx. Shared specificity still applies. Prepared styled wrappers rebind to final contextual classes without replaying their callbacks. Genuine native inline layers are last; border, flex, gap and inset resets use the existing root merge policy. Native arrays retain their own edge precedence.                                                                                                                                           |
| Text/content       | Literal runs receive Text hosts, including zero and bigint. Authored children, keys, types, refs and state are preserved. Typography and direct participating Text/View content inherit color and CSS metric provenance. A CSS unitless line-height remains a ratio for smaller descendants; literal native lineHeight remains absolute.                                                                                                                                                                        |
| Native root/events | The stock host is View. Native inherited attributes, accessibility aliases and all declared View event signatures pass to the selected root without adding activation, focus, selection or grouping semantics. Events keep their callback, event object and return value. A supplied ref addresses that root and retains React 19 callback cleanup. Native component replacement is an additive extension and must implement View style, child and ref ownership; it also receives computed className metadata. |
| Imports/types      | Root and canonical component-deep imports share implementation, classes and helper identities. Props, mergeable Classes and ClassKey preserve source optional values and augmentation. Native OwnProps/RootProps remain additive. The declared non-null JSX.Element return matches the original declaration while retaining the existing native forward-ref metadata. No browser TypeMap, slots/slotProps or string-root API is invented.                                                                       |
| Utility lookup     | The class object contains exactly the original two runtime slots. The arbitrary-string utility helper preserves MUI global state names and ordinary Object.prototype lookup semantics. Class-interface augmentation changes types, not the runtime slot table. The pinned package does not export its internal class-helper subpath; import named helpers from the canonical component entry.                                                                                                                   |

DOM attributes, browser refs/events, external CSS, browser inline formatting and document selection/clipboard APIs are not native View contracts. Inherited events only become available when the selected platform/root can dispatch them. Development-only browser PropTypes validators are not copied.

Opaque custom components returning raw Text cannot gain CSS inheritance through a native View automatically. Use Typography variant="inherit", an explicit native text scope or authored Text styles inside that component. Moving into a Portal follows its physical destination text policy; this wrapper does not inspect arbitrary component internals or intercept their refs.

## Existing MenuItem integration

The native MenuItem integration retains its 36-unit icon reservation. Its dense SVG scope follows the original executed `1.25rem` rule: 20 authored units with the default 16-unit CSS root, or 30 with a 24-unit CSS root. Operating-system fontScale is not multiplied into vector dimensions in JavaScript; a genuine native SVG inline font size remains last. Those styles belong to the parent menu adapter, separately from the wrapper's own theme spacing and action foreground. Existing menu tests protect that baseline and inherited icon scope.

Arbitrary supported parent MenuItem descendant override priority remains required software work in the MenuItem/shared styling scope. This wrapper increment does not mark those dependencies complete. Shared SvgIcon painting and the full List/Menu families also retain their separate status.

## Reproduction

After the existing [isolated original-reference setup](theming.md):

```sh
node scripts/reference/list-item-icon.mjs --check
node_modules/.bin/jest --runInBand tests/list-item-icon.test.tsx tests/list-item-icon-catalog.test.tsx tests/list-item-icon-styled-defaults.test.tsx tests/list-item-icon-dense.test.tsx tests/list-item-icon-layout.test.tsx tests/native-styled-root-props.test.tsx tests/lists.test.tsx tests/menu-list.test.tsx tests/material-text-roots.test.tsx
node scripts/reference/check-list-item-icon-consumer.mjs
node --test packages/compat/list-item-icon.test.cjs
```

The reference checks source archive integrity, MIT license hashes and exact executed files, then retains 13 original wrapper/context/default/class observations, CSS declarations, public root/canonical identities and 28 utility identifiers, plus 12 executed styled/default-prop observations covering absent/undefined/null/own values, nested wrappers and merged defaults. It also retains the actual dense MenuItem SVG CSS declaration; native vector-context tests separately check CSS-root conversion and unscaled authored dimensions. Original React DOM static rendering establishes these source observations; it does not establish native or browser geometry.

The strict consumer compiles emitted declarations, including every native attribute/event key, typed native/custom refs, class augmentation, exact optional undefined, canonical/direct native imports and the original JSX return declaration. It separately compiles the unchanged source-compatible fixture through the original published package exports. Fresh installed archive checks and full-project validation remain integration gates.

## Pending native evidence

`ListItemIconContractExample` is available from the catalog Wrappers tab through Icon. It exposes stock/custom roots, live alignment and spacing/color changes, a persistent caller-owned count, existing dense menu content and guarded onLayout receipts. Its unit test checks update behavior and duplicate receipt handling, without claiming native measurements.

Locally executable iOS/Android checks still need to measure reservation and flex-start offset, compare caller icon/text alignment, exercise native event dispatch/ref measurement, inspect accessibility ownership, and repeat under actual LTR/RTL and baseline/enlarged OS text profiles. Portal placement and an optimized mount/update workload require maintained native evidence. Physical VoiceOver/TalkBack traversal, representative hardware performance and physical keyboard behavior remain external gates.

No component, List/Menu family or package is marked 100% by this source/type increment.
