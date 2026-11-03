import React from 'react';
import { Text, type ViewInstance } from 'react-native';
import {
  InteractiveView,
  NativePortalHost,
  type NativePortalObservation,
  type NativePortalRect,
  NativePressable,
  setInteractiveHotspot,
  setInteractivePressed,
  type InteractiveViewProps,
  type NativeDescendantKey,
  type NativeHostKeyEvent,
  type NativeKeyMetadata,
} from '@altroo/mui-native-host';
const ref = React.createRef<ViewInstance>();
const props: InteractiveViewProps = {
  focusable: true,
  tabIndex: -1,
  managedKeys: ['ArrowDown', 'ArrowUp', 'Home', 'End'],
  managedDescendantKeys: [
    'Tab',
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    'Enter',
  ],
  onKeyDown: (event: NativeHostKeyEvent) => {
    const metadata: NativeKeyMetadata = event.nativeEvent;
    if (metadata.muiKeySource === 'command') event.nativeEvent.code;
    return event.nativeEvent.key;
  },
};
export const host = <InteractiveView {...props} ref={ref} />;
export const control = (
  <NativePressable ref={ref} android_ripple={{ borderless: true }} delayHoverIn={30}>
    {({ pressed }) => <Text>{pressed ? 'Pressed' : 'Action'}</Text>}
  </NativePressable>
);
export function focus() {
  ref.current?.focus();
  ref.current?.blur();
  setInteractiveHotspot(ref.current, 10, 20);
  setInteractivePressed(ref.current, true);
}
// @ts-expect-error This host exposes a native view, not a browser element.
export const browserRef = <InteractiveView ref={React.createRef<HTMLDivElement>()} />;

const command: NativeDescendantKey = 'Tab';
void command;
// @ts-expect-error Ordinary character editing is not a declared navigation command.
export const editingKey = <InteractiveView managedDescendantKeys={['a']} />;
// @ts-expect-error Caret/tag-boundary navigation needs a separate native policy.
export const caretKey = <InteractiveView managedDescendantKeys={['ArrowLeft']} />;

// The low-level geometry channel remains separate from the public Portal layout callback.
export const observedPortal = (
  <NativePortalHost
    active
    revision="surface"
    observedTag={0}
    observationRevision="anchor-lease"
    onPortalObservation={({ nativeEvent }) => {
      const value: NativePortalObservation = nativeEvent;
      const viewport: NativePortalRect = value.viewport;
      void [viewport.width, value.referenceClip.present, value.observationRevision];
    }}
  />
);
