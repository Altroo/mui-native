/* Filtering and value resolution adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface CreateFilterOptionsConfig<Value> {
  ignoreAccents?: boolean;
  ignoreCase?: boolean;
  limit?: number;
  matchFrom?: 'any' | 'start';
  stringify?: (option: Value) => string;
  trim?: boolean;
}
export interface FilterOptionsState<Value> {
  inputValue: string;
  getOptionLabel: (option: Value) => string;
}
const stripDiacritics = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Original matching and limit semantics, independent of native presentation. */
export function createFilterOptions<Value>(config: CreateFilterOptionsConfig<Value> = {}) {
  const {
    ignoreAccents = true,
    ignoreCase = true,
    limit,
    matchFrom = 'any',
    stringify,
    trim = false,
  } = config;
  return (options: Value[], { inputValue, getOptionLabel }: FilterOptionsState<Value>): Value[] => {
    let input = trim ? inputValue.trim() : inputValue;
    if (ignoreCase) input = input.toLowerCase();
    if (ignoreAccents) input = stripDiacritics(input);
    const filteredOptions = !input ? options : [];
    if (input) {
      const maximum = Number.isInteger(limit) && limit! > 0 ? limit! : Infinity;
      options.some((option) => {
        let candidate = (stringify || getOptionLabel)(option);
        if (ignoreCase) candidate = candidate.toLowerCase();
        if (ignoreAccents) candidate = stripDiacritics(candidate);
        if (matchFrom === 'start' ? candidate.startsWith(input) : candidate.includes(input))
          filteredOptions.push(option);
        return filteredOptions.length >= maximum;
      });
    }
    return typeof limit === 'number' ? filteredOptions.slice(0, limit) : filteredOptions;
  };
}

type ResolvedOption<Option> = { option: Option | string };
interface ValueConfiguration<Option> {
  options: readonly Option[];
  getOptionValue?: (option: Option) => unknown;
  isOptionEqualToValue?: (option: Option, value: unknown) => boolean;
  freeSolo: boolean;
  multiple: boolean;
  value: unknown;
}
const describe = (value: unknown) =>
  typeof value === 'string' ? JSON.stringify(value) : String(value);
function report(message: string, seen: Set<string>) {
  if (seen.has(message)) return;
  seen.add(message);
  console.error('[mui-native:autocomplete] ' + message);
}
function validate(value: unknown, freeSolo: boolean, seen: Set<string>) {
  if (freeSolo && typeof value === 'string') {
    report(
      'getOptionValue returned string ' +
        describe(value) +
        ' while freeSolo is enabled. Strings represent free-solo text; return a number or boolean for an option.',
      seen,
    );
    return;
  }
  if (!['string', 'number', 'boolean'].includes(typeof value) || Number.isNaN(value))
    report(
      'getOptionValue returned an invalid option identifier: ' +
        describe(value) +
        '. Return a unique string, number or boolean.',
      seen,
    );
}

/**
 * Cache option-facing lookup separately from selected values. A filtered/generated
 * option survives popup closure, but a controlled parent can reject its selection.
 * Current options always take precedence over retained generated selections.
 */
export function useAutocompleteValues<Option>({
  options,
  getOptionValue: mapper,
  isOptionEqualToValue: equality,
  freeSolo,
  multiple,
  value,
}: ValueConfiguration<Option>) {
  const getOptionValue = useCallback(
    (option: Option): unknown => (mapper ? mapper(option) : option),
    [mapper],
  );
  const reported = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !mapper) return;
    const identifiers = new Set<unknown>();
    for (const option of options) {
      const identifier = mapper(option);
      validate(identifier, freeSolo, reported);
      if (freeSolo && typeof identifier === 'string') continue;
      if (identifiers.has(identifier))
        report(
          'getOptionValue returned duplicate identifier ' +
            describe(identifier) +
            '. Every option must have a unique identifier.',
          reported,
        );
      identifiers.add(identifier);
    }
  }, [options, mapper, freeSolo, reported]);
  const isOptionEqualToValue = useCallback(
    (option: Option, selected: unknown) => {
      if (mapper && freeSolo && typeof selected === 'string') return false;
      return equality ? equality(option, selected) : getOptionValue(option) === selected;
    },
    [mapper, freeSolo, equality, getOptionValue],
  );
  const optionMap = useMemo(
    () => (mapper && !equality ? new Map(options.map((option) => [mapper(option), option])) : null),
    [mapper, equality, options],
  );
  const resolveFromOptions = useMemo(() => {
    if (!mapper)
      return (selected: unknown): ResolvedOption<Option> => ({
        option: selected as Option | string,
      });
    const resolved = new Map<unknown, ResolvedOption<Option> | null>();
    return (selected: unknown): ResolvedOption<Option> | null => {
      if (freeSolo && typeof selected === 'string') return { option: selected };
      if (equality) {
        // Cache misses too. The generated-selection fallback is deliberately
        // outside this cache so a new retained option can resolve a prior miss.
        if (!resolved.has(selected)) {
          const index = options.findIndex((option) => equality(option, selected));
          resolved.set(selected, index === -1 ? null : { option: options[index] });
        }
        return resolved.get(selected)!;
      }
      return optionMap!.has(selected) ? { option: optionMap!.get(selected)! } : null;
    };
  }, [mapper, freeSolo, equality, options, optionMap]);
  const generated = useRef<Option[]>([]);
  const getOptionFromValue = useCallback(
    (selected: unknown): ResolvedOption<Option> | null => {
      const resolved = resolveFromOptions(selected);
      if (resolved !== null) return resolved;
      const index = generated.current.findIndex((option) => isOptionEqualToValue(option, selected));
      return index === -1 ? null : { option: generated.current[index] };
    },
    [resolveFromOptions, isOptionEqualToValue],
  );
  const selectedValues = useMemo(
    () => (multiple ? (value as readonly unknown[]) : value != null ? [value] : []),
    [multiple, value],
  );
  const selectedSet = useMemo(
    () =>
      equality || selectedValues.length === 0
        ? null
        : new Set(
            mapper && freeSolo
              ? selectedValues.filter((selected) => typeof selected !== 'string')
              : selectedValues,
          ),
    [equality, selectedValues, mapper, freeSolo],
  );
  const isOptionSelected = useCallback(
    (option: Option) =>
      selectedSet
        ? selectedSet.has(getOptionValue(option))
        : selectedValues.some(
            (selected) => selected != null && isOptionEqualToValue(option, selected),
          ),
    [selectedSet, getOptionValue, selectedValues, isOptionEqualToValue],
  );
  useEffect(() => {
    if (generated.current.length)
      generated.current = mapper ? generated.current.filter(isOptionSelected) : [];
  });
  const rememberSelectedOption = useCallback(
    (option: Option, identifier: unknown, nextSelection?: readonly unknown[]) => {
      if (process.env.NODE_ENV !== 'production' && mapper) validate(identifier, freeSolo, reported);
      if (!mapper || resolveFromOptions(identifier) !== null) return;
      // Several accepted selections can precede one React commit. Retain
      // generated labels against that projected selection, not an older render.
      const projectedSet =
        nextSelection === undefined || equality
          ? null
          : new Set(
              freeSolo
                ? nextSelection.filter((selected) => typeof selected !== 'string')
                : nextSelection,
            );
      const retained = (previous: Option) =>
        nextSelection === undefined
          ? isOptionSelected(previous)
          : projectedSet
            ? projectedSet.has(getOptionValue(previous))
            : nextSelection.some(
                (selected) => selected != null && isOptionEqualToValue(previous, selected),
              );
      generated.current = [
        ...generated.current.filter(
          (previous) => retained(previous) && !isOptionEqualToValue(previous, identifier),
        ),
        option,
      ];
    },
    [
      mapper,
      freeSolo,
      reported,
      resolveFromOptions,
      isOptionSelected,
      isOptionEqualToValue,
      equality,
      getOptionValue,
    ],
  );
  return {
    getOptionValue,
    isOptionEqualToValue,
    isOptionSelected,
    getOptionFromValue,
    rememberSelectedOption,
  };
}
