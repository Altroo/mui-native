// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef } from 'react';
import {
  I18nManager,
  StyleSheet,
  type StyleProp,
  type TextInstance,
  type TextStyle,
} from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import {
  ThemeProvider,
  Typography,
  createTheme,
  configureDiagnostics,
} from '../packages/material/src';
import { nativeTextScopes } from '../packages/system/src';
import { NativePortalModel } from './helpers/nativePortalModel';

// Decode the pinned iOS/Android paragraph consumer, independently of the CSS
// encoder. A native left prop paints on the right in an actual RTL paragraph.
function physicalAlignment(style: StyleProp<TextStyle>, rtl: boolean) {
  const alignment = StyleSheet.flatten(style)?.textAlign;
  if (!rtl) return alignment;
  if (alignment === 'left') return 'right';
  if (alignment === 'right') return 'left';
  return alignment;
}

let restoreDiagnostics: () => void;
beforeEach(() => {
  restoreDiagnostics = configureDiagnostics(() => {});
  jest
    .spyOn(require('react-native'), 'findNodeHandle')
    .mockImplementation((node: any) => node?.tag ?? 11);
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restoreDiagnostics();
});

test.each([false, true])(
  'window Portal text follows physical global direction %s rather than logical theme direction',
  async (globalRTL) => {
    jest.replaceProperty(I18nManager, 'isRTL', globalRTL);
    const model = new NativePortalModel();
    model.wrapper = (child) => (
      <ThemeProvider theme={createTheme({ direction: globalRTL ? 'ltr' : 'rtl' })}>
        {child}
      </ThemeProvider>
    );
    model.content = (
      <Typography testID="destination-text" sx={{ textAlign: 'start' }}>
        Physical window
      </Typography>
    );
    await model.mount();
    await model.layout();
    expect(model.host().props.direction).toBe(globalRTL ? 'rtl' : 'ltr');
    expect(
      physicalAlignment(model.tree!.getByTestId('destination-text').props.style, globalRTL),
    ).toBe(globalRTL ? 'right' : 'left');
  },
);

test('custom Portal follows live destination direction without remounting its text host', async () => {
  jest.replaceProperty(I18nManager, 'isRTL', false);
  const model = new NativePortalModel();
  model.props.container = () => model.nodes.get('container');
  const ref = createRef<TextInstance>();
  model.content = (
    <Typography ref={ref} testID="destination-text" sx={{ textAlign: 'start' }}>
      Physical container
    </Typography>
  );
  await model.mount();
  await model.layout();
  let lease!: ReturnType<typeof nativeTextScopes.register>;
  await act(async () => {
    lease = nativeTextScopes.register(model.nodes.get('container'), {
      style: { fontSize: 23 },
      direction: 'rtl',
      nativeText: false,
    });
  });
  try {
    const mountedText = ref.current;
    expect(mountedText).not.toBeNull();
    expect(model.host().props.direction).toBe('rtl');
    expect(physicalAlignment(model.tree!.getByTestId('destination-text').props.style, true)).toBe(
      'right',
    );
    await act(async () =>
      lease.update({ style: { fontSize: 23 }, direction: 'ltr', nativeText: false }),
    );
    expect(ref.current).toBe(mountedText);
    expect(model.host().props.direction).toBe('ltr');
    expect(physicalAlignment(model.tree!.getByTestId('destination-text').props.style, false)).toBe(
      'left',
    );
  } finally {
    await act(async () => lease.remove());
  }
});
