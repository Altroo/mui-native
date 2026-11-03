// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'useAutocomplete/useAutocomplete.js',
  'useAutocomplete/useAutocomplete.d.ts',
  'useAutocomplete/utils/useOptionValue.js',
  'useAutocomplete/utils/validateOptionValues.js',
  'Autocomplete/autocompleteClasses.js',
]);
const { createFilterOptions } = material.require('@mui/material/useAutocomplete');
const originalClasses = material.require('@mui/material/Autocomplete');
const classMetadata = {
  classes: originalClasses.autocompleteClasses,
  utilities: Object.fromEntries(
    [
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
      'loading',
      'hover',
    ].map((slot) => [slot, originalClasses.getAutocompleteUtilityClass(slot)]),
  ),
};
const strings = ['Rabat', 'Casablanca', 'Café', 'CAFETERIA', 'Málaga', '  Rabat', 'cafe\u0301'];
const objects = strings.map((label, id) => ({ id, label }));
const cases = [];
for (const inputValue of ['', 'ra', 'CAFE', 'café', '  ra ', 'malaga']) {
  for (const config of [
    {},
    { ignoreCase: false },
    { ignoreAccents: false },
    { matchFrom: 'start' },
    { trim: true },
  ])
    cases.push({ options: strings, inputValue, config, stringifyIds: false });
}
for (const limit of [0, 1, 2, -1, 2.5]) {
  for (const inputValue of ['', 'ca'])
    cases.push({ options: strings, inputValue, config: { limit }, stringifyIds: false });
}
cases.push({ options: objects, inputValue: '2 ', config: {}, stringifyIds: true });
const observations = cases.map((test) => {
  let calls = 0;
  const label = (option) => {
    calls++;
    return typeof option === 'string' ? option : option.label;
  };
  const stringify = test.stringifyIds
    ? (option) => {
        calls++;
        return option.id + ' ' + option.label;
      }
    : undefined;
  const output = createFilterOptions({ ...test.config, stringify })(test.options, {
    inputValue: test.inputValue,
    getOptionLabel: label,
  });
  return {
    ...test,
    indices: output.map((option) => test.options.indexOf(option)),
    sameArray: output === test.options,
    calls,
  };
});
// Use the pinned project CLI so recorded fixtures follow repository formatting.
const output = execFileSync('pnpm', ['exec', 'prettier', '--parser', 'json'], {
  encoding: 'utf8',
  input: JSON.stringify({
    material: material.reference,
    scope:
      'Original filtering, identity, limit and early-stop behavior. Class identifiers are source-backed metadata; value-resolution hooks and native UI have separate checks.',
    observations,
    classMetadata,
  }),
});
const file = 'tests/fixtures/mui-autocomplete-values-9.5.0.json';
if (process.argv.includes('--record')) await writeFile(file, output);
else if ((await readFile(file, { encoding: 'utf8' })) !== output)
  throw Error('Autocomplete values reference drifted');
console.log(observations.length + ' original Autocomplete filtering observations verified.');
