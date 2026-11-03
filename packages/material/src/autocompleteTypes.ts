/* Public contracts adapt MIT-licensed Material UI 9.5.0 Autocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import type * as React from 'react';
import type { ViewInstance, ViewProps, StyleProp } from 'react-native';
import type { SlotProps, SxProps, NativeStyle } from '@altroo/mui-native-system';
import type { Chip } from './chip';
import type { ChipProps } from './chipTypes';
import type { IconButtonProps } from './buttonTypes';
import type { PaperProps } from './layout';
import type { PopperProps } from './popper';
import type { TextFieldInputSlotProps } from './forms';
import type { AutocompleteClasses } from './autocompleteClasses';
import type {
  UseAutocompleteProps,
  AutocompleteMappedValue,
  AutocompleteResolvedValue,
  AutocompleteFreeSoloValueMapping,
  AutocompleteValueOrFreeSoloValueMapping,
  NativeAutocompleteRootProps,
  NativeAutocompleteInputProps,
  NativeAutocompleteOptionProps,
  NativeAutocompleteListboxProps,
  NativeAutocompleteItemBindings,
  AutocompleteGetTagProps,
} from './useAutocompleteTypes';
import type { InputLabelProps } from './labels';
export interface AutocompleteRootSlotPropsOverrides {}
export interface AutocompleteChipSlotPropsOverrides {}
export interface AutocompleteClearIndicatorSlotPropsOverrides {}
export interface AutocompleteListboxSlotPropsOverrides {}
export interface AutocompletePopupIndicatorSlotPropsOverrides {}
export interface AutocompletePaperSlotPropsOverrides {}
export interface AutocompletePopperSlotPropsOverrides {}
export interface AutocompleteStatusSlotPropsOverrides {}
export interface AutocompletePropsSizeOverrides {}
type Size = Extract<
  {
    [K in keyof (Omit<Record<'small' | 'medium', true>, keyof AutocompletePropsSizeOverrides> &
      AutocompletePropsSizeOverrides)]: true extends (Omit<
      Record<'small' | 'medium', true>,
      keyof AutocompletePropsSizeOverrides
    > &
      AutocompletePropsSizeOverrides)[K]
      ? K
      : never;
  }[keyof (Omit<Record<'small' | 'medium', true>, keyof AutocompletePropsSizeOverrides> &
    AutocompletePropsSizeOverrides)],
  string
>;
/** Custom roots/listboxes must forward the supplied native refs and event handlers. */
export interface NativeAutocompleteSlotProps extends Omit<ViewProps, 'style'> {
  ref?: React.Ref<ViewInstance>;
  sx?: SxProps;
  style?: StyleProp<NativeStyle>;
  className?: string;
  ownerState?: AutocompleteOwnerState<any, boolean, boolean, boolean, any, any>;
}
export interface NativeAutocompleteListboxSlotProps extends NativeAutocompleteListboxProps {
  sx?: SxProps;
  ownerState?: NativeAutocompleteSlotProps['ownerState'];
}
export interface AutocompleteSlots {
  root?: React.ComponentType<NativeAutocompleteSlotProps & NativeAutocompleteRootProps>;
  chip?: React.ComponentType<ChipProps<any>>;
  clearIndicator?: React.ComponentType<IconButtonProps>;
  popupIndicator?: React.ComponentType<IconButtonProps>;
  listbox?: React.ComponentType<NativeAutocompleteListboxSlotProps>;
  status?: React.ComponentType<NativeAutocompleteSlotProps>;
  paper?: React.ComponentType<PaperProps>;
  popper?: React.ComponentType<PopperProps>;
}
export type AutocompleteSlotsAndSlotProps<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ComponentType<any> = typeof Chip,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> = {
  slots?: AutocompleteSlots;
  slotProps?: {
    root?: SlotProps<
      NativeAutocompleteSlotProps &
        NativeAutocompleteRootProps &
        AutocompleteRootSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    chip?: SlotProps<
      Partial<ChipProps<ChipComponent>> & AutocompleteChipSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    clearIndicator?: SlotProps<
      Partial<IconButtonProps> & AutocompleteClearIndicatorSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    popupIndicator?: SlotProps<
      Partial<IconButtonProps> & AutocompletePopupIndicatorSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    listbox?: SlotProps<
      NativeAutocompleteListboxSlotProps & AutocompleteListboxSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    status?: SlotProps<
      NativeAutocompleteSlotProps & AutocompleteStatusSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    paper?: SlotProps<
      Partial<PaperProps> & AutocompletePaperSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
    popper?: SlotProps<
      Partial<PopperProps> & AutocompletePopperSlotPropsOverrides,
      AutocompleteOwnerState<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent,
        MappedValue
      >
    >;
  };
};
export type AutocompleteRenderValue<Value, Multiple, FreeSolo> = Multiple extends true
  ? Array<Value | AutocompleteFreeSoloValueMapping<FreeSolo>>
  : NonNullable<Value | AutocompleteFreeSoloValueMapping<FreeSolo>>;
export type AutocompleteRenderValueGetItemProps<Multiple extends boolean | undefined> =
  Multiple extends true
    ? (args: {
        index: number;
        disabled?: boolean;
      }) => NativeAutocompleteItemBindings & { key: number; className: string; disabled: boolean }
    : (args?: {
        index?: number;
        disabled?: boolean;
      }) => NativeAutocompleteItemBindings & { className: string; disabled: boolean };
export interface AutocompleteRenderOptionState {
  inputValue: string;
  index: number;
  selected: boolean;
}
export interface AutocompleteRenderGroupParams {
  key: number;
  group: string;
  children?: React.ReactNode;
}
export interface AutocompleteRenderInputParams {
  id: string;
  disabled: boolean;
  fullWidth: boolean;
  size: 'small' | undefined;
  slotProps: {
    inputLabel: Partial<InputLabelProps>;
    input: TextFieldInputSlotProps & { className: string };
    htmlInput: NativeAutocompleteInputProps;
  };
}
/** Legacy exported type metadata retains tag indices; renderValue uses item indices. */
export type AutocompleteRenderGetTagProps = (args: {
  index: number;
}) => ReturnType<AutocompleteGetTagProps> & { className: string; disabled: boolean };
export interface AutocompleteProps<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends React.ComponentType<any> = typeof Chip,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> extends UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, MappedValue>,
    Omit<NativeAutocompleteRootProps, 'onChange' | 'children' | 'style' | 'id'>,
    AutocompleteSlotsAndSlotProps<
      Value,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent,
      MappedValue
    > {
  ref?: React.Ref<ViewInstance>;
  classes?: Partial<AutocompleteClasses>;
  className?: string;
  style?: StyleProp<NativeStyle>;
  sx?: SxProps;
  clearIcon?: React.ReactNode;
  clearText?: string;
  closeText?: string;
  disablePortal?: boolean;
  forcePopupIcon?: true | false | 'auto';
  fullWidth?: boolean;
  getLimitTagsText?: (more: number) => React.ReactNode;
  loading?: boolean;
  loadingText?: React.ReactNode;
  limitTags?: number;
  noOptionsText?: React.ReactNode;
  openText?: string;
  popupIcon?: React.ReactNode;
  renderGroup?: (params: AutocompleteRenderGroupParams) => React.ReactNode;
  renderInput: (params: AutocompleteRenderInputParams) => React.ReactNode;
  renderOption?: (
    props: NativeAutocompleteOptionProps,
    option: Value,
    state: AutocompleteRenderOptionState,
    ownerState: AutocompleteOwnerState<
      Value,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent,
      MappedValue
    >,
  ) => React.ReactNode;
  renderValue?: (
    value: AutocompleteRenderValue<
      AutocompleteResolvedValue<Value, MappedValue>,
      Multiple,
      FreeSolo
    >,
    getItemProps: AutocompleteRenderValueGetItemProps<Multiple>,
    ownerState: AutocompleteOwnerState<
      Value,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent,
      MappedValue
    >,
  ) => React.ReactNode;
  size?: Size;
}
export type AutocompleteOwnerState<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ComponentType<any> = typeof Chip,
  MappedValue extends AutocompleteMappedValue | undefined = undefined,
> = AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent, MappedValue> & {
  disablePortal: boolean;
  expanded: boolean;
  focused: boolean;
  fullWidth: boolean;
  getOptionLabel: (option: AutocompleteValueOrFreeSoloValueMapping<Value, FreeSolo>) => string;
  hasClearIcon: boolean;
  hasPopupIcon: boolean;
  inputFocused: boolean;
  popupOpen: boolean;
  size: Size;
};
export interface NativeAutocompleteComponent {
  <
    Value,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    FreeSolo extends boolean | undefined = false,
    ChipComponent extends React.ComponentType<any> = typeof Chip,
    MappedValue extends AutocompleteMappedValue<FreeSolo> = AutocompleteMappedValue<FreeSolo>,
  >(
    props: Omit<
      AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent, MappedValue>,
      'getOptionValue'
    > & {
      getOptionValue: (option: Value) => MappedValue;
    },
  ): React.ReactElement;
  <
    Value,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    FreeSolo extends boolean | undefined = false,
    ChipComponent extends React.ComponentType<any> = typeof Chip,
  >(
    props: AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>,
  ): React.ReactElement;
  <
    Value,
    Multiple extends boolean | undefined = false,
    DisableClearable extends boolean | undefined = false,
    FreeSolo extends boolean | undefined = false,
    ChipComponent extends React.ComponentType<any> = typeof Chip,
    MappedValue extends AutocompleteMappedValue | undefined = undefined,
  >(
    props: AutocompleteProps<
      Value,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent,
      MappedValue
    > &
      (undefined extends MappedValue ? {} : { getOptionValue: (option: Value) => MappedValue }) &
      (FreeSolo extends unknown
        ? {
            freeSolo?: FreeSolo;
            getOptionValue?: (option: Value) => MappedValue & AutocompleteMappedValue<FreeSolo>;
          }
        : never),
  ): React.ReactElement;
  displayName?: string;
}
