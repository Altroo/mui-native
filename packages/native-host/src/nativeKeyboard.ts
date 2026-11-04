import type { ViewProps } from 'react-native';
/** Commands a composite can declare before native text/focus defaults run. */
export type NativeDescendantKey =
  | 'Tab'
  | 'Escape'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'Backspace'
  | 'PageUp'
  | 'PageDown'
  | 'Home'
  | 'End'
  | 'Enter';
export interface NativeKeyMetadata {
  /** Hardware event, UIKit keyboard command, or explicit native editing request. */
  muiKeySource?: 'hardware' | 'command' | 'input';
  /** Android press token used only for matching native down/up generations. */
  muiKeySequence?: string;
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
  return source === 'hardware' || source === 'command' || source === 'input';
}
