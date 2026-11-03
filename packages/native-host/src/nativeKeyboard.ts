import type { ViewProps } from 'react-native';
export type NativeDescendantKey = 'Tab' | 'Escape';
export interface NativeKeyMetadata {
  /** Hardware event on Android, or a UIKit keyboard-command invocation. */
  muiKeySource?: 'hardware' | 'command';
  isEditable?: boolean;
  isCanceled?: boolean;
}
type KeyEvent = Parameters<NonNullable<ViewProps['onKeyDown']>>[0];
export type NativeHostKeyEvent = Omit<KeyEvent, 'nativeEvent'> & {
  nativeEvent: KeyEvent['nativeEvent'] & NativeKeyMetadata;
};
/** Only bridge-owned standard events may enter the private host's public callbacks. */
export function isDescendantKeyEvent(event: KeyEvent): boolean {
  const source = (event.nativeEvent as NativeKeyMetadata).muiKeySource;
  return source === 'hardware' || source === 'command';
}
