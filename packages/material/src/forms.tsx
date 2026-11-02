import React, {
  createContext,
  useContext,
  useRef,
  useState,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  type ViewInstance,
  type TextInstance,
  type StyleProp,
  type ViewStyle,
  Pressable,
  Switch as NativeSwitch,
  type TextInputProps,
  type TextInputInstance,
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
export { useControlled, useFormControl } from './formState';
export type { InputChangeEvent } from './formState';
import { FormContext, useControlled, type FormState, type InputChangeEvent } from './formState';
import { NativeInputControl } from './inputs';
export type CheckChangeEvent = {
  target: { checked: boolean; value?: string; name?: string };
  nativeEvent: GestureResponderEvent['nativeEvent'] | null;
};
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
export interface FormControlProps
  extends BoxProps,
    Omit<
      FormState,
      'onFocus' | 'onBlur' | 'onFilled' | 'onEmpty' | 'setAdornedStart' | 'filled' | 'adornedStart'
    > {
  fullWidth?: boolean;
}
export const FormControl: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormControlProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FormControlProps>(function FormControl(inProps, ref) {
  const {
    disabled,
    error,
    required,
    fullWidth,
    color,
    size,
    variant,
    hiddenLabel,
    focused: focusedProp,
    children,
    ...props
  } = useDefaultProps({
    props: inProps,
    name: 'MuiFormControl',
  });
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);
  const [adornedStart, setAdornedStart] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  const onFilled = useCallback(() => setFilled(true), []);
  const onEmpty = useCallback(() => setFilled(false), []);
  const context = useMemo(
    () => ({
      disabled,
      error,
      required,
      color,
      size,
      variant,
      hiddenLabel,
      focused: !disabled && (focusedProp ?? focused),
      filled,
      adornedStart,
      onFocus,
      onBlur,
      onFilled,
      onEmpty,
      setAdornedStart,
    }),
    [
      disabled,
      error,
      required,
      color,
      size,
      variant,
      hiddenLabel,
      focusedProp,
      focused,
      filled,
      adornedStart,
      onFocus,
      onBlur,
      onFilled,
      onEmpty,
    ],
  );
  return (
    <FormContext.Provider value={context}>
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
  const state = useContext(FormContext) ?? {};
  return (
    <Typography
      {...props}
      ref={ref}
      color={
        state.error
          ? 'error.main'
          : (props.color ??
            (state.disabled
              ? 'text.disabled'
              : state.focused
                ? `${state.color ?? 'primary'}.main`
                : 'text.secondary'))
      }
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
  const state = useContext(FormContext) ?? {};
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
    Pick<FormState, 'disabled' | 'error' | 'required'> {
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
  { variant = 'outlined', ownerState, slots, testID, ...props },
  ref,
) {
  return (
    <NativeInputControl
      {...props}
      ref={ref}
      variant={variant}
      ownerStateOverride={ownerState}
      slots={slots as import('./inputs').InputBaseProps['slots']}
      inputProps={{ ...props.inputProps, testID: props.inputProps?.testID ?? testID }}
    />
  );
});

export const TextField: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<TextFieldProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, TextFieldProps>(function TextField(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiTextField' });
  const form = useContext(FormContext) ?? {};
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
  const [focusedLocal, setFocused] = useState(false);
  const focused = !disabled && focusedLocal;
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
  useEffect(() => {
    if (disabled || inputProps.disabled === true) setFocused(false);
  }, [disabled, inputProps.disabled]);
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
  const form = useContext(FormContext) ?? {};
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
