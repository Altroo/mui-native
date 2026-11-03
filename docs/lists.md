# Native lists

The native material package exports List, ListItem, ListItemButton, ListItemText, ListItemIcon, ListItemAvatar, ListItemSecondaryAction and ListSubheader from its root and original deep import paths. The optional [native resolver](installation.md) maps eligible `@mui/material` imports to those same implementations. These primitives are the shared layout foundation for [MenuItem/MenuList](menu-list.md). Anchored Menu and Select remain subsequent work.

```tsx
import { List, ListItem, ListItemButton, ListItemText, ListSubheader } from '@mui/material';

<List subheader={<ListSubheader disableSticky>Accounts</ListSubheader>}>
  <ListItem disablePadding>
    <ListItemButton selected={selected} onClick={openAccount}>
      <ListItemText primary="Operating account" secondary="Updated today" />
    </ListItemButton>
  </ListItem>
</List>;
```

ListItemButton uses [ButtonBase](button-base.md) and the explicit [native host](native-host.md). Rendering it requires a native development/production build; Expo Go does not contain the host. Static list primitives render ordinary native views/text.

## Density and content

List supplies a density context; ListItem and ListItemButton inherit dense=true even when their own dense prop is false, matching the pinned source. A nested List starts its own density scope. Gutters, padding, divider, alignment, selected/disabled/focus/hover state, native text inheritance and scoped theme overrides apply. ListItemButton resolves applicable ButtonBase defaults, supports native refs/action, link composition and autofocus on mount or a false-to-true autoFocus change. It retains default accessibility metadata and adds native selected state.

ListItemText uses primary unless it is null/undefined, then falls back to children. Zero, empty string and false retain their original content semantics. It uses body2 in dense rows, body1 otherwise and body2/textSecondary for secondary text. Supplied Typography elements are retained; disableTypography leaves application-composed content. Native literal strings still receive a Text host. Text roots shrink and wrap instead of forcing single-line labels. Insets use logical start padding. Direction follows outer list, viewport, owned scroll content, row and resolved button-state styles; inherit uses the containing scope.

Pinned 9.5.0 ListItemIcon uses theme.spacing(4.5), which is 36 dp with default spacing. ListItemAvatar reserves 56 dp and accepts application-owned avatar content; this does not implement the separate Avatar component. Both inherit row alignment and support flex-start offsets. Native interactive rows have a 48-dp minimum, or 36 dp with explicit dense mode, and grow with their content. Applications choosing compact density own suitable touch targets.

## Slots and end actions

ListItem supports root/secondaryAction slots. ListItemText supports root/primary/secondary slots. Slot props accept owner-state callbacks; applicable theme defaults, slot overrides and explicit native styles retain their precedence. Native refs and React 19 callback-ref cleanup compose. Root slots receive native styles, children, events and refs; forward them to the native host. Typography slot replacements must implement the Typography prop contract, typically by composing Typography. Public types include native view/text slot refs and the root slot augmentation interfaces.

A ListItem secondaryAction is a sibling of the row content, rather than a control nested inside ListItemButton. The action is positioned at logical end and vertically centered. Native layout measurements reserve space for naturally sized wide actions, propagate it to composed ListItemButton content and expand row height when needed. Smaller measurements and action removal release the reservation; equal-size layout events do not update state. Percentage dimensions, percentage min/max dimensions and parent-filled opposing edges are excluded from natural-size feedback. Those explicitly parent-sized axes remain application-owned. Forward onLayout from replacement native roots; overriding geometry, clipping or fixed row dimensions can override the automatic fit.

The default minimum end reservation is 48 dp. The measured reservation is at least action width plus its normal end gutter and an 8-dp content gap. disablePadding preserves the pinned padding-free item contract; a composed ListItemButton receives the end reservation. A standalone ListItemSecondaryAction uses the surrounding gutter context. Controls with custom positions or legacy child placement need explicit matching content space.

## Scrolling and sticky subheaders

List defaults to a static View, matching a nonvirtualized list container. For bounded native scrolling, set the native scrollable extension and constrain its viewport:

```tsx
<List scrollable sx={{ maxHeight: 320 }} subheader={<ListSubheader>Accounts</ListSubheader>}>
  {rows.map((row) => (
    <ListItem key={row.id}>
      <ListItemText primary={row.name} secondary={row.description} />
    </ListItem>
  ))}
</List>
```

The owned ScrollView moves list padding/layout into contentContainerStyle and keeps viewport sizing on the scroll host. Direct ListSubheader children, including keyed fragments, produce stickyHeaderIndices unless disableSticky is true. Prefix text and subheader insertion retain correct indices and keyed row identity. scrollViewProps can set native options, content styles or explicit sticky indices; handled keyboard taps are the default. React Native does not support sticky headers with horizontal=true: the list clears those indices and reports that unsupported combination.

Wrapped/custom subheader components and external scroll hosts own their native stickyHeaderIndices. component and replacement roots must implement their selected host contract; scrollable custom roots must honor ScrollView props and content/viewport style separation. Large datasets need an application-owned virtualized renderer; this List does not create a FlashList or recycle rows. Native sticky geometry, nested scrolling and accessibility still require platform interaction evidence.

## Evidence and boundaries

`node scripts/reference/lists.mjs --check` reproduces the checked-in composition fixtures against integrity-verified original MUI 9.5.0 after the [isolated reference setup](theming.md). Native tests cover those owner states/Typography choices, default composition, slots/ref cleanup, scrolling/indexing/identity, measurement feedback, logical action layout and ButtonBase states. Installed-consumer checks cover root/deep imports, native refs, slot augmentation and invalid browser contracts.

These are finite runtime/type contracts. Browser classes, arbitrary descendant CSS, DOM refs, full upstream list generics/utilities and custom-slot ownerState forwarding beyond the declared callbacks, Menu/Select behavior and physical native visual/keyboard/screen-reader/RTL/font-scale/performance gates remain open. No screenshot, release-performance or complete upstream package-support claim follows from mocked layout tests.
