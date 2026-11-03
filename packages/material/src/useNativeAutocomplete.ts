/* State transitions adapt MIT-licensed Material UI 9.5.0 useAutocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import {
  useContext,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  type TextInputInstance,
  type ViewInstance,
  type TextInputChangeEvent,
} from 'react-native';
import {
  getNativeFocusedView,
  type NativeDescendantKey,
  type NativeHostKeyEvent,
} from '@altroo/mui-native-host';
import { useControlled } from './formState';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeModalParentContext } from './nativeModalContext';
import { nativeModalManager as modalManager } from './nativeModalManager';
import { useMenuEvent } from './useMenuEvent';
import { buttonKeyEvent } from './nativeButtonEvents';
import { createFilterOptions, useAutocompleteValues } from './autocompleteValues';
import { NativeAutocompleteNodes } from './autocompleteNativeNodes';
import type {
  AutocompleteChangeReason,
  AutocompleteCloseReason,
  AutocompleteGroupedOption,
  AutocompleteHighlightChangeReason,
  AutocompleteInputChangeReason,
  NativeAutocompleteEvent,
  NativeAutocompleteKeyboardEvent,
  NativeAutocompleteListbox,
  NativeAutocompleteListboxProps,
  NativeAutocompleteRootProps,
  NativeAutocompleteItemBindings,
  UseAutocompleteReturnValue,
  UseAutocompleteProps,
} from './useAutocompleteTypes';

// Options remain opaque to this state machine. The public overloads retain the
// option/mapped-value relationship; every comparison goes through configured helpers.
export type NativeAutocompleteConfiguration = UseAutocompleteProps<
  any,
  boolean,
  boolean,
  boolean,
  any
> & { renderValue?: unknown };
type Event = NativeAutocompleteEvent | null;
type HighlightReason = AutocompleteHighlightChangeReason | null;
type Direction = 'next' | 'previous';
type SelectionReason = 'selectOption' | 'createOption' | 'removeOption' | 'blur';
type HighlightChange = {
  index: number;
  event?: Event;
  reason?: HighlightReason;
  preserveScroll?: boolean;
  notify?: boolean;
};
const filter = createFilterOptions<any>();
const rawLabel = (option: any) => option?.label ?? option;
const sameArray = (
  left: readonly any[] | undefined,
  right: readonly any[],
  parse: (value: any) => unknown = (value) => value,
) =>
  Boolean(
    left === right ||
      (left &&
        left.length === right.length &&
        left.every((value, index) => parse(value) === parse(right[index]))),
  );

export interface NativeAutocompleteResult
  extends Omit<
    UseAutocompleteReturnValue<any, boolean, boolean, boolean, boolean, any>,
    'getItemProps'
  > {
  getItemProps: (args?: {
    index?: number;
    disabled?: boolean;
  }) => NativeAutocompleteItemBindings & { key?: number };
  native: {
    highlightedIndex: number;
    highlightReason: HighlightReason;
    inputFocused: boolean;
    filteredOptions: any[];
    collection: NativeAutocompleteNodes;
    focusInputArea: () => void;
    keyboard: (event: NativeAutocompleteKeyboardEvent) => void;
    syncHighlight: () => void;
  };
}

/** Full native state machine; its additional state is private component composition. */
export function useNativeAutocomplete(
  props: NativeAutocompleteConfiguration,
): NativeAutocompleteResult {
  const {
    autoComplete = false,
    autoHighlight = false,
    autoSelect = false,
    blurOnSelect = false,
    clearOnBlur = !props.freeSolo,
    clearOnEscape = false,
    defaultValue = props.multiple ? [] : null,
    disableClearable = false,
    disableCloseOnSelect = false,
    disabled = false,
    disabledItemsFocusable = false,
    disableListWrap = false,
    filterOptions = filter,
    filterSelectedOptions = false,
    freeSolo = false,
    getOptionDisabled,
    getOptionKey,
    getOptionLabel: authoredLabel = rawLabel,
    getOptionValue,
    groupBy,
    handleHomeEndKeys = !props.freeSolo,
    includeInputInList = false,
    inputValue: authoredInput,
    isOptionEqualToValue,
    multiple = false,
    onChange,
    onClose,
    onHighlightChange,
    onInputChange,
    onOpen,
    open: authoredOpen,
    openOnFocus = false,
    options,
    readOnly = false,
    renderValue,
    resetHighlightOnMouseLeave = false,
    selectOnFocus = !props.freeSolo,
    value: authoredValue,
    unstable_classNamePrefix: prefix = 'Mui',
    unstable_isActiveElementInListbox,
  } = props;
  const generatedId = useId(),
    id = props.id ?? 'mui-native-autocomplete-' + generatedId.replace(/:/g, '');
  const [value, setValue] = useControlled<any>(authoredValue, defaultValue);
  const values = useAutocompleteValues<any>({
    options,
    getOptionValue,
    isOptionEqualToValue,
    multiple,
    freeSolo,
    value,
  });
  const getOptionLabel = useCallback(
    (option: any): string => {
      const label = authoredLabel(option);
      if (typeof label === 'string') return label;
      if (process.env.NODE_ENV !== 'production')
        console.error('[mui-native:autocomplete] getOptionLabel must return a string.');
      return String(label);
    },
    [authoredLabel],
  );
  const labelForValue = (next: any) => {
    if (multiple || next == null || renderValue) return '';
    const resolved = values.getOptionFromValue(next);
    return resolved === null ? '' : getOptionLabel(resolved.option);
  };
  // Default input text is initialized once. Later option resolution is handled
  // separately so async data cannot erase a draft the user already edited.
  const [initialInput] = useState(() => {
    if (multiple || (defaultValue ?? authoredValue) == null) return '';
    const resolved = values.getOptionFromValue(defaultValue ?? authoredValue);
    return resolved === null ? '' : getOptionLabel(resolved.option);
  });
  const [inputValue, setInputValue] = useControlled(authoredInput, initialInput);
  const [open, setOpen] = useControlled(authoredOpen, false);
  const [focused, setFocused] = useState(false),
    [focusedItem, setFocusedItem] = useState(-1);
  const [anchorEl, setAnchor] = useState<ViewInstance | null>(null);
  const [inputPristine, setInputPristine] = useState(true);
  const defaultHighlight = autoHighlight ? 0 : -1;
  const [highlight, setHighlight] = useState({
    index: defaultHighlight,
    reason: null as HighlightReason,
  });
  const highlighted = useRef(defaultHighlight),
    highlightReason = useRef<HighlightReason>(null);
  const firstFocus = useRef(true),
    ignoreFocus = useRef(false),
    edited = useRef(false);
  const touched = useRef(false),
    touchScrolled = useRef(false),
    backgrounded = useRef(false);
  const nodes = useRef<NativeAutocompleteNodes | null>(null);
  if (!nodes.current) nodes.current = new NativeAutocompleteNodes();
  const collection = nodes.current;
  const [inlineCompletion, setInlineCompletion] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const selection = useRef({ start: 0, end: 0 });
  const blurRevision = useRef(0),
    mounted = useRef(true);
  const overlayReady = useContext(NativeOverlayReadiness),
    modalParent = useContext(NativeModalParentContext);
  const interactionReady = useMenuEvent(() => {
    if (
      !mounted.current ||
      !overlayReady ||
      modalParent?.open === false ||
      modalParent?.presented === false
    )
      return false;
    const top = modalManager.top(),
      target = collection.input ?? collection.anchor;
    return !top || Boolean(target && target.isConnected !== false && top.contains(target));
  });
  const popupOpen = Boolean(open && !readOnly);
  const selectedOption = !multiple && value != null ? values.getOptionFromValue(value) : null;
  const hasSelectedOption = selectedOption !== null;
  const inputIsSelection =
    selectedOption !== null && inputValue === getOptionLabel(selectedOption.option);
  const filteredOptions = useMemo<any[]>(
    () =>
      popupOpen
        ? filterOptions(
            filterSelectedOptions
              ? options.filter((option) => !values.isOptionSelected(option))
              : options.slice(),
            { inputValue: inputIsSelection && inputPristine ? '' : inputValue, getOptionLabel },
          )
        : [],
    [
      popupOpen,
      options,
      filterOptions,
      filterSelectedOptions,
      values.isOptionSelected,
      inputIsSelection,
      inputPristine,
      inputValue,
      getOptionLabel,
    ],
  );
  const previous = useRef<{
    filteredOptions?: any[];
    value?: any;
    inputValue?: string;
    hasSelectedOption?: boolean;
    popupOpen?: boolean;
    multiple?: boolean;
    disableCloseOnSelect?: boolean;
  }>({});

  const resetInput = useMenuEvent(
    (event: Event, next: any, reason: AutocompleteInputChangeReason) => {
      const selected = multiple ? value.length < next.length : next !== null;
      const clearReset = reason === 'reset' && freeSolo && !multiple && next === null;
      if (!selected && !clearOnBlur && !clearReset) return;
      const text = labelForValue(next);
      edited.current = false;
      setInlineCompletion((current) => (current?.text === text ? current : null));
      if (inputValue === text) return;
      setInputValue(text);
      // Preserve null programmatic events and the runtime createOption reset
      // reason for multiple free-solo selections; native types expose both.
      onInputChange?.(event, text, reason);
    },
  );
  useEffect(() => {
    const changed = value !== previous.current.value;
    const resolved =
      getOptionValue !== undefined &&
      previous.current.hasSelectedOption === false &&
      hasSelectedOption &&
      inputValue === '' &&
      !edited.current;
    if (focused && !changed && !resolved) return;
    if (
      freeSolo &&
      ((!changed && !resolved) || (value == null && previous.current.value === undefined))
    )
      return;
    resetInput(null, value, 'reset');
  }, [
    value,
    focused,
    freeSolo,
    getOptionValue,
    hasSelectedOption,
    inputValue,
    getOptionLabel,
    values.getOptionFromValue,
    resetInput,
  ]);

  const openPopup = useMenuEvent((event: Event) => {
    if (open || disabled || !interactionReady()) return;
    setOpen(true);
    setInputPristine(true);
    touched.current = false;
    onOpen?.(event);
  });
  const closePopup = useMenuEvent((event: Event, reason: AutocompleteCloseReason) => {
    if (!open) return;
    setOpen(false);
    touchScrolled.current = false;
    highlightReason.current = null;
    collection.invalidateScroll();
    setInlineCompletion(null);
    onClose?.(event, reason);
  });
  const changeValue = useMenuEvent(
    (event: Event, next: any, reason: AutocompleteChangeReason, details?: { option: any }) => {
      if (multiple ? sameArray(value, next) : value === next) return;
      onChange?.(event, next, reason, details);
      setValue(next);
    },
  );
  const removalDetails = (selected: any) => {
    const resolved = values.getOptionFromValue(selected);
    return resolved === null ? undefined : { option: resolved.option };
  };
  const select = useMenuEvent(
    (
      event: Event,
      option: any,
      reason: SelectionReason = 'selectOption',
      origin: 'options' | 'freeSolo' = 'options',
    ) => {
      if (disabled || readOnly || !interactionReady()) return;
      const identifier = origin === 'options' ? values.getOptionValue(option) : option;
      let next = identifier;
      if (multiple) {
        next = Array.isArray(value) ? value.slice() : [];
        const index =
          getOptionValue !== undefined && origin === 'freeSolo'
            ? next.indexOf(identifier)
            : next.findIndex((selected: any) => values.isOptionEqualToValue(option, selected));
        if (index === -1) next.push(identifier);
        else if (origin !== 'freeSolo') {
          next.splice(index, 1);
          reason = 'removeOption';
        }
      }
      if (origin === 'options' && reason !== 'removeOption')
        values.rememberSelectedOption(option, identifier);
      resetInput(event, next, reason);
      changeValue(event, next, reason, { option });
      const key = event as Partial<NativeAutocompleteKeyboardEvent> | null;
      if (!disableCloseOnSelect && !key?.ctrlKey && !key?.metaKey) closePopup(event, reason);
      if (
        blurOnSelect === true ||
        (blurOnSelect === 'touch' && touched.current) ||
        (blurOnSelect === 'mouse' && !touched.current)
      )
        collection.input?.blur();
    },
  );
  const setHighlighted = useMenuEvent(
    ({
      index,
      event = null,
      reason = null,
      preserveScroll = false,
      notify = true,
    }: HighlightChange) => {
      highlighted.current = index;
      highlightReason.current = reason;
      setHighlight((old) =>
        old.index === index && old.reason === reason ? old : { index, reason },
      );
      if (reason && notify)
        onHighlightChange?.(event, index < 0 ? null : filteredOptions[index], reason);
      collection.scrollHighlight(index, reason, preserveScroll, Boolean(groupBy));
    },
  );
  const validIndex = (index: number, direction: Direction) => {
    if (!collection.listbox || index < 0 || index >= filteredOptions.length) return -1;
    let current = index;
    do {
      if (collection.isOptionAvailable(current, disabledItemsFocusable)) return current;
      current =
        direction === 'next'
          ? (current + 1) % filteredOptions.length
          : (current - 1 + filteredOptions.length) % filteredOptions.length;
    } while (current !== index);
    return -1;
  };
  const navigate = useMenuEvent(
    (
      diff: number | 'start' | 'end' | 'reset',
      direction: Direction = 'next',
      event: Event = null,
      reason: HighlightReason = null,
      preserveScroll = false,
    ) => {
      if (!popupOpen) return;
      if (reason === 'keyboard') {
        touchScrolled.current = false;
        touched.current = false;
      }
      const maximum = filteredOptions.length - 1;
      let index =
        diff === 'reset'
          ? defaultHighlight
          : diff === 'start'
            ? 0
            : diff === 'end'
              ? maximum
              : highlighted.current + diff;
      if (typeof diff === 'number') {
        if (index < 0)
          index =
            index === -1 && includeInputInList
              ? -1
              : (disableListWrap && highlighted.current !== -1) || Math.abs(diff) > 1
                ? 0
                : maximum;
        else if (index > maximum)
          index =
            index === maximum + 1 && includeInputInList
              ? -1
              : disableListWrap || Math.abs(diff) > 1
                ? maximum
                : 0;
      }
      index = validIndex(index, direction);
      setHighlighted({ index, event, reason, preserveScroll });
      if (autoComplete && diff !== 'reset') {
        const text = index < 0 ? inputValue : getOptionLabel(filteredOptions[index]);
        const completes =
          text.toLowerCase().indexOf(inputValue.toLowerCase()) === 0 && inputValue.length > 0;
        setInlineCompletion({
          text,
          start: completes ? inputValue.length : text.length,
          end: text.length,
        });
      }
    },
  );
  const syncHighlight = useMenuEvent(() => {
    if (!popupOpen) return;
    const old = previous.current;
    const changed = !sameArray(old.filteredOptions, filteredOptions, getOptionLabel);
    const sameValue = (a: any, b: any) => {
      if (a == null || b == null) return a === b;
      const first = values.getOptionFromValue(a),
        second = values.getOptionFromValue(b);
      return first && second
        ? getOptionLabel(first.option) === getOptionLabel(second.option)
        : a === b;
    };
    const unchangedValue = multiple
      ? old.value &&
        value.length === old.value.length &&
        old.value.every((entry: any, index: number) => sameValue(value[index], entry))
      : sameValue(old.value, value);
    if (highlighted.current !== -1 && changed && old.inputValue === inputValue && unchangedValue) {
      const option = old.filteredOptions?.[highlighted.current];
      if (option) {
        const index = filteredOptions.findIndex(
          (candidate) => getOptionLabel(candidate) === getOptionLabel(option),
        );
        if (index !== -1) {
          setHighlighted({ index, reason: highlightReason.current, notify: false });
          return;
        }
      }
    }
    const selected = multiple ? value[0] : value;
    if (filteredOptions.length === 0 || selected == null) {
      const appendOnly =
        changed &&
        old.inputValue === inputValue &&
        Boolean(old.filteredOptions?.length) &&
        filteredOptions.length > old.filteredOptions!.length &&
        old.filteredOptions!.every(
          (option, index) => getOptionLabel(option) === getOptionLabel(filteredOptions[index]),
        );
      navigate('reset', 'next', null, null, appendOnly);
      return;
    }
    if (!collection.listbox) return;
    const current = filteredOptions[highlighted.current];
    if (
      multiple &&
      current &&
      value.some((entry: any) => values.isOptionEqualToValue(current, entry)) &&
      old.filteredOptions?.length
    ) {
      setHighlighted({ index: highlighted.current, reason: highlightReason.current });
      return;
    }
    const index = filteredOptions.findIndex((option) =>
      values.isOptionEqualToValue(option, selected),
    );
    if (index < 0) navigate('reset');
    else setHighlighted({ index });
  });
  useEffect(() => {
    const old = previous.current;
    const changedOptions = !sameArray(old.filteredOptions, filteredOptions, getOptionLabel);
    const changedInputs =
      old.popupOpen !== popupOpen ||
      old.inputValue !== inputValue ||
      old.multiple !== multiple ||
      old.disableCloseOnSelect !== disableCloseOnSelect ||
      (!multiple && old.value !== value) ||
      old.filteredOptions?.length !== filteredOptions.length;
    // Native highlight is React state. Its own render must not reset navigation
    // or repeat callbacks; the original hook updates DOM classes imperatively.
    if (
      (changedOptions || changedInputs) &&
      (changedOptions || (popupOpen && !disableCloseOnSelect))
    )
      syncHighlight();
    previous.current = {
      value,
      filteredOptions,
      inputValue,
      hasSelectedOption,
      popupOpen,
      multiple,
      disableCloseOnSelect,
    };
    collection.prune(
      filteredOptions.length,
      multiple ? value.length : renderValue && value != null ? 1 : 0,
    );
  });
  useEffect(() => {
    if (multiple && focusedItem > value.length - 1) {
      setFocusedItem(-1);
      if (interactionReady()) collection.focusItem(-1);
    }
  }, [multiple, value, focusedItem, collection, interactionReady]);

  const clear = useMenuEvent((event: Event) => {
    if (disabled || readOnly || !interactionReady()) return;
    edited.current = true;
    setInputValue('');
    setInlineCompletion(null);
    onInputChange?.(event, '', 'clear');
    changeValue(event, multiple ? [] : null, 'clear');
  });
  const focusItem = (index: number) => {
    setFocusedItem(index);
    if (interactionReady()) collection.focusItem(index);
  };
  const navigateItem = (direction: Direction) => {
    if (!multiple) return;
    let index =
      focusedItem === -1
        ? direction === 'previous' && inputValue === ''
          ? value.length - 1
          : -1
        : focusedItem + (direction === 'next' ? 1 : -1);
    if (index >= value.length) index = -1;
    while (index >= 0 && index < value.length && !collection.isItemAvailable(index))
      index += direction === 'next' ? 1 : -1;
    focusItem(index < 0 || index >= value.length ? -1 : index);
  };
  const commitInput = useMenuEvent((event: Event, preventDefault: () => void) => {
    if (disabled || readOnly) return;
    const incidental = popupOpen && highlighted.current !== -1 && highlightReason.current === null;
    if (
      highlighted.current !== -1 &&
      popupOpen &&
      (!freeSolo || inputPristine || !incidental) &&
      !touchScrolled.current
    ) {
      preventDefault();
      const option = filteredOptions[highlighted.current];
      if (!getOptionDisabled?.(option)) {
        select(event, option);
        if (autoComplete) {
          const text = getOptionLabel(option);
          setInlineCompletion({ text, start: text.length, end: text.length });
        }
      }
    } else if (freeSolo && inputValue !== '' && !inputIsSelection) {
      if (multiple || (!inputPristine && incidental && !touchScrolled.current)) preventDefault();
      select(event, inputValue, 'createOption', 'freeSolo');
    } else if (popupOpen && touchScrolled.current) {
      preventDefault();
      closePopup(event, 'escape');
    }
  });
  const keyboard = useMenuEvent((event: NativeAutocompleteKeyboardEvent) => {
    if (
      !interactionReady() ||
      event.defaultMuiPrevented ||
      event.isComposing ||
      event.isCanceled ||
      disabled
    )
      return;
    const itemDeletion =
      (event.key === 'Backspace' || event.key === 'Delete') &&
      collection.itemIndex(event.target as unknown as ViewInstance) !== -1;
    // Leave native Chip deletion on its focused host until matching key-up.
    // Moving focus during key-down would orphan that release in a new editor.
    if (itemDeletion) return;
    if (focusedItem !== -1 && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      focusItem(-1);
    switch (event.key) {
      case 'Home':
      case 'End':
        if (popupOpen && handleHomeEndKeys) {
          event.preventDefault();
          navigate(
            event.key === 'Home' ? 'start' : 'end',
            event.key === 'Home' ? 'next' : 'previous',
            event,
            'keyboard',
          );
        }
        break;
      case 'PageUp':
      case 'PageDown':
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const backwards = event.key === 'PageUp' || event.key === 'ArrowUp';
        navigate(
          (backwards ? -1 : 1) * (event.key.startsWith('Page') ? 5 : 1),
          backwards ? 'previous' : 'next',
          event,
          'keyboard',
        );
        openPopup(event);
        break;
      }
      case 'ArrowLeft':
        if (selection.current.start !== 0 || selection.current.end !== 0) break;
        if (!multiple && renderValue && value != null) {
          if (freeSolo && inputValue !== '') {
            setInputValue('');
            onInputChange?.(event, '', 'reset');
          }
          focusItem(0);
        } else navigateItem('previous');
        break;
      case 'ArrowRight':
        if (!multiple && renderValue) focusItem(-1);
        else navigateItem('next');
        break;
      case 'Enter':
        commitInput(event, () => event.preventDefault());
        break;
      case 'Escape':
        if (popupOpen) {
          event.preventDefault();
          event.stopPropagation();
          closePopup(event, 'escape');
        } else if (
          clearOnEscape &&
          (inputValue !== '' || (multiple && value.length > 0) || renderValue)
        ) {
          event.preventDefault();
          event.stopPropagation();
          clear(event);
        }
        break;
      case 'Backspace':
      case 'Delete': {
        if (readOnly || inputValue !== '') break;
        // A native Chip owns deletion through key-up. Its registered root must
        // not also be removed by this ancestor's key-down handler.
        const target = event.target as unknown as ViewInstance;
        if (collection.itemIndex(target) !== -1) break;
        if (multiple && value.length > 0 && (event.key === 'Backspace' || focusedItem !== -1)) {
          const index = focusedItem < 0 ? value.length - 1 : focusedItem,
            next = value.slice();
          next.splice(index, 1);
          changeValue(event, next, 'removeOption', removalDetails(value[index]));
        } else if (!multiple && renderValue)
          changeValue(event, null, 'removeOption', removalDetails(value));
        break;
      }
    }
  });
  const blur = useMenuEvent((event: Event) => {
    if (!interactionReady()) {
      setFocused(false);
      setFocusedItem(-1);
      firstFocus.current = true;
      ignoreFocus.current = false;
      closePopup(event, 'blur');
      return;
    }
    const actual = getNativeFocusedView();
    const inside = unstable_isActiveElementInListbox
      ? unstable_isActiveElementInListbox({ current: collection.listbox })
      : collection.containsListbox(actual);
    if (inside) {
      collection.input?.focus();
      return;
    }
    setFocused(false);
    firstFocus.current = true;
    ignoreFocus.current = false;
    if (
      autoSelect &&
      highlighted.current !== -1 &&
      popupOpen &&
      highlightReason.current !== 'mouse' &&
      highlightReason.current !== 'touch'
    )
      select(event, filteredOptions[highlighted.current], 'blur');
    else if (autoSelect && freeSolo && inputValue !== '')
      select(event, inputValue, 'blur', 'freeSolo');
    else if (clearOnBlur) resetInput(event, value, 'blur');
    closePopup(event, 'blur');
  });
  const inputChange = (event: TextInputChangeEvent) => {
    if (!interactionReady()) return;
    const next = event.nativeEvent.text,
      changed = inputValue !== next;
    if (changed) {
      edited.current = true;
      setInputValue(next);
      setInlineCompletion(null);
      touchScrolled.current = false;
      onInputChange?.(event, next, 'input');
    }
    if (next === '') {
      if (!disableClearable && !multiple && !renderValue) changeValue(event, null, 'clear');
    } else openPopup(event);
    if (changed) setInputPristine(false);
  };
  const deletionEvents = useRef(new WeakSet<object>());
  const deleteItem = useMenuEvent(
    (index: number, event: NativeAutocompleteEvent, itemDisabled: boolean) => {
      if (
        !interactionReady() ||
        disabled ||
        readOnly ||
        itemDisabled ||
        (multiple ? index < 0 || index >= value.length : value == null)
      )
        return;
      const token = event?.nativeEvent;
      if (token && typeof token === 'object') {
        if (deletionEvents.current.has(token)) return;
        deletionEvents.current.add(token);
      }
      if (multiple) {
        const next = value.slice();
        next.splice(index, 1);
        changeValue(event, next, 'removeOption', removalDetails(value[index]));
      } else changeValue(event, null, 'removeOption', removalDetails(value));
      setFocusedItem(-1);
      collection.focusItem(-1);
    },
  );
  const interactWithOption = useMenuEvent(
    (
      kind: 'hover' | 'touch' | 'select',
      index: number,
      option: any,
      event: NativeAutocompleteEvent,
    ) => {
      // Native events/custom renderers may retain handlers across a close or an
      // async collection replacement. Only the current committed row may act.
      if (
        !interactionReady() ||
        !popupOpen ||
        disabled ||
        readOnly ||
        filteredOptions[index] !== option
      )
        return;
      if (kind === 'hover') {
        if (highlighted.current !== index) setHighlighted({ index, event, reason: 'mouse' });
        else highlightReason.current = 'mouse';
        if (!touched.current) touchScrolled.current = false;
      } else if (kind === 'touch') {
        touched.current = true;
        touchScrolled.current = false;
        blurRevision.current++;
        setHighlighted({ index, event, reason: 'touch' });
      } else {
        if (getOptionDisabled?.(option)) return;
        blurRevision.current++;
        select(event, option);
        touched.current = false;
        if (blurOnSelect === false) collection.input?.focus();
      }
    },
  );
  const prepareIndicatorFocus = useMenuEvent(() => {
    if (interactionReady() && !disabled && !readOnly) ignoreFocus.current = true;
  });
  const clearFromIndicator = useMenuEvent((event: NativeAutocompleteEvent) => {
    if (!interactionReady() || disabled || readOnly) return;
    ignoreFocus.current = true;
    clear(event);
    collection.input?.focus();
  });
  const toggleFromIndicator = useMenuEvent((event: NativeAutocompleteEvent) => {
    if (!interactionReady() || disabled || readOnly) return;
    if (open) closePopup(event, 'toggleInput');
    else openPopup(event);
    collection.input?.focus();
  });
  const leaveListbox = useMenuEvent((event: NativeAutocompleteEvent) => {
    if (
      interactionReady() &&
      popupOpen &&
      resetHighlightOnMouseLeave &&
      highlightReason.current === 'mouse' &&
      !touched.current
    )
      setHighlighted({ index: -1, event, reason: 'mouse', preserveScroll: true });
  });
  const setAnchorEl = useCallback(
    (node: ViewInstance | null) => {
      collection.anchor = node;
      setAnchor(node);
      return () => {
        if (collection.anchor !== node) return;
        collection.anchor = null;
        setAnchor((current) => (current === node ? null : current));
      };
    },
    [collection],
  );
  const setInput = useCallback(
    (node: TextInputInstance | null) => {
      collection.input = node;
      return () => {
        if (collection.input === node) collection.input = null;
      };
    },
    [collection],
  );
  const lastListbox = useRef<WeakRef<NativeAutocompleteListbox> | null>(null);
  const setListbox = useMenuEvent((node: NativeAutocompleteListbox | null) => {
    const changedNode = node !== lastListbox.current?.deref();
    collection.listbox = node;
    if (node) {
      lastListbox.current = new WeakRef(node);
      // A caller ref replacement can reattach the same live ScrollView. It
      // must not reset a keyboard highlight created by this hook's own render.
      if (changedNode) syncHighlight();
    } else collection.invalidateScroll();
    return () => {
      if (collection.listbox !== node) return;
      collection.listbox = null;
      collection.invalidateScroll();
    };
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      blurRevision.current++;
      // Ref callbacks own their nodes. Disposing them here would erase live
      // refs during React StrictMode's effect-only cleanup/replay cycle.
      collection.invalidateScroll();
    };
  }, [collection]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') backgrounded.current = true;
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (disabled && focused) blur(null);
  }, [disabled, focused, blur]);

  const groupedOptions = useMemo(() => {
    if (!groupBy) return filteredOptions;
    const groups: AutocompleteGroupedOption<any>[] = [],
      seen = new Set<string>();
    let warned = false;
    filteredOptions.forEach((option, index) => {
      const group = groupBy(option),
        last = groups.at(-1);
      if (last?.group === group) last.options.push(option);
      else {
        if (process.env.NODE_ENV !== 'production' && seen.has(group) && !warned) {
          warned = true;
          console.warn(
            '[mui-native:autocomplete] groupBy produced duplicate headers. Sort options by group.',
          );
        }
        seen.add(group);
        groups.push({ key: index, index, group, options: [option] });
      }
    });
    return groups;
  }, [filteredOptions, groupBy]);
  const declared: NativeDescendantKey[] = disabled
    ? []
    : ['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown'];
  if (!disabled && popupOpen && handleHomeEndKeys) declared.push('Home', 'End');
  if (
    !disabled &&
    (popupOpen ||
      (clearOnEscape && Boolean(inputValue || (multiple && value.length) || renderValue)))
  )
    declared.push('Escape');
  if (
    !disabled &&
    ((popupOpen && (highlighted.current !== -1 || touchScrolled.current)) ||
      (freeSolo && inputValue !== '' && !inputIsSelection))
  )
    declared.push('Enter');
  const focusInputArea = () => {
    if (!interactionReady()) return;
    collection.input?.focus();
    if (selectOnFocus && firstFocus.current && selection.current.start === selection.current.end)
      collection.input?.setNativeProps({ selection: { start: 0, end: inputValue.length } });
    firstFocus.current = false;
  };
  return {
    id,
    value,
    inputValue,
    popupOpen,
    focused: focused || focusedItem !== -1,
    focusedItem,
    dirty: Boolean(
      (freeSolo && inputValue.length > 0) || (multiple ? value.length > 0 : value !== null),
    ),
    expanded: Boolean(popupOpen && anchorEl),
    anchorEl,
    setAnchorEl,
    groupedOptions,
    getOptionFromValue: values.getOptionFromValue,
    getRootProps: (other: NativeAutocompleteRootProps = {}) => ({
      ...other,
      focusable: false,
      managedKeys: [
        ...new Set([
          ...declared,
          'ArrowLeft',
          'ArrowRight',
          'Backspace',
          'Delete',
          ...(other.managedKeys ?? []),
        ]),
      ],
      managedDescendantKeys: declared,
      onKeyDown: (source: NativeHostKeyEvent) => {
        if (!interactionReady()) return;
        const event = buttonKeyEvent(source) as NativeAutocompleteKeyboardEvent;
        other.onKeyDown?.(event);
        keyboard(event);
      },
    }),
    getInputProps: () => ({
      id,
      ref: setInput,
      value: inlineCompletion?.text ?? inputValue,
      editable: !disabled && !readOnly,
      autoCapitalize: 'none' as const,
      autoComplete: 'off' as const,
      autoCorrect: false,
      selectTextOnFocus: selectOnFocus,
      role: 'combobox' as const,
      'aria-controls': popupOpen && filteredOptions.length ? id + '-listbox' : undefined,
      'aria-expanded': Boolean(popupOpen && filteredOptions.length),
      'aria-activedescendant':
        popupOpen && highlight.index >= 0 ? id + '-option-' + highlight.index : undefined,
      onChange: inputChange,
      onFocus: (event: NativeAutocompleteEvent) => {
        if (!interactionReady()) return;
        blurRevision.current++;
        setFocused(true);
        if (focusedItem !== -1) focusItem(-1);
        if (backgrounded.current) {
          backgrounded.current = false;
          return;
        }
        if (openOnFocus && !ignoreFocus.current) openPopup(event);
      },
      onBlur: (event: NativeAutocompleteEvent) => {
        const revision = ++blurRevision.current;
        event?.persist?.();
        // Native focus/touch events can be delivered in the same UI batch.
        // Let a listbox/indicator interaction settle before closing its popup.
        queueMicrotask(() => {
          if (mounted.current && revision === blurRevision.current) blur(event);
        });
      },
      onSelectionChange: (event: {
        nativeEvent: { selection: { start: number; end: number } };
      }) => {
        selection.current = event.nativeEvent.selection;
        setInlineCompletion((current) =>
          current ? { ...current, ...event.nativeEvent.selection } : current,
        );
      },
      selection: inlineCompletion
        ? { start: inlineCompletion.start, end: inlineCompletion.end }
        : undefined,
      onPressIn: (event: NativeAutocompleteEvent) => {
        if (interactionReady() && !disabled && (inputValue === '' || !open)) {
          if (open) closePopup(event, 'toggleInput');
          else openPopup(event);
        }
      },
      submitBehavior: 'submit' as const,
      onSubmitEditing: (event: NativeAutocompleteEvent) => {
        // Software submission remains an input action with its actual event.
        if (interactionReady()) commitInput(event, () => event?.preventDefault());
      },
    }),
    getInputLabelProps: () => ({ id: id + '-label', htmlFor: id }),
    getClearProps: () => ({
      tabIndex: -1,
      disabled: disabled || readOnly,
      onPressIn: prepareIndicatorFocus,
      onClick: clearFromIndicator,
    }),
    getPopupIndicatorProps: () => ({
      tabIndex: -1,
      disabled: disabled || readOnly,
      onPressIn: prepareIndicatorFocus,
      onClick: toggleFromIndicator,
    }),
    getItemProps: ({
      index = 0,
      disabled: itemDisabled = disabled,
    }: { index?: number; disabled?: boolean } = {}) => ({
      ...(multiple ? { key: index } : {}),
      'data-item-index': index,
      tabIndex: -1,
      ref: collection.bind('item', index, itemDisabled),
      onFocus: () => {
        if (interactionReady()) setFocusedItem(index);
      },
      ...(!readOnly
        ? {
            onDelete: (event: NativeAutocompleteEvent) => deleteItem(index, event, itemDisabled),
            onKeyUp: (event: NativeAutocompleteKeyboardEvent) => {
              if (
                event.target === event.currentTarget &&
                !event.isComposing &&
                !event.isCanceled &&
                !event.defaultMuiPrevented &&
                (event.key === 'Backspace' || event.key === 'Delete')
              )
                deleteItem(index, event, itemDisabled);
            },
          }
        : {}),
    }),
    getListboxProps: (other: NativeAutocompleteListboxProps = {}) => ({
      ...other,
      id: id + '-listbox',
      ref: setListbox,
      // React Native exposes list rather than the browser's listbox role.
      role: 'list' as const,
      'aria-labelledby': id + '-label',
      'aria-multiselectable': multiple || undefined,
      keyboardShouldPersistTaps: 'always' as const,
      onLayout: (event: Parameters<NonNullable<NativeAutocompleteListboxProps['onLayout']>>[0]) => {
        collection.updateViewport(event.nativeEvent.layout.height);
        other.onLayout?.(event);
      },
      onContentSizeChange: (width: number, height: number) => {
        collection.updateContent(height);
        other.onContentSizeChange?.(width, height);
      },
      onScroll: (event: Parameters<NonNullable<NativeAutocompleteListboxProps['onScroll']>>[0]) => {
        const state = event.nativeEvent;
        collection.updateScroll(
          state.contentOffset.y,
          state.layoutMeasurement.height,
          state.contentSize.height,
        );
        other.onScroll?.(event);
        if (touched.current) touchScrolled.current = true;
      },
      onPointerLeave: (
        event: Parameters<NonNullable<NativeAutocompleteListboxProps['onPointerLeave']>>[0],
      ) => {
        other.onPointerLeave?.(event);
        leaveListbox(event);
      },
    }),
    getOptionProps: ({ index, option }: { index: number; option: any }) => {
      const optionDisabled = Boolean(getOptionDisabled?.(option));
      return {
        key: getOptionKey?.(option) ?? getOptionLabel(option),
        id: id + '-option-' + index,
        ref: collection.bind('option', index, optionDisabled),
        tabIndex: -1,
        role: 'option' as const,
        disabled: optionDisabled,
        // The combobox retains native input focus. Highlighting a disabled
        // option is separate from granting that row native keyboard focus.
        focusable: false,
        focusableWhenDisabled: false,
        'data-option-index': index,
        'aria-disabled': optionDisabled,
        'aria-selected': values.isOptionSelected(option),
        ...(() => {
          const focused = highlight.index === index;
          const focusVisible = focused && highlight.reason === 'keyboard';
          const className = focused
            ? prefix + '-focused' + (focusVisible ? ' ' + prefix + '-focusVisible' : '')
            : undefined;
          return {
            className,
            _muiNativeClassName: className,
            _muiNativeItemState: {
              focused,
              focusVisible,
              selected: values.isOptionSelected(option),
            },
          };
        })(),
        onHoverIn: (event: NativeAutocompleteEvent) =>
          interactWithOption('hover', index, option, event),
        onTouchStart: (event: NativeAutocompleteEvent) =>
          interactWithOption('touch', index, option, event),
        onClick: (event: NativeAutocompleteEvent) =>
          interactWithOption('select', index, option, event),
      };
    },
    native: {
      highlightedIndex: highlight.index,
      highlightReason: highlight.reason,
      inputFocused: focused,
      filteredOptions,
      collection,
      focusInputArea,
      keyboard,
      syncHighlight,
    },
  };
}
