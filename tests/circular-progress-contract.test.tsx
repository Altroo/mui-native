// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Match the original static renderer here; motion has independent native evidence.
jest.mock('../packages/material/src/motionPreference', () => ({
  useNativeReducedMotion: () => true,
}));
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Circle, G } from 'react-native-svg';
import { render, cleanup } from '@testing-library/react-native';
import {
  CircularProgress,
  resetCircularProgressWarnings,
} from '../packages/material/src/circularProgress';
import { Box, createTheme, ThemeProvider } from '../packages/material/src';
import { nativeStyleCallback } from './helpers/nativeStyleCallback';
import {
  circularProgressClasses,
  getCircularProgressUtilityClass,
} from '../packages/material/src/circularProgressClasses';
import { unstable_ClassNameGenerator } from '../packages/material/src/classNameGenerator';
import reference from './fixtures/mui-circular-progress-9.5.0.json';

afterEach(() => {
  cleanup();
  resetCircularProgressWarnings();
  jest.restoreAllMocks();
  unstable_ClassNameGenerator.reset();
});

function childrenShape(value: unknown): unknown[] {
  return React.Children.toArray(value as React.ReactNode).map((child) => {
    if (!React.isValidElement<Record<string, unknown>>(child))
      return { kind: typeof child, value: child };
    const props = child.props;
    return {
      className: props.className ?? null,
      viewBox: props.viewBox ?? null,
      r: props.r ?? null,
      strokeWidth: props.strokeWidth ?? null,
      style: props.style ?? null,
      children: childrenShape(props.children),
    };
  });
}

test('CircularProgress retains all nine source classes and utility edge cases', () => {
  expect(circularProgressClasses).toEqual(reference.classes);
  for (const [slot, value] of Object.entries(reference.utilities)) {
    expect(getCircularProgressUtilityClass(slot)).toBe(value);
  }
});

test('configured class generation leaves captured vocabulary and state classes intact', () => {
  unstable_ClassNameGenerator.configure((name) => 'Configured' + name);
  expect(getCircularProgressUtilityClass('root')).toBe('ConfiguredMuiCircularProgress-root');
  expect(getCircularProgressUtilityClass('track')).toBe('ConfiguredMuiCircularProgress-track');
  expect(getCircularProgressUtilityClass('disabled')).toBe(reference.utilities.disabled);
  expect(circularProgressClasses).toEqual(reference.classes);
});

test('the utility reads the current canonical generator method', () => {
  const replacement = jest
    .spyOn(unstable_ClassNameGenerator, 'generate')
    .mockImplementation((name) => 'Current' + name);
  expect(getCircularProgressUtilityClass('circle')).toBe('CurrentMuiCircularProgress-circle');
  expect(replacement).toHaveBeenCalledWith('MuiCircularProgress');
});

test.each(reference.observations)('original static slot contract: $input.name', (observation) => {
  const input = observation.input as {
    name: string;
    props?: object;
    defaults?: object;
    configured?: boolean;
    mutateRoot?: boolean;
    inspectChildren?: boolean;
  };
  if (input.configured) unstable_ClassNameGenerator.configure((name) => 'Configured' + name);
  const trace: Array<Record<string, unknown>> = [];
  const warnings: Array<{ level: string; args: string[] }> = [];
  jest.spyOn(console, 'warn').mockImplementation((...args) =>
    warnings.push({
      level: 'warn',
      args: args.map((value) => String(value).replace('MUI Native:', 'MUI:')),
    }),
  );
  jest.spyOn(console, 'error').mockImplementation((...args) =>
    warnings.push({
      level: 'error',
      args: args.map((value) => String(value).replace('MUI Native:', 'MUI:')),
    }),
  );
  const slots = [
    'root',
    'determinate',
    'indeterminate',
    'colorPrimary',
    'colorSecondary',
    'svg',
    'track',
    'circle',
    'circleDisableShrink',
  ];
  const overrides = Object.fromEntries(
    slots.map((slot) => [
      slot,
      nativeStyleCallback((args) => {
        const owner = args.ownerState;
        trace.push({
          slot,
          ownerKeys: Object.keys(owner),
          color: owner.color,
          variant: owner.variant,
          disableShrink: owner.disableShrink,
          enableTrackSlot: owner.enableTrackSlot,
          size: owner.size,
          thickness: owner.thickness,
          value: owner.value,
          style: args.style ?? null,
          genuine: {
            className: args.className ?? null,
            classMap: args.classes ?? null,
            hasSx: Object.hasOwn(args, 'sx'),
            id: args.id ?? null,
            hasStyle: Object.hasOwn(args, 'style'),
            viewBox: args.viewBox ?? null,
            cx: args.cx ?? null,
            cy: args.cy ?? null,
            r: args.r ?? null,
            fill: args.fill ?? null,
            strokeWidth: args.strokeWidth ?? null,
            hidden: args['aria-hidden'] ?? null,
            children: childrenShape(args.children),
            ownerChildren: owner.children ?? null,
          },
        });
        if (input.mutateRoot && slot === 'root') owner.thickness = 8;
        return {};
      }),
    ]),
  );
  const theme = createTheme({
    // This runtime fixture follows the original JS input; augmentation is
    // independently checked by the strict installed TypeScript consumer.
    palette: { brand: { main: '#156b5f' } } as unknown as NonNullable<
      Parameters<typeof createTheme>[0]
    >['palette'],
    components: {
      MuiCircularProgress: {
        defaultProps: input.defaults,
        styleOverrides: overrides,
        variants: input.inspectChildren
          ? [
              {
                props: (args: Record<string, unknown>) => {
                  const owner = args.ownerState as Record<string, unknown>;
                  trace.push({
                    slot: 'variant-predicate',
                    children: childrenShape(args.children),
                    ownerChildren: owner.children ?? null,
                  });
                  return true;
                },
                style: nativeStyleCallback((args) => {
                  trace.push({
                    slot: 'variant-style',
                    children: childrenShape(args.children),
                    ownerChildren: args.ownerState.children ?? null,
                  });
                  return {};
                }),
              },
            ]
          : undefined,
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <CircularProgress {...input.props} />
    </ThemeProvider>,
  );
  const actualGroups = trace.reduce<Array<{ context: Record<string, unknown>; slots: string[] }>>(
    (groups, { slot, ...context }) => {
      const previous = groups.at(-1);
      if (previous && JSON.stringify(previous.context) === JSON.stringify(context))
        previous.slots.push(String(slot));
      else groups.push({ context, slots: [String(slot)] });
      return groups;
    },
    [],
  );
  expect(actualGroups).toEqual(observation.trace);
  expect(warnings).toEqual(observation.warnings);
  const root = tree.getByRole(observation.root.role as Parameters<typeof tree.getByRole>[0]);
  expect(root.props.className).toBe(observation.root.class);
  expect(root.props.role).toBe(observation.root.role);
  const circles = tree.UNSAFE_getAllByType(Circle);
  expect(circles).toHaveLength(observation.circles.length);
  for (let index = 0; index < circles.length; index++) {
    const expected = observation.circles[index];
    expect(circles[index].props).toMatchObject({
      cx: Number(expected.cx),
      cy: Number(expected.cy),
      r: Number(expected.r),
      strokeWidth: Number(expected['stroke-width']),
      fill: expected.fill,
    });
    const declarations = Object.fromEntries(
      (('style' in expected ? expected.style : '') ?? '')
        .split(';')
        .filter(Boolean)
        .map((pair) => pair.split(':')),
    );
    if (declarations['stroke-dasharray'])
      expect(Number(circles[index].props.strokeDasharray)).toBe(
        Number(declarations['stroke-dasharray']),
      );
    if (declarations['stroke-dashoffset'])
      expect(Number(circles[index].props.strokeDashoffset)).toBe(
        parseFloat(declarations['stroke-dashoffset']),
      );
  }
  const rootStyle = StyleSheet.flatten(root.props.style);
  const expected = Object.fromEntries(
    (observation.root.style ?? '')
      .split(';')
      .filter(Boolean)
      .map((pair) => pair.split(':')),
  );
  const dimension = (value: string) =>
    value.endsWith('rem')
      ? parseFloat(value) * 16
      : value.endsWith('%')
        ? value
        : parseFloat(value);
  expect(rootStyle.width).toBe(dimension(expected.width));
  expect(rootStyle.height).toBe(dimension(expected.height));
  expect(tree.queryByText('Ignored child')).toBeNull();
});

test('root and SVG descendant sheets reach their actual circle without extra hosts', () => {
  const theme = createTheme({
    components: {
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            '& .MuiCircularProgress-svg .MuiCircularProgress-circle': {
              stroke: '#8b1f50',
              strokeWidth: 6,
            },
          },
          svg: { '& .MuiCircularProgress-circle': { strokeOpacity: 0.4 } },
          circle: { strokeLinecap: 'round' },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={theme}>
      <CircularProgress enableTrackSlot />
    </ThemeProvider>,
  );
  const circles = tree.UNSAFE_getAllByType(Circle);
  expect(circles[1].props).toMatchObject({
    stroke: '#8b1f50',
    strokeWidth: 6,
    strokeOpacity: 0.4,
    strokeLinecap: 'round',
  });
  expect(circles[0].props.strokeWidth).toBe(3.6);
});

test('valid progress exposes its original range and invalid ranges withhold native numeric counters', () => {
  const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
  const tree = render(<CircularProgress variant="determinate" min={20} max={80} value={50} />);
  expect(tree.getByRole('progressbar')).toHaveAccessibilityValue({ min: 20, max: 80, now: 50 });
  tree.rerender(
    <CircularProgress
      variant="determinate"
      min={80}
      max={20}
      value={50}
      accessibilityValue={{ text: 'Invalid range' }}
    />,
  );
  expect(tree.getByRole('progressbar').props.accessibilityValue).toEqual({ text: 'Invalid range' });
  expect(warn).toHaveBeenCalledTimes(1);
});

test('CSS em sizes inherit the root font including its own sx', () => {
  const tree = render(
    <Box sx={{ fontSize: 28 }}>
      <CircularProgress size="2em" />
    </Box>,
  );
  expect(tree.getByRole('progressbar')).toHaveStyle({ width: 56, height: 56 });
  tree.rerender(
    <Box sx={{ fontSize: 28 }}>
      <CircularProgress size="2em" sx={{ fontSize: 10 }} />
    </Box>,
  );
  expect(tree.getByRole('progressbar')).toHaveStyle({ width: 20, height: 20 });
});

test.each(['inherit', 'unset', 'currentColor'])(
  'SVG color reset %s binds inherited native paint',
  (color) => {
    const theme = createTheme({
      components: { MuiCircularProgress: { styleOverrides: { svg: { color } } } },
    });
    const tree = render(
      <ThemeProvider theme={theme}>
        <CircularProgress color="secondary" />
      </ThemeProvider>,
    );
    const svg = tree.UNSAFE_getByType(require('react-native-svg').default);
    expect(svg.props.color).toBe(theme.palette.secondary.main);
    const groups = tree.UNSAFE_getAllByType(G);
    for (const group of groups)
      expect(StyleSheet.flatten(group.props.style)?.color).toBeUndefined();
  },
);

test('original test IDs and native events survive SVG composition', () => {
  const onClick = jest.fn(),
    onLayout = jest.fn();
  const tree = render(
    <CircularProgress data-testid="source-progress" onClick={onClick} onLayout={onLayout} />,
  );
  const root = tree.getByTestId('source-progress');
  const event = { nativeEvent: { pageX: 1, pageY: 2 } };
  root.props.onClick(event);
  root.props.onLayout(event);
  expect(onClick).toHaveBeenCalledWith(event);
  expect(onLayout).toHaveBeenCalledWith(event);
});

test.each([
  [20, 80, 65, '75%'],
  [-10, 10, -5, '25%'],
  [0.1, 0.3, 0.2, '50%'],
  [-1e308, 1e308, 0, '50%'],
])('iOS announces relative progress for %s..%s at %s', (min, max, value, text) => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const tree = render(
    <CircularProgress
      variant="determinate"
      min={Number(min)}
      max={Number(max)}
      value={Number(value)}
    />,
  );
  expect(tree.getByRole('progressbar').props.accessibilityValue).toEqual({
    min,
    max,
    now: value,
    text,
  });
});

test.each(['ios', 'android'] as const)(
  'authored progress text takes precedence on %s',
  (platform) => {
    jest.replaceProperty(Platform, 'OS', platform);
    const tree = render(
      <CircularProgress
        variant="determinate"
        min={20}
        max={80}
        value={65}
        accessibilityValue={{ text: 'Uploading files' }}
      />,
    );
    expect(tree.getByRole('progressbar').props.accessibilityValue).toEqual({
      min: 20,
      max: 80,
      now: 65,
      text: 'Uploading files',
    });
    tree.rerender(
      <CircularProgress
        variant="determinate"
        min={20}
        max={80}
        value={65}
        aria-valuetext="Transfer in progress"
        accessibilityValue={{ text: 'Uploading files' }}
      />,
    );
    expect(tree.getByRole('progressbar').props.accessibilityValue.text).toBe(
      'Transfer in progress',
    );
  },
);

test('Android retains the original numeric accessibility range without generated iOS text', () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const tree = render(<CircularProgress variant="determinate" min={20} max={80} value={65} />);
  expect(tree.getByRole('progressbar').props.accessibilityValue).toEqual({
    min: 20,
    max: 80,
    now: 65,
  });
});

test('an empty authored color retains the original utility path without crashing', () => {
  const tree = render(
    <CircularProgress
      color={'' as NonNullable<React.ComponentProps<typeof CircularProgress>['color']>}
    />,
  );
  expect(tree.getByRole('progressbar').props.className).toContain('MuiCircularProgress-color');
});
