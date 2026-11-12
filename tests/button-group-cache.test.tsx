// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { Suspense, StrictMode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  Button,
  ButtonGroup,
  ThemeProvider,
  createTheme,
  NativeStyleCacheProvider,
  createNativeStyleCache,
  styled,
  type NativeStyleCache,
  type ButtonProps,
} from '../packages/material/src';
import reference from './fixtures/mui-button-group-cache-9.5.0.json';

afterEach(cleanup);
const targetSx = {
  '& .MuiButtonGroup-grouped': { minWidth: 58, '&.Mui-disabled': { opacity: 0.4 } },
  '& .MuiButtonGroup-firstButton': { minWidth: 69 },
};

// A separately mounted standalone Button warms the same default styling cache.
// Component unmount must retain source insertion history for the next mount.
test('a standalone Button warm-up preserves original disabled group border order', () => {
  const original = reference.observations.find((row) => row.name === 'standalone-defaults-target');
  const expected = original!.observations
    .at(-1)!
    .buttons.map((button) =>
      button.rightBorder === 'rgba(0, 0, 0, 0)' ? 'transparent' : button.rightBorder,
    );
  const warm = render(<Button variant="outlined">Warm up</Button>);
  warm.unmount();
  const target = render(
    <ButtonGroup disabled sx={targetSx}>
      {[1, 2, 3].map((n) => (
        <Button key={n} testID={'cache-action-' + n}>
          Action {n}
        </Button>
      ))}
    </ButtonGroup>,
  );
  const actual = [1, 2, 3].map((n) => {
    const props = target.getByTestId('cache-action-' + n).props;
    const value =
      typeof props.style === 'function'
        ? props.style({ pressed: false, focusVisible: false })
        : props.style;
    const flat = StyleSheet.flatten(value);
    return flat.borderRightColor ?? flat.borderColor;
  });
  expect(actual).toEqual(expected);
});

const WarmStyled = styled(View)({ padding: 1 });
const scopedCaches: NativeStyleCache[] = [];
afterEach(() => {
  for (const cache of scopedCaches.splice(0)) cache.dispose();
});
const makeCache = (key = 'group-cache') => {
  const cache = createNativeStyleCache({ key });
  scopedCaches.push(cache);
  return cache;
};
const suspended = new Promise<never>(() => {});
function Suspend(): never {
  throw suspended;
}
function CachedButton({ cache, ...props }: ButtonProps & { cache: NativeStyleCache }) {
  return (
    <NativeStyleCacheProvider value={cache}>
      <Button {...props} />
    </NativeStyleCacheProvider>
  );
}
const normalize = (color: unknown) => (color === 'rgba(0, 0, 0, 0)' ? 'transparent' : color);

test.each(reference.observations)(
  'mounted native cache sequence matches original $name',
  (scenario) => {
    let cache = makeCache(),
      theme = createTheme();
    const a = makeCache('group-cache-a'),
      b = makeCache('group-cache-b');
    const wrap = (children: React.ReactNode) => {
      const content = (
        <NativeStyleCacheProvider value={cache}>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </NativeStyleCacheProvider>
      );
      return scenario.strict ? <StrictMode>{content}</StrictMode> : content;
    };
    const tree = render(wrap(null));
    const actions = (inner?: NativeStyleCache) =>
      [1, 2, 3].map((n) =>
        inner ? (
          <CachedButton key={n} cache={inner} testID={'sequence-action-' + n}>
            Action {n}
          </CachedButton>
        ) : (
          <Button key={n} testID={'sequence-action-' + n}>
            Action {n}
          </Button>
        ),
      );
    const group = (target: boolean, inner?: NativeStyleCache) => (
      <ButtonGroup disabled={target} {...(target ? { sx: targetSx } : {})}>
        {actions(inner)}
      </ButtonGroup>
    );
    for (const step of scenario.steps) {
      if (scenario.name !== 'live-button-cache-switch' || !step.startsWith('nested-target'))
        tree.rerender(wrap(null));
      if (step === 'reset' || step === 'independent') {
        if (step === 'reset') cache.reset();
        cache = makeCache();
        continue;
      }
      if (step === 'theme') {
        theme = createTheme();
        continue;
      }
      let content: React.ReactNode = step === 'target' ? group(true) : group(false);
      if (step.startsWith('standalone'))
        content = (
          <Button
            variant="outlined"
            disabled={step === 'standalone-disabled'}
            testID="sequence-action-1"
          >
            Warm up
          </Button>
        );
      if (step === 'suspended-defaults')
        content = (
          <Suspense fallback={<Text>Fallback</Text>}>
            {group(false)}
            <Suspend />
          </Suspense>
        );
      if (step === 'warm-styled-b') {
        cache = b;
        content = <WarmStyled />;
      }
      if (step === 'warm-button-b') {
        cache = b;
        content = (
          <Button variant="outlined" testID="sequence-action-1">
            Warm B
          </Button>
        );
      }
      if (step === 'warm-group-a') {
        cache = a;
        content = group(false);
      }
      if (step.startsWith('nested-target')) {
        cache = a;
        content = group(true, step === 'nested-target-a' ? a : b);
      }
      tree.rerender(wrap(content));
      const expected = scenario.observations.find((row) => row.step === step)!;
      // Repeated target phases use the same CSS identity and settled outcome.
      const colors = tree.queryAllByTestId(/^sequence-action-/).map((node) => {
        const style =
          typeof node.props.style === 'function'
            ? node.props.style({ pressed: false, focusVisible: false })
            : node.props.style;
        const flat = StyleSheet.flatten(style);
        return flat.borderRightColor ?? flat.borderColor;
      });
      expect({ name: scenario.name, step, colors }).toEqual({
        name: scenario.name,
        step,
        colors: expected.buttons.map((button) => normalize(button.rightBorder)),
      });
    }
    tree.unmount();
  },
);
