// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef } from 'react';
import { I18nManager, StyleSheet, type TextInstance } from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import {
  ThemeProvider,
  Typography,
  createTheme,
  configureDiagnostics,
} from '../packages/material/src';
import { nativeTextScopes } from '../packages/system/src';
import { NativePortalModel } from './helpers/nativePortalModel';

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
      StyleSheet.flatten(model.tree!.getByTestId('destination-text').props.style).textAlign,
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
    expect(
      StyleSheet.flatten(model.tree!.getByTestId('destination-text').props.style),
    ).toMatchObject({ textAlign: 'right' });
    await act(async () =>
      lease.update({ style: { fontSize: 23 }, direction: 'ltr', nativeText: false }),
    );
    expect(ref.current).toBe(mountedText);
    expect(model.host().props.direction).toBe('ltr');
    expect(
      StyleSheet.flatten(model.tree!.getByTestId('destination-text').props.style).textAlign,
    ).toBe('left');
  } finally {
    await act(async () => lease.remove());
  }
});
