import { autocompleteClasses, getAutocompleteUtilityClass } from '@altroo/mui-native';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import {
  createFilterOptions,
  useAutocompleteValues,
} from '../packages/material/src/autocompleteValues';
import reference from './fixtures/mui-autocomplete-values-9.5.0.json';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});
for (const [index, test] of reference.observations.entries()) {
  it('matches original filter ordering, identity and work at case ' + index, () => {
    let calls = 0;
    type Option = string | { id: number; label: string };
    const options: Option[] = test.options;
    const label = (option: Option) => {
      calls++;
      return typeof option === 'string' ? option : option.label;
    };
    const stringify = test.stringifyIds
      ? (option: Option) => {
          calls++;
          return typeof option === 'string' ? option : option.id + ' ' + option.label;
        }
      : undefined;
    const output = createFilterOptions<Option>({
      ...test.config,
      matchFrom: 'matchFrom' in test.config ? (test.config.matchFrom as 'start') : undefined,
      stringify,
    })(options, { inputValue: test.inputValue, getOptionLabel: label });
    expect(output.map((option) => options.indexOf(option))).toEqual(test.indices);
    expect(output === options).toBe(test.sameArray);
    expect(calls).toBe(test.calls);
  });
}
type City = { id: number; label: string };
const rabat = { id: 1, label: 'Rabat' },
  casa = { id: 2, label: 'Casablanca' };
const id = (option: City) => option.id;
const cities = [rabat, casa];

test('mapped identifiers preserve original options and free-solo strings remain distinct', () => {
  const { result, rerender } = renderHook(
    ({ value, freeSolo }: { value: unknown; freeSolo: boolean }) =>
      useAutocompleteValues({
        options: cities,
        getOptionValue: id,
        freeSolo,
        multiple: true,
        value,
      }),
    { initialProps: { value: [1, 'Rabat'], freeSolo: true } },
  );
  expect(result.current.getOptionFromValue(1)?.option).toBe(rabat);
  expect(result.current.getOptionFromValue('Rabat')).toEqual({ option: 'Rabat' });
  expect(result.current.isOptionSelected(rabat)).toBe(true);
  expect(result.current.isOptionSelected(casa)).toBe(false);
  rerender({ value: [2], freeSolo: false });
  expect(result.current.isOptionSelected(rabat)).toBe(false);
  expect(result.current.isOptionSelected(casa)).toBe(true);
  expect(result.current.getOptionFromValue(99)).toBeNull();
});

test('an array-valued option remains one raw selection in single mode', () => {
  const option = ['Rabat', 'Morocco'];
  const { result } = renderHook(() =>
    useAutocompleteValues({ options: [option], multiple: false, freeSolo: false, value: option }),
  );
  expect(result.current.getOptionFromValue(option)?.option).toBe(option);
  expect(result.current.isOptionSelected(option)).toBe(true);
  expect(result.current.isOptionSelected(['Rabat', 'Morocco'])).toBe(false);
});

test('null and undefined options remain distinct from mapped lookup misses', () => {
  type Option = City | null | undefined;
  const mapper = (option: Option) =>
    option === null ? 0 : option === undefined ? 1 : option.id + 10;
  const { result } = renderHook(() =>
    useAutocompleteValues({
      options: [null, undefined, rabat],
      getOptionValue: mapper,
      multiple: true,
      freeSolo: false,
      value: [0, 1],
    }),
  );
  expect(result.current.getOptionFromValue(0)).toEqual({ option: null });
  expect(result.current.getOptionFromValue(1)).toEqual({ option: undefined });
  expect(result.current.getOptionFromValue(99)).toBeNull();
});

test('custom equality caches misses and a generated selection can resolve a cached miss', () => {
  const equality = jest.fn((option: City, value: unknown) => option.id === value);
  const { result, rerender } = renderHook(
    ({ value }: { value: unknown }) =>
      useAutocompleteValues({
        options: cities,
        getOptionValue: id,
        isOptionEqualToValue: equality,
        multiple: false,
        freeSolo: false,
        value,
      }),
    { initialProps: { value: 3 } },
  );
  expect(result.current.getOptionFromValue(3)).toBeNull();
  const calls = equality.mock.calls.length;
  expect(result.current.getOptionFromValue(3)).toBeNull();
  expect(equality).toHaveBeenCalledTimes(calls);
  const generated = { id: 3, label: 'Fes' };
  act(() => result.current.rememberSelectedOption(generated, 3));
  expect(result.current.getOptionFromValue(3)?.option).toBe(generated);
  rerender({ value: 3 });
  expect(result.current.getOptionFromValue(3)?.option).toBe(generated);
});

test('current options supersede retained generated selections and deselection retires them', () => {
  const generated = { id: 3, label: 'Fes' },
    refreshed = { id: 3, label: 'Fes updated' };
  const { result, rerender } = renderHook(
    ({ options, value }: { options: City[]; value: unknown }) =>
      useAutocompleteValues({
        options,
        getOptionValue: id,
        multiple: false,
        freeSolo: false,
        value,
      }),
    { initialProps: { options: cities, value: 3 } },
  );
  act(() => result.current.rememberSelectedOption(generated, 3));
  rerender({ options: cities, value: 3 });
  expect(result.current.getOptionFromValue(3)?.option).toBe(generated);
  rerender({ options: [...cities, refreshed], value: 3 });
  expect(result.current.getOptionFromValue(3)?.option).toBe(refreshed);
  rerender({ options: cities, value: null });
  expect(result.current.getOptionFromValue(3)).toBeNull();
});

test('a controlled parent rejecting a generated selection removes it after commit', () => {
  const { result, rerender } = renderHook(
    ({ value }: { value: unknown }) =>
      useAutocompleteValues({
        options: cities,
        getOptionValue: id,
        multiple: false,
        freeSolo: false,
        value,
      }),
    { initialProps: { value: 1 } },
  );
  act(() => result.current.rememberSelectedOption({ id: 3, label: 'Fes' }, 3));
  expect(result.current.getOptionFromValue(3)?.option).toEqual({ id: 3, label: 'Fes' });
  rerender({ value: 1 });
  expect(result.current.getOptionFromValue(3)).toBeNull();
  expect(result.current.getOptionFromValue(1)?.option).toBe(rabat);
});

test('invalid and duplicated mapped identifiers are diagnosed once per message', () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const options = [rabat, { id: 1, label: 'Duplicate' }];
  const { rerender } = renderHook(
    ({ freeSolo }: { freeSolo: boolean }) =>
      useAutocompleteValues({
        options,
        getOptionValue: () => 'duplicate',
        multiple: false,
        freeSolo,
        value: null,
      }),
    { initialProps: { freeSolo: false } },
  );
  expect(error).toHaveBeenCalledTimes(1);
  rerender({ freeSolo: false });
  expect(error).toHaveBeenCalledTimes(1);
  rerender({ freeSolo: true });
  expect(error).toHaveBeenCalledTimes(2);
  expect(error.mock.calls.map(([message]) => message).join(' ')).toContain('freeSolo');
});

test('class helpers retain original slot names and every global state identifier', () => {
  expect(autocompleteClasses).toEqual(reference.classMetadata.classes);
  for (const [slot, expected] of Object.entries(reference.classMetadata.utilities))
    expect(getAutocompleteUtilityClass(slot)).toBe(expected);
});
