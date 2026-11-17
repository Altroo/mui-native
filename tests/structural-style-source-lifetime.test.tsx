// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
// Node GC checks JS ownership with the actual React consumers and Jest hosts.
// They do not measure native heap use or certify mobile performance.
// An independent stock Animated.View control retains old children in RN's
// Jest wrapper too. Replace only those graph wrappers here to isolate our
// prepared-style ownership; this is not native animation or heap evidence.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const animated = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual.Animated),
      View: { value: actual.View, enumerable: true },
      createAnimatedComponent: { value: (Component: unknown) => Component, enumerable: true },
    },
  );
  return Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(actual),
      Animated: { value: animated, enumerable: true },
    },
  );
});
import { spawnSync } from 'node:child_process';
import { setImmediate as nextJob } from 'node:timers';
import { render, cleanup } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';
import { Paper } from '../packages/material/src/paper';
import { Card } from '../packages/material/src/card';
import { Accordion, AccordionSummary } from '../packages/material/src/accordion';
import { Collapse } from '../packages/material/src/collapse';
import { createTheme, componentRootStyle, createNativeStyledStyle } from '../packages/system/src';
const theme = createTheme();
afterEach(cleanup);
const token = () => ({ label: 'obsolete-content', payload: new Array(20000).fill('synthetic') });
function Copy({ value }: { value: ReturnType<typeof token> }) {
  return <Text>{value.label}</Text>;
}
function mountPaper() {
  const value = token();
  return {
    weak: new WeakRef(value),
    view: render(
      <Paper>
        <Copy value={value} />
      </Paper>,
    ),
  };
}
function mountCard() {
  const value = token();
  return {
    weak: new WeakRef(value),
    view: render(
      <Card>
        <Copy value={value} />
      </Card>,
    ),
  };
}
function Immediate({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
function mountAccordion(immediate = false) {
  const value = token();
  return {
    weak: new WeakRef(value),
    view: render(
      <Accordion defaultExpanded slots={immediate ? { transition: Immediate } : undefined}>
        <AccordionSummary>Summary</AccordionSummary>
        <Copy value={value} />
      </Accordion>,
    ),
  };
}
function mountCollapse() {
  const value = token();
  return {
    weak: new WeakRef(value),
    view: render(
      <Collapse in>
        <Copy value={value} />
      </Collapse>,
    ),
  };
}
function mountAnimated() {
  const value = token();
  return {
    weak: new WeakRef(value),
    view: render(
      <Animated.View>
        <Copy value={value} />
      </Animated.View>,
    ),
  };
}
function prepared(structural: boolean) {
  const value = token();
  const result = componentRootStyle(theme, '', {}, undefined, undefined, {
    rootProps: { children: value },
    lastChild: true,
    baseStyle: structural ? { '&:last-child': { opacity: 0.3 } } : { opacity: 0.3 },
  });
  return { weak: new WeakRef(value), prepared: result.prepared, computed: result.computed };
}
function sentinel() {
  return new WeakRef(token());
}
test('prepared scopes release obsolete caller content while their native roots stay mounted', async () => {
  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  if (!gc) {
    // GC is explicit in one isolated child; the normal project test command
    // needs no V8 flags. Forward only its optional config, never its test list.
    if (process.execArgv.includes('--expose-gc')) throw Error('Exposed GC is unavailable');
    const index = process.argv.indexOf('--config');
    const inline = process.argv.find((arg) => arg.startsWith('--config='));
    const config = index >= 0 ? ['--config', process.argv[index + 1]] : inline ? [inline] : [];
    const result = spawnSync(
      process.execPath,
      [
        '--expose-gc',
        require.resolve('jest/bin/jest'),
        ...config,
        '--runInBand',
        '--runTestsByPath',
        __filename,
        '--testNamePattern',
        '^prepared scopes release obsolete caller content',
      ],
      { cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 30000 },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(result.stdout + result.stderr);
    return;
  }
  const control = sentinel(),
    ordinary = prepared(false),
    resolved = prepared(true);
  let paper: ReturnType<typeof mountPaper>;
  let card: ReturnType<typeof mountCard>;
  let accordion: ReturnType<typeof mountAccordion>;
  let immediate: ReturnType<typeof mountAccordion>;
  let collapse: ReturnType<typeof mountCollapse>;
  let animated: ReturnType<typeof mountAnimated>;
  // React's development-only _debugStack captures render call frames, including
  // old children in the RN Jest host mock. Exclude those diagnostic traces from
  // this runtime ownership check; restore normal error reporting immediately.
  const stackTraceLimit = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit')!;
  try {
    // React explicitly requests ten frames, so hold the diagnostic limit at
    // zero in this isolated GC child instead of replacing any runtime data.
    Object.defineProperty(Error, 'stackTraceLimit', {
      configurable: true,
      get: () => 0,
      set: () => undefined,
    });
    paper = mountPaper();
    card = mountCard();
    accordion = mountAccordion();
    immediate = mountAccordion(true);
    collapse = mountCollapse();
    animated = mountAnimated();
    for (let index = 0; index < 8; index++) {
      paper.view.rerender(
        <Paper>
          <Text>{String(index)}</Text>
        </Paper>,
      );
      card.view.rerender(
        <Card>
          <Text>{String(index)}</Text>
        </Card>,
      );
      accordion.view.rerender(
        <Accordion defaultExpanded>
          <AccordionSummary>Summary</AccordionSummary>
          <Text>{String(index)}</Text>
        </Accordion>,
      );
      immediate.view.rerender(
        <Accordion defaultExpanded slots={{ transition: Immediate }}>
          <AccordionSummary>Summary</AccordionSummary>
          <Text>{String(index)}</Text>
        </Accordion>,
      );
      collapse.view.rerender(
        <Collapse in>
          <Text>{String(index)}</Text>
        </Collapse>,
      );
      animated.view.rerender(
        <Animated.View>
          <Text>{String(index)}</Text>
        </Animated.View>,
      );
    }
  } finally {
    Object.defineProperty(Error, 'stackTraceLimit', stackTraceLimit);
  }
  for (let index = 0; index < 8; index++) {
    await new Promise<void>((resolve) => nextJob(resolve));
    gc();
  }
  for (const mounted of [accordion, immediate, collapse, animated]) {
    expect(mounted.view.getByText('7')).toBeTruthy();
    expect(mounted.view.queryByText('obsolete-content')).toBeNull();
  }
  const observations = [
    ['GC control', control],
    ['unused source', ordinary.weak],
    ['resolved source', resolved.weak],
    ['Paper old child', paper.weak],
    ['Card old child', card.weak],
    ['Accordion old child', accordion.weak],
    ['Immediate Accordion old child', immediate.weak],
    ['Collapse old child', collapse.weak],
    ['Animation host control old child', animated.weak],
  ] as const;
  expect(observations.map(([name, weak]) => [name, weak.deref() === undefined])).toEqual(
    observations.map(([name]) => [name, true]),
  );
  // Keep the owned prepared contexts alive across the complete GC check.
  expect(ordinary.prepared.sheets.length).toBeGreaterThan(0);
  // Keep evaluated styles alive too, so their cache refresh closures cannot
  // retain caller props even after prepared sheets have released lazy readers.
  expect(ordinary.computed.opacity).toBe(0.3);
  expect(resolved.computed.opacity).toBe(0.3);
  expect(resolved.prepared.sheets.length).toBeGreaterThan(0);
}, 60000);

test('retained wrappers and ancestor sheets use current owner facts after release', () => {
  const unused = jest.fn(() => {
    throw Error('obsolete owner');
  });
  const context = Object.defineProperty(
    {
      classes: ['Before'],
      baseStyle: {
        '&.After:last-child': { opacity: 0.3 },
      },
    },
    'lastChild',
    { get: unused },
  );
  const wrapper = createNativeStyledStyle(theme, '', {}, undefined, context, undefined);
  expect(unused).not.toHaveBeenCalled();
  expect(
    componentRootStyle(theme, '', {}, undefined, wrapper, {
      classes: ['After'],
      lastChild: true,
    }).computed.opacity,
  ).toBe(0.3);
  expect(
    componentRootStyle(theme, '', {}, undefined, wrapper, {
      classes: ['After'],
      lastChild: false,
    }).computed.opacity,
  ).toBeUndefined();
  expect(unused).not.toHaveBeenCalled();
  const owner = componentRootStyle(theme, '', {}, undefined, undefined, {
    classes: ['Owner'],
    lastChild: false,
    baseStyle: { '&:last-child .Leaf': { opacity: 0.4 } },
  });
  for (const fact of [true, false, true])
    expect(
      componentRootStyle(theme, '', {}, undefined, undefined, {
        classes: ['Leaf'],
        ancestors: [
          {
            theme,
            name: '',
            props: {},
            prepared: owner.prepared,
            context: {
              classes: ['Owner'],
              lastChild: fact,
              descendantPath: [{ classes: ['Leaf'] }],
            },
          },
        ],
      }).computed.opacity,
    ).toBe(fact ? 0.4 : undefined);
});

test('a selected getter failure propagates without poisoning a later operation', () => {
  const error = new Error('selected fact');
  const read = jest
    .fn()
    .mockImplementationOnce(() => {
      throw error;
    })
    .mockReturnValue(true);
  const context = Object.defineProperty(
    { baseStyle: { '&:last-child': { opacity: 0.3 } } },
    'lastChild',
    { get: read },
  );
  expect(() => createNativeStyledStyle(theme, '', {}, undefined, context, undefined)).toThrow(
    error,
  );
  const wrapper = createNativeStyledStyle(theme, '', {}, undefined, context, undefined);
  expect(
    componentRootStyle(theme, '', {}, undefined, wrapper, { lastChild: false }).computed.opacity,
  ).toBeUndefined();
  expect(read).toHaveBeenCalledTimes(2);
});
