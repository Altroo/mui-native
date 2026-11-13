# Native LinearProgress

The source build replaces the earlier spinner prototype with native horizontal bars and an SVG buffer pattern. It follows the pinned MIT Material UI 9.5.0 component contract. Published previews keep their earlier implementation until a future release. Scoped native validation passes on iOS and Android at normal, enlarged and restored text sizes. This guide does not claim complete compatibility.

```tsx
import LinearProgress from '@mui/material/LinearProgress';

<LinearProgress aria-label="Loading results" />;
<LinearProgress variant="determinate" value={75} aria-label="Uploaded" />;
<LinearProgress variant="buffer" value={35} valueBuffer={85} />;
<LinearProgress variant="query" />;
<LinearProgress variant="determinate" min={20} max={80} value={65} />;
```

## Variants and values

`indeterminate` uses two traveling bars. `query` rotates the same loading presentation by 180 degrees. `determinate` renders one bar. `buffer` combines a foreground value, a second buffered value and a dotted background.

The default range is zero to 100. Supply `value` for determinate and buffer progress, and `valueBuffer` for buffer progress. Unlike the old prototype, the source component does not silently supply a missing value or clamp authored values. Invalid ranges and missing values retain the original diagnostics. Nonfinite or impossible numeric accessibility ranges are withheld from the native accessibility API.

The default track height is four native points. Root `sx`, native `style`, theme defaults, variants and named overrides keep their source preparation order. Standard palette colors, declared custom colors and `inherit` are supported. Track shades use the original light/dark calculations. Explicit System `RtlProvider` direction controls determinate and buffer translation independently of a root-local styling theme.

## Motion and accessibility

Traveling bars use the original 2.1-second keyframes. The second bar starts after a single 1.15-second delay. The buffer pattern uses the original three-second opacity and translation cycle. Animated transforms and opacity run on native drivers with no JavaScript frame listeners.

Theme motion policy supports `never`, `always` and the OS preference through `system`. Reduced motion presents a static first loading bar and hides its second bar. OS preference and viewport updates do not reexecute user override, variant or `sx` callbacks. Determinate and buffer value updates use the supported theme transition-factory timing.

The outer root has a real native `ViewInstance` ref. It retains its identity through value, range, direction, motion and theme changes. Numeric accessibility exposes the supplied custom bounds. On the pinned iOS peer, relative localized percentage text corrects the peer's calculation for a nonzero minimum; explicit authored announcement text takes precedence. Give loading indicators an accessible label and identify the region whose work they describe.

## Imports and customization

```tsx
import LinearProgress, {
  linearProgressClasses,
  getLinearProgressUtilityClass,
  type LinearProgressProps,
} from '@mui/material/LinearProgress';
import classes from '@mui/material/LinearProgress/linearProgressClasses';
```

The eleven captured class keys match the original runtime vocabulary. `MuiLinearProgress` theme defaults, `styleOverrides`, variants and color/variant/class module augmentation are available to installed TypeScript consumers. Generated bars own their children; root `children` and a polymorphic `component` are not public source APIs.

The scoped entry previously reexported unrelated feedback components by accident. Import those components from their own documented entries or the package root. The root ref is a native host, not an HTML span. Browser builds continue using original MUI through the compatibility resolver.

## Validation and remaining gates

Source fixtures compare original defaults, four styled stages, callback ordering and genuine generated children, classes, colors, ranges, diagnostics and RTL context precedence. Strict installed consumers exercise import paths, exact optional props, augmentation and negative type cases. The native catalog includes range, RTL, light/dark and reduced-motion controls for visual verification.

Normal, enlarged and restored iOS/Android interaction and actual pixel comparisons pass across six profiles and 90 screenshots. The checks compare native progress fractions and RTL orientation with original MUI rendering, require the centered static 40% loading bar in reduced motion, and verify active buffer dots and retained roots. Native canvas assertions reject stale SVG rectangle geometry after layout. See the [native test procedure](native-catalog-testing.md#linearprogress-rendering). Physical VoiceOver/TalkBack checks, broader device/theme coverage and optimized release performance remain independent gates.

The shared native styling engine still has gaps for arbitrary CSS animations, full CSS-variable providers, custom gradients and general matrix/perspective or percentage transform composition. Static numeric/angle transform strings are retained for bar overrides; the source's inline determinate translation still takes precedence. Native bars use transform-based sizing for animation rather than browser left/right layout. Arbitrary decorations whose geometry depends on changing browser box width need separate verification. These limitations must remain explicit rather than being counted as complete CSS compatibility.
