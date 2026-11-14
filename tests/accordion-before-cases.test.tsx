// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  componentRootStyle,
  createTheme,
  type StyleContext,
  type NativeStyleTarget,
} from '@altroo/mui-native-system';
import { accordionBeforeCases } from '../packages/material/src/accordionBeforeStyles';
import type { NativeButtonGroupRule } from '../packages/material/src/buttonGroupContext';
const theme = createTheme();
const marker = 'owned-panel';
function rule(
  prepared: ReturnType<typeof componentRootStyle>['prepared'],
  selector: NativeStyleTarget,
): NativeButtonGroupRule {
  return {
    selector,
    cascade(classes, path) {
      return {
        theme,
        name: '',
        props: {},
        prepared,
        context: {
          ...selector,
          descendantOnly: true,
          descendantClasses: classes,
          descendantPath: path,
        },
      };
    },
  };
}
function prepare(source: Parameters<typeof componentRootStyle>[3], context: StyleContext) {
  return componentRootStyle(theme, '', {}, source, undefined, context, true).prepared;
}
test('parent facts rebind retained root predicates without replaying caller CSS', () => {
  const source = jest.fn(() => ({
    '&::before': { height: '1px', opacity: 1 },
    '&:first-of-type::before': { display: 'none' },
    '&:last-of-type::before': { height: 3 },
    '&:last-child::before': { opacity: 0.4 },
  }));
  const selector = { classes: [marker], firstOfType: false, lastOfType: false, lastChild: false };
  const cases = accordionBeforeCases(
    theme,
    [rule(prepare(source, selector), selector)],
    {},
    marker,
  );
  expect(cases.map((value) => value.display)).toEqual([
    undefined,
    undefined,
    'none',
    'none',
    undefined,
    undefined,
    'none',
    'none',
  ]);
  expect(cases.map((value) => value.height)).toEqual([1, 1, 1, 1, 3, 3, 3, 3]);
  expect(cases.map((value) => value.opacity)).toEqual([1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4]);
  expect(source).toHaveBeenCalledTimes(1);
});
test('outer ancestors retain their own facts while paths through the panel are projected', () => {
  const outer = { classes: ['outer'], firstOfType: false };
  const panel = { classes: [marker, 'MuiAccordion-root'], firstOfType: false, lastOfType: false };
  const outerStyle = prepare(
    {
      '&:first-of-type': { '& .MuiAccordion-root': { '&::before': { top: 20 } } },
      '& .MuiAccordion-root': { '&:first-of-type::before': { height: 7 } },
    },
    outer,
  );
  const panelStyle = prepare({ '&::before': { height: '1px', top: -1 } }, panel);
  const cases = accordionBeforeCases(
    theme,
    [rule(outerStyle, outer), rule(panelStyle, panel)],
    {},
    marker,
  );
  expect(cases.map((value) => value.top)).toEqual(Array(8).fill(-1));
  expect(cases.map((value) => value.height)).toEqual([1, 1, 7, 7, 1, 1, 7, 7]);
});

test('retained outer sheets do not acquire the panel structural facts', () => {
  const outer = { classes: ['outer'], firstOfType: false };
  const panel = { classes: [marker, 'MuiAccordion-root'], firstOfType: false };
  const outerPrepared = prepare(
    {
      '&:first-of-type': {
        '& .MuiAccordion-root': { '&::before': { top: 20 } },
      },
    },
    outer,
  );
  const prepared = componentRootStyle(
    theme,
    '',
    {},
    { '&::before': { top: -1, height: '1px' } },
    undefined,
    {
      ...panel,
      ancestors: [rule(outerPrepared, outer).cascade(panel.classes, [panel])],
    },
    true,
  ).prepared;
  const cases = accordionBeforeCases(theme, [rule(prepared, panel)], {}, marker);
  expect(cases.map((value) => value.top)).toEqual(Array(8).fill(-1));
});
