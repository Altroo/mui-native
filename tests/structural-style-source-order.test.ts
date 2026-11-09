// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  componentRootStyle,
  createNativeStyledStyle,
  createTheme,
  resolveSx,
} from '../packages/system/src';

const theme = createTheme();
const recipe = {
  '& .Mid': {
    '&.B .Leaf': { color: 'red' },
    '&.A .Leaf': { color: 'blue' },
  },
};

// Both equal-specificity rules match. Original MUI emits B/red before A/blue;
// the order of the matching native ancestors must not reverse that cascade.
test.each([
  {
    name: 'A then B',
    ancestors: [
      ['Mid', 'A'],
      ['Mid', 'B'],
    ],
  },
  {
    name: 'B then A',
    ancestors: [
      ['Mid', 'B'],
      ['Mid', 'A'],
    ],
  },
  {
    name: 'A then B then A',
    ancestors: [
      ['Mid', 'A'],
      ['Mid', 'B'],
      ['Mid', 'A'],
    ],
  },
])('nested rules retain source order across matching ancestors: $name', ({ ancestors }) => {
  expect(
    resolveSx(recipe, theme, {
      descendantOnly: true,
      descendantPath: [...ancestors.map((classes) => ({ classes })), { classes: ['Leaf'] }],
    }).color,
  ).toBe('blue');
});

test('reversing authored declaration order reverses an equal-specificity winner', () => {
  expect(
    resolveSx(
      { '& .Mid': { '&.A .Leaf': { color: 'blue' }, '&.B .Leaf': { color: 'red' } } },
      theme,
      {
        descendantOnly: true,
        descendantPath: [
          { classes: ['Mid', 'B'] },
          { classes: ['Mid', 'A'] },
          { classes: ['Leaf'] },
        ],
      },
    ).color,
  ).toBe('red');
});

test('the greatest matching selector-list specificity wins once across paths', () => {
  expect(
    resolveSx(
      {
        '& .Mid': {
          '&.A.X .Leaf, &.B .Leaf': { color: 'red' },
          '&.B .Leaf': { color: 'blue' },
        },
      },
      theme,
      {
        descendantOnly: true,
        descendantPath: [
          { classes: ['Mid', 'A', 'X'] },
          { classes: ['Mid', 'B'] },
          { classes: ['Leaf'] },
        ],
      },
    ).color,
  ).toBe('red');
});

test('prepared source-order resolution retains callbacks, getters and authored native layers', () => {
  let reads = 0;
  const callback = jest.fn(() => ({
    '& .Mid': {
      '&.B .Leaf': { color: 'red' },
      '&.A .Leaf': Object.defineProperty({}, 'color', {
        enumerable: true,
        get() {
          reads += 1;
          return 'blue';
        },
      }),
    },
  }));
  const programme = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    { baseStyle: callback },
    undefined,
  );
  const initial = componentRootStyle(theme, '', {}, undefined, programme);
  const changed = componentRootStyle(
    theme,
    '',
    {},
    undefined,
    { color: 'green' },
    {
      classes: ['Leaf'],
      ancestors: [
        {
          theme,
          name: '',
          props: {},
          prepared: initial.prepared,
          context: {
            descendantOnly: true,
            descendantPath: [
              { classes: ['Mid', 'A'] },
              { classes: ['Mid', 'B'] },
              { classes: ['Leaf'] },
            ],
          },
        },
      ],
    },
  );
  expect(changed.computed.color).toBe('blue');
  expect(changed.authored).toEqual([{ color: 'green' }]);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(reads).toBe(1);
});
