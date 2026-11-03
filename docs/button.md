# Native Button and IconButton

Button and IconButton compose the shared native ButtonBase interaction host. Original package-root and component imports resolve to the same implementations through the native resolver; web continues using original MUI. Both controls require the native host in a development/production build. Expo Go does not include it. See [installation](installation.md) and [ButtonBase](button-base.md).

```tsx
import { Button, IconButton } from '@mui/material';

<Button loading={saving} loadingPosition="end" onClick={saveInvoice}>
  Save invoice
</Button>;
<IconButton aria-label="Delete invoice" disabled={saving} onClick={deleteInvoice}>
  {deleteIcon}
</IconButton>;
```

## Native interaction and refs

Pointer/touch activation, Enter on key down, Space on key up, focus-visible actions, disabled handling and native link/custom-root forwarding use ButtonBase. onPress is the native alias and takes precedence over onClick when both are supplied. Keyboard callbacks use ButtonBaseKeyEvent; composing, canceled, descendant and retained disabled/unmounted activation paths are guarded. Enter and Space retain the pinned ButtonBase cancellation policy, described in its guide. Physical hardware-key, focus-engine and touch-feedback behavior remains unverified.

The forwarded ref is a native ViewInstance. action receives ButtonBaseActions with focusVisible(). disableFocusRipple controls the native focus indication; disableRipple and disableTouchRipple retain the ButtonBase native behavior. autoFocus waits for parent presentation/readiness and overlay ownership. Enabling it after mount focuses an idle control without taking focus from an already focused native input or button.

Activation events retain their native gesture or hardware-key provenance. They are not DOM MouseEvents. Narrow the native payload before using gesture-only fields:

```tsx
<Button
  onClick={(event) => {
    if ('pageX' in event.nativeEvent) console.log(event.nativeEvent.pageX);
  }}
>
  Position
</Button>
```

href uses ButtonBase's native URL opening unless a native LinkComponent/custom root owns navigation. Preventing the activation default cancels owned opening. to requires an application-owned native link component. Custom component roots must forward native interaction props, accessibility, style and the ViewInstance ref. ButtonProps<typeof NativeRoot> and IconButtonProps<typeof NativeRoot> check required custom props and require an explicit component. DOM root strings, browser refs/form submission and complete arbitrary DOM polymorphism are not implemented.

## Loading and content

loading=true disables activation and exposes native disabled/busy state. Button supports center, start and end positions. Center hides the label/icons while preserving their layout; side positions replace the matching icon with a native indicator while preserving its space. Without an icon, a placeholder reserves that space. Boolean and empty icon values do not add native layout slots. The indicator stays aligned with its icon even on a full-width control. Stateful label/icon content remains mounted during loading changes. Boolean loading retains an empty native wrapper when idle; null/omitted loading does not request that wrapper. Native wrappers do not implement browser translation behavior.

IconButton has its own API and defaults: color=default uses the theme action color, size=medium, edge=false and one centered loading indicator. It does not inherit MuiButton defaults, variant styling or loadingPosition. Its content remains mounted while the indicator replaces its visible appearance. Normal and small controls retain at least a 44 dp touch target; large content can grow naturally. edge=start/end uses native logical margins, with size-specific offsets.

The default ActivityIndicator has a progress role and uses the explicit aria-label/accessibilityLabel or fully readable literal/native-text content. Opaque custom content leaves the button's name to native descendant discovery; provide an explicit label for icon-only or complex controls. A custom loadingIndicator should have its own accessible progress role and name. Named indicator color styles reach both the default spinner and custom inheriting text/icon content. Actual VoiceOver/TalkBack announcements remain a device gate.

Literal text and known text roots keep a native Text label. Rich or opaque native content uses a view boundary so native Views are not placed under Text. Typography root defaults, including scoped DefaultPropsProvider defaults, participate in that choice. Relative typography provenance survives state callbacks and nested library text; explicit native styles keep their native units.

## Themes, types and imports

MuiButton and MuiIconButton resolve their own defaults, root overrides/variants and supported sx states. Button also resolves its variant, size, colorInherit, disableElevation, fullWidth and loading overrides, plus startIcon/endIcon, their loading overrides, loadingIconPlaceholder and loadingIndicator. IconButton resolves loading, color, edge, size and loadingIndicator. Native style arrays/callbacks win after component overrides, including padding shorthands. Style callbacks receive ButtonBaseState with pressed, disabled and focusVisible. DefaultPropsProvider merging and native ButtonBase defaults retain their established precedence.

The original loadingWrapper is a plain wrapper, so it has a class identifier but no named styled resolver here. CSS className/classes identify slots only and issue a native diagnostic; arbitrary CSS, descendant selectors and programmable browser ripples are not implemented. Root/icon/indicator scopes remain distinct.

ButtonPropsVariantOverrides, ButtonPropsColorOverrides, ButtonPropsSizeOverrides and the corresponding IconButton color/size interfaces are available for module augmentation. Custom colors need a native palette entry; custom variants/sizes need matching theme styles. The complete upstream TypeMap/DOM overload family and ButtonGroup composition remain open.

buttonClasses/getButtonUtilityClass and iconButtonClasses/getIconButtonUtilityClass are available from the package root, component subpaths and the original Button/buttonClasses and IconButton/iconButtonClasses paths. Helpers preserve original identifiers and do not implement CSS styling.

## Evidence and remaining gates

The source-verified original-runtime probe executes 28 MUI 9.5.0 wrapper/default/loading cases and the actual class helpers. Run `node scripts/reference/buttons.mjs --check` with the cached reference environment. Native tests exercise the real library with modeled nodes/events; clean archives verify native events, refs, augmentation, custom-root props and root/deep identity. See [validation](validation.md) and [issue #33](https://github.com/Altroo/mui-native/issues/33).

Native platform backend/schema bytes are unchanged by this JavaScript/TypeScript increment. Prior native host compile/link evidence remains scoped to those same backend bytes. Hardware input/IME, native focus engines, nested-window behavior, native ripple/hover feedback, screen-reader announcements, RTL/font scaling, visual layout, stability and calibrated release-build performance remain open. No complete Button/Material compatibility, alpha readiness, npm publication or paid feature parity is implied.
