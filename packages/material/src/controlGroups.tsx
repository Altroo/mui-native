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
  type SxProps,
  type NativeStyle,
  diagnostic,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { FormContext, useControlled } from './formState';
import { useMenuEvent } from './useMenuEvent';
import { NativeRadioRegistry } from './nativeRadioRegistry';
import { RadioContext } from './radioContext';
import type { NativeCheckedChangeEvent } from './checkedTypes';
import type { FormGroupClasses, RadioGroupClasses } from './controlClasses';
export { useRadioGroup } from './radioContext';
export type { RadioGroupState } from './radioContext';
export interface FormGroupProps extends Omit<ViewProps, 'style'> {
  children?: React.ReactNode;
  row?: boolean;
  error?: boolean;
  sx?: SxProps;
  style?: StyleProp<NativeStyle>;
  classes?: Partial<FormGroupClasses>;
  className?: string;
  component?: React.ComponentType<ViewProps & React.RefAttributes<ViewInstance>>;
}
export const FormGroup: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormGroupProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FormGroupProps>(function FormGroup(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiFormGroup' }),
    form = useContext(FormContext);
  const {
    children,
    row = false,
    error = form?.error ?? false,
    sx,
    style,
    component: Root = View,
    classes,
    className,
    ...native
  } = props;
  if (classes || className)
    diagnostic('group-classes', 'Native group classes identify slots; use native styles or sx.');
  const resolved = useComponentStyle('MuiFormGroup', { ...props, row, error }, sx, {
    states: error ? ['error'] : [],
    overrideKeys: row ? ['row'] : [],
    baseStyle: { flexDirection: row ? 'row' : 'column', flexWrap: 'wrap', minWidth: 0 },
  });
  return (
    <Root {...native} ref={ref} style={[resolved, style]}>
      {children}
    </Root>
  );
});
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
