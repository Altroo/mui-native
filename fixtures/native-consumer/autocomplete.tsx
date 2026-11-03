import React from 'react';
import { TextInput, ScrollView, type ViewInstance } from 'react-native';
import {
  Autocomplete,
  TextField,
  Chip,
  ButtonBase,
  useAutocomplete,
  createFilterOptions,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  type AutocompleteRenderGetTagProps,
} from '@mui/material';
import DeepAutocomplete from '@mui/material/Autocomplete';
import deepHook from '@mui/material/useAutocomplete';
import classes, {
  getAutocompleteUtilityClass,
} from '@mui/material/Autocomplete/autocompleteClasses';
type City = { id: number; label: string };
const cities: City[] = [{ id: 1, label: 'Rabat' }];
const input = (params: AutocompleteRenderInputParams) => <TextField {...params} label="City" />;
export const raw = (
  <Autocomplete
    options={cities}
    multiple
    renderInput={input}
    onChange={(_, value) => {
      const selections: City[] = value;
      void selections;
    }}
  />
);
export const mapped = (
  <DeepAutocomplete
    options={cities}
    getOptionValue={(option) => option.id}
    value={1}
    renderInput={input}
    onChange={(_, value, _reason, details) => {
      const selected: number | null = value;
      const option: City | undefined = details?.option;
      void [selected, option];
    }}
    renderValue={(value, getItemProps) => {
      const { className, ...props } = getItemProps();
      return <Chip {...props} label={'ID ' + value} />;
    }}
  />
);
export const solo = (
  <Autocomplete
    options={cities}
    freeSolo
    getOptionValue={(option) => option.id}
    renderInput={input}
    onChange={(_, value) => {
      const selected: number | string | null = value;
      void selected;
    }}
  />
);
const Typed = Autocomplete<City, false, false, false, typeof Chip, number>;
const Memo = React.memo(Typed);
export const memo = (
  <Memo options={cities} getOptionValue={(option) => option.id} value={1} renderInput={input} />
);
export const element = React.createElement(Autocomplete, {
  options: cities,
  value: 1,
  getOptionValue: (option: unknown) => (option as City).id,
  renderInput: input,
});
export const custom: AutocompleteProps<City, false, false, false, typeof Chip, number> = {
  options: cities,
  getOptionValue: (option) => option.id,
  renderInput: input,
  slotProps: {
    root: { ref: React.createRef<ViewInstance>() },
    listbox: { keyboardShouldPersistTaps: 'always' },
    clearIndicator: { style: ({ pressed }) => ({ opacity: pressed ? 0.7 : 1 }) },
  },
};
export function Headless() {
  const state = useAutocomplete({ options: cities, getOptionValue: (option) => option.id });
  const selected: number | null = state.value;
  void selected;
  return (
    <>
      <TextInput {...state.getInputProps()} />
      <ScrollView {...state.getListboxProps()}>
        {state.groupedOptions.map((option, index) => {
          const { key, ...props } = state.getOptionProps({ option, index });
          return (
            <ButtonBase key={key} {...props}>
              {option.label}
            </ButtonBase>
          );
        })}
      </ScrollView>
    </>
  );
}
// @ts-expect-error Explicit mapped selections require their mapper.
export const missing = <Typed options={cities} value={1} renderInput={input} />;
export const wrong = (
  // @ts-expect-error Mapped values use numeric IDs.
  <Typed options={cities} getOptionValue={(option) => option.id} value="one" renderInput={input} />
);
export const browser = (
  // @ts-expect-error Native component refs are not DOM nodes.
  <Autocomplete options={cities} renderInput={input} ref={React.createRef<HTMLDivElement>()} />
);
void [classes, getAutocompleteUtilityClass('option'), createFilterOptions<City>(), deepHook];

export function legacyTagMetadata(getTagProps: AutocompleteRenderGetTagProps) {
  const { 'data-tag-index': index, className, disabled, onDelete } = getTagProps({ index: 0 });
  const numericIndex: number = index;
  void [numericIndex, className, disabled, onDelete];
}
