import React, {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  I18nManager,
  type ViewInstance,
  type TextInputProps,
  type NativeSyntheticEvent,
  type StyleProp,
} from 'react-native';
import {
  NativePicker,
  NativePressable,
  getNativeFocusedView,
  type NativePickerProps,
  type NativePickerSelection,
} from '@altroo/mui-native-host';
import {
  NativeTextScope,
  diagnostic,
  useDefaultProps,
  type NativeStyle,
  type SxProps,
} from '@altroo/mui-native-system';
import { Input, type InputBaseProps } from './inputs';
import { FormContext } from './formState';
import { NativeInputValueContext } from './nativeInputControl';
import { useTheme, useComponentStyle } from './themeProvider';
import { useForkRef } from './utils';
import { buttonKeyEvent, type ButtonBaseKeyEvent } from './nativeButtonEvents';
import { useMenuEvent } from './useMenuEvent';
import { useNativePickerLayer } from './useNativePickerLayer';
import {
  nativeOptionModels,
  reconcileNativeSelection,
  nativeSelectionProposal,
  nativeSelectionValue,
  type NativeSelectionState,
} from './nativeSelectionModel';
import { selectionEvent } from './selectionEvent';
import {
  NativeSelectionIconSurface,
  NativeSelectionIndicator,
  useNativeSelectionSlotStyle,
} from './selectionStyles';
import type { SelectVariants } from './select';

type FocusSource = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
export interface NativeSelectOption {
  readonly value: string;
  readonly label: string;
  readonly text: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly index: number;
  readonly id: string;
}
export interface NativeSelectOptionCollection extends ReadonlyArray<NativeSelectOption> {
  item(index: number): NativeSelectOption | null;
  namedItem(name: string): NativeSelectOption | null;
}
export interface NativeSelectTarget {
  value: string;
  readonly name: string;
  readonly id: string;
  readonly type: 'select-one' | 'select-multiple';
  readonly multiple: boolean;
  readonly selectedIndex: number;
  readonly options: NativeSelectOptionCollection;
  readonly selectedOptions: NativeSelectOptionCollection;
  readonly node: ViewInstance | null;
}
export interface NativeSelectInputHandle extends Readonly<NativeSelectTarget> {
  focus(): void;
  blur(): void;
}
export type NativeSelectChangeEvent = Omit<
  NativeSyntheticEvent<NativePickerSelection>,
  'target' | 'currentTarget'
> & { target: NativeSelectTarget; currentTarget: NativeSelectTarget };
export type NativeSelectFocusEvent = Omit<FocusSource, 'target' | 'currentTarget'> & {
  target: NativeSelectTarget;
  currentTarget: NativeSelectTarget;
};
export type NativeSelectBlurEvent = NativeSelectFocusEvent;
export type NativeSelectPickerProps = Omit<
  NativePickerProps,
  'open' | 'options' | 'multiple' | 'requestKey' | 'onSelection' | 'onDismiss' | 'children'
>;
export interface NativeSelectIconProps {
  style?: StyleProp<NativeStyle>;
  ownerState?: NativeSelectOwnerState;
}
export interface NativeSelectInputProps
  extends Omit<
    TextInputProps,
    | 'value'
    | 'defaultValue'
    | 'children'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'style'
    | 'onKeyDown'
    | 'onKeyUp'
  > {
  children?: React.ReactNode;
  value?: unknown;
  defaultValue?: unknown;
  multiple?: boolean;
  size?: number;
  name?: string;
  id?: string;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: SelectVariants;
  classes?: Partial<NativeSelectClasses>;
  className?: string;
  inputRef?: React.Ref<NativeSelectInputHandle>;
  IconComponent?: React.ComponentType<NativeSelectIconProps>;
  nativePickerProps?: NativeSelectPickerProps;
  onChange?: (event: NativeSelectChangeEvent) => void;
  onFocus?: (event: NativeSelectFocusEvent) => void;
  onBlur?: (event: NativeSelectBlurEvent) => void;
  onKeyDown?: (event: ButtonBaseKeyEvent) => void;
  onKeyUp?: (event: ButtonBaseKeyEvent) => void;
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
}
export interface NativeSelectOwnerState extends NativeSelectInputProps {
  variant: SelectVariants;
  nativePickerOpen: boolean;
}
export interface NativeSelectProps
  extends Omit<
    InputBaseProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onFocus'
    | 'onBlur'
    | 'children'
    | 'inputProps'
    | 'inputRef'
    | 'inputComponent'
    | 'classes'
    | 'onKeyDown'
    | 'onKeyUp'
  > {
  children?: React.ReactNode;
  value?: unknown;
  defaultValue?: unknown;
  variant?: SelectVariants;
  input?: React.ReactElement<any>;
  inputProps?: Partial<NativeSelectInputProps> & React.RefAttributes<NativeSelectInputHandle>;
  inputRef?: React.Ref<NativeSelectInputHandle>;
  IconComponent?: React.ComponentType<NativeSelectIconProps>;
  classes?: Partial<NativeSelectClasses>;
  className?: string;
  onKeyDown?: NativeSelectInputProps['onKeyDown'];
  onKeyUp?: NativeSelectInputProps['onKeyUp'];
  onChange?: NativeSelectInputProps['onChange'];
  onFocus?: NativeSelectInputProps['onFocus'];
  onBlur?: NativeSelectInputProps['onBlur'];
  nativePickerProps?: NativeSelectPickerProps;
}
const nativeKeys = [
  'root',
  'select',
  'multiple',
  'filled',
  'outlined',
  'standard',
  'disabled',
  'icon',
  'iconOpen',
  'iconFilled',
  'iconOutlined',
  'iconStandard',
  'nativeInput',
  'error',
] as const;
export type NativeSelectClassKey = (typeof nativeKeys)[number];
export type NativeSelectClasses = Record<NativeSelectClassKey, string>;
export function getNativeSelectUtilityClasses(slot: string) {
  return [
    'active',
    'checked',
    'completed',
    'disabled',
    'error',
    'expanded',
    'focused',
    'focusVisible',
    'open',
    'readOnly',
    'required',
    'selected',
  ].includes(slot)
    ? `Mui-${slot}`
    : `MuiNativeSelect-${slot}`;
}
export const nativeSelectClasses = Object.fromEntries(
  nativeKeys.map((key) => [key, getNativeSelectUtilityClasses(key)]),
) as NativeSelectClasses;
function collection(values: NativeSelectOption[]): NativeSelectOptionCollection {
  Object.defineProperties(values, {
    item: { value: (index: number) => values[index] ?? null },
    namedItem: {
      value: (name: string) => values.find((option) => Boolean(name) && option.id === name) ?? null,
    },
  });
  return values as unknown as NativeSelectOptionCollection;
}
function target(
  state: NativeSelectionState,
  name: string,
  id: string,
  node: ViewInstance | null,
): NativeSelectTarget {
  const keys = new Set(state.selectedKeys);
  const options = collection(
    state.options.map((option, index) => ({
      value: option.value,
      label: option.label,
      text: option.text,
      selected: keys.has(option.key),
      disabled: option.disabled,
      index,
      id: option.element.props.id ?? '',
    })),
  );
  return {
    value: nativeSelectionValue(state),
    name,
    id,
    node,
    multiple: state.multiple,
    type: state.multiple ? 'select-multiple' : 'select-one',
    selectedIndex: options.findIndex((option) => option.selected),
    options,
    selectedOptions: collection(options.filter((option) => option.selected)),
  };
}
type InternalNativeInputProps = NativeSelectInputProps & {
  nativeSelectionEndAdornment?: boolean;
  nativeSelectionNotify?: (value: string) => void;
  nativeSelectionBaseStyle?: StyleProp<NativeStyle>;
  nativeSelectionAuthoredStyle?: StyleProp<NativeStyle>;
  ownerState?: unknown;
};
export const NativeSelectInput: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeSelectInputProps> & React.RefAttributes<NativeSelectInputHandle>
> = forwardRef<NativeSelectInputHandle, InternalNativeInputProps>(
  function NativeSelectInput(inputProps, forwarded) {
    const {
      children,
      value,
      defaultValue,
      multiple = false,
      size,
      name = '',
      id,
      disabled = false,
      error = false,
      required,
      readOnly = false,
      variant = 'standard',
      autoFocus = false,
      IconComponent = NativeSelectionIndicator,
      inputRef,
      nativePickerProps = {},
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      style,
      sx,
      classes,
      className,
      nativeSelectionEndAdornment = false,
      nativeSelectionNotify,
      nativeSelectionBaseStyle,
      nativeSelectionAuthoredStyle,
      ownerState: _inputOwner,
      ...native
    } = inputProps;
    if (classes || className)
      diagnostic(
        'native-select-classes',
        'Use native selection styles or slot overrides instead of CSS classes.',
      );
    const options = nativeOptionModels(children);
    const display = useRef<ViewInstance | null>(null),
      focused = useRef(false),
      pendingBlur = useRef<FocusSource | null>(null);
    const committed = useRef<{ state: NativeSelectionState; request: object | null } | undefined>(
      undefined,
    );
    const eventState = useRef<NativeSelectionState | null>(null);
    const [request, setRequest] = useState<{ keys: readonly string[] } | null>(null);
    const previous = committed.current;
    const seed =
      request && request !== previous?.request && previous
        ? { ...previous.state, selectedKeys: request.keys }
        : previous?.state;
    const state = reconcileNativeSelection(seed, options, { value, defaultValue, multiple, size });
    const latest = useRef(state);
    const fieldId = id ?? native.nativeID ?? '';
    const finish = useMenuEvent((restoring: boolean) => {
      const blur = pendingBlur.current;
      pendingBlur.current = null;
      if (!restoring && blur && display.current && display.current.isConnected !== false) {
        focused.current = false;
        onBlur?.(selectionEvent(blur, target(latest.current, name, fieldId, display.current)));
      }
    });
    const picker = useNativePickerLayer(display, disabled, readOnly, finish);
    useInsertionEffect(() => {
      committed.current = { state, request };
      latest.current = state;
      eventState.current = null;
    });
    useLayoutEffect(() => {
      nativeSelectionNotify?.(nativeSelectionValue(state));
    }, [nativeSelectionValue(state), nativeSelectionNotify]);
    const focus = useMenuEvent(() => {
      if (!disabled && picker.eligible && !picker.retained) display.current?.focus();
    });
    const blur = useMenuEvent(() => {
      picker.close(false);
      display.current?.blur();
    });
    const handle = useMemo(() => {
      const result = { focus, blur } as NativeSelectInputHandle;
      for (const key of [
        'value',
        'name',
        'id',
        'type',
        'multiple',
        'selectedIndex',
        'options',
        'selectedOptions',
        'node',
      ] as const)
        Object.defineProperty(result, key, {
          get: () =>
            target(eventState.current ?? latest.current, name, fieldId, display.current)[key],
        });
      return result;
    }, [focus, blur, name, fieldId]);
    useImperativeHandle(inputRef ?? forwarded, () => handle, [handle]);
    const focusPending = useRef({ previous: autoFocus, pending: autoFocus, initial: autoFocus });
    useLayoutEffect(() => {
      const request = focusPending.current;
      if (!autoFocus) {
        request.previous = false;
        request.pending = false;
        return;
      }
      if (!request.previous) {
        request.pending = true;
        request.initial = false;
      }
      request.previous = true;
      if (request.pending && picker.eligible && !picker.retained) {
        request.pending = false;
        if (
          !disabled &&
          display.current?.isConnected !== false &&
          (request.initial || (!getNativeFocusedView() && !TextInput.State.currentlyFocusedInput()))
        )
          display.current?.focus();
      }
    }, [autoFocus, disabled, picker.eligible, picker.retained]);

    useLayoutEffect(
      () => () => {
        display.current = null;
      },
      [],
    );
    const theme = useTheme(),
      owner: NativeSelectOwnerState = { ...inputProps, variant, nativePickerOpen: picker.retained };
    const selectedStyle = useNativeSelectionSlotStyle('MuiNativeSelect', 'select', owner, sx),
      iconStyle = useNativeSelectionSlotStyle('MuiNativeSelect', 'icon', owner);
    const physicalEnd =
      I18nManager.isRTL && !I18nManager.doLeftAndRightSwapInRTL ? 'left' : 'right';
    const defaults = {
      [physicalEnd === 'left' ? 'paddingLeft' : 'paddingRight']: nativeSelectionEndAdornment
        ? 0
        : variant === 'standard'
          ? 24
          : 32,
      ...(variant === 'standard' ? { minWidth: 16 } : {}),
    };
    const selected = new Set(state.selectedKeys),
      content = state.options
        .filter((option) => selected.has(option.key))
        .map((option) => option.label || option.text)
        .join(', ');
    const transport = new Map(
      state.options.map((option) => [JSON.stringify([option.key, option.value]), option]),
    );
    const selection = useMenuEvent((event: NativeSyntheticEvent<NativePickerSelection>) => {
      if (
        !picker.isActive() ||
        disabled ||
        readOnly ||
        !display.current ||
        display.current.isConnected === false
      )
        return;
      const option = transport.get(event.nativeEvent.optionId);
      if (!option) return;
      const proposal = nativeSelectionProposal(
        latest.current,
        option.key,
        event.nativeEvent.selected,
      );
      if (!proposal) return;
      eventState.current = proposal;
      if (value == null) setRequest({ keys: proposal.selectedKeys });
      try {
        onChange?.(selectionEvent(event, target(proposal, name, fieldId, display.current)));
      } finally {
        if (value != null) eventState.current = null;
      }
    });
    const show = useMenuEvent(() => {
      if (picker.show()) display.current?.focus();
    });
    const renderIcon = () =>
      !multiple ? (
        <NativeSelectionIconSurface
          trailing={nativeSelectionEndAdornment}
          end={physicalEnd}
          variant={variant}
          disabled={disabled || readOnly}
          onPress={show}
        >
          <IconComponent
            ownerState={owner}
            style={[
              {
                color: disabled ? theme.palette.text.disabled : theme.palette.action.active,
                fontSize: 24,
              },
              iconStyle,
            ]}
          />
        </NativeSelectionIconSurface>
      ) : null;
    return (
      <NativeTextScope
        theme={theme}
        style={[
          defaults,
          nativeSelectionBaseStyle,
          selectedStyle,
          nativeSelectionAuthoredStyle ?? style,
        ]}
        content={content}
      >
        {(viewStyle, _content, scope) => (
          <>
            <NativePressable
              ref={display}
              nativeID={fieldId || undefined}
              testID={native.testID}
              disabled={disabled}
              focusable={!disabled}
              tabIndex={disabled ? -1 : (native.tabIndex ?? 0)}
              accessibilityRole="combobox"
              accessibilityLabel={native.accessibilityLabel}
              accessibilityLabelledBy={native.accessibilityLabelledBy}
              accessibilityHint={native.accessibilityHint}
              accessibilityValue={{ ...native.accessibilityValue, text: content }}
              accessibilityState={{
                ...native.accessibilityState,
                disabled,
                expanded: picker.retained,
              }}
              aria-required={required}
              aria-invalid={error}
              aria-readonly={readOnly}
              {...{ managedKeys: ['Enter', ' ', 'ArrowUp', 'ArrowDown'] }}
              onPress={show}
              onKeyDown={(source) => {
                if (disabled || !display.current || display.current.isConnected === false) return;
                const event = buttonKeyEvent(source);
                onKeyDown?.(event);
                if (
                  !event.defaultPrevented &&
                  !event.isComposing &&
                  !event.isCanceled &&
                  event.target === event.currentTarget &&
                  ['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)
                ) {
                  event.preventDefault();
                  show();
                }
              }}
              onKeyUp={(source) => onKeyUp?.(buttonKeyEvent(source))}
              onFocus={(source) => {
                if (
                  !display.current ||
                  display.current.isConnected === false ||
                  !picker.acceptFocus()
                )
                  return;
                if (!focused.current) {
                  focused.current = true;
                  onFocus?.(
                    selectionEvent(source, target(latest.current, name, fieldId, display.current)),
                  );
                }
              }}
              onBlur={(source) => {
                if (picker.retained) {
                  source.persist();
                  pendingBlur.current = source;
                  return;
                }
                focused.current = false;
                onBlur?.(
                  selectionEvent(source, target(latest.current, name, fieldId, display.current)),
                );
              }}
              style={[{ justifyContent: 'center', minHeight: 44 }, viewStyle]}
            >
              <Text
                numberOfLines={multiple ? 2 : 1}
                ellipsizeMode="tail"
                style={scope.literalStyle ?? scope.style}
              >
                {content}
              </Text>
              {!nativeSelectionEndAdornment ? renderIcon() : null}
              <NativePicker
                {...nativePickerProps}
                open={picker.open}
                requestKey={picker.requestKey}
                multiple={multiple}
                title={nativePickerProps.title ?? native.accessibilityLabel ?? ''}
                colorScheme={nativePickerProps.colorScheme ?? theme.palette.mode}
                options={Array.from(transport, ([id, option]) => ({
                  id,
                  label: option.label || option.text,
                  groupId: option.groupKey,
                  groupLabel: option.groupLabel,
                  enabled: !option.disabled && !option.groupDisabled,
                  selected: selected.has(option.key),
                }))}
                onSelection={selection}
                onDismiss={picker.dismissed}
                onPresentationChange={(event, context) => {
                  picker.presentation(event, context);
                  nativePickerProps.onPresentationChange?.(event, context);
                }}
              />
            </NativePressable>
            {nativeSelectionEndAdornment ? renderIcon() : null}
          </>
        )}
      </NativeTextScope>
    );
  },
);
export const NativeSelect: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeSelectProps> & React.RefAttributes<ViewInstance>
> & { muiName: string } = Object.assign(
  forwardRef<ViewInstance, NativeSelectProps>(function NativeSelect(inProps, forwarded) {
    const props = useDefaultProps({ props: inProps, name: 'MuiNativeSelect' }),
      form = useContext(FormContext);
    const {
      children,
      input,
      inputProps,
      IconComponent = NativeSelectionIndicator,
      variant: variantProp,
      style,
      classes,
      className,
      nativePickerProps,
      ...other
    } = props;
    const variant = variantProp ?? form?.variant ?? 'standard',
      element = input ?? <Input />;
    const ref = useForkRef(forwarded, element.props.ref);
    const [focused, setFocused] = useState(false),
      owner = { ...props, variant, focused };
    const rootStyle = useComponentStyle('MuiNativeSelect', owner, undefined, {
      states: [
        ...((props.disabled ?? form?.disabled) ? ['disabled'] : []),
        ...((props.error ?? form?.error) ? ['error'] : []),
        ...(focused && !(props.disabled ?? form?.disabled) ? ['focused'] : []),
      ],
    });
    return (
      <NativeInputValueContext.Provider value="nativeSelect">
        {React.cloneElement(element, {
          inputComponent: NativeSelectInput,
          inputProps: {
            children,
            IconComponent,
            variant,
            classes,
            className,
            nativePickerProps,
            ...inputProps,
            ...element.props.inputProps,
          },
          ref,
          ...other,
          onFocus: (event: any) => {
            setFocused(true);
            ({ ...element.props, ...other }).onFocus?.(event);
          },
          onBlur: (event: any) => {
            setFocused(false);
            ({ ...element.props, ...other }).onBlur?.(event);
          },
          style: [rootStyle, style ?? element.props.style],
        })}
      </NativeInputValueContext.Provider>
    );
  }),
  { muiName: 'Select' },
);
