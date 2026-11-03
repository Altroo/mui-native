import React, { forwardRef, useCallback, useRef } from 'react';
import type { ColorValue, ViewInstance, ViewProps } from 'react-native';
import type { NativeProps } from './AltrooMUIInteractiveViewNativeComponent';
let implementation: typeof import('./AltrooMUIInteractiveViewNativeComponent') | undefined;
function nativeImplementation() {
  // Keep importing package exports safe before a native host is rendered.
  return (implementation ??= require('./AltrooMUIInteractiveViewNativeComponent'));
}
export interface InteractiveViewProps extends ViewProps {
  /** Observe standard descendant focus events, including native TextInput. */
  onNativeFocus?: ViewProps['onFocus'];
  onNativeBlur?: ViewProps['onBlur'];
  managedKeys?: readonly string[];
  rippleColor?: ColorValue;
  rippleEnabled?: boolean;
  rippleRadius?: number;
  rippleBorderless?: boolean;
  rippleForeground?: boolean;
}
export function setInteractivePressed(node: ViewInstance | null, pressed: boolean) {
  if (node) nativeImplementation().Commands.setPressed(node as any, pressed);
}
export function setInteractiveHotspot(node: ViewInstance | null, x: number, y: number) {
  if (node) nativeImplementation().Commands.setHotspot(node as any, x, y);
}
function normalizedViewProps(input: InteractiveViewProps): InteractiveViewProps {
  const result = { ...input } as {
    -readonly [K in keyof InteractiveViewProps]: InteractiveViewProps[K];
  } & Record<string, unknown>;
  const aliases: Record<string, string> = {
    'aria-label': 'accessibilityLabel',
    'aria-live': 'accessibilityLiveRegion',
    'aria-modal': 'accessibilityViewIsModal',
    id: 'nativeID',
  };
  for (const [source, target] of Object.entries(aliases))
    if (result[source] !== undefined)
      result[target] = source === 'aria-live' && result[source] === 'off' ? 'none' : result[source];
  if (input['aria-labelledby'] != null)
    result.accessibilityLabelledBy = input['aria-labelledby'].split(/\s*,\s*/g);
  if (input['aria-hidden'] !== undefined) {
    result.accessibilityElementsHidden = input['aria-hidden'];
    if (input['aria-hidden']) result.importantForAccessibility = 'no-hide-descendants';
  }
  const state = { ...input.accessibilityState };
  for (const key of ['busy', 'checked', 'disabled', 'expanded', 'selected'] as const)
    state[key] = (input[`aria-${key}`] ?? state[key]) as never;
  result.accessibilityState = state;
  const value = { ...input.accessibilityValue };
  for (const key of ['max', 'min', 'now', 'text'] as const)
    value[key] = (input[`aria-value${key}`] ?? value[key]) as never;
  result.accessibilityValue = value;
  for (const key of Object.keys(result)) if (key.startsWith('aria-')) delete result[key];
  delete result.id;
  return result;
}
export const InteractiveView: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<InteractiveViewProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, InteractiveViewProps>(function InteractiveView(
  {
    tabIndex,
    focusable,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    onKeyDownCapture,
    onKeyUpCapture,
    onFocusCapture,
    onBlurCapture,
    onNativeFocus,
    onNativeBlur,
    ...props
  },
  forwarded,
) {
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const ref = useCallback(
    (node: ViewInstance | null) => {
      cleanup.current?.();
      cleanup.current = undefined;
      if (!node) return;
      const originals = {
        focus: Object.getOwnPropertyDescriptor(node, 'focus'),
        blur: Object.getOwnPropertyDescriptor(node, 'blur'),
      };
      const native = nativeImplementation();
      Object.defineProperties(node, {
        focus: {
          configurable: true,
          writable: true,
          value: () => native.Commands.focus(node as any),
        },
        blur: {
          configurable: true,
          writable: true,
          value: () => native.Commands.blur(node as any),
        },
      });
      let release: (() => void) | void;
      let released = false;
      const restore = () => {
        for (const key of ['focus', 'blur'] as const) {
          const original = originals[key];
          if (original) Object.defineProperty(node, key, original);
          else delete (node as unknown as Record<string, unknown>)[key];
        }
      };
      const detach = () => {
        if (released) return;
        released = true;
        if (cleanup.current === detach) cleanup.current = undefined;
        try {
          if (typeof release === 'function') release();
          else if (typeof forwarded === 'function') forwarded(null);
          else if (forwarded?.current === node) forwarded.current = null;
        } finally {
          restore();
        }
      };
      try {
        if (typeof forwarded === 'function') release = forwarded(node);
        else if (forwarded) forwarded.current = node;
      } catch (error) {
        restore();
        throw error;
      }
      cleanup.current = detach;
      return detach;
    },
    [forwarded],
  );
  const Native = nativeImplementation().default;
  return (
    <Native
      {...normalizedViewProps(props)}
      ref={ref as any}
      rippleEnabled={props.rippleEnabled ?? props.rippleColor != null}
      nativeFocusable={focusable ?? tabIndex != null}
      nativeTabIndex={tabIndex ?? 0}
      {...{
        onMUIKeyDownCapture: onKeyDownCapture,
        onMUIKeyUpCapture: onKeyUpCapture,
        onMUIFocusCapture: onFocusCapture,
        onMUIBlurCapture: onBlurCapture,
      }}
      onFocus={onNativeFocus}
      onBlur={onNativeBlur}
      onMUIFocus={onFocus as NativeProps['onMUIFocus']}
      onMUIBlur={onBlur as NativeProps['onMUIBlur']}
      onMUIKeyDown={onKeyDown as NativeProps['onMUIKeyDown']}
      onMUIKeyUp={onKeyUp as NativeProps['onMUIKeyUp']}
    />
  );
});
