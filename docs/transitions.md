# Native Fade, Grow and transition timing

Fade renders one ref-forwarding native child and animates its opacity with React Native Animated's native driver. It adds no native wrapper. Original root/deep imports work through the opt-in native resolver; web keeps original MUI.

```tsx
import { View, Text } from 'react-native';
import Fade from '@mui/material/Fade';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  motion: { reducedMotion: 'system' },
  transitions: { duration: { enteringScreen: 180, leavingScreen: 140 } },
});

<ThemeProvider theme={theme}>
  <Fade in={visible} timeout={{ enter: 180, exit: 140 }} unmountOnExit>
    <View>
      <Text>Saved changes</Text>
    </View>
  </Fade>
</ThemeProvider>;
```

## Lifecycle and refs

The implemented subset includes appear, enter, exit, mountOnEnter, unmountOnExit, numeric/per-phase timeout, easing, addEndListener, the six transition callbacks and disablePrefersReducedMotion. Fade defaults to appear=true. An initial in=true/appear=false child is entered immediately without enter callbacks. enter=false skips later enter phases, while an initial appear still runs. exit=false skips the intermediate exit callbacks.

Enter callbacks receive (nativeView, isAppearing); exit callbacks receive nativeView. addEndListener receives (nativeView, done). The child and forwarded Fade refs reach the same native view. A child must forward a usable native ref. Browser nodes and fragments are not transition targets.

An authored timeout remains the lifecycle fallback even when style timing or a custom theme factory changes the animation duration. For an appearing child, timeout.appear controls completion and timeout.enter controls opacity animation, following the pinned upstream contract. Listener and timeout completion race exactly once. Reversing direction or unmounting invalidates old completions and stops obsolete native animations. Changing a callback during an active phase uses the current callback without restarting its deadline.

Closed Fade children retain layout and become transparent, noninteractive and hidden from native accessibility. Use unmountOnExit to remove them. Child styles take precedence over Fade styles during visible phases. Native Pressable style callbacks are supported; an authored child opacity can replace animated opacity, as upstream child styles can replace Fade styles.

## Theme helpers and reduced motion

Theme transitions contains easing, duration, create and getAutoHeightDuration. Partial duration/easing overrides, numeric/string CSS timing generation and the pinned automatic-height calculation are covered. These helpers are also available from @mui/material/styles/createTransitions. Motion configuration and types are available from @mui/material/styles/createMotion. Transition types are available from @mui/material/transitions and @mui/material/transitions/types.

The pinned MUI 9.5.0 motion default is reducedMotion='never'. Set 'system' to follow AccessibilityInfo or 'always' to suppress owned motion. disablePrefersReducedMotion opts a Fade out. System observers are shared with native floating labels, removed after the last subscriber, and protected against stale asynchronous reads. While the native system preference is unresolved, motion is suppressed. Enabling reduced motion during an active phase stops motion and completes the phase promptly; this native behavior extends upstream's phase-start preference capture.

Floating labels now use theme.transitions.duration.shorter/easing.easeOut and this motion policy. Applications that relied on the earlier native prototype always following the OS must set motion.reducedMotion='system'. The catalog sets that policy explicitly.

Fade calls theme.transitions.create('opacity', timing). Native execution understands canonical opacity/all duration easing optional-delay clauses with nonnegative ms/s times, linear/ease/ease-in/ease-out/ease-in-out or cubic-bezier easing, plus 'none'. Unsupported CSS produces a diagnostic and uses the explicit native timing fallback. This is a bounded translation of timing, not arbitrary CSS execution. Fade style transitionDuration/transitionTimingFunction/transitionDelay configure native timing and are removed from the native style payload.

## Dialog and Backdrop

Dialog now uses Fade as slots.transition; Backdrop supports root and transition slots. Both accept transitionDuration and object/callback transition slotProps. Modal closeAfterTransition retains a Dialog until its matching exit callback. Default Dialog/Backdrop timings follow the current theme. Per-slot props can replace the transition's in/timeout/callback values, following upstream slot precedence; custom transitions must forward refs and deliver their lifecycle callbacks.

Dialog's native window animation now defaults to 'none' because its content and backdrop animate through Fade. This avoids two animation systems running together. An explicit nativeModalProps.animationType still wins. Root/container/paper styles remain scoped; native keyboard avoidance remains in the default container. Existing root/paper migration guidance is in [native modals](modals.md).

## Validation and open work

Run node scripts/reference/transitions.mjs --check after the [isolated reference setup](theming.md), with react-test-renderer@19.3.0 installed only in that ignored reference cache. The script verifies the pinned tarball, selected source bytes and license before executing four theme, three helper, four motion and ten original Fade lifecycle cases. Original lifecycle cases use a mock host ref and timer clock; they do not execute browser layout or CSS. Native tests compare those traces and add native-driver configuration, interruption cleanup, StrictMode, refs, reduced-motion subscriptions, slot replacement and Pressable behavior. A fresh installed consumer checks public root/deep paths and native ref/type contracts.

[Native Grow](grow.md) now supplies measured automatic opacity/scale transitions. [Native Collapse](collapse.md) provides the existing measured height/width implementation. Slide, Zoom, full TransitionGroup interoperation and arbitrary CSS remain unfinished. The upstream helper declarations also list internal standalone create/getAutoHeightDuration functions that are absent from the pinned JavaScript module; the native package provides the actual factory methods and does not invent those named runtime exports. Frame pacing, physical keyboard/VoiceOver/TalkBack behavior, native presentation geometry and release-performance measurements remain device gates. Native-driver configuration alone is not a measured smoothness result.

Participating library containers now normalize literal text and share inherited text styles; see [text containers](text-containers.md). Opaque custom component internals and full browser text flow remain open. No paid source or new runtime dependency is included, and no complete upstream package is marked verified.
