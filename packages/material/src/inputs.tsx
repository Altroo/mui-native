import React, { forwardRef, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  I18nManager,
  type ViewProps,
  type ViewInstance,
  type TextInputProps,
  type TextInputInstance,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import {
  useDefaultProps,
  useTheme,
  useSx,
  useComponentStyle,
  resolveSlotProps,
  diagnostic,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { Typography } from './typography';
import { FormContext, useControlled, type InputChangeEvent } from './formState';
import { useForkRef } from './utils/refs';
import { nativeInsets } from './nativeInsets';

export interface InputBasePropsSizeOverrides {}
export interface InputBasePropsColorOverrides {}
type OverrideUnion<Base extends string, Overrides> = Extract<
  {
    [K in keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)]: true extends (Omit<
      Record<Base, true>,
      keyof Overrides
    > &
      Overrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<Base, true>, keyof Overrides> & Overrides)],
  string
>;
export type InputSize = OverrideUnion<'small' | 'medium', InputBasePropsSizeOverrides>;
export type InputColor = OverrideUnion<
  'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning',
  InputBasePropsColorOverrides
>;
export type InputRootProps = ViewProps & { sx?: SxProps } & React.RefAttributes<ViewInstance>;
export type InputBaseComponentProps = TextInputProps & {
  sx?: SxProps;
  'aria-describedby'?: string;
} & React.RefAttributes<TextInputInstance>;
export interface InputBaseOwnerState
  extends Omit<InputBaseProps, 'slots' | 'slotProps' | 'color' | 'size'> {
  color: string;
  size: string;
  focused: boolean;
  filled: boolean;
  disabled: boolean;
  error: boolean;
  required: boolean;
}
type RootSlot = React.ComponentType<InputRootProps & { ownerState?: InputBaseOwnerState }>;
type InputSlot = React.ComponentType<
  InputBaseComponentProps & { ownerState?: InputBaseOwnerState }
>;
export interface InputBaseProps
  extends Omit<
    TextInputProps,
    'onChange' | 'value' | 'defaultValue' | 'style' | 'children' | 'rows'
  > {
  sx?: SxProps;
  style?: StyleProp<ViewStyle>;
  component?: RootSlot;
  color?: InputColor;
  size?: InputSize;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  margin?: 'dense' | 'none';
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  id?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  onChange?: (event: InputChangeEvent) => void;
  onClick?: (event: GestureResponderEvent) => void;
  inputRef?: React.Ref<TextInputInstance>;
  inputProps?: InputBaseComponentProps;
  inputComponent?: InputSlot;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  renderSuffix?: (state: InputBaseOwnerState) => React.ReactNode;
  rows?: number | string;
  minRows?: number | string;
  maxRows?: number | string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  slots?: { root?: RootSlot; input?: InputSlot };
  slotProps?: {
    root?: InputRootProps;
    input?: InputBaseComponentProps;
  };
}
export interface InputProps extends InputBaseProps {
  disableUnderline?: boolean;
}
export interface FilledInputProps extends InputProps {
  hiddenLabel?: boolean;
}
export type NotchedOutlineProps = InputRootProps & { label?: React.ReactNode; notched?: boolean };
export interface OutlinedInputProps extends Omit<InputBaseProps, 'slots' | 'slotProps'> {
  label?: React.ReactNode;
  notched?: boolean;
  slots?: InputBaseProps['slots'] & {
    notchedOutline?: React.ComponentType<
      NotchedOutlineProps & { ownerState?: InputBaseOwnerState }
    >;
  };
  slotProps?: InputBaseProps['slotProps'] & {
    notchedOutline?: SlotProps<NotchedOutlineProps, InputBaseOwnerState>;
  };
}
type Variant = 'base' | 'standard' | 'filled' | 'outlined';
type EngineProps = InputBaseProps & {
  ownerState?: object;
  disableUnderline?: boolean;
  hiddenLabel?: boolean;
  label?: React.ReactNode;
  notched?: boolean;
  slots?: OutlinedInputProps['slots'];
  slotProps?: OutlinedInputProps['slotProps'];
};
const names = {
  base: 'MuiInputBase',
  standard: 'MuiInput',
  filled: 'MuiFilledInput',
  outlined: 'MuiOutlinedInput',
};
const paddingEdges = (style: Readonly<Partial<ViewStyle>> | undefined) =>
  nativeInsets(style, 'padding');
function rowCount(value: string | number | undefined, name: string) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (Number.isInteger(number) && number > 0) return number;
  diagnostic('input', `${name} must be a positive integer.`);
  return undefined;
}
function content(node: React.ReactNode) {
  return React.Children.map(node, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <Typography>{child}</Typography>
    ) : (
      child
    ),
  );
}
const NotchedOutline = forwardRef<ViewInstance, NotchedOutlineProps>(function NotchedOutline(
  { label, notched, style, sx, ...props },
  ref,
) {
  const [width, setWidth] = useState(0);
  const [labelWidth, setLabelWidth] = useState(0);
  const resolved = useSx(sx);
  const border = StyleSheet.flatten([resolved, style]) ?? {};
  const metrics = useSx({ typography: 'body1' });
  const gap =
    notched && label != null && label !== '' && labelWidth > 0
      ? Math.min(labelWidth + 8, Math.max(0, width - 28))
      : 0;
  return (
    <View
      {...props}
      ref={ref}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        props.onLayout?.(e);
      }}
      style={[
        StyleSheet.absoluteFill,
        resolved,
        style,
        {
          borderWidth: 0,
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
        },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderColor: border.borderColor,
            borderWidth: border.borderWidth,
            borderRadius: border.borderRadius,
            borderStyle: border.borderStyle,
            borderTopWidth: gap ? 0 : border.borderWidth,
          },
        ]}
      />
      {gap ? (
        <>
          <View
            style={{
              position: 'absolute',
              top: 0,
              start: 0,
              width: 14,
              height: border.borderWidth,
              backgroundColor: border.borderColor,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              start: 14 + gap,
              end: 0,
              height: border.borderWidth,
              backgroundColor: border.borderColor,
            }}
          />
        </>
      ) : null}
      {label != null && label !== '' ? (
        <Typography
          variant="body1"
          noWrap
          onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
          style={{
            position: 'absolute',
            start: 14,
            maxWidth: '85%',
            opacity: 0,
            fontSize: Number(metrics.fontSize ?? 16) * 0.75,
          }}
        >
          {label}
        </Typography>
      ) : null}
    </View>
  );
});
function InputEngine({
  inProps,
  variant,
  nativeHostEventsLast = false,
  ownerStateOverride,
  forwardedRef,
}: {
  inProps: EngineProps;
  variant: Variant;
  nativeHostEventsLast?: boolean;
  ownerStateOverride?: object;
  forwardedRef: React.ForwardedRef<ViewInstance>;
}) {
  const variantDefaults = useDefaultProps({ props: inProps, name: names[variant] });
  const baseDefaults = useDefaultProps({ props: variantDefaults, name: 'MuiInputBase' });
  const props = variant === 'base' ? variantDefaults : baseDefaults;
  const form = useContext(FormContext);
  const {
    sx,
    style,
    component,
    color = form?.color ?? 'primary',
    size = form?.size ?? 'medium',
    disabled = form?.disabled ?? false,
    error = form?.error ?? false,
    required = form?.required ?? false,
    fullWidth,
    margin,
    value,
    defaultValue = '',
    name,
    id,
    type = 'text',
    inputRef,
    inputProps = {},
    inputComponent,
    slots,
    slotProps,
    startAdornment,
    endAdornment,
    renderSuffix,
    rows,
    minRows,
    maxRows,
    onChange,
    onChangeText,
    onFocus,
    onBlur,
    onClick,
    testID,
    ownerState: _externalOwnerState,
    disableUnderline,
    hiddenLabel = form?.hiddenLabel ?? false,
    label,
    notched,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    ...native
  } = props;
  const [focusedLocal, setFocused] = useState(false);
  const focused = !disabled && (form?.focused ?? focusedLocal);
  const rootProps = slotProps?.root ?? {};
  const slotInput = slotProps?.input ?? {};
  const resolvedHost = { ...inputProps, ...slotInput };
  const { value: _hostValue, defaultValue: _hostDefault, ...managedHost } = resolvedHost;
  // Apply the TextField policy after both variant and base theme defaults.
  const host: InputBaseComponentProps = nativeHostEventsLast ? managedHost : resolvedHost;
  const [text, setText] = useControlled(
    host.value ?? value,
    Object.prototype.hasOwnProperty.call(host, 'defaultValue')
      ? (host.defaultValue ?? '')
      : defaultValue,
  );
  const filled = String(text ?? '').length > 0;
  const ownerState = {
    ...props,
    ...ownerStateOverride,
    color,
    size,
    disabled,
    error,
    required,
    focused,
    filled,
  };
  const theme = useTheme();
  const states = [
    ...(focused ? ['focused'] : []),
    ...(disabled ? ['disabled'] : []),
    ...(error ? ['error'] : []),
  ];
  const baseStyle = useComponentStyle(
    'MuiInputBase',
    ownerState,
    variant === 'base' ? sx : undefined,
    { states },
  );
  const variantStyle = useComponentStyle(
    names[variant],
    ownerState,
    variant === 'base' ? undefined : sx,
    { states },
  );
  const rootSx = useSx(rootProps.sx);
  const inputOverride = (name: string, slot = 'input') => {
    const config = theme.components[name];
    const override =
      config && typeof config === 'object' ? config.styleOverrides?.[slot] : undefined;
    return typeof override === 'function' ? override({ theme, ownerState }) : override;
  };
  const typography = useSx(
    [
      { typography: 'body1' },
      inputOverride('MuiInputBase'),
      variant !== 'base' ? inputOverride(names[variant]) : undefined,
      host.sx,
    ].flat() as SxProps,
    { nativeStyle: StyleSheet.flatten(host.style) ?? undefined },
  );
  const innerRef = useRef<TextInputInstance>(null);
  const nativeFocused = useRef(false);
  const rootRef = useForkRef(forwardedRef, rootProps.ref);
  const hostRef = useForkRef(innerRef, inputRef, inputProps.ref, slotInput.ref);
  useLayoutEffect(
    () =>
      form?.registerInput?.(id ?? host.nativeID, () => {
        if (!disabled) innerRef.current?.focus();
      }),
    [form?.registerInput, id, host.nativeID, disabled],
  );
  useLayoutEffect(() => {
    if (filled) form?.onFilled?.();
    else form?.onEmpty?.();
  }, [filled, form?.onFilled, form?.onEmpty]);
  useLayoutEffect(() => {
    form?.setAdornedStart?.(Boolean(startAdornment));
  }, [Boolean(startAdornment), form?.setAdornedStart]);
  useEffect(() => {
    if (disabled) {
      if (nativeFocused.current) innerRef.current?.blur?.();
      nativeFocused.current = false;
      setFocused(false);
      form?.onBlur?.();
    }
  }, [disabled, form?.onBlur]);
  const [contentHeight, setContentHeight] = useState<number>();
  const multiline = host.multiline ?? native.multiline ?? false;
  const fixedRows = multiline ? rowCount(rows, 'rows') : undefined;
  const minimum = fixedRows ?? (multiline ? rowCount(minRows, 'minRows') : undefined) ?? 1;
  const maximum = fixedRows ?? (multiline ? rowCount(maxRows, 'maxRows') : undefined);
  if (maximum !== undefined && maximum < minimum)
    diagnostic('input', 'maxRows must be at least minRows.');
  const lineHeight = Number(typography.lineHeight) || (Number(typography.fontSize) || 16) * 1.5;
  const paddingTop =
    variant === 'base'
      ? 0
      : variant === 'filled' && !hiddenLabel
        ? size === 'small'
          ? 21
          : 25
        : variant === 'standard'
          ? size === 'small'
            ? 1
            : 4
          : size === 'small'
            ? 10
            : 16;
  const paddingBottom =
    variant === 'filled' && !hiddenLabel
      ? 8
      : variant === 'base'
        ? 0
        : variant === 'standard'
          ? 5
          : size === 'small'
            ? 10
            : 16;
  const themedPadding = paddingEdges(typography);
  const callerPadding = paddingEdges(StyleSheet.flatten(host.style) ?? undefined);
  const framed = variant === 'outlined' || variant === 'filled';
  // Native left/right values already swap in RTL when that platform option is enabled.
  const mapPhysicalSides = I18nManager.isRTL && !I18nManager.doLeftAndRightSwapInRTL;
  const leftAdornment = mapPhysicalSides ? endAdornment : startAdornment;
  const rightAdornment = mapPhysicalSides ? startAdornment : endAdornment;
  const topInset = Number(callerPadding.paddingTop ?? themedPadding.paddingTop ?? paddingTop);
  const bottomInset = Number(
    callerPadding.paddingBottom ?? themedPadding.paddingBottom ?? paddingBottom,
  );
  const verticalInset =
    (Number.isFinite(topInset) ? topInset : paddingTop) +
    (Number.isFinite(bottomInset) ? bottomInset : paddingBottom);
  const minHeight = Math.max(44, minimum * lineHeight + verticalInset);
  const maxHeight =
    maximum === undefined ? undefined : Math.max(minHeight, maximum * lineHeight + verticalInset);
  const height =
    multiline && (fixedRows || contentHeight !== undefined)
      ? Math.min(maxHeight ?? Infinity, Math.max(minHeight, contentHeight ?? minHeight))
      : undefined;
  const input = { ...native, ...host };
  const readOnly =
    disabled ||
    native.readOnly === true ||
    native.editable === false ||
    host.readOnly === true ||
    host.editable === false;
  const palette = (theme.palette as unknown as Record<string, { main?: string }>)[color];
  const activeColor = palette?.main ?? theme.palette.primary.main;
  const borderColor = disabled
    ? theme.palette.action.disabled
    : error
      ? theme.palette.error.main
      : focused
        ? activeColor
        : theme.palette.divider;
  const Root = slots?.root ?? component ?? View;
  const Host = slots?.input ?? inputComponent ?? TextInput;
  const Outline = slots?.notchedOutline ?? NotchedOutline;
  const outlineProps = resolveSlotProps(slotProps?.notchedOutline, ownerState) ?? {};
  const outlineStyle = useSx(
    [inputOverride(names[variant], 'notchedOutline'), outlineProps.sx].flat() as SxProps,
  );
  const labelShrink =
    form?.label?.shrink ?? Boolean(form?.filled || form?.focused || form?.adornedStart);
  const labelRelations = input['aria-labelledby'] ?? input.accessibilityLabelledBy;
  const relationIds =
    typeof labelRelations === 'string' ? labelRelations.split(/\s+/) : labelRelations;
  const linkedLabel =
    form?.label &&
    (!form.label.htmlFor || form.label.htmlFor === (id ?? input.nativeID)) &&
    (!relationIds || (form.label.id && relationIds.includes(form.label.id)))
      ? form.label
      : undefined;
  const explicitLabel = host['aria-label'] ?? ariaLabel ?? input.accessibilityLabel;
  const describedby = host['aria-describedby'] ?? ariaDescribedby;
  const helpers = form?.helpers ?? (form?.helper ? [form.helper] : []);
  const helperIds =
    describedby === undefined ? undefined : [...new Set(describedby.split(/\s+/).filter(Boolean))];
  const helpText =
    (helperIds
      ? helperIds.map((id) => helpers.find((helper) => helper.id === id)?.text)
      : helpers.map((helper) => helper.text)
    )
      .filter(Boolean)
      .join(' ') || undefined;
  const { sx: _rootSx, ref: _rootRef, ...rootNative } = rootProps;
  const {
    sx: _inputSx,
    ref: _hostRef,
    'aria-label': _hostAriaLabel,
    'aria-describedby': _hostAriaDescription,
    ...hostNative
  } = input;
  return (
    <Root
      {...rootNative}
      {...(Root !== View ? { ownerState } : {})}
      ref={rootRef}
      testID={testID ?? rootProps.testID}
      onTouchEnd={(event) => {
        if (!disabled && event.target === event.currentTarget) innerRef.current?.focus();
        rootProps.onTouchEnd?.(event);
        onClick?.(event);
      }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          marginTop:
            variant === 'standard' && form && form.labelDisplay !== 'stacked' ? 16 : undefined,
          alignSelf: fullWidth ? 'stretch' : undefined,
          paddingLeft: framed && leftAdornment ? 14 : 0,
          paddingRight: framed && rightAdornment ? 14 : 0,
          backgroundColor: variant === 'filled' ? theme.palette.action.hover : 'transparent',
          borderTopLeftRadius: variant === 'filled' ? theme.shape.borderRadius : undefined,
          borderTopRightRadius: variant === 'filled' ? theme.shape.borderRadius : undefined,
        },
        baseStyle,
        paddingEdges(baseStyle),
        variant !== 'base' ? variantStyle : undefined,
        variant !== 'base' ? paddingEdges(variantStyle) : undefined,
        style,
        paddingEdges(StyleSheet.flatten(style) ?? undefined),
        rootSx,
        paddingEdges(rootSx),
        rootProps.style,
        paddingEdges(StyleSheet.flatten(rootProps.style) ?? undefined),
      ]}
    >
      {content(startAdornment)}
      <FormContext.Provider value={undefined}>
        <Host
          {...hostNative}
          {...(Host !== TextInput ? { ownerState } : {})}
          ref={hostRef}
          nativeID={id ?? input.nativeID}
          accessibilityLabel={explicitLabel ?? linkedLabel?.text}
          accessibilityLabelledBy={
            input.accessibilityLabelledBy ??
            (explicitLabel !== undefined || input['aria-labelledby'] ? undefined : linkedLabel?.id)
          }
          accessibilityHint={input.accessibilityHint ?? helpText}
          placeholder={input.placeholder}
          accessibilityState={{ ...input.accessibilityState, disabled }}
          readOnly={readOnly}
          editable={!readOnly}
          multiline={multiline}
          value={String(text ?? '')}
          numberOfLines={fixedRows ?? input.numberOfLines}
          placeholderTextColor={
            form?.label && !labelShrink && !focusedLocal && form.labelDisplay !== 'stacked'
              ? 'transparent'
              : (input.placeholderTextColor ?? theme.palette.text.secondary)
          }
          selectionColor={input.selectionColor ?? activeColor}
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
            if (!nativeHostEventsLast) host.onChange?.(event);
            onChange?.({ target, currentTarget: target, nativeEvent: event.nativeEvent });
            onChangeText?.(next);
            if (nativeHostEventsLast) host.onChange?.(event);
            if (host.onChangeText !== onChangeText) host.onChangeText?.(next);
          }}
          onChangeText={undefined}
          onFocus={(event) => {
            if (disabled) return;
            nativeFocused.current = true;
            setFocused(true);
            onFocus?.(event);
            if (host.onFocus !== onFocus) host.onFocus?.(event);
            form?.onFocus?.();
          }}
          onBlur={(event) => {
            nativeFocused.current = false;
            setFocused(false);
            onBlur?.(event);
            if (host.onBlur !== onBlur) host.onBlur?.(event);
            form?.onBlur?.();
          }}
          onContentSizeChange={(event) => {
            if (multiline) setContentHeight(event.nativeEvent.contentSize.height);
            input.onContentSizeChange?.(event);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
              paddingTop,
              paddingBottom,
              paddingLeft: framed && !leftAdornment ? 14 : 0,
              paddingRight: framed && !rightAdornment ? 14 : 0,
              minHeight,
              maxHeight,
              height,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            typography,
            themedPadding,
            host.style,
            callerPadding,
          ]}
        />
      </FormContext.Provider>
      {content(endAdornment)}
      {variant === 'outlined' ? (
        <Outline
          {...outlineProps}
          {...(Outline !== NotchedOutline && Outline !== View ? { ownerState } : {})}
          label={
            Object.prototype.hasOwnProperty.call(outlineProps, 'label') ? (
              outlineProps.label
            ) : label != null && label !== '' && required ? (
              <>
                {label}
                {'\u2009'}*
              </>
            ) : (
              label
            )
          }
          notched={
            notched ??
            (form?.labelDisplay === 'stacked'
              ? false
              : Boolean(startAdornment || focused || filled))
          }
          style={[
            { borderWidth: focused ? 2 : 1, borderColor, borderRadius: theme.shape.borderRadius },
            outlineStyle,
            outlineProps.style,
          ]}
        />
      ) : null}
      {(variant === 'standard' || variant === 'filled') && !disableUnderline ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={{
            position: 'absolute',
            bottom: 0,
            start: 0,
            end: 0,
            height: focused ? 2 : 1,
            backgroundColor: borderColor,
          }}
        />
      ) : null}
      {renderSuffix?.(ownerState)}
    </Root>
  );
}
export const InputBase: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<InputBaseProps> & React.RefAttributes<ViewInstance>
> = forwardRef((props, ref) => <InputEngine inProps={props} variant="base" forwardedRef={ref} />);
export const Input: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<InputProps> & React.RefAttributes<ViewInstance>
> & { muiName: string } = Object.assign(
  forwardRef<ViewInstance, InputProps>((props, ref) => (
    <InputEngine inProps={props} variant="standard" forwardedRef={ref} />
  )),
  { muiName: 'Input' },
);
export const FilledInput: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FilledInputProps> & React.RefAttributes<ViewInstance>
> & { muiName: string } = Object.assign(
  forwardRef<ViewInstance, FilledInputProps>((props, ref) => (
    <InputEngine inProps={props} variant="filled" forwardedRef={ref} />
  )),
  { muiName: 'Input' },
);
export const OutlinedInput: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<OutlinedInputProps> & React.RefAttributes<ViewInstance>
> & { muiName: string } = Object.assign(
  forwardRef<ViewInstance, OutlinedInputProps>((props, ref) => (
    <InputEngine inProps={props} variant="outlined" forwardedRef={ref} />
  )),
  { muiName: 'Input' },
);
// Internal bridge preserves the already documented TextField native extension.
export const NativeInputControl: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<
    EngineProps & { variant: Exclude<Variant, 'base'>; ownerStateOverride?: object }
  > &
    React.RefAttributes<ViewInstance>
> = forwardRef<
  ViewInstance,
  EngineProps & { variant: Exclude<Variant, 'base'>; ownerStateOverride?: object }
>(function NativeInputControl({ variant, ownerStateOverride, ...inProps }, ref) {
  return (
    <InputEngine
      inProps={inProps}
      variant={variant}
      nativeHostEventsLast
      ownerStateOverride={ownerStateOverride}
      forwardedRef={ref}
    />
  );
});
export interface InputAdornmentProps extends ViewProps {
  sx?: SxProps;
  position: 'start' | 'end';
  disablePointerEvents?: boolean;
  disableTypography?: boolean;
  variant?: Exclude<Variant, 'base'>;
  component?: React.ComponentType<ViewProps & React.RefAttributes<ViewInstance>>;
}
export const InputAdornment: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<InputAdornmentProps> & React.RefAttributes<ViewInstance>
> = forwardRef(function InputAdornment(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiInputAdornment' });
  const form = useContext(FormContext);
  const {
    position,
    disablePointerEvents,
    disableTypography,
    variant = form?.variant ?? 'standard',
    component: Component = View,
    children,
    sx,
    style,
    ...native
  } = props;
  const resolved = useComponentStyle('MuiInputAdornment', { ...props, variant }, sx);
  return (
    <Component
      {...native}
      ref={ref}
      pointerEvents={disablePointerEvents ? 'none' : native.pointerEvents}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
          marginEnd: position === 'start' ? 8 : 0,
          marginStart: position === 'end' ? 8 : 0,
        },
        resolved,
        style,
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          disableTypography ? (
            <Text>{child}</Text>
          ) : (
            <Typography color="text.secondary">{child}</Typography>
          )
        ) : (
          child
        ),
      )}
    </Component>
  );
});
