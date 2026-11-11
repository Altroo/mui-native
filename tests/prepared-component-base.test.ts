// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  componentRootStyle,
  componentStyle,
  createNativeStyledStyle,
  createTheme,
} from '../packages/system/src';
import { rebaseNativeComponentStyle } from '../packages/system/src/internal/prepared-style';

test('constructor rebinding preserves same-root ancestors, wrappers and resolved theme/SX', () => {
  const calls = { theme: 0, sx: 0, wrapper: 0 };
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: () => {
            calls.theme++;
            return { minHeight: 48 };
          },
        },
      },
    },
  });
  const parent = componentRootStyle(theme, 'MuiPaper', {}, undefined, undefined, {
    baseStyle: { minWidth: 10 },
  }).prepared;
  const wrapper = createNativeStyledStyle(
    theme,
    '',
    {},
    undefined,
    {
      baseStyle: () => {
        calls.wrapper++;
        return { maxWidth: 190 };
      },
    },
    undefined,
  );
  const root = componentRootStyle(
    theme,
    'MuiButtonGroup',
    {},
    () => {
      calls.sx++;
      return { fontSize: 17 };
    },
    wrapper,
    {
      baseStyle: [{ margin: 2 }, { borderRadius: 3 }],
      ancestors: [
        { theme, name: 'MuiPaper', props: {}, context: {}, sameRoot: true, prepared: parent },
      ],
    },
  );
  const replacement = componentRootStyle(theme, '', {}, undefined, undefined, {
    baseStyle: [{ margin: 5 }, { borderRadius: 7 }],
  }).prepared;
  const rebased = rebaseNativeComponentStyle(root.prepared, replacement);
  const actual = componentStyle(theme, '', {}, undefined, {
    ancestors: [{ theme, name: '', props: {}, context: {}, sameRoot: true, prepared: rebased }],
  });
  expect(actual).toMatchObject({
    minWidth: 10,
    minHeight: 48,
    maxWidth: 190,
    fontSize: 17,
    margin: 5,
    borderRadius: 7,
  });
  expect(calls).toEqual({ theme: 1, sx: 1, wrapper: 1 });
  expect(Object.isFrozen(rebased)).toBe(true);
  expect(Object.isFrozen(rebased.sheets)).toBe(true);
  expect(root.computed).toMatchObject({ margin: 2, borderRadius: 3 });
});

test('empty constructor spans accept replacement without discarding theme output', () => {
  let calls = 0;
  const theme = createTheme({
    components: {
      MuiButtonGroup: {
        styleOverrides: {
          root: () => {
            calls++;
            return { minHeight: 48 };
          },
        },
      },
    },
  });
  const root = componentRootStyle(theme, 'MuiButtonGroup', {}, undefined, undefined, {
    baseStyle: [],
  }).prepared;
  const replacement = componentRootStyle(theme, '', {}, undefined, undefined, {
    baseStyle: { margin: 5 },
  }).prepared;
  const rebased = rebaseNativeComponentStyle(root, replacement);
  const actual = componentStyle(theme, '', {}, undefined, {
    ancestors: [{ theme, name: '', props: {}, context: {}, sameRoot: true, prepared: rebased }],
  });
  expect(actual).toMatchObject({ margin: 5, minHeight: 48 });
  expect(calls).toBe(1);
  expect(() => rebaseNativeComponentStyle({ sheets: [] }, replacement)).toThrow(
    'constructor boundary',
  );
});
