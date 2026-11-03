# Native mobile extensions

This is a planned extension track, not an API shipped in the first pre-alpha. React Native already provides the underlying platform primitives and services. Add wrappers only when consistent theming, composition or interaction ownership improves the library consumer's experience.

The proposed optional package is `@altroo/mui-native-mobile`, in the same monorepo and sharing the Material/System theme. Do not create a placeholder publication. New native APIs must use their own namespace; they must not claim nonexistent original `@mui/material` imports. Existing MUI web imports continue using original MUI. Define any web support/fallback for new extensions explicitly.

## Curated priorities

1. **Screen and scrolling:** combine safe-area layout and keyboard avoidance; add a themed ScrollView only with useful typed styling/composition beyond a raw re-export.
2. **Virtualized collections:** FlatList and SectionList wrappers keep the native virtualizers, data identity, refs and callbacks. Add consistent empty/footer/separator/refresh slots and examples. Do not nest a virtualized list in an unnecessary ScrollView.
3. **Refresh/loading:** compose RefreshControl, refreshing and load-more feedback into the collection components. Fetching and application-specific search/filter/sort policy remain consumer-owned.
4. **Mobile surfaces/actions:** implement BottomSheet with snap points, gestures and keyboard/focus ownership; then evaluate cross-platform action sheets and swipeable list actions. Reuse the existing overlay/list foundations.

## React Native API decisions

| Native primitive/API | Approach                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ScrollView           | A themed visual wrapper is a candidate; preserve native props, scrolling and ref methods.                                             |
| FlatList             | Prioritize useful MUI-style composition while retaining native virtualization.                                                        |
| SectionList          | Preserve section/sticky-header behavior and virtualization with shared list theming.                                                  |
| KeyboardAvoidingView | Compose into Screen; avoid a redundant public component unless a separate use case warrants it.                                       |
| RefreshControl       | Theme and compose into scrolling/list slots before adding another standalone abstraction.                                             |
| StatusBar            | Start with theme-aware recipes and Screen integration; handle system/lifecycle ownership explicitly.                                  |
| BackHandler          | Reuse overlay/back ownership and focused screen recipes; do not install competing global listeners automatically.                     |
| DrawerLayoutAndroid  | Complete the native MUI Drawer/SwipeableDrawer track; an additional Android-only public wrapper needs a distinct benefit.             |
| PermissionsAndroid   | Keep permission requests and policy application-owned. Document platform-aware recipes; do not auto-request permissions.              |
| ToastAndroid         | Prefer the MUI Snackbar track for consistent cross-platform UI; document the native Android API when system-toast behavior is wanted. |
| ActionSheetIOS       | Document native usage and limits; evaluate a cross-platform action-sheet abstraction after BottomSheet is ready.                      |

These APIs are not all visual components. A permission or back-handler API should not be presented as a styled JSX widget simply to mirror its name.

## MUI-style contracts

Use the shared ThemeProvider, theme tokens, `sx`, typed slots/slotProps and owner state. Support default props, style overrides and variants where meaningful, using clearly native component keys such as `MuiNativeBottomSheet`. Preserve controlled/uncontrolled behavior, native refs and explicit event/close reasons. Publish root/deep imports and examples in the same format as the Material guides. Document platform-specific behavior and styling limits instead of silently pretending they are identical.

### Proposed example

This illustrates the intended API shape only. The mobile imports below are **not available in the first pre-alpha**; exact props will be finalized with implementation and tests.

```tsx
import { useState } from 'react';
import { Button, ThemeProvider, Typography, createTheme } from '@altroo/mui-native';
import { BottomSheet, Screen } from '@altroo/mui-native-mobile';

const theme = createTheme();

export function MobileExample() {
  const [open, setOpen] = useState(false);
  return (
    <ThemeProvider theme={theme}>
      <Screen sx={{ flex: 1, p: 2 }}>
        <Button onClick={() => setOpen(true)}>Open actions</Button>
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          snapPoints={['40%', '80%']}
          slotProps={{ paper: { sx: { p: 2, bgcolor: 'background.paper' } } }}
        >
          <Typography variant="h6">Delivery actions</Typography>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </BottomSheet>
      </Screen>
    </ThemeProvider>
  );
}
```

## Validation before completion

Each implemented extension needs meaningful contract/cleanup/edge-case checks, installed-consumer types/imports, independent review, both-platform interactions and clear accessibility/keyboard/RTL/font-scaling behavior. Measure release-build list/gesture latency, scrolling and memory against native equivalents. Preserve the native virtualizers and optimize measured bottlenecks; do not introduce a new runtime merely for an unmeasured speed claim.

The [roadmap](../ROADMAP.md) and [performance contract](performance.md) remain the completion criteria. This additional track does not reduce the full Material UI/X goal.
