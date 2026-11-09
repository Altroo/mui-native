// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  cardContentClasses,
  getCardContentUtilityClass,
} from '../packages/material/src/cardContentClasses';
import { unstable_ClassNameGenerator } from '../packages/material/src/classNameGenerator';
import original from './fixtures/mui-card-content-9.5.0.json';
afterEach(() => {
  jest.restoreAllMocks();
  unstable_ClassNameGenerator.reset();
});
test('CardContent class vocabulary and utility edge cases match the pinned original', () => {
  expect(cardContentClasses).toEqual(original.classes);
  for (const [slot, value] of Object.entries(original.utilities)) {
    expect(getCardContentUtilityClass(slot)).toBe(value);
  }
});
test('component utility generation follows the active configuration while the vocabulary stays captured', () => {
  unstable_ClassNameGenerator.configure((name) => 'Configured' + name);
  expect(getCardContentUtilityClass('root')).toBe('ConfiguredMuiCardContent-root');
  expect(getCardContentUtilityClass('disabled')).toBe(original.utilities.disabled);
  expect(cardContentClasses.root).toBe(original.classes.root);
  unstable_ClassNameGenerator.reset();
  expect(getCardContentUtilityClass('root')).toBe(original.classes.root);
});
test('the source utility lookup reads the current generator method', () => {
  const replacement = jest
    .spyOn(unstable_ClassNameGenerator, 'generate')
    .mockImplementation((name) => 'Method' + name);
  expect(getCardContentUtilityClass('root')).toBe('MethodMuiCardContent-root');
  expect(replacement).toHaveBeenCalledWith('MuiCardContent');
});
