# Native Grow

Grow is a reusable native opacity/scale transition through @mui/material/Grow or the root @mui/material import. It supplies the default transition for [native Popover](popover.md); Menu and Select remain separate implementation work. It adds no native wrapper.

```tsx
import Grow from '@mui/material/Grow';
import { Paper, Typography } from '@mui/material';

<Grow in={open} timeout="auto" style={{ transformOrigin: 'top left' }}>
  <Paper elevation={8}>
    <Typography>Available actions</Typography>
  </Paper>
</Grow>;
```

## Lifecycle and automatic timing

Grow supports appear/enter/exit, mountOnEnter/unmountOnExit, native refs, the six callbacks, addEndListener, easing, reduced motion and numeric/per-phase timeouts. It defaults to appear=true and timeout='auto'. Enter callbacks receive (nativeView, isAppearing); exit callbacks receive nativeView. The public muiSupportAuto=true marker allows a consuming transition slot to negotiate automatic duration.

For automatic timing, Grow reads the native view's untransformed clientHeight once at the start of each phase, then calls theme.transitions.getAutoHeightDuration. This public geometry getter is available in the pinned React Native 0.88 baseline. A transformed bounding rectangle is not used. Changes in height during an active phase affect the next phase rather than restarting the current deadline.

When a custom handle lacks usable clientHeight, Grow can use its most recent onLayout height for that same native node. A weak-key cache survives a transient callback-ref detach without retaining discarded nodes. An unavailable measurement emits transition-height and uses zero; forward the actual native view for the normal geometry path. The fallback is the reported native layout height, so a custom outer box can differ from CSS clientHeight. Initial native geometry and border/inset behavior still need device validation.

For numeric timeouts, timeout.appear controls initial completion while timeout.enter controls its animation. Authored completion deadlines remain separate from CSS-style/factory animation timing. Listener and timer completion race once; stale completions cannot finish a later cycle. Grow does not read MuiGrow component defaults, following the pinned original implementation.

## Opacity and scale

The hidden scale is 0.75 horizontally and 0.5625 vertically. Opacity and scale use separate native-driver animations with isInteraction=false. Scale interpolation nodes are reused across renders. Finished/closed surfaces release their active driver state; hidden children retain layout, reject hit testing and leave native accessibility exposure. unmountOnExit removes them.

The pinned timing rules are preserved:

- Opacity uses the full duration and theme default easing. Grow easing configures the transform transition.
- Numeric transform duration is duration \* 0.666. A string duration retains its full value.
- Exit transform delay uses an authored truthy delay, otherwise duration \* 0.333 for numbers or the full string duration. Numeric zero and the string '0ms' therefore differ.
- Auto timing replaces style.transitionDuration with the measured-height duration. Style delay/easing still apply.

Both timings pass through theme.transitions.create and the bounded native timing parser described in [transitions](transitions.md). Transform origin and visible caller/child style precedence are forwarded through native styles. Explicit opacity/transform overrides can replace the owned animation. Full CSS execution is not implied.

Reduced motion skips geometry calculation and both animation drivers. System preference observation is shared with Fade and floating labels. Enabling reduced motion during a phase stops both drivers, snaps the current target and completes once. disablePrefersReducedMotion opts out. The theme's pinned default remains motion.reducedMotion='never'; choose 'system' to follow the OS.

## Safety and evidence

Fade and Grow share a private native surface and lifecycle engine. Interrupted/unmounted generations cannot settle a reopened transition. A current native cancellation, such as detaching an animated style when an authored override appears, settles owned values while retaining the authored lifecycle deadline. Child keys remain on the animated component, so changing a key remounts child state as ordinary React code expects. Native caller/child refs remain composed.

Run node scripts/reference/grow.mjs --check after the [isolated reference setup](theming.md), with the matching react-test-renderer@19.3.0 installed only in that ignored cache. Fourteen original Material UI 9.5.0 cases compare geometry reads, height calculations, exact factory arguments/output and callback/mounting traces. Tarball integrity, selected source bytes and MIT license identity are checked before execution. Twenty-nine native cases include those reference comparisons and native-driver configuration, initial scale, origin forwarding, cancellation, refs/keys, reduced motion and cleanup. A fresh installed consumer checks root/deep imports, public props refs, the auto marker and Modal composition.

These tests use mocked native nodes, geometry, timers and animation drivers. They establish no physical window/layout result, frame pacing, screen-reader workflow or release-performance certification. Full TransitionGroup/CSS behavior, remaining transitions, physical Popover geometry and Menu/Select remain open. No paid source, runtime dependency or npm publication is included, and no complete upstream package support is promoted.
