// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import * as helpers from '../packages/system/src/transitions';
import * as deepTransitions from '../packages/material/src/styles/createTransitions';
import * as deepMotion from '../packages/material/src/styles/createMotion';
import * as materialStyles from '../packages/material/src/styles';
import reference from './fixtures/mui-transition-helpers-9.5.0.json';
const observe = require('../scripts/reference/transition-helper-cases.cjs') as (
  helpers: typeof import('../packages/system/src/transitions'),
  mode: string,
) => unknown;
test.each(['development', 'production'] as const)(
  'timing helper boundaries match pinned MUI in %s',
  (mode) => {
    expect(observe(helpers, mode)).toEqual(reference.cases[mode]);
  },
);
test('deep/root helpers share identity and expose the original actual runtime exports', () => {
  expect(deepTransitions.default).toBe(helpers.createTransitions);
  expect(deepTransitions.createTransitions).toBe(helpers.createTransitions);
  expect(materialStyles.createTransitions).toBe(helpers.createTransitions);
  expect(deepMotion.default).toBe(helpers.createMotion);
  expect(deepMotion.createMotion).toBe(helpers.createMotion);
  expect(deepTransitions.duration).toBe(helpers.duration);
  expect(deepTransitions.easing).toBe(helpers.easing);
  expect(Object.keys(deepTransitions)).toEqual(expect.arrayContaining(reference.transitionExports));
  expect(Object.keys(deepMotion)).toEqual(expect.arrayContaining(reference.motionExports));
  expect('create' in deepTransitions).toBe(false);
  expect('getAutoHeightDuration' in deepTransitions).toBe(false);
});
