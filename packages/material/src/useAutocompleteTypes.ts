/* Public contracts adapt MIT-licensed Material UI 9.5.0 useAutocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import type * as React from 'react';
import type {
  ViewInstance,
  ScrollViewInstance,
  ScrollViewProps,
  NativeSyntheticEvent,
} from 'react-native';
import type { InteractiveViewProps } from '@altroo/mui-native-host';
import type { ButtonBaseProps, ButtonBaseKeyEvent } from './buttonBase';
import type { InputBaseComponentProps } from './inputs';
import type { InputLabelProps } from './labels';
export type { CreateFilterOptionsConfig, FilterOptionsState } from './autocompleteValues';
export interface AutocompleteGroupedOption<Value = string> {
  key: number;
  index: number;
  group: string;
  options: Value[];
}
/** Native event provenance is retained; callback values and reasons follow MUI. */
/** Programmatic reset/disable transitions can have no native event, as in MUI runtime. */
export type NativeAutocompleteEvent = NativeSyntheticEvent<unknown> | null;
export type NativeAutocompleteKeyboardEvent = ButtonBaseKeyEvent & {
  defaultMuiPrevented?: boolean;
};
export type NativeAutocompleteListbox = ViewInstance | ScrollViewInstance;
import type { FilterOptionsState } from './autocompleteValues';
export type AutocompleteFreeSoloValueMapping<FreeSolo> = FreeSolo extends true ? string : never;
export type AutocompleteValueOrFreeSoloValueMapping<Value, FreeSolo> = FreeSolo extends true
  ? Value | string
  : Value;
export type AutocompleteMappedValue<FreeSolo = false> = true extends FreeSolo
  ? number | boolean
  : string | number | boolean;
type NoInfer<T> = [T][T extends unknown ? 0 : never];
export type AutocompleteResolvedValue<Value, MappedValue> = MappedValue extends undefined
  ? Value
  : NoInfer<MappedValue>;
export type AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo> = Multiple extends true
  ? Array<Value | AutocompleteFreeSoloValueMapping<FreeSolo>>
  : DisableClearable extends true
    ? NonNullable<Value | AutocompleteFreeSoloValueMapping<FreeSolo>>
    : Value | null | AutocompleteFreeSoloValueMapping<FreeSolo>;
export interface UseAutocompleteProps<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> {
  unstable_classNamePrefix?: string | undefined;
  unstable_isActiveElementInListbox?:
    | ((listbox: React.RefObject<NativeAutocompleteListbox | null>) => boolean)
    | undefined;
  autoComplete?: boolean | undefined;
  autoHighlight?: boolean | undefined;
  autoSelect?: boolean | undefined;
  blurOnSelect?: 'touch' | 'mouse' | true | false | undefined;
  clearOnBlur?: boolean | undefined;
  clearOnEscape?: boolean | undefined;
  componentName?: string | undefined;
  defaultValue?:
    | AutocompleteValue<
        AutocompleteResolvedValue<Value, MappedValue>,
        Multiple,
        DisableClearable,
        FreeSolo
      >
    | undefined;
  disableClearable?: DisableClearable | undefined;
  disableCloseOnSelect?: boolean | undefined;
  disabled?: boolean | undefined;
  disabledItemsFocusable?: boolean | undefined;
  disableListWrap?: boolean | undefined;
  filterOptions?: ((options: Value[], state: FilterOptionsState<Value>) => Value[]) | undefined;
  filterSelectedOptions?: boolean | undefined;
  freeSolo?: FreeSolo | undefined;
  getOptionDisabled?: ((option: Value) => boolean) | undefined;
  getOptionKey?:
    | ((option: Value | AutocompleteFreeSoloValueMapping<FreeSolo>) => string | number)
    | undefined;
  getOptionValue?: ((option: Value) => Exclude<MappedValue, undefined>) | undefined;
  getOptionLabel?:
    | ((option: AutocompleteValueOrFreeSoloValueMapping<Value, FreeSolo>) => string)
    | undefined;
  groupBy?: ((option: Value) => string) | undefined;
  handleHomeEndKeys?: boolean | undefined;
  id?: string | undefined;
  includeInputInList?: boolean | undefined;
  inputValue?: string | undefined;
  isOptionEqualToValue?:
    | ((
        option: Value,
        value: AutocompleteValueOrFreeSoloValueMapping<
          AutocompleteResolvedValue<Value, MappedValue>,
          FreeSolo
        >,
      ) => boolean)
    | undefined;
  multiple?: Multiple | undefined;
  onChange?:
    | ((
        event: NativeAutocompleteEvent,
        value: AutocompleteValue<
          AutocompleteResolvedValue<Value, MappedValue>,
          Multiple,
          DisableClearable,
          FreeSolo
        >,
        reason: AutocompleteChangeReason,
        details?: AutocompleteChangeDetails<Value>,
      ) => void)
    | undefined;
  onClose?: ((event: NativeAutocompleteEvent, reason: AutocompleteCloseReason) => void) | undefined;
  onHighlightChange?:
    | ((
        event: NativeAutocompleteEvent,
        option: Value | null,
        reason: AutocompleteHighlightChangeReason,
      ) => void)
    | undefined;
  onInputChange?:
    | ((
        event: NativeAutocompleteEvent,
        value: string,
        reason: AutocompleteInputChangeReason,
      ) => void)
    | undefined;
  onOpen?: ((event: NativeAutocompleteEvent) => void) | undefined;
  open?: boolean | undefined;
  openOnFocus?: boolean | undefined;
  options: ReadonlyArray<Value>;
  readOnly?: boolean | undefined;
  resetHighlightOnMouseLeave?: boolean | undefined;
  selectOnFocus?: boolean | undefined;
  value?:
    | AutocompleteValue<
        AutocompleteResolvedValue<Value, MappedValue>,
        Multiple,
        DisableClearable,
        FreeSolo
      >
    | undefined;
}
export interface UseAutocompleteParameters<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> extends UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, MappedValue> {}
export type AutocompleteHighlightChangeReason = 'keyboard' | 'mouse' | 'touch';
export type AutocompleteChangeReason =
  | 'createOption'
  | 'selectOption'
  | 'removeOption'
  | 'clear'
  | 'blur';
export interface AutocompleteChangeDetails<Value = string> {
  option: Value;
}
export type AutocompleteCloseReason =
  | 'createOption'
  | 'toggleInput'
  | 'escape'
  | 'selectOption'
  | 'removeOption'
  | 'blur';
export type AutocompleteInputChangeReason =
  | 'input'
  | 'reset'
  | 'clear'
  | 'blur'
  | 'selectOption'
  | 'removeOption'
  | 'createOption';
/** Native renderers forward these refs and keyboard handlers with the item props. */
export interface NativeAutocompleteItemBindings {
  ref: React.RefCallback<ViewInstance>;
  'data-item-index': number;
  tabIndex: -1;
  onFocus: NonNullable<ButtonBaseProps['onFocus']>;
  onKeyUp?: ButtonBaseProps['onKeyUp'];
  onDelete?: (event: NativeAutocompleteEvent) => void;
}
export type AutocompleteGetItemProps<Multiple extends boolean | undefined> = Multiple extends true
  ? (args: {
      index: number;
      disabled?: boolean;
    }) => NativeAutocompleteItemBindings & { key: number }
  : (args?: { index?: number; disabled?: boolean }) => NativeAutocompleteItemBindings;
export type AutocompleteGetTagProps = ({ index }: { index: number }) => {
  key: number;
  'data-tag-index': number;
  tabIndex: -1;
  onDelete: (event: any) => void;
};

export interface NativeAutocompleteRootProps extends Omit<InteractiveViewProps, 'onKeyDown'> {
  onKeyDown?: (event: NativeAutocompleteKeyboardEvent) => void;
}
export interface NativeAutocompleteInputProps extends InputBaseComponentProps {
  id?: string;
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
}
export interface NativeAutocompleteOptionProps extends ButtonBaseProps {
  className?: string;
  key: React.Key;
  id: string;
  'data-option-index': number;
  'aria-selected': boolean;
  'aria-disabled': boolean;
}
export interface NativeAutocompleteListboxProps extends ScrollViewProps {
  ref?: React.Ref<NativeAutocompleteListbox>;
  id?: string;
  className?: string;
  'aria-multiselectable'?: boolean;
}
export interface NativeAutocompleteListboxBindings
  extends Omit<NativeAutocompleteListboxProps, 'ref'> {
  ref: React.RefCallback<NativeAutocompleteListbox>;
}
export interface UseAutocompleteRenderedOption<Value> {
  option: Value;
  index: number;
}
/**
 * Root/input/listbox/option getters bind real native refs and interaction props.
 * Custom renderers must forward those refs and handlers to native hosts.
 * Browser element mutation, form submission and CSS selectors are not native APIs.
 */
export interface UseAutocompleteReturnValue<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  HasGroupBy extends boolean = false,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> {
  getRootProps: (externalProps?: NativeAutocompleteRootProps) => InteractiveViewProps;
  getInputProps: () => NativeAutocompleteInputProps;
  getInputLabelProps: () => Partial<InputLabelProps>;
  getClearProps: () => ButtonBaseProps;
  getItemProps: AutocompleteGetItemProps<Multiple>;
  getPopupIndicatorProps: () => ButtonBaseProps;
  getListboxProps: (
    externalProps?: NativeAutocompleteListboxProps,
  ) => NativeAutocompleteListboxBindings;
  getOptionFromValue: (
    value: AutocompleteValueOrFreeSoloValueMapping<
      AutocompleteResolvedValue<Value, MappedValue>,
      FreeSolo
    >,
  ) => { option: AutocompleteValueOrFreeSoloValueMapping<Value, FreeSolo> } | null;
  getOptionProps: (
    renderedOption: UseAutocompleteRenderedOption<Value>,
  ) => NativeAutocompleteOptionProps;
  id: string;
  inputValue: string;
  value: AutocompleteValue<
    AutocompleteResolvedValue<Value, MappedValue>,
    Multiple,
    DisableClearable,
    FreeSolo
  >;
  dirty: boolean;
  expanded: boolean;
  popupOpen: boolean;
  focused: boolean;
  anchorEl: ViewInstance | null;
  setAnchorEl: React.RefCallback<ViewInstance>;
  focusedItem: number;
  groupedOptions: HasGroupBy extends true ? AutocompleteGroupedOption<Value>[] : Value[];
}
