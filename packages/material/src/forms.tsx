import React, {
  createContext,
  useContext,
  useRef,
  useState,
  forwardRef,
  useEffect,
  useLayoutEffect,
} from 'react';
import {
  View,
  StyleSheet,
  type ViewInstance,
  TextInput,
  Pressable,
  Switch as NativeSwitch,
  type TextInputProps,
  type TextInputInstance,
  type TextInputChangeEvent,
  type GestureResponderEvent,
} from 'react-native';
import {
  useTheme,
  useThemeProps,
  useComponentStyle,
  useSx,
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
  nativeEvent: TextInputChangeEvent['nativeEvent'];
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
type LabelActivation = (event: GestureResponderEvent) => void;
const LabelActivationContext = createContext<React.RefObject<LabelActivation | null> | null>(null);
function useLabelActivation(activate: LabelActivation) {
  const target = useContext(LabelActivationContext);
  useLayoutEffect(() => {
    if (!target) return;
    target.current = activate;
    return () => {
      target.current = null;
    };
  }, [target, activate]);
}
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
  inputRef?: React.Ref<TextInputInstance>;
  'aria-label'?: string;
  slotProps?: {
    htmlInput?: TextInputProps;
    inputLabel?: TypographyProps;
    formHelperText?: TypographyProps;
  };
}
export const TextField: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TextFieldProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, TextFieldProps>(function TextField(inProps, ref) {
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
  const input = { ...native, ...slotProps?.htmlInput };
  const inputTypography = useSx(
    { typography: 'body1' },
    { nativeStyle: StyleSheet.flatten(input.style) ?? undefined },
  );
  const borderColor = error
    ? theme.palette.error.main
    : focused
      ? theme.palette.primary.main
      : theme.palette.divider;
  const readOnly = disabled || input.readOnly === true || input.editable === false;
  const change = (event: TextInputChangeEvent) => {
    const next = event.nativeEvent.text;
    setText(next);
    const target = { value: next, name, id };
    onChange?.({ target, currentTarget: target, nativeEvent: event.nativeEvent });
    onChangeText?.(next);
    slotProps?.htmlInput?.onChange?.(event);
    if (slotProps?.htmlInput?.onChangeText !== onChangeText)
      slotProps?.htmlInput?.onChangeText?.(next);
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
          {...input}
          ref={inputRef}
          nativeID={id}
          accessibilityLabel={
            ariaLabel ?? input.accessibilityLabel ?? (typeof label === 'string' ? label : undefined)
          }
          accessibilityState={{ ...input.accessibilityState, disabled }}
          accessibilityHint={
            input.accessibilityHint ?? (typeof helperText === 'string' ? helperText : undefined)
          }
          readOnly={readOnly}
          editable={!readOnly}
          value={String(text ?? '')}
          placeholderTextColor={input.placeholderTextColor ?? theme.palette.text.secondary}
          selectionColor={input.selectionColor ?? theme.palette.primary.main}
          keyboardAppearance={input.keyboardAppearance ?? theme.palette.mode}
          secureTextEntry={type === 'password' || input.secureTextEntry}
          keyboardType={
            type === 'email'
              ? 'email-address'
              : type === 'number'
                ? 'decimal-pad'
                : input.keyboardType
          }
          onChange={change}
          onChangeText={undefined}
          onFocus={(e) => {
            setFocused(true);
            native.onFocus?.(e);
            if (slotProps?.htmlInput?.onFocus !== native.onFocus)
              slotProps?.htmlInput?.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            native.onBlur?.(e);
            if (slotProps?.htmlInput?.onBlur !== native.onBlur) slotProps?.htmlInput?.onBlur?.(e);
          }}
          style={[
            inputTypography,
            {
              color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
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
  const activate = (event: GestureResponderEvent) => {
    if (disabled) return;
    const next = !selected;
    setSelected(next);
    onChange?.({ target: { checked: next, value, name }, nativeEvent: event.nativeEvent }, next);
  };
  useLabelActivation(activate);
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? inputProps?.['aria-label']}
      accessibilityState={{ checked: indeterminate ? 'mixed' : selected, disabled }}
      onPress={activate}
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
  const change = (next: boolean) => {
    if (disabled) return;
    setSelected(next);
    onChange?.({ target: { checked: next, value, name }, nativeEvent: null }, next);
  };
  useLabelActivation(() => change(!selected));
  return (
    <NativeSwitch
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="switch"
      disabled={disabled}
      value={selected}
      style={{ alignSelf: 'center' }}
      trackColor={{ true: theme.palette.primary.main }}
      onValueChange={change}
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
  const activate = (e: GestureResponderEvent) => {
    if (disabled || selected) return;
    setLocal(true);
    const event = {
      target: { checked: true, value, name: group.name },
      nativeEvent: e.nativeEvent,
    };
    onChange?.(event, true);
    group.onChange?.(event, value);
  };
  useLabelActivation(activate);
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
      onPress={activate}
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
function labelText(label: React.ReactNode): string | undefined {
  if (label == null || typeof label === 'boolean') return '';
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  if (Array.isArray(label)) {
    const parts = label.map(labelText);
    return parts.every((part) => part !== undefined) ? parts.join('') : undefined;
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(label) && label.type === React.Fragment)
    return labelText(label.props.children);
  return undefined;
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
  const activate = useRef<LabelActivation | null>(null);
  const form = useContext(FormContext);
  const inactive = disabled ?? control.props.disabled ?? form.disabled;
  const accessibleName =
    control.props['aria-label'] ?? control.props.inputProps?.['aria-label'] ?? labelText(label);
  return (
    <LabelActivationContext.Provider value={activate}>
      <Stack direction="row" style={{ alignItems: 'center', gap: 8 }}>
        {React.cloneElement(control, {
          disabled: inactive,
          'aria-label': accessibleName,
        })}
        <Pressable
          accessible={false}
          disabled={inactive}
          onPress={(event) => activate.current?.(event)}
          style={{
            flexGrow: 1,
            flexShrink: 1,
            minWidth: 0,
            minHeight: 44,
            paddingVertical: 8,
            justifyContent: 'center',
          }}
        >
          <Typography
            accessible={!accessibleName}
            color={inactive ? 'text.disabled' : 'text.primary'}
          >
            {label}
          </Typography>
        </Pressable>
      </Stack>
    </LabelActivationContext.Provider>
  );
}
