import React, { createContext, useContext, useRef, useState, forwardRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Switch as NativeSwitch,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
  type GestureResponderEvent,
} from 'react-native';
import {
  useTheme,
  useThemeProps,
  useComponentStyle,
  type SxProps,
} from '@altroo/mui-native-system';
import { Box, Stack, Typography, type BoxProps, type TypographyProps } from './layout';
export function useControlled<T>(
  controlled: T | undefined,
  defaultValue: T,
): [T, (value: T) => void] {
  const isControlled = useRef(controlled !== undefined).current;
  const [local, setLocal] = useState(defaultValue);
  useEffect(() => {
    if (isControlled !== (controlled !== undefined))
      console.warn(
        '[mui-native:controlled] Do not switch between controlled and uncontrolled state.',
      );
  }, [controlled, isControlled]);
  return [
    isControlled ? (controlled as T) : local,
    (value) => {
      if (!isControlled) setLocal(value);
    },
  ];
}
export type InputChangeEvent = {
  target: { value: string; name?: string; id?: string };
  currentTarget: { value: string; name?: string; id?: string };
  nativeEvent: TextInputChangeEventData;
};
export type CheckChangeEvent = {
  target: { checked: boolean; value?: string; name?: string };
  nativeEvent: GestureResponderEvent['nativeEvent'] | null;
};
interface FormState {
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
}
const FormContext = createContext<FormState>({});
export interface FormControlProps extends BoxProps, FormState {
  fullWidth?: boolean;
}
export function FormControl({
  disabled,
  error,
  required,
  fullWidth,
  children,
  ...props
}: FormControlProps) {
  return (
    <FormContext.Provider value={{ disabled, error, required }}>
      <Box {...props} style={[fullWidth ? { alignSelf: 'stretch' } : undefined, props.style]}>
        {children}
      </Box>
    </FormContext.Provider>
  );
}
export function FormLabel({ children, ...props }: TypographyProps) {
  const state = useContext(FormContext);
  return (
    <Typography {...props} color={state.error ? 'error.main' : 'text.secondary'}>
      {children}
      {state.required ? ' *' : ''}
    </Typography>
  );
}
export const InputLabel = FormLabel;
export function FormHelperText(props: TypographyProps) {
  const state = useContext(FormContext);
  return (
    <Typography
      {...props}
      variant="caption"
      color={state.error ? 'error.main' : 'text.secondary'}
    />
  );
}
export interface TextFieldProps
  extends Omit<TextInputProps, 'onChange' | 'value' | 'defaultValue' | 'style'> {
  sx?: SxProps;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  id?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  onChange?: (event: InputChangeEvent) => void;
  inputRef?: React.Ref<TextInput>;
  'aria-label'?: string;
  slotProps?: {
    htmlInput?: TextInputProps;
    inputLabel?: TypographyProps;
    formHelperText?: TypographyProps;
  };
}
export const TextField = forwardRef<View, TextFieldProps>(function TextField(inProps, ref) {
  const props = useThemeProps({ props: inProps, name: 'MuiTextField' });
  const form = useContext(FormContext);
  const {
    sx,
    label,
    helperText,
    error = form.error,
    disabled = form.disabled,
    required = form.required,
    fullWidth,
    variant = 'outlined',
    size = 'medium',
    value,
    defaultValue = '',
    name,
    id,
    type = 'text',
    onChange,
    onChangeText,
    inputRef,
    slotProps,
    'aria-label': ariaLabel,
    ...native
  } = props;
  const [text, setText] = useControlled(value, defaultValue);
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const resolved = useComponentStyle(
    'MuiTextField',
    { ...props, variant, size, error, disabled },
    sx,
    {
      states: [
        ...(focused ? ['focused'] : []),
        ...(error ? ['error'] : []),
        ...(disabled ? ['disabled'] : []),
      ],
    },
  );
  const borderColor = error
    ? theme.palette.error.main
    : focused
      ? theme.palette.primary.main
      : theme.palette.divider;
  const change = (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
    const next = event.nativeEvent.text;
    setText(next);
    const target = { value: next, name, id };
    onChange?.({ target, currentTarget: target, nativeEvent: event.nativeEvent });
    onChangeText?.(next);
  };
  return (
    <View ref={ref} style={[{ alignSelf: fullWidth ? 'stretch' : undefined, gap: 4 }, resolved]}>
      <FormControl disabled={disabled} error={error} required={required}>
        {label != null ? (
          <InputLabel {...slotProps?.inputLabel} nativeID={id ? `${id}-label` : undefined}>
            {label}
          </InputLabel>
        ) : null}
        <TextInput
          {...native}
          {...slotProps?.htmlInput}
          ref={inputRef}
          nativeID={id}
          accessibilityLabel={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
          accessibilityState={{ disabled }}
          accessibilityHint={typeof helperText === 'string' ? helperText : undefined}
          editable={!disabled && native.editable !== false}
          value={String(text ?? '')}
          secureTextEntry={type === 'password'}
          keyboardType={
            type === 'email'
              ? 'email-address'
              : type === 'number'
                ? 'decimal-pad'
                : native.keyboardType
          }
          onChange={change}
          onChangeText={undefined}
          onFocus={(e) => {
            setFocused(true);
            native.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            native.onBlur?.(e);
          }}
          style={[
            {
              color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
              fontSize: 16,
              paddingHorizontal: variant === 'standard' ? 0 : 14,
              paddingVertical: size === 'small' ? 10 : 16,
              minHeight: 44,
              borderColor,
              borderRadius: variant === 'outlined' ? theme.shape.borderRadius : 0,
              borderWidth: variant === 'outlined' ? 1 : 0,
              borderBottomWidth: variant === 'outlined' ? 1 : focused ? 2 : 1,
              backgroundColor: variant === 'filled' ? theme.palette.action.hover : 'transparent',
            },
            slotProps?.htmlInput?.style,
          ]}
        />
        {helperText != null ? (
          <FormHelperText {...slotProps?.formHelperText}>{helperText}</FormHelperText>
        ) : null}
      </FormControl>
    </View>
  );
});
export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  value?: string;
  name?: string;
  onChange?: (event: CheckChangeEvent, checked: boolean) => void;
  size?: 'small' | 'medium';
  sx?: SxProps;
  inputProps?: { 'aria-label'?: string };
  'aria-label'?: string;
  testID?: string;
}
export function Checkbox({
  checked,
  defaultChecked = false,
  disabled,
  indeterminate,
  value,
  name,
  onChange,
  sx,
  inputProps,
  'aria-label': label,
  testID,
}: CheckboxProps) {
  const [selected, setSelected] = useControlled(checked, defaultChecked);
  const theme = useTheme();
  const style = useComponentStyle('MuiCheckbox', { checked: selected, disabled }, sx);
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? inputProps?.['aria-label']}
      accessibilityState={{ checked: indeterminate ? 'mixed' : selected, disabled }}
      onPress={(e) => {
        const next = !selected;
        setSelected(next);
        onChange?.({ target: { checked: next, value, name }, nativeEvent: e.nativeEvent }, next);
      }}
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderWidth: 2,
          borderRadius: 2,
          borderColor: disabled ? theme.palette.action.disabled : theme.palette.primary.main,
          backgroundColor: selected || indeterminate ? theme.palette.primary.main : 'transparent',
        }}
      >
        <Typography style={{ color: '#fff', fontSize: 14, lineHeight: 16, textAlign: 'center' }}>
          {indeterminate ? '−' : selected ? '✓' : ''}
        </Typography>
      </View>
    </Pressable>
  );
}
export function Switch({
  checked,
  defaultChecked = false,
  disabled,
  onChange,
  name,
  value,
  'aria-label': label,
  testID,
}: CheckboxProps) {
  const [selected, setSelected] = useControlled(checked, defaultChecked);
  const theme = useTheme();
  return (
    <NativeSwitch
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="switch"
      disabled={disabled}
      value={selected}
      trackColor={{ true: theme.palette.primary.main }}
      onValueChange={(next) => {
        setSelected(next);
        onChange?.({ target: { checked: next, value, name }, nativeEvent: null }, next);
      }}
    />
  );
}
const RadioContext = createContext<{
  value?: string;
  name?: string;
  onChange?: (e: CheckChangeEvent, value: string) => void;
}>({});
export interface RadioGroupProps extends Omit<BoxProps, 'onChange'> {
  value?: string;
  defaultValue?: string;
  name?: string;
  row?: boolean;
  onChange?: (e: CheckChangeEvent, value: string) => void;
}
export function RadioGroup({
  value,
  defaultValue = '',
  name,
  onChange,
  row,
  children,
  ...props
}: RadioGroupProps) {
  const [selected, setSelected] = useControlled(value, defaultValue);
  return (
    <RadioContext.Provider
      value={{
        value: selected,
        name,
        onChange: (e, next) => {
          setSelected(next);
          onChange?.(e, next);
        },
      }}
    >
      <Stack {...props} direction={row ? 'row' : 'column'}>
        {children}
      </Stack>
    </RadioContext.Provider>
  );
}
export function Radio({
  value = '',
  checked,
  defaultChecked = false,
  onChange,
  disabled,
  'aria-label': label,
  testID,
}: CheckboxProps) {
  const group = useContext(RadioContext);
  const [local, setLocal] = useControlled(checked, defaultChecked);
  const selected = group.value !== undefined ? group.value === value : local;
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
      onPress={(e) => {
        if (selected) return;
        setLocal(true);
        const event = {
          target: { checked: true, value, name: group.name },
          nativeEvent: e.nativeEvent,
        };
        onChange?.(event, true);
        group.onChange?.(event, value);
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: theme.palette.primary.main,
          padding: 3,
        }}
      >
        {selected ? (
          <View
            style={{ flex: 1, borderRadius: 10, backgroundColor: theme.palette.primary.main }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
export function FormControlLabel({
  control,
  label,
  disabled,
}: {
  control: React.ReactElement<CheckboxProps>;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Stack direction="row" style={{ alignItems: 'center' }}>
      {React.cloneElement(control, {
        disabled: disabled ?? control.props.disabled,
        'aria-label':
          control.props['aria-label'] ?? (typeof label === 'string' ? label : undefined),
      })}
      <Typography>{label}</Typography>
    </Stack>
  );
}
