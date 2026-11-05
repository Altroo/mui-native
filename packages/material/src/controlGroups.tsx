// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// FormGroup state/classes adapt MIT Material UI 9.5.0; see NOTICE and upstream/reuse.json.
import React, {
  forwardRef,
  useContext,
  useId,
  useMemo,
  useLayoutEffect,
  useImperativeHandle,
} from 'react';
import { View, StyleSheet, type ViewProps, type ViewInstance, type StyleProp } from 'react-native';
import {
  useDefaultProps,
  useNativeRootProps,
  type SxProps,
  type NativeStyle,
  diagnostic,
  joinClassNames,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  nativeStyleTextMetrics,
  applyNativeTextMetrics,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle, useComponentRootStyle } from './themeProvider';
import { FormContext, useControlled } from './formState';
import { mergeNativeRootStyle } from './nativeControlStyles';
import { useMenuEvent } from './useMenuEvent';
import { NativeRadioRegistry } from './nativeRadioRegistry';
import { RadioContext } from './radioContext';
import type { NativeCheckedChangeEvent } from './checkedTypes';
import {
  getFormGroupUtilityClass,
  type FormGroupClasses,
  type RadioGroupClasses,
} from './controlClasses';
export { useRadioGroup } from './radioContext';
export type { RadioGroupState } from './radioContext';
export interface FormGroupProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  row?: boolean | undefined;
  error?: boolean | undefined;
  sx?: SxProps | undefined;
  style?: StyleProp<NativeStyle>;
  classes?: Partial<FormGroupClasses> | undefined;
  className?: string | undefined;
  component?:
    | React.ComponentType<
        ViewProps & { className?: string | undefined } & React.RefAttributes<ViewInstance>
      >
    | undefined;
}
export const FormGroup = forwardRef<ViewInstance, FormGroupProps>(function FormGroup(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiFormGroup',
  });
  const form = useContext(FormContext);
  const {
    children,
    row = false,
    error = form?.error,
    sx,
    style,
    component: Root = View,
    classes,
    className,
    ...native
  } = props;
  const theme = useTheme(),
    parent = useNativeTextContext();
  const slots: ('root' | 'row' | 'error')[] = [
    'root',
    ...(row ? ['row' as const] : []),
    ...(error ? ['error' as const] : []),
  ];
  const rootClass = joinClassNames(
    slots
      .map((slot) => {
        const generated = getFormGroupUtilityClass(slot);
        // Preserve composeClasses' observable lookup order for class accessors.
        return classes?.[slot] ? `${generated} ${classes[slot]}` : generated;
      })
      .join(' '),
    className,
  );
  // The styled root gets composed classes and forwarded props; row belongs only
  // to ownerState because the original wrapper consumes that prop itself.
  const rootProps = { ...props, className: rootClass };
  delete rootProps.row;
  // Class identifiers participate in native selectors without inventing a CSS host.
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiFormGroup',
    { ...props, row, error },
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      classes: rootClass.split(/\s+/),
      rootProps,
      states: error ? ['error'] : [],
      overrideKeys: row ? ['row'] : [],
      baseStyle: { flexDirection: row ? 'row' : 'column', flexWrap: 'wrap', minWidth: 0 },
    },
  );
  // Expand each inline inset layer before Yoga applies edge-specific precedence.
  const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, resolved, authored);
  // Native inset normalization must retain CSS ratios for smaller text descendants.
  const mergedStyle =
    applyNativeTextMetrics(merged, resolved, nativeStyleTextMetrics([resolved, authored])) ??
    merged;
  // Publish text inheritance on the existing root, preserving refs and row geometry.
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={mergedStyle} content={children}>
      {(nativeStyle, content) => (
        <Root
          {...native}
          {...(Root === View ? {} : { className: rootClass })}
          ref={scopeRef}
          style={nativeStyle}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
}) as React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormGroupProps> & React.RefAttributes<ViewInstance>
> & {
  // The wrapper always returns its scope element, matching the original call
  // signature while retaining native forwardRef metadata and ref inference.
  (props: FormGroupProps & React.RefAttributes<ViewInstance>): React.JSX.Element;
};
export interface RadioGroupActions {
  focus(): void;
}
export interface RadioGroupProps extends Omit<FormGroupProps, 'onChange' | 'classes'> {
  value?: unknown;
  defaultValue?: unknown;
  name?: string;
  onChange?: (event: NativeCheckedChangeEvent, value: string) => void;
  actions?: React.Ref<RadioGroupActions>;
  classes?: Partial<RadioGroupClasses>;
}
export const RadioGroup: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<RadioGroupProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, RadioGroupProps>(function RadioGroup(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiRadioGroup' });
  const {
    value: authored,
    defaultValue,
    name: nameProp,
    onChange,
    actions,
    children,
    row = false,
    error,
    sx,
    style,
    classes,
    className,
    ...native
  } = props;
  const [value, setValue] = useControlled(authored, defaultValue),
    generated = useId(),
    name = nameProp ?? `mui-radio-group-${generated}`;
  const registry = useMemo(() => new NativeRadioRegistry(), []);
  useLayoutEffect(() => registry.flush());
  useLayoutEffect(() => () => registry.dispose(), [registry]);
  const change = useMenuEvent((event: NativeCheckedChangeEvent) => {
    setValue(event.target.value);
    onChange?.(event, event.target.value);
  });
  const resolved = useComponentStyle('MuiRadioGroup', { ...props, row, error }, sx, {
    states: error ? ['error'] : [],
    overrideKeys: row ? ['row'] : [],
  });
  const theme = useTheme(),
    direction =
      StyleSheet.flatten([resolved, style])?.direction === 'rtl'
        ? 'rtl'
        : StyleSheet.flatten([resolved, style])?.direction === 'ltr'
          ? 'ltr'
          : theme.direction;
  const context = useMemo(
    () => ({ name, value, onChange: change, registry, direction }),
    [name, value, change, registry, direction],
  );
  useImperativeHandle(actions, () => ({ focus: () => registry.focus() }), [registry]);
  if (classes || className)
    diagnostic(
      'radio-group-classes',
      'Native radio group classes identify states; use sx or native styles.',
    );

  return (
    <RadioContext.Provider value={context}>
      <FormGroup
        {...native}
        ref={ref}
        row={row}
        error={error}
        accessibilityRole="radiogroup"
        style={[resolved, style]}
      >
        {children}
      </FormGroup>
    </RadioContext.Provider>
  );
});
