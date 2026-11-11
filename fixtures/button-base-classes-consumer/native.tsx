// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef } from 'react';
import { NativePressable } from '@altroo/mui-native-host';
import { View, type ViewInstance } from 'react-native';
import Base, {
  buttonBaseClasses,
  getButtonBaseUtilityClass,
  type ButtonBaseClasses,
  type ButtonBaseClassKey,
  type ButtonBaseProps,
  type ButtonBaseRootProps,
} from '@mui/material/ButtonBase';
import {
  ButtonBase as RootBase,
  buttonBaseClasses as RootClasses,
  getButtonBaseUtilityClass as RootHelper,
} from '@mui/material';

declare module '@mui/material/ButtonBase' {
  interface ButtonBaseClasses {
    contributorSlot?: string | undefined;
  }
}
export const classKey: ButtonBaseClassKey = 'contributorSlot';
export const augmented: Partial<ButtonBaseClasses> = { contributorSlot: 'custom' };
export const aliases: [typeof Base, typeof buttonBaseClasses, typeof getButtonBaseUtilityClass] = [
  RootBase,
  RootClasses,
  RootHelper,
];
export const optional: ButtonBaseProps = {
  classes: undefined,
  className: undefined,
  focusVisibleClassName: undefined,
};
export const sample = (
  <Base
    classes={augmented}
    component={View}
    className="custom-root"
    focusVisibleClassName="custom-focus"
  >
    Action
  </Base>
);
// @ts-expect-error Class declarations must be strings.
export const invalidClasses: Partial<ButtonBaseClasses> = { root: 1 };
// @ts-expect-error Slots must be strings.
export const invalidSlot = getButtonBaseUtilityClass(1);

// A custom native host consumes class metadata before forwarding native props.
export const CustomRoot = forwardRef<ViewInstance, ButtonBaseRootProps>(function CustomRoot(
  { className: _className, ...native },
  ref,
) {
  return <NativePressable {...native} ref={ref} />;
});
export const custom = (
  <Base component={CustomRoot} className="custom">
    Action
  </Base>
);
