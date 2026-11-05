import React, { forwardRef, useRef, useContext, useId } from 'react';
import {
  View,
  Text,
  type ViewProps,
  type ViewInstance,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  type TextProps,
  type TextInstance,
} from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import {
  useDefaultProps,
  resolveSlotProps,
  type SlotProps,
  type NativeStyle,
  type SxProps,
  NativeTextScope,
  useNativeTextRootRef,
  diagnostic,
  isNativeTextStyleProperty,
} from '@altroo/mui-native-system';
import { useTheme, useComponentStyle } from './themeProvider';
import { Typography, type TypographyProps } from './typography';
import { FormContext } from './formState';
import { LabelActivationContext, type LabelActivation } from './controlLabelContext';
import { useMenuEvent } from './useMenuEvent';
import { listSlotStyle } from './listStyles';
import type { CheckChangeEvent } from './forms';
import type { FormControlLabelClasses } from './controlClasses';
export interface FormControlLabelTypographySlotPropsOverrides {}
export interface FormControlLabelSlots {
  typography?: React.ElementType;
}
export interface FormControlLabelProps extends Omit<ViewProps, 'style' | 'children'> {
  control: React.ReactElement<any>;
  label: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  checked?: boolean;
  name?: string;
  value?: unknown;
  onChange?: (event: CheckChangeEvent, checked: boolean) => void;
  disableTypography?: boolean;
  labelPlacement?: 'end' | 'start' | 'top' | 'bottom';
  sx?: SxProps;
  style?: StyleProp<NativeStyle>;
  classes?: Partial<FormControlLabelClasses>;
  className?: string;
  slots?: FormControlLabelSlots;
  slotProps?: {
    typography?: SlotProps<
      TypographyProps & FormControlLabelTypographySlotPropsOverrides,
      FormControlLabelProps
    >;
  };
}
export type FormControlLabelSlotsAndSlotProps = Pick<FormControlLabelProps, 'slots' | 'slotProps'>;
function plainLabel(label: React.ReactNode): string | undefined {
  if (label == null || typeof label === 'boolean') return '';
  if (typeof label === 'string' || typeof label === 'number' || typeof label === 'bigint')
    return String(label);
  const nodes = Array.isArray(label)
    ? label
    : React.isValidElement<{ children?: React.ReactNode }>(label) && label.type === React.Fragment
      ? [label.props.children]
      : null;
  if (!nodes) return undefined;
  const parts = nodes.map(plainLabel);
  return parts.every((text) => text !== undefined) ? parts.join('') : undefined;
}
function textLabel(label: React.ReactNode): boolean {
  return React.Children.toArray(label).every(
    (child) =>
      !React.isValidElement<{ children?: React.ReactNode }>(child) ||
      child.type === Text ||
      (child.type === React.Fragment && textLabel(child.props.children)),
  );
}
// Typography resolves the label's defaults and text metrics; opaque native content gets a View boundary.
const NativeLabelContainer = forwardRef<TextInstance, TextProps>(function NativeLabelContainer(
  { children, style, nativeID, testID, accessible, accessibilityLabel, onLayout },
  ref,
) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const theme = useTheme();
  const layout = Object.fromEntries(
    Object.entries(StyleSheet.flatten(style) ?? {}).filter(
      ([key]) => !isNativeTextStyleProperty(key),
    ),
  );
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={layout} content={children}>
      {(native, content) => (
        <View
          ref={scopeRef}
          nativeID={nativeID}
          testID={testID}
          accessible={accessible}
          accessibilityLabel={accessibilityLabel}
          onLayout={onLayout}
          style={native}
        >
          {content}
        </View>
      )}
    </NativeTextScope>
  );
});
export const FormControlLabel: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<FormControlLabelProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, FormControlLabelProps>(function FormControlLabel(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiFormControlLabel' }),
    form = useContext(FormContext),
    theme = useTheme();
  const { width } = useWindowDimensions(),
    labelId = `mui-control-label-${useId()}`;
  const labelTextRoot = useRef<ViewInstance | null>(null);
  const {
    control,
    label,
    labelPlacement = 'end',
    disableTypography = false,
    disabled: disabledProp,
    required: requiredProp,
    error: errorProp,
    checked,
    name,
    value,
    onChange,
    slots = {},
    slotProps = {},
    sx,
    style,
    classes,
    className,
    ...native
  } = props;
  if (classes || className)
    diagnostic(
      'control-label-classes',
      'Native control label classes identify slots; use native styles, typography slots or sx.',
    );
  const disabled = disabledProp ?? control.props.disabled ?? form?.disabled,
    required = requiredProp ?? control.props.required,
    error = errorProp ?? form?.error ?? false;
  const owner = { ...props, disabled, required, error, labelPlacement },
    activate = useRef<LabelActivation | null>(null);
  const labelName =
    control.props['aria-label'] ??
    control.props.accessibilityLabel ??
    control.props.inputProps?.['aria-label'] ??
    plainLabel(label);
  const controlProps: Record<string, unknown> = { disabled, required, 'aria-label': labelName };
  if (
    labelName === undefined &&
    control.props['aria-labelledby'] === undefined &&
    control.props.accessibilityLabelledBy === undefined
  )
    controlProps.accessibilityLabelledBy = labelId;
  for (const key of ['checked', 'name', 'value', 'onChange'] as const)
    if (control.props[key] === undefined && props[key] !== undefined)
      controlProps[key] = props[key];
  const typographyProps = resolveSlotProps(slotProps.typography, owner) ?? {},
    TypographySlot = slots.typography ?? Typography;
  const labelStyle = listSlotStyle(theme, 'MuiFormControlLabel', 'label', owner, width);
  const rootStyle = useComponentStyle('MuiFormControlLabel', owner, sx, {
    states: [
      ...(disabled ? ['disabled'] : []),
      ...(required ? ['required'] : []),
      ...(error ? ['error'] : []),
    ],
    overrideKeys: [`labelPlacement${labelPlacement[0].toUpperCase() + labelPlacement.slice(1)}`],
    baseStyle: {
      flexDirection:
        labelPlacement === 'start'
          ? 'row-reverse'
          : labelPlacement === 'top'
            ? 'column-reverse'
            : labelPlacement === 'bottom'
              ? 'column'
              : 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      marginEnd: 16,
      direction: theme.direction,
    },
  });
  const text =
    label == null ? null : !disableTypography &&
      !(React.isValidElement(label) && label.type === Typography) ? (
      <TypographySlot
        {...(TypographySlot !== Typography
          ? { ownerState: owner }
          : { component: textLabel(label) ? 'span' : NativeLabelContainer })}
        {...typographyProps}
        accessible={!labelName}
        style={[
          { color: disabled ? theme.palette.text.disabled : theme.palette.text.primary },
          labelStyle,
          typographyProps.style,
        ]}
      >
        {label}
      </TypographySlot>
    ) : (
      label
    );
  const press = useMenuEvent((source: any) => {
    if (!disabled) activate.current?.(source);
  });
  return (
    <LabelActivationContext.Provider value={activate}>
      <View {...native} ref={ref} style={[rootStyle, style]} accessible={false}>
        {React.cloneElement(control, controlProps)}
        <NativePressable
          nativeID={labelId}
          accessible={false}
          focusable={false}
          tabIndex={-1}
          disabled={disabled}
          onPress={press}
          style={{
            flexShrink: 1,
            minWidth: 0,
            minHeight: 44,
            paddingVertical: 8,
            justifyContent: 'center',
          }}
        >
          <NativeTextScope
            rootRef={labelTextRoot}
            theme={theme}
            style={{ color: disabled ? theme.palette.text.disabled : theme.palette.text.primary }}
            content={text}
          >
            {(_style, content) => (
              <View
                ref={labelTextRoot}
                style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}
              >
                {content}
                {required ? (
                  <Text
                    accessible={false}
                    style={[
                      { color: error ? theme.palette.error.main : theme.palette.text.primary },
                      listSlotStyle(theme, 'MuiFormControlLabel', 'asterisk', owner, width),
                    ]}
                  >
                    {'\u2009*'}
                  </Text>
                ) : null}
              </View>
            )}
          </NativeTextScope>
        </NativePressable>
      </View>
    </LabelActivationContext.Provider>
  );
});
