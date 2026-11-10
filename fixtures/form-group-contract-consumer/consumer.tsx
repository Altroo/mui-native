// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type JSX } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import FormGroup, {
  type FormGroupProps,
  type FormGroupClasses,
  type FormGroupClassKey,
  formGroupClasses,
  getFormGroupUtilityClass,
} from '@mui/material/FormGroup';
import NativeGroup from '@altroo/mui-native/FormGroup';
import { FormGroup as RootGroup, formGroupClasses as rootClasses } from '@mui/material';

declare module '@mui/material/FormGroup' {
  interface FormGroupClasses {
    contractProbe?: string | undefined;
  }
}

// The compiler assertions verify the complete native host surface, not just row.
type MissingViewProps = Exclude<keyof Omit<ViewProps, 'style'>, keyof FormGroupProps>;
export const allNativeProps: MissingViewProps extends never ? true : false = true;
export const exactOptional: FormGroupProps = {
  row: undefined,
  classes: undefined,
  sx: undefined,
  className: undefined,
  error: undefined,
  component: undefined,
  children: undefined,
};
export const classKey: FormGroupClassKey = 'contractProbe';
export const classes: Partial<FormGroupClasses> = { root: 'root', contractProbe: 'custom' };
export const rootClassIdentity: typeof formGroupClasses = rootClasses;
export const nativeIdentity: typeof FormGroup = NativeGroup;
export const rootIdentity: typeof FormGroup = RootGroup;
export const renderGroup: (props: FormGroupProps) => JSX.Element = FormGroup;
export const utility: string = getFormGroupUtilityClass('focused');

const Root = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  function Root(props, ref) {
    const { className: _className, ...native } = props;
    return <View {...native} ref={ref} />;
  },
);
export const nodes = (
  <FormGroup
    {...exactOptional}
    row={undefined}
    classes={classes}
    component={Root}
    ref={createRef<ViewInstance>()}
    aria-label="Options"
    role="group"
    onLayout={(event): number => event.nativeEvent.layout.width}
    onTouchEnd={(event): number => event.nativeEvent.pageX}
    onFocus={(event): number => event.nativeEvent.target}
    onFocusCapture={(event): number => event.nativeEvent.target}
    onBlur={(event): number => event.nativeEvent.target}
    onBlurCapture={(event): number => event.nativeEvent.target}
    onKeyDown={(event): string => event.nativeEvent.key}
    onKeyDownCapture={(event): string => event.nativeEvent.code}
    onKeyUp={(event): boolean => event.nativeEvent.ctrlKey}
    onKeyUpCapture={(event): boolean => event.nativeEvent.shiftKey}
    accessibilityActions={[{ name: 'inspect', label: 'Inspect group' }]}
    onAccessibilityAction={(event): string => event.nativeEvent.actionName}
  >
    <RootGroup />
    <NativeGroup />
  </FormGroup>
);
// @ts-expect-error The upstream row prop is boolean or undefined.
export const invalidRow = <FormGroup row="horizontal" />;
// @ts-expect-error Only declared class keys can be supplied.
export const invalidClasses = <FormGroup classes={{ unregistered: 'bad' }} />;
// @ts-expect-error A native View wrapper cannot consume an HTML element ref.
export const invalidRef = <FormGroup ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error FormGroup is not a link.
export const invalidHref = <FormGroup href="/settings" />;
