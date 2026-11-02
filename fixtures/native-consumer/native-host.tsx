import React from 'react';
import { Text, type ViewInstance } from 'react-native';
import {
  InteractiveView,
  NativePressable,
  setInteractiveHotspot,
  setInteractivePressed,
  type InteractiveViewProps,
} from '@altroo/mui-native-host';
const ref = React.createRef<ViewInstance>();
const props: InteractiveViewProps = {
  focusable: true,
  tabIndex: -1,
  managedKeys: ['ArrowDown', 'ArrowUp', 'Home', 'End'],
  onKeyDown: (event) => event.nativeEvent.key,
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
