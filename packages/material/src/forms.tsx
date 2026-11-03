import type {
  NativeSelectChangeEvent,
  NativeSelectInputHandle,
  NativeSelectInputProps,
} from './nativeSelect';
import type { NativeSelectModeProps } from './select';
import { useTheme, useSx, useComponentStyle } from './themeProvider';
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
  useId,
} from 'react';
import {
  View,
  StyleSheet,
  type ViewInstance,
  type TextInstance,
  type StyleProp,
  type ViewStyle,
  Pressable,
  Switch as NativeSwitch,
  type TextInputProps,
  type TextInputInstance,
  type SwitchProps as ReactNativeSwitchProps,
} from 'react-native';
import {
  useDefaultProps,
  diagnostic,
  resolveSlotProps,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { Box, Stack, Typography, type BoxProps, type TypographyProps } from './layout';
import { useForkRef } from './utils/refs';
import { Select, type SelectProps, type SelectChangeEvent, type SelectInputHandle } from './select';
import { inputControlFilled } from './nativeInputControl';
export { useControlled, useFormControl } from './formState';
export type { InputChangeEvent } from './formState';
import {
  FormContext,
  useControlled,
  nativeLabelText,
  type FormState,
  type InputChangeEvent,
} from './formState';
import {
  NativeInputControl,
  type InputBaseProps,
  type InputBaseComponentProps,
  type OutlinedInputProps,
} from './inputs';
import { nativeInsets } from './nativeInsets';
import {
  FormLabel,
  InputLabel,
  FormHelperText,
  type InputLabelProps,
  type FormHelperTextProps,
} from './labels';
export * from './labels';
type NativeSwitchSource = Parameters<NonNullable<ReactNativeSwitchProps['onChange']>>[0];
export type NativeSwitchChangeEvent =
  | import('./checkedTypes').NativeCheckedChangeEvent
  | (Omit<NativeSwitchSource, 'target' | 'currentTarget'> & {
      target: import('./checkedTypes').NativeCheckedTarget;
      currentTarget: import('./checkedTypes').NativeCheckedTarget;
    });
export type CheckChangeEvent = NativeSwitchChangeEvent;
import { selectionEvent } from './selectionEvent';
import { useMenuEvent } from './useMenuEvent';
import { useLabelActivation } from './controlLabelContext';
export { Checkbox, Radio } from './checkControls';
export type * from './checkedTypes';
export { NativeCheckedInputSurface } from './checkControls';
export * from './controlClasses';
export { FormGroup, RadioGroup, useRadioGroup } from './controlGroups';
export type {
  FormGroupProps,
  RadioGroupProps,
  RadioGroupActions,
  RadioGroupState,
} from './controlGroups';
export { FormControlLabel } from './controlLabel';
export type {
  FormControlLabelProps,
  FormControlLabelSlots,
  FormControlLabelSlotsAndSlotProps,
  FormControlLabelTypographySlotPropsOverrides,
} from './controlLabel';
export interface FormControlProps
  extends Omit<BoxProps, 'component'>,
    Pick<
      FormState,
      | 'disabled'
      | 'error'
      | 'required'
      | 'color'
      | 'size'
      | 'variant'
      | 'hiddenLabel'
      | 'focused'
      | 'labelDisplay'
    > {
  fullWidth?: boolean;
  margin?: 'none' | 'dense' | 'normal';
  component?: BoxProps['component'] | 'div' | 'fieldset';
}
function initialInputState(children: React.ReactNode, kind: 'filled' | 'adornedStart') {
  let result = false;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<Record<string, any>>(child)) return;
    const name = (child.type as { muiName?: string }).muiName;
    if (name !== 'Input') return;
    if (kind === 'adornedStart') result ||= Boolean(child.props.startAdornment);
    else {
      const props = child.props;
      const value =
        props.value ??
        props.defaultValue ??
        props.inputProps?.value ??
        props.inputProps?.defaultValue;
      result ||= value != null && String(value).length > 0;
    }
  });
  return result;
}
export const FormControl: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormControlProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FormControlProps>(function FormControl(inProps, ref) {
  const {
    disabled = false,
    error = false,
    required = false,
    fullWidth = false,
    component,
    color = 'primary',
    size = 'medium',
    variant = 'outlined',
    hiddenLabel = false,
    labelDisplay = 'floating',
    margin = 'none',
    focused: focusedProp,
    children,
    ...props
  } = useDefaultProps({
    props: inProps,
    name: 'MuiFormControl',
  });
  const [focused, setFocused] = useState(false);
  if (disabled && focused) setFocused(false);
  const [filled, setFilled] = useState(() => initialInputState(children, 'filled'));
  const [adornedStart, setAdornedStart] = useState(() =>
    initialInputState(children, 'adornedStart'),
  );
  const [width, setWidth] = useState<number>();
  const [label, setLabel] = useState<FormState['label']>();
  const [helpers, setHelpers] = useState<NonNullable<FormState['helper']>[]>([]);
  const helper = helpers.at(-1);
  const helperEntries = useRef(new Map<symbol, NonNullable<FormState['helper']>>());
  const inputs = useRef(new Map<symbol, { id?: string; focus: () => void }>());
  const activeLabel = useRef<symbol | undefined>(undefined);
  const registerInput = useCallback((id: string | undefined, focus: () => void) => {
    if (inputs.current.size)
      diagnostic('form-control', 'Only one input should be registered in a FormControl.');
    const token = Symbol();
    inputs.current.set(token, { id, focus });
    return () => {
      inputs.current.delete(token);
    };
  }, []);
  const focusInput = useCallback(
    (id?: string) => {
      if (disabled) return;
      const input = [...inputs.current.values()].find(
        (input) => id === undefined || input.id === id,
      );
      input?.focus();
    },
    [disabled],
  );
  const registerLabel = useCallback((description: NonNullable<FormState['label']>) => {
    const token = Symbol();
    activeLabel.current = token;
    setLabel(description);
    return () => {
      if (activeLabel.current === token) {
        activeLabel.current = undefined;
        setLabel(undefined);
      }
    };
  }, []);
  const registerHelper = useCallback((description: NonNullable<FormState['helper']>) => {
    const token = Symbol();
    helperEntries.current.set(token, description);
    setHelpers([...helperEntries.current.values()]);
    return {
      update(next: NonNullable<FormState['helper']>) {
        const previous = helperEntries.current.get(token);
        if (
          !previous ||
          (previous.id === next.id &&
            previous.text === next.text &&
            previous.htmlFor === next.htmlFor &&
            previous.shrink === next.shrink)
        )
          return;
        helperEntries.current.set(token, next);
        setHelpers([...helperEntries.current.values()]);
      },
      remove() {
        if (helperEntries.current.delete(token)) setHelpers([...helperEntries.current.values()]);
      },
    };
  }, []);
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
      fullWidth,
      margin,
      labelDisplay,
      width,
      label,
      helper,
      helpers,
      registerInput,
      focusInput,
      registerLabel,
      registerHelper,
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
      fullWidth,
      margin,
      labelDisplay,
      width,
      label,
      helper,
      helpers,
      registerInput,
      focusInput,
      registerLabel,
      registerHelper,
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
  const resolved = useComponentStyle(
    'MuiFormControl',
    { ...inProps, disabled, error, required, fullWidth, color, size, variant, hiddenLabel, margin },
    props.sx,
    {
      overrideKeys: [
        `margin${margin[0].toUpperCase()}${margin.slice(1)}`,
        ...(fullWidth ? ['fullWidth'] : []),
      ],
      baseStyle: {
        position: 'relative',
        flexDirection: 'column',
        minWidth: 0,
        width: fullWidth ? '100%' : undefined,
        marginTop: margin === 'normal' ? 16 : margin === 'dense' ? 8 : 0,
        marginBottom: margin === 'normal' ? 8 : margin === 'dense' ? 4 : 0,
      },
    },
  );
  return (
    <FormContext.Provider value={context}>
      <Box
        {...props}
        component={typeof component === 'string' ? View : component}
        ref={ref}
        sx={undefined}
        onLayout={(event) => {
          setWidth(event.nativeEvent.layout.width);
          props.onLayout?.(event);
        }}
        style={[
          fullWidth ? { alignSelf: 'stretch' } : undefined,
          resolved,
          props.style,
          nativeInsets(StyleSheet.flatten(props.style), 'margin'),
          nativeInsets(StyleSheet.flatten(props.style), 'padding'),
        ]}
      >
        {children}
      </Box>
    </FormContext.Provider>
  );
});
export interface TextFieldOwnerState
  extends Omit<TextFieldProps, 'slots' | 'slotProps' | 'select'> {
  focused: boolean;
  select: boolean;
}
export type TextFieldRootSlotProps = FormControlProps & React.RefAttributes<ViewInstance>;
export type TextFieldLabelSlotProps = InputLabelProps & React.RefAttributes<TextInstance>;
export type TextFieldHelperTextSlotProps = FormHelperTextProps & React.RefAttributes<TextInstance>;
export type TextFieldHtmlInputSlotProps = InputBaseComponentProps;
type NativeSlot<P> = React.ComponentType<P>;

/** Native input-container contract, distinct from the editable htmlInput host. */
export interface NativeTextFieldInputProps
  extends Omit<InputBaseProps, 'slots' | 'slotProps' | 'inputProps'> {
  variant?: 'outlined' | 'filled' | 'standard';
  inputProps?: TextFieldHtmlInputSlotProps;
  slots?: OutlinedInputProps['slots'];
  slotProps?: OutlinedInputProps['slotProps'];
  ownerState?: TextFieldOwnerState;
  label?: React.ReactNode;
  notched?: boolean;
  disableUnderline?: boolean;
  hiddenLabel?: boolean;
}
export type TextFieldInputSlotProps = NativeTextFieldInputProps & React.RefAttributes<ViewInstance>;
export interface NativeTextFieldProps
  extends Omit<TextInputProps, 'onChange' | 'value' | 'defaultValue' | 'style'> {
  sx?: SxProps;
  style?: StyleProp<ViewStyle>;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  labelDisplay?: 'floating' | 'stacked';
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  id?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  onChange?: (event: InputChangeEvent) => void;
  inputRef?: React.Ref<TextInputInstance>;
  select?: false;
  SelectProps?: Partial<SelectProps<any>>;
  'aria-label'?: string;
  slots?: {
    root?: NativeSlot<TextFieldRootSlotProps>;
    input?: NativeSlot<TextFieldInputSlotProps>;
    htmlInput?: NativeSlot<TextFieldHtmlInputSlotProps>;
    inputLabel?: NativeSlot<TextFieldLabelSlotProps>;
    formHelperText?: NativeSlot<TextFieldHelperTextSlotProps>;
    select?: NativeSlot<SelectProps<any> & React.RefAttributes<ViewInstance>>;
  };
  slotProps?: {
    root?: SlotProps<TextFieldRootSlotProps, TextFieldOwnerState>;
    input?: SlotProps<TextFieldInputSlotProps, TextFieldOwnerState>;
    htmlInput?: SlotProps<TextFieldHtmlInputSlotProps, TextFieldOwnerState>;
    inputLabel?: SlotProps<TextFieldLabelSlotProps, TextFieldOwnerState>;
    formHelperText?: SlotProps<TextFieldHelperTextSlotProps, TextFieldOwnerState>;
    select?: SlotProps<
      Partial<SelectProps<any>> & React.RefAttributes<ViewInstance>,
      TextFieldOwnerState
    >;
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

Object.assign(NativeTextFieldInput, { muiName: 'Input' });

export type TextFieldVariants = 'outlined' | 'filled' | 'standard';
export interface TextFieldProps<
  Variant extends TextFieldVariants = TextFieldVariants,
  Value = string,
> extends Omit<
    NativeTextFieldProps,
    'select' | 'value' | 'defaultValue' | 'onChange' | 'inputRef' | 'variant'
  > {
  select?: boolean;
  variant?: Variant;
  value?: unknown;
  defaultValue?: unknown;
  onChange?: (
    event: InputChangeEvent | SelectChangeEvent<Value> | NativeSelectChangeEvent,
    child?: React.ReactNode,
  ) => void;
  inputRef?: React.Ref<TextInputInstance | SelectInputHandle<Value> | NativeSelectInputHandle>;
}
export interface TextFieldSelectProps<Value = unknown>
  extends Omit<
    TextFieldProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'inputRef'
    | 'select'
    | 'SelectProps'
    | 'slotProps'
    | 'onKeyDown'
    | 'onKeyUp'
  > {
  select: true;
  value?: Value;
  defaultValue?: Value;
  onChange?: (event: SelectChangeEvent<Value>, child: React.ReactNode) => void;
  inputRef?: React.Ref<SelectInputHandle<Value>>;
  onKeyDown?: SelectProps<Value>['onKeyDown'];
  onKeyUp?: SelectProps<Value>['onKeyUp'];
  SelectProps?: Partial<Exclude<SelectProps<Value>, { native: true }>>;
  slotProps?: Omit<NonNullable<NativeTextFieldProps['slotProps']>, 'select'> & {
    select?: SlotProps<
      Partial<Exclude<SelectProps<Value>, { native: true }>> & React.RefAttributes<ViewInstance>,
      TextFieldOwnerState
    >;
  };
}
type ConfiguredNativeSelect = Partial<NativeSelectModeProps<any>> & {
  native: true;
} & React.RefAttributes<ViewInstance>;
type NativeFieldSlots = Omit<NonNullable<NativeTextFieldProps['slotProps']>, 'select'> & {
  select?: SlotProps<ConfiguredNativeSelect, TextFieldOwnerState>;
};
export type TextFieldNativeSelectProps<Variant extends TextFieldVariants = TextFieldVariants> =
  Omit<
    NativeTextFieldProps,
    | 'select'
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'inputRef'
    | 'SelectProps'
    | 'slotProps'
    | 'variant'
    | 'onKeyDown'
    | 'onKeyUp'
  > & {
    select: true;
    variant?: Variant;
    value?: unknown;
    defaultValue?: unknown;
    onChange?: (event: NativeSelectChangeEvent) => void;
    onKeyDown?: NativeSelectInputProps['onKeyDown'];
    onKeyUp?: NativeSelectInputProps['onKeyUp'];
    inputRef?: React.Ref<NativeSelectInputHandle>;
  } & (
      | { SelectProps: ConfiguredNativeSelect; slotProps?: NativeFieldSlots }
      | {
          SelectProps?: Partial<SelectProps<any>>;
          slotProps: NativeFieldSlots & {
            select: SlotProps<ConfiguredNativeSelect, TextFieldOwnerState>;
          };
        }
    );
type TextFieldImplementationProps = Omit<NativeTextFieldProps, 'select'> & { select?: boolean };
const TextFieldImpl = forwardRef<ViewInstance, TextFieldImplementationProps>(
  function TextField(inProps, ref) {
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
      labelDisplay = 'floating',
      variant = 'outlined',
      size = 'medium',
      value,
      defaultValue: defaultValueProp,
      name,
      id: idProp,
      type = 'text',
      onChange,
      onChangeText,
      inputRef,
      slots,
      slotProps,
      select = false,
      SelectProps: legacySelectProps,
      children,
      'aria-label': ariaLabel,
      ...native
    } = props;
    const defaultValue = !select && defaultValueProp === undefined ? '' : defaultValueProp;
    const generatedId = useId();
    const hostInstance = useRef<TextInputInstance>(null);
    const [rootWidth, setRootWidth] = useState<number>();
    const [focusedLocal, setFocused] = useState(false);
    const focused = !disabled && focusedLocal;
    const ownerState = {
      ...props,
      select,
      variant,
      size,
      error,
      disabled,
      required,
      focused,
    } as unknown as TextFieldOwnerState;
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
    const selectProps =
      slotProps?.select === undefined
        ? legacySelectProps
        : resolveSlotProps(slotProps.select, ownerState);
    const initialValue =
      select && selectProps && Object.hasOwn(selectProps, 'defaultValue')
        ? selectProps.defaultValue
        : Object.prototype.hasOwnProperty.call(inputProps, 'defaultValue')
          ? select
            ? inputProps.defaultValue
            : (inputProps.defaultValue ?? '')
          : defaultValue;
    const controlledValue =
      select && selectProps && Object.hasOwn(selectProps, 'value') ? selectProps.value : value;
    const [text, setText] = useControlled<any>(controlledValue, initialValue);
    const htmlInputProps = resolveSlotProps(slotProps?.htmlInput, ownerState) ?? {};
    const inputLabelProps = resolveSlotProps(slotProps?.inputLabel, ownerState);
    const helperProps = resolveSlotProps(slotProps?.formHelperText, ownerState);
    const SelectSlot: React.ElementType = slots?.select ?? Select;
    const fieldFilled = select
      ? inputControlFilled(
          selectProps?.value !== undefined ? selectProps.value : (inputProps.value ?? text),
        )
      : String(inputProps.value ?? text ?? '').length > 0;
    const id =
      idProp ??
      htmlInputProps.nativeID ??
      inputProps.inputProps?.nativeID ??
      native.nativeID ??
      generatedId;
    const labelId = idProp
      ? `${id}-label`
      : (inputLabelProps?.id ?? inputLabelProps?.nativeID ?? `${id}-label`);
    const helperId = idProp
      ? `${id}-helper-text`
      : (helperProps?.id ?? helperProps?.nativeID ?? `${id}-helper-text`);
    const rootRef = useForkRef(ref, rootSlotRef);
    const mergedInputRef = useForkRef(hostInstance, inputRef, inputSlotInputRef);
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
    const inputElement = (
      <Input
        {...native}
        value={text}
        defaultValue={initialValue}
        name={name}
        id={id}
        type={type}
        label={variant === 'outlined' ? label : undefined}
        notched={
          labelDisplay === 'stacked'
            ? false
            : variant === 'outlined'
              ? inputLabelProps?.shrink
              : undefined
        }
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        accessibilityLabel={
          ariaLabel ?? native.accessibilityLabel ?? (typeof label === 'string' ? label : undefined)
        }
        accessibilityHint={
          native.accessibilityHint ??
          (typeof helperText === 'string' && helperText.trim() ? helperText : undefined)
        }
        onChangeText={onChangeText}
        {...inputProps}
        ref={inputSlotRef}
        inputRef={mergedInputRef}
        inputProps={{
          ...inputProps.inputProps,
          ...htmlInputProps,
          ref: mergedHostRef,
          'aria-label':
            ariaLabel ?? htmlInputProps['aria-label'] ?? inputProps.inputProps?.['aria-label'],
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
    );
    return (
      <FormContext.Provider
        value={{
          disabled,
          error,
          required,
          size,
          variant,
          labelDisplay,
          width: rootWidth,
          filled: fieldFilled,
          focused,
          adornedStart: Boolean(inputProps.startAdornment),
          label:
            label != null && label !== ''
              ? {
                  id: labelId,
                  htmlFor: id,
                  text: nativeLabelText(label),
                  shrink:
                    inputLabelProps?.shrink ??
                    Boolean(focused || fieldFilled || inputProps.startAdornment),
                }
              : undefined,
          helper:
            helperText != null
              ? { id: helperId, text: nativeLabelText(helperText)?.trim() || undefined }
              : undefined,
          focusInput: (target) => {
            if (!disabled && !inputProps.disabled && (!target || target === (inputProps.id ?? id)))
              hostInstance.current?.focus();
          },
        }}
      >
        <Root
          {...rootProps}
          {...(Root !== FormControl && Root !== View ? { ownerState } : {})}
          {...(Root !== View
            ? { disabled, error, required, fullWidth, variant, size, labelDisplay }
            : {})}
          ref={rootRef}
          onLayout={(event) => {
            if (Root !== FormControl) setRootWidth(event.nativeEvent.layout.width);
            rootProps.onLayout?.(event);
          }}
          style={[
            {
              alignSelf: fullWidth ? 'stretch' : undefined,
              gap: labelDisplay === 'stacked' ? 4 : 0,
            },
            resolved,
            style,
            rootSlotStyle,
            rootStyle,
          ]}
        >
          {label != null && label !== '' ? (
            <Label
              htmlFor={id}
              {...inputLabelProps}
              {...(Label !== InputLabel ? { ownerState } : {})}
              nativeID={labelId}
            >
              {label}
            </Label>
          ) : null}
          {select ? (
            <SelectSlot
              id={id}
              labelId={labelId}
              aria-describedby={helperText != null ? helperId : undefined}
              value={controlledValue}
              input={inputElement}
              {...(labelDisplay === 'stacked' ? { notched: false } : {})}
              {...selectProps}
              onChange={(
                event: SelectChangeEvent<any> | NativeSelectChangeEvent,
                child?: React.ReactNode,
              ) => {
                setText(event.target.value);
                const callback = (selectProps?.onChange ?? inputProps.onChange ?? onChange) as any;
                if ('selectedOptions' in event.target) callback?.(event);
                else callback?.(event, child);
              }}
            >
              {children}
            </SelectSlot>
          ) : (
            inputElement
          )}
          {helperText != null ? (
            <Helper
              {...helperProps}
              {...(Helper !== FormHelperText ? { ownerState } : {})}
              nativeID={helperId}
            >
              {helperText}
            </Helper>
          ) : null}
        </Root>
      </FormContext.Provider>
    );
  },
);
export const TextField = TextFieldImpl as unknown as {
  (props: NativeTextFieldProps & React.RefAttributes<ViewInstance>): React.ReactElement;
  <Variant extends TextFieldVariants = TextFieldVariants>(
    props: TextFieldNativeSelectProps<Variant> & React.RefAttributes<ViewInstance>,
  ): React.ReactElement;
  <Value = unknown>(
    props: TextFieldSelectProps<Value> & React.RefAttributes<ViewInstance>,
  ): React.ReactElement;
  <Variant extends TextFieldVariants = TextFieldVariants, Value = string>(
    props: TextFieldProps<Variant, Value> & React.RefAttributes<ViewInstance>,
  ): React.ReactElement;
};
export interface SwitchProps {
  accessibilityLabel?: string;
  accessibilityLabelledBy?: ReactNativeSwitchProps['accessibilityLabelledBy'];
  'aria-labelledby'?: ReactNativeSwitchProps['aria-labelledby'];
  required?: boolean;
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  value?: string;
  name?: string;
  onChange?: (event: CheckChangeEvent, checked: boolean) => void;
  size?: 'small' | 'medium';
  sx?: SxProps;
  inputProps?: { 'aria-label'?: string };
  'aria-label'?: string;
  testID?: string;
}
export function Switch(inProps: SwitchProps) {
  const {
    checked,
    defaultChecked = false,
    disabled,
    required = false,
    id = '',
    accessibilityLabel,
    accessibilityLabelledBy,
    'aria-labelledby': labelledBy,
    onChange,
    name,
    value,
    'aria-label': label,
    testID,
  } = useDefaultProps({ props: inProps, name: 'MuiSwitch' });

  const [selected, setSelected] = useControlled(checked, defaultChecked);
  const theme = useTheme();
  const change = useMenuEvent(
    (
      next: boolean,
      source: NativeSwitchSource | import('./buttonBase').ButtonBaseActivationEvent,
    ) => {
      if (disabled || source.defaultPrevented || source.isDefaultPrevented?.()) return;
      const event = selectionEvent(source, {
        checked: next,
        value: value ?? 'on',
        name: name ?? '',
        id,
        type: 'checkbox',
        indeterminate: false,
        disabled: Boolean(disabled),
        readOnly: false,
        required,
        node: null,
      }) as NativeSwitchChangeEvent;
      setSelected(next);
      onChange?.(event, next);
    },
  );
  useLabelActivation((source) => change(!selected, source));
  return (
    <NativeSwitch
      testID={testID}
      accessibilityLabel={label ?? accessibilityLabel}
      accessibilityLabelledBy={labelledBy ?? accessibilityLabelledBy}
      accessibilityRole="switch"
      disabled={disabled}
      value={selected}
      style={{ alignSelf: 'center' }}
      trackColor={{ true: theme.palette.primary.main }}
      nativeID={id || undefined}
      aria-required={required}
      onChange={(event) => change(event.nativeEvent.value, event)}
    />
  );
}
