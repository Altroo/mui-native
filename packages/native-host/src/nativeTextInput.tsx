/* Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT */
import React, { forwardRef } from 'react';
import type { TextInputInstance, TextInputProps } from 'react-native';
import type { NativeHostKeyEvent } from './nativeKeyboard';
export interface NativeTextInputProps extends TextInputProps {
  /** MUI slot metadata belongs to the wrapper, never the native editor. */
  ownerState?: object;
  onKeyDown?: (event: NativeHostKeyEvent) => void;
  onKeyUp?: (event: NativeHostKeyEvent) => void;
}
type Implementation = React.ComponentType<
  NativeTextInputProps & { ref?: React.Ref<TextInputInstance> }
>;
let implementation: Implementation | undefined;
function nativeImplementation(): Implementation {
  return (implementation ??= (require('./nativeTextInputRuntime') as { default: Implementation })
    .default);
}
/** Native editor retaining React Native props/refs with guarded composite editing commands. */
export const NativeTextInput: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeTextInputProps> & React.RefAttributes<TextInputInstance>
> = forwardRef<TextInputInstance, NativeTextInputProps>(function NativeTextInput(
  { ownerState: _ownerState, ...props },
  ref,
) {
  const Input = nativeImplementation();
  return <Input {...props} ref={ref} />;
});
