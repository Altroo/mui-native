# Native picker host

The host package exports a low-level NativePicker anchor for framework-native selection. Its iOS implementation presents UIKit table rows in an adaptive sheet or an anchored iPad popover; Android uses a framework AlertDialog and native checkable rows. These choices follow the public [UIKit row-selection API](https://developer.apple.com/documentation/uikit/handling-row-selection-in-a-table-view) and [Android dialog API](https://developer.android.com/reference/android/app/AlertDialog.Builder). It adds no runtime dependency.

This is the platform foundation for the unfinished NativeSelect/Select native branch. Material NativeSelect and TextField native integration are not available yet. The existing default [Select](select.md) continues using Menu. No whole-package support or physical-device validation is implied.

## Composing a control

NativePicker draws a transparent native anchor inside its parent. The caller owns the visible activation control, value model, labels, focus and whether another overlay permits opening. The anchor covers the parent's bounds by default, takes no pointer/accessibility focus and keeps its native node for geometry and presentation. A native development/production rebuild is required; Expo Go lacks it.

```tsx
import React from 'react';
import { NativePressable, NativePicker, type NativePickerOption } from '@altroo/mui-native-host';
import { Text } from 'react-native';

export function FrameworkChoice() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('one');
  const options: NativePickerOption[] = [
    { id: 'one', label: 'One', selected: value === 'one' },
    { id: 'two', label: 'Two', selected: value === 'two' },
  ];
  return (
    <NativePressable onPress={() => setOpen(true)} style={{ minHeight: 48 }}>
      <Text>{value}</Text>
      <NativePicker
        open={open}
        title="Choose a number"
        options={options}
        onSelection={(event) => setValue(event.nativeEvent.optionId)}
        onDismiss={() => setOpen(false)}
      />
    </NativePressable>
  );
}
```

Options have unique nonempty string ids, string labels and optional enabled/selected booleans. Groups use groupId/groupLabel; disabled options cannot activate. Single mode permits at most one selected option. Multiple mode leaves the picker open and emits each toggle request. Done or Cancel dismisses the surface; neither rolls back changes the caller already accepted. Selected checks remain owned by props, including when a controlled caller declines a request. System buttons use native localization; doneText/cancelText can override them. colorScheme accepts system, light or dark.

## Events and lifecycle

onSelection receives the persisted original native event with sessionId, revision, optionId and selected. onDismiss receives a persisted native event with sessionId and selected/cancel/done/background/unavailable reason. These are native host events, with no fabricated DOM input or gesture data. The later Material wrapper will own browser-shaped string and selectedOptions adaptation.

Each opening or requestKey change gets a new presentation session. Equivalent option arrays keep the revision stable; meaningful option/model changes get a new revision. Only the current committed session, revision and enabled option can publish selection. Closed, consumed, removed and unmounted callbacks are ignored. A native user dismissal consumes the session even if the caller leaves open=true; toggle open or change requestKey to request another presentation. Programmatic closure/replacement and stale callbacks do not publish user dismissal.

UIKit waits for ongoing presentation transitions, anchors popovers to the native carrier and handles dismissal, detachment, backgrounding and recycling. Rows use dynamic system text, checkmarks and disabled/selected accessibility metadata. Android applies the authoritative React activity lifecycle gate before presenting, closes an empty/invalid model, consumes terminal sessions before queued dismissal callbacks and releases dialog/lifecycle listeners. Native rows are recycled. The picker uses platform fonts and appearance; Material trigger styling belongs to the composing control.

The anchor does not register a JavaScript Modal stack layer, move caller focus or implement a browser focus trap. The composing control owns readiness/focus integration. Native presentation, native window layering, initial focus/scroll behavior, keyboard/IME, accessibility announcements, iPad dismissal, RTL/font scaling, activity restoration and release-build latency/memory still require physical-device validation. Large option sets and repeated presentation workloads have no calibrated performance certification.

## Local evidence

JavaScript tests exercise actual host composition and native-shaped events for session replacement, model revisions, controlled checks, invalid/stale/disabled options, callback persistence, consumed sessions, closure/unmount and model validation. A plain JVM policy runner covers Android empty-list, detach/resync, background and old-dismiss ordering without executing Android UI:

```sh
# From a generated catalog Android project with the pinned build prerequisites:
./gradlew :altroo_mui-native-host:verifyPickerPolicy
```

Codegen, platform compilation and installed-consumer evidence are recorded in [validation](validation.md) and [issue #31](https://github.com/Altroo/mui-native/issues/31). These checks establish source/build/event contracts within their stated scope. Material native option parsing, string values, refs/events and NativeSelect import paths remain the next integration work.
