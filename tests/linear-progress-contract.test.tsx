// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
jest.mock('../packages/material/src/motionPreference', () => ({
  useNativeReducedMotion: () => true,
}));
import React from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import {
  createTheme,
  ThemeProvider,
  LinearProgress,
  linearProgressClasses,
  getLinearProgressUtilityClass,
} from '@altroo/mui-native';
import { resetLinearProgressWarnings } from '../packages/material/src/linearProgress';
import type { LinearProgressProps } from '../packages/material/src/linearProgressTypes';
import { unstable_ClassNameGenerator } from '../packages/material/src/classNameGenerator';
import { RtlProvider, lighten, darken } from '@altroo/mui-native-system';
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import reference from './fixtures/mui-linear-progress-9.5.0.json';

afterEach(() => {
  cleanup();
  resetLinearProgressWarnings();
  jest.restoreAllMocks();
  unstable_ClassNameGenerator.reset();
});
function shape(value: unknown): unknown[] {
  return React.Children.toArray(value as React.ReactNode).map((child) =>
    React.isValidElement<Record<string, unknown>>(child)
      ? {
          className: child.props.className ?? null,
          style: child.props.style ?? null,
          children: shape(child.props.children),
        }
      : { kind: typeof child, value: child },
  );
}
test('all eleven utility classes preserve the pinned runtime vocabulary', () => {
  expect(linearProgressClasses).toEqual(reference.classes);
  for (const [key, value] of Object.entries(reference.utilities))
    expect(getLinearProgressUtilityClass(key)).toBe(value);
  unstable_ClassNameGenerator.configure((name) => 'Configured' + name);
  expect(getLinearProgressUtilityClass('bar1')).toBe('ConfiguredMuiLinearProgress-bar1');
  expect(linearProgressClasses).toEqual(reference.classes);
});

test.each(reference.observations)(
  'source slot, range, color and callback contract: $input.name',
  (observation) => {
    const input = observation.input as {
      name: string;
      props?: Record<string, unknown>;
      defaults?: Record<string, unknown>;
      rtl?: boolean;
      dark?: boolean;
      reduced?: boolean;
      configured?: boolean;
      rtlContext?: boolean;
      receiver?: boolean;
    };
    const warnings: unknown[] = [],
      trace: Array<Record<string, unknown>> = [];
    for (const level of ['warn', 'error'] as const)
      jest
        .spyOn(console, level)
        .mockImplementation((...args) =>
          warnings.push({ level, args: args.map((v) => String(v).replace('MUI Native:', 'MUI:')) }),
        );
    if (input.configured) unstable_ClassNameGenerator.configure((name) => 'Configured' + name);
    const slots = [
      'root',
      'colorPrimary',
      'colorSecondary',
      'determinate',
      'indeterminate',
      'buffer',
      'query',
      'dashed',
      'bar',
      'bar1',
      'bar2',
    ];
    const theme = createTheme({
      direction: input.rtl ? 'rtl' : 'ltr',
      motion: { reducedMotion: input.reduced ? 'always' : 'never' },
      palette: {
        mode: input.dark ? 'dark' : 'light',
        brand: { main: '#156b5f' },
      } as unknown as NonNullable<Parameters<typeof createTheme>[0]>['palette'],
      components: {
        MuiLinearProgress: {
          defaultProps: input.defaults,
          styleOverrides: Object.fromEntries(
            slots.map((slot) => [
              slot,
              nativeStyleCallback((args) => {
                const owner = args.ownerState;
                trace.push({
                  slot,
                  ownerKeys: Object.keys(owner),
                  color: owner.color,
                  variant: owner.variant,
                  style: args.style ?? null,
                  className: args.className ?? null,
                  children: shape(args.children),
                  ownerChildren: owner.children ?? null,
                });
                return {};
              }),
            ]),
          ),
        },
      },
    });
    if (input.receiver) {
      const method = input.dark ? 'darken' : 'lighten';
      (theme as unknown as Record<string, unknown>).__receiver = 'linear-progress-receiver';
      (theme as unknown as Record<string, unknown>)[method] = function (
        this: unknown,
        color: string,
        amount: number,
      ) {
        expect((this as { __receiver?: string } | undefined)?.__receiver).toBe(
          'linear-progress-receiver',
        );
        return (input.dark ? darken : lighten)(color, amount);
      };
    }
    const props = Object.fromEntries(
      Object.entries(input.props ?? {}).map(([k, v]) => [k, v === '$undefined' ? undefined : v]),
    );
    const content = <LinearProgress {...(props as LinearProgressProps)} />;
    const tree = render(
      <ThemeProvider theme={theme}>
        {input.rtlContext !== undefined ? (
          <RtlProvider value={input.rtlContext}>{content}</RtlProvider>
        ) : (
          content
        )}
      </ThemeProvider>,
    );
    const groups = trace.reduce<Array<{ context: Record<string, unknown>; slots: string[] }>>(
      (groups, { slot, ...context }) => {
        const previous = groups.at(-1);
        if (previous && JSON.stringify(previous.context) === JSON.stringify(context))
          previous.slots.push(String(slot));
        else groups.push({ context, slots: [String(slot)] });
        return groups;
      },
      [],
    );
    expect(groups).toEqual(observation.trace);
    expect(warnings).toEqual(observation.warnings);
    const sourceRoot = observation.elements[0] as Record<string, string>;
    const root = tree.getByRole(sourceRoot.role as Parameters<typeof tree.getByRole>[0]);
    expect(root.props.className).toBe(sourceRoot.class);
    expect(root.props.nativeID).toBe(sourceRoot.id);
    const color = props.color ?? input.defaults?.color ?? 'primary';
    const variant = props.variant ?? input.defaults?.variant ?? 'indeterminate';
    const shade = observation.shades[color as keyof typeof observation.shades];
    if (shade && variant !== 'buffer')
      expect(StyleSheet.flatten(root.props.style).backgroundColor).toBe(shade);
    if (variant === 'buffer')
      expect(StyleSheet.flatten(root.props.style).backgroundColor).toBe('transparent');
    expect(tree.queryByText('Ignored child')).toBeNull();
  },
);

test.each(['ios', 'android'] as const)(
  '%s preserves valid ranges and authored announcements without impossible numeric accessibility values',
  (platform) => {
    jest.replaceProperty(Platform, 'OS', platform);
    const tree = render(
      <LinearProgress
        variant="buffer"
        min={20}
        max={80}
        value={65}
        valueBuffer={75}
        testID="progress"
      />,
    );
    expect(tree.getByTestId('progress').props.accessibilityValue).toEqual({
      min: 20,
      max: 80,
      now: 65,
      ...(platform === 'ios'
        ? {
            text: new Intl.NumberFormat(undefined, {
              style: 'percent',
              maximumFractionDigits: 0,
            }).format(0.75),
          }
        : {}),
    });
    tree.rerender(
      <LinearProgress
        variant="determinate"
        value={NaN}
        aria-valuetext="Unavailable"
        testID="progress"
      />,
    );
    expect(tree.getByTestId('progress').props.accessibilityValue).toEqual({ text: 'Unavailable' });
  },
);

test('authored CSS string transforms survive loading geometry while determinate inline transforms take precedence', () => {
  const theme = createTheme({
    motion: { reducedMotion: 'always' },
    components: {
      MuiLinearProgress: { styleOverrides: { bar1: { transform: 'translateY(2px)' } } },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <LinearProgress />
    </ThemeProvider>,
  );
  const frame = () =>
    StyleSheet.flatten(tree.UNSAFE_getAllByType(Animated.View)[0].props.style).transform;
  expect(frame()).toEqual(expect.arrayContaining([{ translateY: 2 }]));
  tree.rerender(
    <ThemeProvider theme={theme}>
      <LinearProgress variant="determinate" value={25} />
    </ThemeProvider>,
  );
  expect(frame()).not.toEqual(expect.arrayContaining([{ translateY: 2 }]));
});
