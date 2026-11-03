import React from 'react';
import { TextInput, ScrollView } from 'react-native';
import { InteractiveView } from '@altroo/mui-native-host';
import {
  ButtonBase,
  useAutocomplete,
  type AutocompleteGroupedOption,
  type AutocompleteValue,
} from '@altroo/mui-native';

type City = { id: number; label: string; country: string };
const cities: City[] = [{ id: 1, label: 'Rabat', country: 'Morocco' }];
/** Compile-only consumer: native host refs, original value inference and mapped IDs. */
export function AutocompleteContracts() {
  const raw = useAutocomplete({ options: cities });
  const rawValue: City | null = raw.value;
  const mapped = useAutocomplete({ options: cities, getOptionValue: (option) => option.id });
  const mappedValue: number | null = mapped.value;
  const grouped = useAutocomplete({
    options: cities,
    groupBy: (option) => option.country,
    getOptionValue: (option) => option.id,
  });
  const groups: AutocompleteGroupedOption<City>[] = grouped.groupedOptions;
  const many = useAutocomplete({
    options: cities,
    multiple: true,
    getOptionValue: (option) => option.id,
  });
  const identifiers: number[] = many.value;
  const solo = useAutocomplete({
    options: cities,
    freeSolo: true,
    getOptionValue: (option) => option.id,
    getOptionLabel: (option) => (typeof option === 'string' ? option : option.label),
  });
  const soloValue: number | string | null = solo.value;
  const mandatory = useAutocomplete({ options: cities, disableClearable: true });
  const requiredValue: City = mandatory.value;
  const scalar: AutocompleteValue<number, false, false, false> = mappedValue;
  void [rawValue, mappedValue, groups, identifiers, soloValue, requiredValue, scalar];
  // @ts-expect-error Mapped IDs retain the mapper's number type.
  const wrongMapped: string | null = mapped.value;
  void wrongMapped;
  useAutocomplete({
    options: cities,
    freeSolo: true,
    // @ts-expect-error Free-solo strings cannot also identify mapped options.
    getOptionValue: (option) => String(option.id),
  });
  // @ts-expect-error Browser element refs cannot stand in for native input refs.
  const browser: React.Ref<HTMLInputElement> = raw.getInputProps().ref;
  void browser;
  const option = raw.getOptionProps({ option: cities[0], index: 0 });
  return (
    <InteractiveView {...raw.getRootProps()}>
      <TextInput {...raw.getInputProps()} />
      <ScrollView {...raw.getListboxProps()}>
        <ButtonBase {...option}>{cities[0].label}</ButtonBase>
      </ScrollView>
    </InteractiveView>
  );
}
