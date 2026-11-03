import { selectionEvent } from './selectionEvent';
import {
  NativeSelectInput,
  type NativeSelectInputProps,
  type NativeSelectInputHandle,
  type NativeSelectChangeEvent,
  type NativeSelectFocusEvent,
  type NativeSelectIconProps,
  type NativeSelectPickerProps,
} from './nativeSelect';
import {
  NativeSelectionIconSurface,
  NativeSelectionIndicator as DefaultIcon,
  useNativeSelectionSlotStyle,
} from './selectionStyles';
import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Text,
  I18nManager,
  useWindowDimensions,
  type ViewInstance,
  type TextInputProps,
  type StyleProp,
} from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import {
  useDefaultProps,
  resolveSlotProps,
  NativeTextScope,
  diagnostic,
  type NativeStyle,
  type SlotProps,
  type SxProps,
} from '@altroo/mui-native-system';
import { Input, FilledInput, OutlinedInput, type InputBaseProps } from './inputs';
import { Menu, type MenuProps, type MenuPaperProps, type MenuListSlotProps } from './menu';
import { FormContext, useControlled, nativeLabelText } from './formState';
import { NativeInputValueContext, inputControlFilled } from './nativeInputControl';
import { NativeMenuFocusSource } from './menuContext';
import {
  buttonKeyEvent,
  type ButtonBaseKeyEvent,
  type ButtonBaseActivationEvent,
} from './nativeButtonEvents';
import type { ModalCloseEvent } from './modal';
import { useTheme, useComponentStyle, useSx } from './themeProvider';
import { useForkRef } from './utils';
import { useMenuEvent } from './useMenuEvent';
import type { MenuItemProps } from './menuItem';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type SourceEvent = Exclude<ModalCloseEvent, null> | ButtonBaseActivationEvent;
export type SelectChangeEvent<Value = string> = Omit<SourceEvent, 'target' | 'currentTarget'> & {
  target: { value: Value; name?: string };
  currentTarget: { value: Value; name?: string };
};
export type SelectBlurEvent<Value = unknown> = Omit<FocusEvent, 'target'> & {
  target: { value: Value; name?: string };
};
export interface SelectInputHandle<Value = unknown> {
  readonly node: ViewInstance | null;
  readonly value: Value | '' | undefined;
  focus(): void;
  blur(): void;
}
export type SelectVariants = 'outlined' | 'standard' | 'filled';
export interface SelectIconProps {
  style?: StyleProp<NativeStyle>;
  ownerState?: SelectOwnerState;
}
export interface SelectDisplayProps
  extends Omit<
    React.ComponentProps<typeof NativePressable>,
    'style' | 'children' | 'onKeyDown' | 'onKeyUp'
  > {
  id?: string;
  sx?: SxProps;
  style?: StyleProp<NativeStyle>;
  onKeyDown?: (event: ButtonBaseKeyEvent) => void;
  onKeyUp?: (event: ButtonBaseKeyEvent) => void;
}
export type SelectMenuProps = Omit<Partial<MenuProps>, 'slotProps'> & {
  slotProps?: Omit<NonNullable<MenuProps['slotProps']>, 'paper' | 'list'> & {
    paper?: SlotProps<MenuPaperProps & React.RefAttributes<ViewInstance>, SelectOwnerState>;
    list?: SlotProps<MenuListSlotProps, SelectOwnerState>;
  };
};
export interface SelectInputProps<Value = unknown>
  extends Omit<
    TextInputProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onBlur'
    | 'children'
    | 'style'
    | 'onKeyDown'
    | 'onKeyUp'
  > {
  value?: Value;
  defaultValue?: Value;
  children?: React.ReactNode;
  name?: string;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  multiple?: boolean;
  autoWidth?: boolean;
  displayEmpty?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  variant?: SelectVariants;
  labelId?: string;
  IconComponent?: React.ComponentType<SelectIconProps>;
  MenuProps?: SelectMenuProps;
  SelectDisplayProps?: SelectDisplayProps;
  renderValue?: (value: Value) => React.ReactNode;
  onChange?: (event: SelectChangeEvent<Value>, child: React.ReactNode) => void;
  onOpen?: (event: SourceEvent) => void;
  onClose?: (event: ModalCloseEvent | ButtonBaseActivationEvent) => void;
  onBlur?: (event: SelectBlurEvent<Value>) => void;
  onKeyDown?: (event: ButtonBaseKeyEvent) => void;
  onKeyUp?: (event: ButtonBaseKeyEvent) => void;
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
}
export interface BaseSelectProps<Value = unknown>
  extends Omit<
    InputBaseProps,
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onBlur'
    | 'onKeyDown'
    | 'onKeyUp'
    | 'onChangeText'
    | 'children'
    | 'inputRef'
    | 'inputProps'
    | 'inputComponent'
  > {
  value?: Value | '';
  defaultValue?: Value;
  children?: React.ReactNode;
  native?: false;
  autoWidth?: boolean;
  defaultOpen?: boolean;
  displayEmpty?: boolean;
  multiple?: boolean;
  open?: boolean;
  label?: React.ReactNode;
  labelId?: string;
  input?: React.ReactElement<any>;
  inputRef?: React.Ref<SelectInputHandle<Value>>;
  inputProps?: Partial<SelectInputProps<Value>> & React.RefAttributes<SelectInputHandle<Value>>;
  IconComponent?: React.ComponentType<SelectIconProps>;
  MenuProps?: SelectMenuProps;
  SelectDisplayProps?: SelectDisplayProps;
  renderValue?: (value: Value) => React.ReactNode;
  onChange?: SelectInputProps<Value>['onChange'];
  onOpen?: SelectInputProps<Value>['onOpen'];
  onClose?: SelectInputProps<Value>['onClose'];
  onBlur?: SelectInputProps<Value>['onBlur'];
  onKeyDown?: SelectInputProps<Value>['onKeyDown'];
  onKeyUp?: SelectInputProps<Value>['onKeyUp'];
}
export interface FilledSelectProps {
  variant: 'filled';
  disableUnderline?: boolean;
  hiddenLabel?: boolean;
}
export interface StandardSelectProps {
  variant: 'standard';
  disableUnderline?: boolean;
}
export interface OutlinedSelectProps {
  variant?: 'outlined';
  notched?: boolean;
}
export interface NativeSelectModeProps<Value = unknown>
  extends Omit<
    BaseSelectProps<Value>,
    'native' | 'inputRef' | 'inputProps' | 'onChange' | 'onFocus' | 'onBlur' | 'IconComponent'
  > {
  native: true;
  inputRef?: React.Ref<NativeSelectInputHandle>;
  inputProps?: Partial<NativeSelectInputProps> & React.RefAttributes<NativeSelectInputHandle>;
  onChange?: (event: NativeSelectChangeEvent, child?: undefined) => void;
  onFocus?: (event: NativeSelectFocusEvent) => void;
  onBlur?: (event: NativeSelectFocusEvent) => void;
  IconComponent?: React.ComponentType<NativeSelectIconProps>;
  nativePickerProps?: NativeSelectPickerProps;
}
export type SelectProps<Value = unknown> = (BaseSelectProps<Value> | NativeSelectModeProps<Value>) &
  (FilledSelectProps | StandardSelectProps | OutlinedSelectProps);
export interface SelectOwnerState extends Omit<SelectInputProps, 'MenuProps'> {
  value: unknown;
  variant: SelectVariants;
  open: boolean;
  multiple: boolean;
  error: boolean;
}
export interface SelectClasses {
  root: string;
  select: string;
  multiple: string;
  filled: string;
  outlined: string;
  standard: string;
  disabled: string;
  focused: string;
  icon: string;
  iconOpen: string;
  nativeInput: string;
  error: string;
}
export type SelectClassKey = keyof SelectClasses;
const globalStates = new Set([
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
]);
export function getSelectUtilityClasses(slot: string) {
  return `${globalStates.has(slot) ? 'Mui' : 'MuiSelect'}-${slot}`;
}
export const selectClasses = Object.fromEntries(
  [
    'root',
    'select',
    'multiple',
    'filled',
    'outlined',
    'standard',
    'disabled',
    'focused',
    'icon',
    'iconOpen',
    'nativeInput',
    'error',
  ].map((key) => [key, getSelectUtilityClasses(key)]),
) as unknown as SelectClasses;
function optionContent(child: React.ReactElement<MenuItemProps>): React.ReactNode {
  return typeof child.props.children === 'function' ? null : child.props.children;
}
function equalValue(a: unknown, b: unknown) {
  return typeof b === 'object' && b !== null ? a === b : String(a) === String(b);
}
/** Keep native event provenance and bound methods; never overwrite the source target. */
function valueEvent(event: any, value: unknown, name: string | undefined, blur = false) {
  return selectionEvent(event, { value, name }, !blur);
}
type InternalInputProps = SelectInputProps & {
  nativeSelectAnchor?: React.RefObject<ViewInstance | null>;
  nativeSelectWidth?: number;
  nativeSelectionEndAdornment?: boolean;
  nativeSelectionBaseStyle?: StyleProp<NativeStyle>;
  nativeSelectionAuthoredStyle?: StyleProp<NativeStyle>;
  ownerState?: object;
};
export const SelectInput = forwardRef<SelectInputHandle, InternalInputProps>(
  function SelectInput(inputProps, ref) {
    const {
      value: valueProp,
      defaultValue,
      children,
      name,
      disabled = false,
      error = false,
      required,
      multiple = false,
      autoWidth = false,
      displayEmpty = false,
      defaultOpen = false,
      open: openProp,
      variant = 'standard',
      labelId,
      IconComponent = DefaultIcon,
      MenuProps = {},
      SelectDisplayProps = {},
      renderValue,
      onChange,
      onOpen,
      onClose,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      autoFocus,
      readOnly = false,
      style,
      sx,
      nativeSelectAnchor,
      nativeSelectWidth,
      nativeSelectionEndAdornment = false,
      nativeSelectionBaseStyle,
      nativeSelectionAuthoredStyle,
      ownerState: _owner,
      ...native
    } = inputProps;
    const [value, setValue] = useControlled(valueProp, defaultValue),
      [openState, setOpen] = useControlled(openProp, defaultOpen);
    const display = useRef<ViewInstance | null>(null),
      [node, setNode] = useState<ViewInstance | null>(null),
      displayRef = useForkRef(
        display,
        useCallback((target: ViewInstance | null) => setNode(target), []),
        SelectDisplayProps.ref,
      );
    const open = node !== null && Boolean(openState);
    const isOpenControlled = useRef(openProp !== undefined).current;
    const effectiveMenuOpen = Boolean(Object.hasOwn(MenuProps, 'open') ? MenuProps.open : open);
    const [source, setSource] = useState<'keyboard' | 'pointer' | null>(null);
    const [minimumWidth, setMinimumWidth] = useState<number>();
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const owner: SelectOwnerState = {
      ...inputProps,
      value,
      variant,
      open,
      error,
      multiple,
      disabled,
      required,
      name,
    };
    const selectedStyle = useNativeSelectionSlotStyle('MuiSelect', 'select', owner, sx);
    const displaySx = useSx(SelectDisplayProps.sx);
    const iconStyle = useNativeSelectionSlotStyle('MuiSelect', 'icon', owner);
    // Match InputEngine's physical edge policy; native left/right values may
    // already swap in RTL. Defaults must not outrank authored physical padding.
    const physicalEnd =
      I18nManager.isRTL && !I18nManager.doLeftAndRightSwapInRTL ? 'left' : 'right';
    const selectionDefaults = {
      [physicalEnd === 'left' ? 'paddingLeft' : 'paddingRight']: variant === 'standard' ? 24 : 32,
      ...(variant === 'standard' ? { minWidth: 16 } : {}),
    };
    const options = useMemo(
      () =>
        React.Children.toArray(children).filter(
          React.isValidElement,
        ) as React.ReactElement<MenuItemProps>[],
      [children],
    );
    if (multiple && !Array.isArray(value))
      throw new Error('MUI Native: Select value must be an array when multiple is true.');
    for (const child of options) {
      if (child.type === React.Fragment)
        throw new Error(
          'MUI Native: Select requires direct options; use an array instead of a Fragment.',
        );
      if (typeof child.type === 'string')
        throw new Error(
          'MUI Native: HTML options require the unfinished NativeSelect branch. Use MenuItem for Select.',
        );
    }
    const selected = (option: React.ReactElement<MenuItemProps>) =>
      multiple
        ? (value as unknown[]).some((v) => equalValue(v, option.props.value))
        : equalValue(value, option.props.value);
    const matches = options.filter(
      (option) => Object.hasOwn(option.props, 'value') && selected(option),
    );
    useEffect(() => {
      if (!multiple && value !== '' && !matches.length)
        diagnostic(
          'select-value',
          'Select value does not match an available option. Use a matching value or an empty string.',
        );
    }, [value, multiple, Boolean(matches.length)]);
    const search = useRef<{
      buffer: string;
      previous: number | null;
      matched: number | null;
      timer: ReturnType<typeof setTimeout> | undefined;
    }>({ buffer: '', previous: null, matched: null, timer: undefined });
    const resetSearch = useCallback(() => {
      clearTimeout(search.current.timer);
      search.current = { buffer: '', previous: null, matched: null, timer: undefined };
    }, []);
    useEffect(() => resetSearch, [resetSearch]);
    useLayoutEffect(() => {
      if (open || (!multiple && !matches.length)) resetSearch();
    }, [open, multiple, Boolean(matches.length), resetSearch]);
    useImperativeHandle(
      ref,
      () => ({
        focus: () => display.current?.focus(),
        blur: () => display.current?.blur(),
        node,
        value,
      }),
      [node, value],
    );
    useEffect(() => {
      if (autoFocus || (defaultOpen && openProp === undefined)) display.current?.focus();
    }, [autoFocus, node]);
    useLayoutEffect(() => {
      if ((!open && !isOpenControlled) || autoWidth) return;
      let live = true;
      if (
        nativeSelectWidth !== undefined &&
        Number.isFinite(nativeSelectWidth) &&
        nativeSelectWidth >= 0
      )
        setMinimumWidth(nativeSelectWidth);
      const anchor = nativeSelectAnchor?.current ?? node;
      anchor?.measureInWindow?.((_x, _y, width) => {
        if (
          live &&
          (nativeSelectAnchor?.current ?? node) === anchor &&
          Number.isFinite(width) &&
          width >= 0
        )
          setMinimumWidth(width);
      });
      return () => {
        live = false;
      };
    }, [
      open,
      isOpenControlled,
      autoWidth,
      node,
      nativeSelectAnchor,
      nativeSelectWidth,
      dimensions.width,
      dimensions.height,
    ]);
    const update = useMenuEvent((next: boolean, event: any, interaction: typeof source = null) => {
      if (next && (disabled || readOnly)) return;
      resetSearch();
      setSource(next ? interaction : null);
      if (next) onOpen?.(event);
      else onClose?.(event);
      setOpen(next);
    });
    const change = useMenuEvent(
      (event: any, child: React.ReactElement<MenuItemProps>, next: unknown) => {
        setValue(next);
        onChange?.(valueEvent(event, next, name), child);
      },
    );
    const select = useMenuEvent((previous: React.ReactElement<MenuItemProps>, event: any) => {
      const child = options.find(
        (option) =>
          option.key === previous.key &&
          option.type === previous.type &&
          option.props.value === previous.props.value,
      );
      if (!child) return;
      if (
        disabled ||
        readOnly ||
        !effectiveMenuOpen ||
        !display.current ||
        display.current.isConnected === false ||
        child.props.disabled ||
        !Object.hasOwn(child.props, 'value') ||
        event.nativeEvent?.isCanceled ||
        event.nativeEvent?.isComposing
      )
        return;
      const optionValue = child.props.value;
      let next: unknown = optionValue;
      if (multiple) {
        const array = [...(value as unknown[])],
          index = array.indexOf(optionValue);
        if (index === -1) array.push(optionValue);
        else array.splice(index, 1);
        next = array;
      }
      (child.props.onPress ?? child.props.onClick)?.(event);
      if (value !== next) change(event, child, next);
      if (!multiple) update(false, event);
    });
    const typeahead = (event: ButtonBaseKeyEvent) => {
      const state = search.current,
        active = state.buffer !== '';
      if (
        open ||
        multiple ||
        event.defaultPrevented ||
        event.key.length !== 1 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.key === ' ' && !active)
      )
        return false;
      if (event.key === ' ') event.preventDefault();
      const searchable = options
        .filter((option) => Object.hasOwn(option.props, 'value') && !option.props.disabled)
        .map((child) => ({
          child,
          label: (child.props.textValue ?? nativeLabelText(optionContent(child)) ?? '')
            .trim()
            .toLowerCase(),
        }))
        .filter((option) => option.label);
      if (!searchable.length) {
        if (event.key !== ' ') resetSearch();
        return true;
      }
      if (!active)
        state.previous = searchable.findIndex((option) =>
          equalValue(value, option.child.props.value),
        );
      const key = event.key.toLowerCase();
      if (
        state.buffer === key &&
        !searchable.some((option) => option.label[0] === key && option.label[1] === key)
      ) {
        state.buffer = '';
        state.previous = state.matched;
      }
      state.buffer += key;
      clearTimeout(state.timer);
      state.timer = setTimeout(resetSearch, 750);
      const start = (state.previous ?? -1) + 1;
      let match = -1;
      for (let offset = 0; offset < searchable.length; offset++) {
        const index = (start + offset + searchable.length) % searchable.length;
        if (searchable[index].label.startsWith(state.buffer)) {
          match = index;
          break;
        }
      }
      if (match !== -1) {
        state.matched = match;
        const child = searchable[match].child;
        if (!equalValue(value, child.props.value)) change(event, child, child.props.value);
      } else if (event.key !== ' ') resetSearch();
      return true;
    };
    let content: React.ReactNode = null;
    if (inputControlFilled(value) || displayEmpty) {
      if (renderValue) content = renderValue(value);
      else if (multiple)
        content = matches.flatMap((child, index) =>
          index ? [', ', optionContent(child)] : [optionContent(child)],
        );
      else content = matches.length ? optionContent(matches.at(-1)!) : null;
    }
    if (typeof content === 'string' && !content.trim()) content = null;
    const paper = resolveSlotProps(MenuProps.slotProps?.paper, owner) ?? {},
      list = resolveSlotProps(MenuProps.slotProps?.list, owner) ?? {},
      listId = useId();
    const {
      style: displayStyle,
      sx: _displaySx,
      id: displayId,
      ref: _displayRef,
      onKeyDown: displayDown,
      onKeyUp: displayUp,
      ...displayProps
    } = SelectDisplayProps;
    const pressOpen = useMenuEvent((event: any) => {
      if (!disabled && !readOnly && display.current && display.current.isConnected !== false) {
        display.current.focus();
        update(true, event, 'pointer');
      }
    });
    const renderIcon = () => (
      <NativeSelectionIconSurface
        trailing={nativeSelectionEndAdornment}
        end={physicalEnd}
        variant={variant}
        disabled={disabled || readOnly}
        onPress={pressOpen}
      >
        <IconComponent
          ownerState={owner}
          style={[
            {
              color: disabled ? theme.palette.text.disabled : theme.palette.action.active,
              fontSize: 24,
              transform: [{ rotate: open ? '180deg' : '0deg' }],
            },
            iconStyle,
          ]}
        />
      </NativeSelectionIconSurface>
    );
    return (
      <>
        <NativeTextScope
          theme={theme}
          style={[
            selectionDefaults,
            nativeSelectionBaseStyle,
            selectedStyle,
            nativeSelectionAuthoredStyle ?? style,
            displaySx,
            displayStyle,
          ]}
          content={content}
        >
          {(viewStyle, textContent, scope) => (
            <>
              <NativePressable
                {...{
                  managedKeys: ['ArrowUp', 'ArrowDown', 'Enter', ' '],
                  role: 'combobox',
                  'aria-controls': open ? listId : undefined,
                  'aria-expanded': open,
                  'aria-haspopup': 'listbox',
                  'aria-readonly': readOnly,
                  'aria-required': required,
                  'aria-invalid': error,
                }}
                ref={displayRef}
                nativeID={
                  displayId ??
                  native.nativeID ??
                  (name ? `mui-component-select-${name}` : undefined)
                }
                testID={native.testID}
                accessibilityRole="combobox"
                accessibilityLabel={native.accessibilityLabel}
                accessibilityLabelledBy={labelId ?? native.accessibilityLabelledBy}
                accessibilityHint={native.accessibilityHint}
                accessibilityValue={{
                  ...native.accessibilityValue,
                  text: nativeLabelText(content) ?? undefined,
                }}
                accessibilityState={{ ...native.accessibilityState, disabled, expanded: open }}
                disabled={disabled}
                focusable={!disabled}
                tabIndex={disabled ? -1 : (native.tabIndex ?? 0)}
                onPress={pressOpen}
                onKeyDown={(nativeEvent) => {
                  const event = buttonKeyEvent(nativeEvent);
                  if (!display.current || display.current.isConnected === false) return;
                  if (displayDown) {
                    displayDown(event);
                    return;
                  }
                  if (
                    disabled ||
                    readOnly ||
                    event.target !== event.currentTarget ||
                    event.isComposing ||
                    event.isCanceled
                  )
                    return;
                  if (
                    !typeahead(event) &&
                    [' ', 'ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)
                  ) {
                    event.preventDefault();
                    update(true, event, 'keyboard');
                  }
                  onKeyDown?.(event);
                }}
                onKeyUp={(event) => {
                  const key = buttonKeyEvent(event);
                  (displayUp ?? onKeyUp)?.(key);
                }}
                onFocus={onFocus as any}
                onBlur={(event) => {
                  resetSearch();
                  if (!open) onBlur?.(valueEvent(event, value, name, true));
                }}
                {...displayProps}
                style={[{ justifyContent: 'center', minHeight: 44 }, viewStyle]}
              >
                {typeof content === 'string' || typeof content === 'number' ? (
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={scope.literalStyle ?? scope.style}
                  >
                    {content}
                  </Text>
                ) : (
                  textContent
                )}
                {!nativeSelectionEndAdornment ? renderIcon() : null}
              </NativePressable>
              {nativeSelectionEndAdornment ? renderIcon() : null}
            </>
          )}
        </NativeTextScope>
        <NativeMenuFocusSource.Provider value={source}>
          <Menu
            anchorEl={() => nativeSelectAnchor?.current ?? display.current}
            open={open}
            returnFocusRef={display}
            onClose={(event) => update(false, event)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            {...(MenuProps as Partial<MenuProps>)}
            slotProps={{
              ...MenuProps.slotProps,
              list: {
                role: 'listbox',
                'aria-labelledby': labelId,
                disableListWrap: true,
                nativeID: listId,
                ...list,
              },
              paper: {
                ...paper,
                style: [{ minWidth: autoWidth ? undefined : minimumWidth }, paper.style],
              },
            }}
          >
            {options.map((child) =>
              Object.hasOwn(child.props, 'value')
                ? React.cloneElement(child, {
                    value: undefined,
                    role: 'option',
                    selected: selected(child),
                    'aria-selected': selected(child),
                    accessibilityState: {
                      ...child.props.accessibilityState,
                      selected: selected(child),
                    },
                    onPress: (event) => select(child, event),
                    onClick: undefined,
                    onKeyDown: (event) => {
                      child.props.onKeyDown?.(event);
                      if (
                        event.key === ' ' &&
                        event.target === event.currentTarget &&
                        !event.defaultPrevented &&
                        !event.isComposing &&
                        !event.isCanceled
                      ) {
                        event.preventDefault();
                        if (!event.repeat) select(child, event);
                      }
                    },
                    onKeyUp: (event) => {
                      if (event.key === ' ') event.preventDefault();
                      child.props.onKeyUp?.(event);
                    },
                  })
                : child,
            )}
          </Menu>
        </NativeMenuFocusSource.Provider>
      </>
    );
  },
);

type SelectImplementationProps = Omit<
  BaseSelectProps<any>,
  'native' | 'inputRef' | 'inputProps' | 'onChange' | 'onFocus' | 'onBlur' | 'IconComponent'
> & {
  variant?: SelectVariants;
  native?: boolean;
  inputRef?: React.Ref<any>;
  inputProps?: any;
  onChange?: any;
  onFocus?: any;
  onBlur?: any;
  IconComponent?: React.ComponentType<any>;
  nativePickerProps?: NativeSelectPickerProps;
};
const SelectImpl = forwardRef<ViewInstance, SelectImplementationProps>(
  function Select(inProps, forwarded) {
    const props = useDefaultProps({ props: inProps, name: 'MuiSelect' }),
      form = useContext(FormContext);
    const {
      autoWidth = false,
      children,
      defaultOpen = false,
      displayEmpty = false,
      IconComponent = DefaultIcon,
      id,
      input,
      inputProps,
      label,
      labelId,
      MenuProps,
      multiple = false,
      native = false,
      nativePickerProps,
      onClose,
      onOpen,
      open,
      renderValue,
      SelectDisplayProps,
      variant: variantProp,
      style,
      slotProps,
      ...other
    } = props;
    const variant = variantProp ?? form?.variant ?? 'outlined';
    const anchor = useRef<ViewInstance | null>(null),
      [width, setWidth] = useState<number>();
    const [focused, setFocused] = useState(false);
    const disabled = props.disabled ?? form?.disabled ?? false;
    useEffect(() => {
      if (disabled) setFocused(false);
    }, [disabled]);
    const element =
      input ??
      (variant === 'outlined' ? (
        <OutlinedInput label={label} />
      ) : variant === 'filled' ? (
        <FilledInput />
      ) : (
        <Input />
      ));
    const root = useForkRef(anchor, forwarded, element.props.ref);
    const owner = { ...props, variant, focused };
    const rootStyle = useComponentStyle('MuiSelect', owner, undefined, {
      states: [
        ...((props.disabled ?? form?.disabled) ? ['disabled'] : []),
        ...((props.error ?? form?.error) ? ['error'] : []),
        ...(focused && !disabled ? ['focused'] : []),
      ],
    });
    const effectiveSlots = slotProps ?? element.props.slotProps;
    const rootProps = effectiveSlots?.root ?? {};
    return (
      <NativeInputValueContext.Provider value={native ? 'nativeSelect' : 'select'}>
        {React.cloneElement(element, {
          inputComponent: native ? NativeSelectInput : SelectInput,
          inputProps: {
            children,
            error: props.error ?? form?.error,
            IconComponent,
            variant,
            multiple,
            ...(native
              ? { id, nativePickerProps }
              : {
                  autoWidth,
                  defaultOpen,
                  displayEmpty,
                  labelId,
                  MenuProps,
                  onClose,
                  onOpen,
                  open,
                  renderValue,
                  SelectDisplayProps: { id, ...SelectDisplayProps },
                }),
            ...inputProps,
            ...element.props.inputProps,
            ...(!native ? { nativeSelectAnchor: anchor, nativeSelectWidth: width } : {}),
          },
          ...((displayEmpty || (multiple && native)) && variant === 'outlined'
            ? { notched: true }
            : {}),
          ...other,
          onFocus: (event: any) => {
            setFocused(true);
            ({ ...element.props, ...other }).onFocus?.(event);
          },
          onBlur: (event: any) => {
            setFocused(false);
            ({ ...element.props, ...other }).onBlur?.(event);
          },
          id: id ?? element.props.id,
          ref: root,
          style: [rootStyle, style ?? element.props.style],
          slotProps: {
            ...effectiveSlots,
            root: {
              ...rootProps,
              onLayout: (event: any) => {
                const next = event.nativeEvent.layout.width;
                if (Number.isFinite(next) && next >= 0) setWidth(next);
                rootProps.onLayout?.(event);
              },
            },
          },
        })}
      </NativeInputValueContext.Provider>
    );
  },
);
export const Select = Object.assign(SelectImpl, { muiName: 'Select' }) as {
  <Value = unknown>(
    props: BaseSelectProps<Value> &
      (FilledSelectProps | StandardSelectProps | OutlinedSelectProps) &
      React.RefAttributes<ViewInstance>,
  ): React.ReactElement | null;
  <Value = unknown>(
    props: NativeSelectModeProps<Value> &
      (FilledSelectProps | StandardSelectProps | OutlinedSelectProps) &
      React.RefAttributes<ViewInstance>,
  ): React.ReactElement | null;
  muiName: string;
};
