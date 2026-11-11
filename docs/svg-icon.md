# Native SvgIcon and icon factories

This implementation is included in `0.0.8-prealpha.0`. Material `SvgIcon`, its class helpers and `createSvgIcon` share the existing native SVG renderer. The [full pinned catalog of 10,750 glyphs](material-icons.md) uses that same implementation. Artwork/import completion does not close the renderer gates below.

```tsx
import SvgIcon, { createSvgIcon } from '@mui/material/SvgIcon';

const Parcel = createSvgIcon(<path d="M4 4h16v16H4z" />, 'Parcel');

<Parcel color="primary" fontSize="small" titleAccess="Parcel" />;
<SvgIcon sx={{ fontSize: 32, fill: 'none', stroke: 'currentColor' }}>
  <circle cx="12" cy="12" r="9" />
</SvgIcon>;
```

Registered Metro routing accepts the original Material root/deep imports, `SvgIcon/svgIconClasses`, `SvgIcon/createSvgIcon`, `utils` and the legacy `utils/createSvgIcon` entry. Direct imports from `@altroo/mui-native` use the same instances. Web continues to use original MUI. Starting with `0.0.8-prealpha.0`, Material requires `react-native-svg` as a peer; install it directly in the application and rebuild if it is not already in the binary. See [installation](installation.md).

## Geometry and native refs

Known authored SVG element names, fragments and native `react-native-svg` elements become real native geometry. Custom components stay opaque and run through React normally; they must return native SVG nodes. Unsupported browser elements fail with a native-specific message. Arbitrary HTML inside `foreignObject`, browser stylesheets and animation elements need native equivalents. Child title, desc and metadata nodes are omitted. Supply titleAccess or explicit ARIA naming for native accessibility.

The default ref is the actual SVG instance, including measurement and PNG-export methods. A custom native root receives the SVG props and forwarded ref; its type retains required custom props and its actual ref type. DOM element refs and HTML root strings are rejected. The `svg` root alias selects the native SVG renderer.

A single authored or native SVG child contributes its own props and children to the root. Its viewBox, presentation values, style, sx and ref replace corresponding authored values, including explicitly present undefined values. `inheritViewBox` omits the wrapper's viewBox so a custom root can supply it. It does not add another SVG root.

## Theme, sizing and paint

Default dimensions follow Material's font sizes: small 20, medium 24 and large 35 before theme scaling. `inherit` uses a tracked text/SVG context. Native control icon-size scopes remain available, and explicit native inline sizing wins over them.

Theme defaults, named root/color/size overrides, component variants and sx compose through the shared styling engine. Named overrides inspect wrapper owner state. Object variants can match either final SVG-child props or owner state, in source declaration order; function variants and styles receive merged state, ownerState and theme. Native style applies last. Browser utility identifiers remain available for interoperation; arbitrary CSS class rules do not style native nodes.

Material CSS dimensions and paint rules outrank SVG presentation attributes. Set dimensions with sx or native style; width/height attributes alone do not replace the default 1em dimensions. `htmlColor` supplies a presentation color below CSS rules. Explicit inherit/unset/currentColor color rules resolve through the tracked parent. Paint retains symbolic currentColor so SVG descendants can change their own color. Native SVG paint declarations are kept out of native View styles.

MUI's `htmlFontSize` calibrates pxToRem and does not change the document root font. Native rem units default to 16 dp; the native `cssRootFontSize` extension represents an explicitly changed web root. See [typography](typography.md). Opaque third-party containers require explicit sizing/color or a participating native text scope.

## Factories and interaction

Material `createSvgIcon` accepts a React node, memoizes the icon and forwards refs. Factory children stay fixed while caller props and development test IDs remain overridable. The icon package also retains its early path-string extension, converting that string into a native Path before using the shared factory.

Native onPress is the touch equivalent of the inherited onClick handler and wins when both are provided. SvgIcon remains nonfocusable by default; use IconButton when an icon represents a button action. DOM mouse-event objects are replaced by native touch events.

`titleAccess` maps to native naming and image-role props. Decorative icons are hidden from the accessibility tree by default; explicit ARIA/native accessibility props remain available. Property mapping does not certify VoiceOver/TalkBack behavior.

## Evidence and remaining gates

The [pinned source record](../upstream/svg-icon.json) identifies MIT Material UI 9.5.0 and the shared styled-variant reference. Fifty-three original-browser observations cover settled dimensions, colors, wrapped-child priority, naming, factories, callbacks, variants and root identity. Each reference case mounts independently so a transition from the preceding case cannot contaminate its result. The [native regression suite](../tests/svg-icon.test.tsx) and [installed-consumer fixture](../fixtures/native-consumer/svg-icon.tsx) exercise the translated contracts and native type boundaries.

Prepare the original browser fixture with `node scripts/reference/svg-icon.mjs prepare`. Serve `.cache/svg-icon-reference` on localhost, capture its observations and metadata, then pass the saved JSON to `node scripts/reference/svg-icon.mjs record FILE`. The recorder rejects stale metadata. Original MUI stays in the isolated reference environment.

The catalog's Icons scene exercises existing/custom glyphs, three sizes, live palette changes, native measurement and PNG export. The Android API37 scenario passes seven ordered stages with ten native bounds/paint/font samples and three screenshots. Its actual rendered colors follow group currentColor and primary/error changes; measured font ink grows from 39 × 23 to 95 × 57 pixels. These are emulator pixels, not timing measurements. The existing iPhone18Pro/iOS27 simulator passes its native interaction/ref/size case with three screenshots; both font samples are visibly distinct. Both platforms exercise one original onClick activation and actual SVG measurement/PNG export. See [reproduction](native-catalog-testing.md#svg-icons-and-factories). CSS fill transitions, browser shape-rendering hints, complete inherited DOM contracts, physical accessibility/font/RTL matrices and calibrated release performance remain open. The shape-rendering hint is accepted without a native rasterization effect. These checks do not establish full MUI compatibility or verified-alpha readiness.
