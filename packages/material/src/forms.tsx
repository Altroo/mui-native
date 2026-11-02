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
  type TextInstance,
  type StyleProp,
  type ViewStyle,
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
  useDefaultProps,
  useComponentStyle,
  useSx,
  resolveSlotProps,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { Box, Stack, Typography, type BoxProps, type TypographyProps } from './layout';
import { useForkRef } from './utils/refs';
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
export const FormControl: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormControlProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FormControlProps>(function FormControl(inProps, ref) {
  const { disabled, error, required, fullWidth, children, ...props } = useDefaultProps({
    props: inProps,
    name: 'MuiFormControl',
  });
  return (
    <FormContext.Provider value={{ disabled, error, required }}>
      <Box
        {...props}
        ref={ref}
        style={[fullWidth ? { alignSelf: 'stretch' } : undefined, props.style]}
      >
        {children}
      </Box>
    </FormContext.Provider>
  );
});
export const FormLabel: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TypographyProps> & React.RefAttributes<TextInstance>
> = forwardRef<TextInstance, TypographyProps>(function FormLabel(inProps, ref) {
  const { children, ...props } = useDefaultProps({ props: inProps, name: 'MuiFormLabel' });
  const state = useContext(FormContext);
  return (
    <Typography
      {...props}
      ref={ref}
      color={state.error ? 'error.main' : (props.color ?? 'text.secondary')}
    >
      {children}
      {state.required ? ' *' : ''}
    </Typography>
  );
});
export const InputLabel: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TypographyProps> & React.RefAttributes<TextInstance>
> = forwardRef<TextInstance, TypographyProps>(function InputLabel(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiInputLabel' });
  return <FormLabel {...props} ref={ref} />;
});
export const FormHelperText: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TypographyProps> & React.RefAttributes<TextInstance>
> = forwardRef<TextInstance, TypographyProps>(function FormHelperText(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiFormHelperText' });
  const state = useContext(FormContext);
  return (
    <Typography
      {...props}
      ref={ref}
      variant={props.variant ?? 'caption'}
      color={state.error ? 'error.main' : (props.color ?? 'text.secondary')}
    />
  );
});
export interface TextFieldOwnerState extends Omit<TextFieldProps, 'slots' | 'slotProps'> {
  focused: boolean;
}
export type TextFieldRootSlotProps = FormControlProps & React.RefAttributes<ViewInstance>;
export type TextFieldLabelSlotProps = TypographyProps & React.RefAttributes<TextInstance>;
export type TextFieldHtmlInputSlotProps = TextInputProps & React.RefAttributes<TextInputInstance>;
type NativeSlot<P> = React.ComponentType<P & { ownerState?: TextFieldOwnerState }>;

/** Native input-container contract, distinct from the editable htmlInput host. */
export interface NativeTextFieldInputProps
  extends Omit<TextInputProps, 'onChange' | 'value' | 'defaultValue' | 'style'>,
    FormState {
  sx?: SxProps;
  style?: StyleProp<ViewStyle>;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  id?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  onChange?: (event: InputChangeEvent) => void;
  inputRef?: React.Ref<TextInputInstance>;
  inputProps?: TextFieldHtmlInputSlotProps;
  slots?: { input?: NativeSlot<TextFieldHtmlInputSlotProps> };
  ownerState?: TextFieldOwnerState;
}
export type TextFieldInputSlotProps = NativeTextFieldInputProps & React.RefAttributes<ViewInstance>;
export interface TextFieldProps
  extends Omit<TextInputProps, 'onChange' | 'value' | 'defaultValue' | 'style'> {
  sx?: SxProps;
  style?: StyleProp<ViewStyle>;
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
  slots?: {
    root?: NativeSlot<TextFieldRootSlotProps>;
    input?: NativeSlot<TextFieldInputSlotProps>;
    htmlInput?: NativeSlot<TextFieldHtmlInputSlotProps>;
    inputLabel?: NativeSlot<TextFieldLabelSlotProps>;
    formHelperText?: NativeSlot<TextFieldLabelSlotProps>;
  };
  slotProps?: {
    root?: SlotProps<TextFieldRootSlotProps, TextFieldOwnerState>;
    input?: SlotProps<TextFieldInputSlotProps, TextFieldOwnerState>;
    htmlInput?: SlotProps<TextFieldHtmlInputSlotProps, TextFieldOwnerState>;
    inputLabel?: SlotProps<TextFieldLabelSlotProps, TextFieldOwnerState>;
    formHelperText?: SlotProps<TextFieldLabelSlotProps, TextFieldOwnerState>;
  };
}

/** Compose this native adapter when replacing TextField's input-container slot. */
export const NativeTextFieldInput: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeTextFieldInputProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, NativeTextFieldInputProps>(function NativeTextFieldInput(
  {
    sx,
    style,
    variant = 'outlined',
    size = 'medium',
    fullWidth,
    error: errorProp,
    disabled: disabledProp,
    required: _required,
    value,
    defaultValue = '',
    name,
    id,
    type = 'text',
    onChange,
    onChangeText,
    inputRef,
    inputProps = {},
    slots,
    ownerState,
    ...native
  },
  ref,
) {
  const form = useContext(FormContext);
  const error = errorProp ?? form.error ?? false;
  const disabled = disabledProp ?? form.disabled ?? false;
  const [text, setText] = useControlled(value, defaultValue);
  const theme = useTheme();
  const wrapperStyle = useSx(sx);
  const { ref: hostRef, ...hostProps } = inputProps;
  const input = { ...native, ...hostProps };
  const inputTypography = useSx(
    { typography: 'body1' },
    {
      nativeStyle: StyleSheet.flatten(input.style) ?? undefined,
    },
  );
  const mergedRef = useForkRef(inputRef, hostRef);
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? theme.palette.error.main
    : focused
      ? theme.palette.primary.main
      : theme.palette.divider;
  // No lower-level alias may re-enable a disabled or explicitly read-only input.
  const readOnly =
    disabled ||
    native.readOnly === true ||
    native.editable === false ||
    hostProps.readOnly === true ||
    hostProps.editable === false;
  const Host = slots?.input ?? TextInput;
  return (
    <View ref={ref} style={[fullWidth ? { alignSelf: 'stretch' } : undefined, wrapperStyle, style]}>
      <Host
        {...input}
        {...(Host !== TextInput ? { ownerState } : {})}
        ref={mergedRef}
        nativeID={id ?? input.nativeID}
        accessibilityState={{ ...input.accessibilityState, disabled }}
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
        onChange={(event) => {
          const next = event.nativeEvent.text;
          setText(next);
          const target = { value: next, name, id };
          onChange?.({ target, currentTarget: target, nativeEvent: event.nativeEvent });
          onChangeText?.(next);
          hostProps.onChange?.(event);
          if (hostProps.onChangeText !== onChangeText) hostProps.onChangeText?.(next);
        }}
        onChangeText={undefined}
        onFocus={(event) => {
          setFocused(true);
          native.onFocus?.(event);
          if (hostProps.onFocus !== native.onFocus) hostProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          native.onBlur?.(event);
          if (hostProps.onBlur !== native.onBlur) hostProps.onBlur?.(event);
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
          hostProps.style,
        ]}
      />
    </View>
  );
});

export const TextField: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TextFieldProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, TextFieldProps>(function TextField(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiTextField' });
  const form = useContext(FormContext);
  const {
    sx,
    style,
    label,
    helperText,
    error = form.error ?? false,
    disabled = form.disabled ?? false,
    required = form.required ?? false,
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
    slots,
    slotProps,
    'aria-label': ariaLabel,
    ...native
  } = props;
  const [focused, setFocused] = useState(false);
  const ownerState = { ...props, variant, size, error, disabled, required, focused };
  const {
    ref: rootSlotRef,
    sx: rootSx,
    style: rootStyle,
    ...rootProps
  } = resolveSlotProps(slotProps?.root, ownerState) ?? {};
  const {
    ref: inputSlotRef,
    inputRef: inputSlotInputRef,
    ...inputProps
  } = resolveSlotProps(slotProps?.input, ownerState) ?? {};
  const initialValue = Object.prototype.hasOwnProperty.call(inputProps, 'defaultValue')
    ? (inputProps.defaultValue ?? '')
    : defaultValue;
  const [text, setText] = useControlled(value, initialValue);
  const htmlInputProps = resolveSlotProps(slotProps?.htmlInput, ownerState) ?? {};
  const inputLabelProps = resolveSlotProps(slotProps?.inputLabel, ownerState);
  const helperProps = resolveSlotProps(slotProps?.formHelperText, ownerState);
  const rootRef = useForkRef(ref, rootSlotRef);
  const mergedInputRef = useForkRef(inputRef, inputSlotInputRef);
  const mergedHostRef = useForkRef(inputProps.inputProps?.ref, htmlInputProps.ref);
  const resolved = useComponentStyle('MuiTextField', ownerState, sx, {
    states: [
      ...(focused ? ['focused'] : []),
      ...(error ? ['error'] : []),
      ...(disabled ? ['disabled'] : []),
    ],
  });
  const rootSlotStyle = useSx(rootSx);
  const Root = slots?.root ?? FormControl;
  const Input = slots?.input ?? NativeTextFieldInput;
  const Label = slots?.inputLabel ?? InputLabel;
  const Helper = slots?.formHelperText ?? FormHelperText;
  const change = (event: InputChangeEvent) => {
    setText(event.target.value);
    (inputProps.onChange ?? onChange)?.(event);
  };
  return (
    <FormContext.Provider value={{ disabled, error, required }}>
      <Root
        {...rootProps}
        {...(Root !== FormControl && Root !== View ? { ownerState } : {})}
        {...(Root !== View ? { disabled, error, required, fullWidth } : {})}
        ref={rootRef}
        style={[
          { alignSelf: fullWidth ? 'stretch' : undefined, gap: 4 },
          resolved,
          style,
          rootSlotStyle,
          rootStyle,
        ]}
      >
        {label != null && label !== '' ? (
          <Label
            {...inputLabelProps}
            {...(Label !== InputLabel ? { ownerState } : {})}
            nativeID={id ? `${id}-label` : inputLabelProps?.nativeID}
          >
            {label}
          </Label>
        ) : null}
        <Input
          {...native}
          value={text}
          name={name}
          id={id}
          type={type}
          variant={variant}
          size={size}
          fullWidth={fullWidth}
          accessibilityLabel={
            ariaLabel ??
            native.accessibilityLabel ??
            (typeof label === 'string' ? label : undefined)
          }
          accessibilityHint={
            native.accessibilityHint ?? (typeof helperText === 'string' ? helperText : undefined)
          }
          onChangeText={onChangeText}
          {...inputProps}
          ref={inputSlotRef}
          inputRef={mergedInputRef}
          inputProps={{
            ...inputProps.inputProps,
            ...htmlInputProps,
            ref: mergedHostRef,
            onFocus:
              (htmlInputProps.onFocus ?? inputProps.inputProps?.onFocus) ===
              (inputProps.onFocus ?? native.onFocus)
                ? undefined
                : (htmlInputProps.onFocus ?? inputProps.inputProps?.onFocus),
            onBlur:
              (htmlInputProps.onBlur ?? inputProps.inputProps?.onBlur) ===
              (inputProps.onBlur ?? native.onBlur)
                ? undefined
                : (htmlInputProps.onBlur ?? inputProps.inputProps?.onBlur),
            accessibilityLabel:
              ariaLabel ??
              htmlInputProps.accessibilityLabel ??
              inputProps.inputProps?.accessibilityLabel ??
              inputProps.accessibilityLabel ??
              native.accessibilityLabel ??
              (typeof label === 'string' ? label : undefined),
          }}
          slots={{ ...inputProps.slots, ...(slots?.htmlInput ? { input: slots.htmlInput } : {}) }}
          ownerState={ownerState}
          disabled={disabled || inputProps.disabled === true}
          error={inputProps.error ?? error}
          required={inputProps.required ?? required}
          readOnly={native.readOnly === true || inputProps.readOnly === true}
          editable={
            native.editable === false || inputProps.editable === false
              ? false
              : (inputProps.editable ?? native.editable)
          }
          onChange={change}
          onFocus={(event) => {
            setFocused(true);
            (inputProps.onFocus ?? native.onFocus)?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            (inputProps.onBlur ?? native.onBlur)?.(event);
          }}
        />
        {helperText != null ? (
          <Helper
            {...helperProps}
            {...(Helper !== FormHelperText ? { ownerState } : {})}
            nativeID={id ? `${id}-helper-text` : helperProps?.nativeID}
          >
            {helperText}
          </Helper>
        ) : null}
      </Root>
    </FormContext.Provider>
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
export function Checkbox(inProps: CheckboxProps) {
  const {
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
  } = useDefaultProps({ props: inProps, name: 'MuiCheckbox' });

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
export function Switch(inProps: CheckboxProps) {
  const {
    checked,
    defaultChecked = false,
    disabled,
    onChange,
    name,
    value,
    'aria-label': label,
    testID,
  } = useDefaultProps({ props: inProps, name: 'MuiSwitch' });

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
export function RadioGroup(inProps: RadioGroupProps) {
  const {
    value,
    defaultValue = '',
    name,
    onChange,
    row,
    children,
    ...props
  } = useDefaultProps({ props: inProps, name: 'MuiRadioGroup' });

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
export function Radio(inProps: CheckboxProps) {
  const {
    value = '',
    checked,
    defaultChecked = false,
    onChange,
    disabled,
    'aria-label': label,
    testID,
  } = useDefaultProps({ props: inProps, name: 'MuiRadio' });

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
export function FormControlLabel(inProps: {
  control: React.ReactElement<CheckboxProps>;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  const { control, label, disabled } = useDefaultProps({
    props: inProps,
    name: 'MuiFormControlLabel',
  });

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
