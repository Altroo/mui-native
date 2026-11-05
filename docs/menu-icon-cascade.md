# MenuItem icon styling

This development increment after `0.0.7-prealpha.0` applies pinned MIT Material UI 9.5.0 MenuItem descendant CSS to the existing native ListItemIcon and SvgIcon adapters. It does not publish a version or complete the separate MenuItem, SvgIcon, accessibility, device or optimized-performance gates.

```tsx
import { MenuList, MenuItem, ListItemIcon } from '@mui/material';
import Notifications from '@mui/icons-material/NotificationsNoneRounded';

<MenuList dense>
  <MenuItem
    sx={{
      '& .MuiListItemIcon-root': { minWidth: 40 },
      '& .MuiListItemIcon-root svg': { fontSize: '22px' },
    }}
  >
    <ListItemIcon>
      <Notifications />
    </ListItemIcon>
    Notifications
  </MenuItem>
</MenuList>;
```

Use the existing native compatibility configuration for these canonical imports. Web retains original MUI. Direct native imports use `@altroo/mui-native` and the corresponding scoped icon deep import.

## Cascade

MenuItem's default descendant rule reserves 36 authored units for ListItemIcon. Dense MenuItem supplies the original `1.25rem` SVG rule. Its conversion uses the configured authored CSS root, including a nondefault root; JavaScript does not multiply operating-system fontScale into vector geometry.

Parent base declarations, theme overrides, matching theme variants and `sx` remain CSS sheets. They join the child adapter's CSS in one specificity cascade. A parent descendant class selector outranks a child's plain root `sx`; a stronger child class selector can win. Equal class counts compare tag counts, then retained sheet order. Genuine native `style`, including registered/nested arrays and state-callback results, applies after CSS. A native parent style does not become descendant CSS.

The participating finite selector grammar supports root class compounds, whitespace descendant chains of class compounds, the known standard SVG root tag, comma-separated supported selectors, nested selectors and the existing media conditions. Active authored Icon/SvgIcon classes participate. MenuItem uses its actual root/state tokens: inherited dense behavior does not invent an authored `MuiMenuItem-dense` token. Unsupported DOM selectors still diagnose; this is not an arbitrary browser selector engine. Raw native wrapper classes and the physical tag produced by an opaque custom SVG component are not inferred.

## Physical ownership

The implementation reuses the existing native style ancestry registry and Portal boundary mapping. It adds no native wrapper host and does not clone caller children. MenuItem, ListItemIcon and existing ButtonGroup roots expose participating class metadata; SvgIcon supplies the standard SVG leaf metadata.

A default window Portal leaves its logical MenuItem's descendant CSS. A custom Portal destination receives rules from its actual physical ancestors, including a sibling menu destination. `disablePortal` retains ordinary inline ancestry. A same-destination CSS update preserves mounted content state; changing the actual Portal container retains Portal's existing remount semantics. Root replacement, class/sheet updates and cleanup publish through the same registry.

Prepared root sheets retain their owning theme, media width and selector context. They evaluate owning callbacks before descendant matching, rather than once per Icon/SVG. Stateful native style callbacks remain separate and execute only with the actual supplied host state. Menu and ButtonBase defaults resolve against genuine props before the CSS carrier is restored around their final native style, so merged callbacks and native layers are not repeated. The final resolved native direction also reaches the nested List context. The pure default-props provider and merge policy are unchanged.

## Evidence and remaining gates

Run `node scripts/reference/menu-icon-cascade.mjs --check` against the existing pinned reference cache. The retained fixture verifies original source bytes against the published archive and MIT license, executes original React DOM rendering, and records emitted CSS, static/default owner observations and an independent finite specificity comparison. The source reader is not a browser used-style or layout engine. Its `rem` arithmetic uses the declared document root size.

Focused native-renderer tests compare the same finite cases and cover custom class paths, parent state guards, callback counts, native inline priority, nested participating roots, live equal-specificity rule reordering, Portal destinations, same-destination state, root replacement and React 19 ref cleanup. The emitted System declarations retain the System-to-Material isolation guard; strict consumers verify callback arguments and the full StyleProp carrier type.

Actual browser used styles, native device geometry/paint/accessibility, optimized workloads and final IDE/delivery validation remain separate gates. Shared Emotion cache insertion-history parity remains open; this increment does not claim every browser cache history or the full List/Menu families.
