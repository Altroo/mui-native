// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { createRef, forwardRef, type ReactNode } from 'react';
import { View, StyleSheet, type ViewInstance } from 'react-native';
import { cleanup, render, screen } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  ButtonBase,
  ThemeProvider,
  Typography,
  Box,
  Paper,
  createTheme,
  type NativeAccordionSlotProps,
} from '@altroo/mui-native';
import { useNativeTextContext, type NativeTextScopeValue } from '@altroo/mui-native-system';
import reference from './fixtures/mui-accordion-9.5.0.json';

afterEach(cleanup);

test.each(reference.slotConstructorContracts)(
  'matches pinned $slot constructor and terminal forwarding: $mode',
  ({ slot, mode, calls: expectedCalls, forwarded: expectedForwarded }) => {
    let calls = 0;
    let forwarded: unknown = null;
    const Leaf = forwardRef<ViewInstance, { children?: ReactNode }>(function Leaf(props, ref) {
      return <View ref={ref}>{props.children}</View>;
    });
    Leaf.displayName = 'Leaf';
    const Custom = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Custom(props, ref) {
      forwarded = {
        sxPresent: Object.hasOwn(props, 'sx'),
        sx: props.sx ?? null,
        ownerPresent: Object.hasOwn(props, 'ownerState'),
        ownerExpanded: props.ownerState?.expanded ?? null,
        asPresent: Object.hasOwn(props, 'as'),
        as: props.as?.displayName ?? null,
        classes: String(props.className)
          .split(/\s+/)
          .filter((name) => name.startsWith('Mui')),
      };
      return (
        <View ref={ref} style={props.style} testID="slot-host">
          {props.children}
        </View>
      );
    });
    const theme = createTheme({
      motion: { reducedMotion: 'always' },
      components: {
        MuiAccordion: {
          styleOverrides: {
            [slot]: (args: Record<string, unknown>) => {
              if (String(args.className).split(/\s+/).includes(`MuiAccordion-${slot}`)) calls++;
              return { paddingTop: '19px' };
            },
          },
        },
      },
    });
    const slotProps = {
      [slot]: {
        sx: { paddingBottom: 2 },
        ...(mode === 'as' ? { as: Custom } : {}),
        ...(mode === 'slot-component' ? { component: Leaf } : {}),
      },
    };
    render(
      <ThemeProvider theme={theme}>
        <Accordion
          defaultExpanded
          slots={mode.startsWith('slot') ? { [slot]: Custom } : {}}
          slotProps={slotProps}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <View />
        </Accordion>
      </ThemeProvider>,
    );
    expect(calls).toBe(expectedCalls);
    expect(forwarded).toEqual(expectedForwarded);
    if (mode.startsWith('slot')) {
      // Replacing Region skips its own constructor, but the root's higher
      // specificity region selector still applies to the authored slot class.
      expect(StyleSheet.flatten(screen.getByTestId('slot-host').props.style)?.paddingTop).toBe(
        slot === 'region' ? 19 : undefined,
      );
    } else if (mode === 'as')
      expect(screen.getByTestId('slot-host')).toHaveStyle({ paddingTop: 19 });
  },
);

for (const slot of ['heading', 'region'] as const) {
  test(`${slot} receives actual ancestor selectors and native inline priority`, () => {
    const theme = createTheme({ motion: { reducedMotion: 'always' } });
    render(
      <ThemeProvider theme={theme}>
        <Box sx={{ [`& .MuiAccordion-${slot}`]: { paddingTop: '21px', color: '#123456' } }}>
          <Accordion
            expanded
            slotProps={{ [slot]: { testID: 'frame', style: { paddingBottom: 9 } } }}
          >
            <AccordionSummary>Summary</AccordionSummary>
            <Typography variant="inherit" testID="body">
              Body
            </Typography>
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('frame')).toHaveStyle({ paddingTop: 21, paddingBottom: 9 });
    if (slot === 'region') expect(screen.getByTestId('body')).toHaveStyle({ color: '#123456' });
  });
  for (const Base of [Box, Paper]) {
    test(`${slot} relative typography resolves once through a ${Base === Box ? 'Box' : 'Paper'} wrapper`, () => {
      const Wrapped = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Wrapped(
        { component: _component, as: _as, ...props },
        ref,
      ) {
        return <Base {...props} ref={ref} />;
      });
      render(
        <ThemeProvider theme={createTheme({ motion: { reducedMotion: 'always' } })}>
          <Box sx={{ fontSize: 10 }}>
            <Accordion
              expanded
              slotProps={{ [slot]: { as: Wrapped, sx: { fontSize: '2em', lineHeight: 1.5 } } }}
            >
              <AccordionSummary>
                <Typography variant="inherit" testID="summary">
                  Summary
                </Typography>
              </AccordionSummary>
              <Typography variant="inherit" testID="body">
                Body
              </Typography>
            </Accordion>
          </Box>
        </ThemeProvider>,
      );
      expect(screen.getByTestId(slot === 'heading' ? 'summary' : 'body')).toHaveStyle({
        fontSize: 20,
        lineHeight: 30,
      });
    });
  }
}

test.each(reference.slotReadContracts)(
  'matches original $slot getter order and selected values without replay',
  ({ slot, trace: expectedTrace, forwarded: expectedForwarded }) => {
    const trace: string[] = [];
    const counts: Record<string, number> = {};
    let forwarded: unknown;
    const Leaf = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Leaf(props, ref) {
      return <View ref={ref}>{props.children}</View>;
    });
    Leaf.displayName = 'Leaf';
    const Slot = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Slot(props, ref) {
      forwarded = {
        className: props.className,
        sx: props.sx,
        component: props.component?.displayName ?? null,
        as: props.as?.displayName ?? null,
        extra: Reflect.get(props.ownerState ?? {}, 'extra') ?? null,
        paddingTop: StyleSheet.flatten(props.style)?.paddingTop ?? null,
      };
      return <View ref={ref}>{props.children}</View>;
    });
    const authored = {};
    for (const key of ['sx', 'component', 'ownerState', 'className', 'style', 'ref'])
      Object.defineProperty(authored, key, {
        enumerable: true,
        get() {
          const count = (counts[key] = (counts[key] ?? 0) + 1);
          trace.push(key + ':' + count);
          if (['sx', 'component', 'ownerState'].includes(key) && count > 1)
            throw Error('Unexpected accessor replay: ' + key);
          return {
            sx: { opacity: 0.8 },
            component: Leaf,
            ownerState: { extra: 'kept' },
            className: 'slot-class-' + count,
            style: { paddingTop: count },
            ref: null,
          }[key];
        },
      });
    render(
      <Accordion slots={{ [slot]: Slot }} slotProps={{ [slot]: authored }}>
        <View />
        <View />
      </Accordion>,
    );
    expect(trace).toEqual(expectedTrace);
    expect(forwarded).toEqual(expectedForwarded);
  },
);

test.each([undefined, { paddingTop: 13 }])(
  'root region override specificity stays above region sx and below native inline: %s',
  (style) => {
    const theme = createTheme({
      motion: { reducedMotion: 'always' },
      components: {
        MuiAccordion: {
          styleOverrides: {
            region: (args) => ({
              paddingTop: String(args.className).split(/\s+/).includes('MuiAccordion-root')
                ? '17px'
                : '9px',
            }),
          },
        },
      },
    });
    render(
      <ThemeProvider theme={theme}>
        <Accordion
          expanded
          slotProps={{ region: { testID: 'projected-region', sx: { paddingTop: '5px' }, style } }}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <View />
        </Accordion>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('projected-region')).toHaveStyle({ paddingTop: style ? 13 : 17 });
  },
);

test.each(['ltr', 'rtl'] as const)(
  'Summary content resets inherited centered text to start in %s',
  (direction) => {
    let inherited: NativeTextScopeValue | undefined;
    function Content() {
      inherited = useNativeTextContext();
      return (
        <Typography variant="inherit" testID="aligned-summary">
          Summary
        </Typography>
      );
    }
    render(
      <ThemeProvider theme={createTheme({ direction, motion: { reducedMotion: 'always' } })}>
        <Box sx={{ direction, textAlign: 'center' }}>
          <Accordion>
            <AccordionSummary>
              <Content />
            </AccordionSummary>
            <View />
          </Accordion>
        </Box>
      </ThemeProvider>,
    );
    // RN mirrors emitted left/right in RTL paragraphs. The shared text
    // foundation encodes CSS start as native left with the actual direction.
    expect(inherited).toMatchObject({
      direction,
      textAlign: 'start',
      style: { textAlign: direction === 'rtl' ? 'right' : 'left' },
    });
    expect(screen.getByTestId('aligned-summary')).toHaveStyle({ textAlign: 'left' });
  },
);

for (const slot of ['heading', 'region'] as const) {
  test.each(['as', 'component'] as const)(
    `${slot} forwards classes to a custom %s terminal`,
    (prop) => {
      let classes: unknown;
      const Terminal = forwardRef<ViewInstance, NativeAccordionSlotProps>(
        function Terminal(props, ref) {
          classes = Reflect.get(props, 'classes');
          return <View ref={ref}>{props.children}</View>;
        },
      );
      const supplied = { root: 'authored-terminal-root' };
      render(
        <Accordion slotProps={{ [slot]: { [prop]: Terminal, classes: supplied } }}>
          <AccordionSummary>Summary</AccordionSummary>
          <View />
        </Accordion>,
      );
      expect(classes).toBe(supplied);
    },
  );
}

test.each(reference.transitionClassContracts)(
  'Transition preserves original conditional class merge: $kind',
  ({ kind, reads: expectedReads, observed: expected }) => {
    let reads = 0;
    let observed: unknown;
    const Transition = (props: { className?: string; children?: ReactNode }) => {
      observed = { present: Object.hasOwn(props, 'className'), value: props.className ?? null };
      return <View>{props.children}</View>;
    };
    const slot = {};
    if (kind !== 'absent')
      Object.defineProperty(slot, 'className', {
        enumerable: true,
        get() {
          reads++;
          if (kind === 'explicit-undefined') return undefined;
          return reads === 1 ? (kind === 'empty-first' ? '' : undefined) : 'selected';
        },
      });
    render(
      <Accordion slots={{ transition: Transition }} slotProps={{ transition: slot }}>
        <View />
        <View />
      </Accordion>,
    );
    expect(reads).toBe(expectedReads);
    expect(observed).toEqual(expected);
  },
);

test.each(reference.refOrderContracts)(
  '$family composes slot refs before the outer ref on attach and cleanup',
  ({ family, trace: expected }) => {
    const trace: string[] = [];
    const slot = createRef<ViewInstance>();
    const outer = (node: ViewInstance | null) => {
      if (!node) {
        trace.push('outer-null:' + (slot.current === null));
        return;
      }
      trace.push('outer-attach:' + (slot.current === node));
      return () => {
        trace.push('outer-cleanup:' + (slot.current === null));
      };
    };
    const Root = forwardRef<ViewInstance, { children?: ReactNode }>(function Root(props, ref) {
      return <View ref={ref}>{props.children}</View>;
    });
    const Component = family === 'Accordion' ? Accordion : AccordionSummary;
    const tree = render(
      <Component ref={outer} slots={{ root: Root }} slotProps={{ root: { ref: slot } }}>
        <View />
        <View />
      </Component>,
    );
    tree.unmount();
    expect(trace).toEqual(expected);
  },
);

test.each(reference.styleValueReadContracts)(
  '$slot style declarations retain original single-read semantics',
  ({ slot, reads: expectedReads, selected: expected }) => {
    let reads = 0;
    let selected: unknown;
    const style = Object.defineProperty({}, 'paddingTop', {
      enumerable: true,
      get() {
        reads++;
        if (reads > 1) throw Error('Native declaration accessor replayed');
        return 17;
      },
    });
    const Slot = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Slot(props, ref) {
      selected = StyleSheet.flatten(props.style)?.paddingTop;
      return <View ref={ref}>{props.children}</View>;
    });
    render(
      <Accordion slots={{ [slot]: Slot }} slotProps={{ [slot]: { style } }}>
        <View />
        <View />
      </Accordion>,
    );
    expect(reads).toBe(expectedReads);
    expect(selected).toBe(expected);
  },
);

test('a replaced Summary root owns raw sx and does not execute the old root constructor', () => {
  const rootCalls: unknown[] = [];
  const sx = { minHeight: '71px' };
  const slotSx = { minHeight: '73px' };
  let received: unknown;
  const Custom = forwardRef<
    ViewInstance,
    import('@altroo/mui-native').AccordionSummaryRootSlotProps
  >(function Custom({ ownerState: _ownerState, sx, ...props }, ref) {
    received = sx;
    return <ButtonBase {...props} sx={sx} ref={ref} />;
  });
  const selected = createTheme({
    motion: { reducedMotion: 'always' },
    components: {
      MuiAccordionSummary: {
        styleOverrides: {
          root: (args: Record<string, unknown>) => {
            if (String(args.className).split(/\s+/).includes('MuiAccordionSummary-root'))
              rootCalls.push(args);
            return { minHeight: 91 };
          },
        },
      },
    },
  });
  const tree = render(
    <ThemeProvider theme={selected}>
      <AccordionSummary
        slots={{ root: Custom }}
        sx={sx}
        slotProps={{ root: { sx: slotSx } }}
        testID="replacement"
      >
        Summary
      </AccordionSummary>
    </ThemeProvider>,
  );
  expect(received).toBe(slotSx);
  expect(rootCalls).toEqual([]);
  expect(tree.getByTestId('replacement')).toHaveStyle({ minHeight: 73 });
});

test('an explicit ButtonBase Summary slot replaces the named constructor', () => {
  const tree = render(
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: 'always' } })}>
      <AccordionSummary
        slots={{ root: ButtonBase }}
        sx={{ minHeight: '79px' }}
        testID="replacement"
      >
        Summary
      </AccordionSummary>
    </ThemeProvider>,
  );
  expect(tree.getByTestId('replacement')).toHaveStyle({ minHeight: 79 });
  const style = StyleSheet.flatten(tree.getByTestId('replacement').props.style);
  expect(style.paddingLeft ?? style.padding).toBe(0);
});
