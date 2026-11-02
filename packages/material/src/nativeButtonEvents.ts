import type { PressableProps, GestureResponderEvent } from 'react-native';
type NativeKeyEvent = Parameters<NonNullable<PressableProps['onKeyDown']>>[0];
type KeyDetails = NativeKeyEvent['nativeEvent'] & { isCanceled?: boolean };
export type ButtonBaseKeyEvent = Omit<NativeKeyEvent, 'nativeEvent'> & {
  nativeEvent: KeyDetails;
} & KeyDetails;
export type ButtonBaseActivationEvent = GestureResponderEvent | ButtonBaseKeyEvent;
const keyFields = [
  'key',
  'code',
  'altKey',
  'ctrlKey',
  'metaKey',
  'shiftKey',
  'repeat',
  'isComposing',
  'isCanceled',
] as const;
/** Keep native provenance and event methods while supplying familiar keyboard fields. */
export function buttonKeyEvent(event: NativeKeyEvent): ButtonBaseKeyEvent {
  const adapted = Object.create(event) as ButtonBaseKeyEvent;
  for (const key of keyFields)
    Object.defineProperty(adapted, key, { get: () => (event.nativeEvent as KeyDetails)[key] });
  for (const method of [
    'preventDefault',
    'stopPropagation',
    'persist',
    'isDefaultPrevented',
    'isPropagationStopped',
  ] as const)
    if (typeof event[method] === 'function')
      Object.defineProperty(adapted, method, { value: event[method].bind(event) });
  Object.defineProperty(adapted, 'defaultPrevented', {
    get: () => event.defaultPrevented || event.isDefaultPrevented?.(),
  });
  return adapted;
}
/** Keyboard cancellation stops platform activation; a separate activation can still be canceled. */
export function buttonActivationEvent(event: ButtonBaseKeyEvent): ButtonBaseKeyEvent {
  let prevented = false;
  const activation = Object.create(event) as ButtonBaseKeyEvent;
  Object.defineProperties(activation, {
    defaultPrevented: { get: () => prevented },
    isDefaultPrevented: { value: () => prevented },
    preventDefault: {
      value: () => {
        prevented = true;
        event.preventDefault();
      },
    },
  });
  return activation;
}
export function isButtonEventPrevented(event: ButtonBaseActivationEvent): boolean {
  return Boolean(event.defaultPrevented || event.isDefaultPrevented?.());
}
