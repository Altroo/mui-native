/* Public hook overloads adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import {
  useNativeAutocomplete,
  type NativeAutocompleteConfiguration,
} from './useNativeAutocomplete';
import type {
  AutocompleteMappedValue,
  UseAutocompleteProps,
  UseAutocompleteReturnValue,
} from './useAutocompleteTypes';
export * from './useAutocompleteTypes';
export { createFilterOptions } from './autocompleteValues';
type RequiredProps<Props, Keys extends keyof Props> = Omit<Props, Keys> &
  Required<Pick<Props, Keys>>;

/** Mapped selections with grouped option-facing results. */
export function useAutocomplete<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  MappedValue extends AutocompleteMappedValue<FreeSolo> = AutocompleteMappedValue<FreeSolo>,
>(
  props: RequiredProps<
    UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, MappedValue>,
    'groupBy' | 'getOptionValue'
  >,
): UseAutocompleteReturnValue<Value, Multiple, DisableClearable, FreeSolo, true, MappedValue>;
/** Mapped selections without grouping. */
export function useAutocomplete<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  MappedValue extends AutocompleteMappedValue<FreeSolo> = AutocompleteMappedValue<FreeSolo>,
>(
  props: RequiredProps<
    Omit<UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, MappedValue>, 'groupBy'>,
    'getOptionValue'
  >,
): UseAutocompleteReturnValue<Value, Multiple, DisableClearable, FreeSolo, false, MappedValue>;
/** Original option selections with grouped results. */
export function useAutocomplete<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>(
  props: RequiredProps<
    UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo>,
    'groupBy'
  >,
): UseAutocompleteReturnValue<Value, Multiple, DisableClearable, FreeSolo, true>;
/** Original option selections without grouping. */
export function useAutocomplete<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>(
  props: Omit<UseAutocompleteProps<Value, Multiple, DisableClearable, FreeSolo>, 'groupBy'>,
): UseAutocompleteReturnValue<Value, Multiple, DisableClearable, FreeSolo>;
export function useAutocomplete(
  props: NativeAutocompleteConfiguration,
): UseAutocompleteReturnValue<any, boolean, boolean, boolean, boolean, any> {
  const { native: _composition, ...publicState } = useNativeAutocomplete(props);
  return publicState;
}
export default useAutocomplete;
