// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import {
  Accordion,
  Box,
  AccordionSummary,
  ThemeProvider,
  createTheme,
  styled,
  accordionClasses,
  accordionSummaryClasses,
  getAccordionUtilityClass,
  getAccordionSummaryUtilityClass,
  getAccordionDetailsUtilityClass,
  getAccordionActionsUtilityClass,
} from '@altroo/mui-native';
import { unstable_ClassNameGenerator as generator } from '../packages/material/src/className';
import reference from './fixtures/mui-accordion-9.5.0.json';
import { NativeButtonModel } from './helpers/nativeButtonModel';
import { backendEdges } from './helpers/nativeInsetEdges';

afterEach(() => {
  cleanup();
  generator.reset();
});

const helpers = {
  Accordion: getAccordionUtilityClass,
  AccordionSummary: getAccordionSummaryUtilityClass,
  AccordionDetails: getAccordionDetailsUtilityClass,
  AccordionActions: getAccordionActionsUtilityClass,
};
test.each(Object.entries(reference.classUtility))(
  'pinned helper states and inherited keys: %s',
  (name, values) => {
    for (const [slot, expected] of Object.entries(values))
      expect(helpers[name as keyof typeof helpers](slot)).toBe(expected);
  },
);

test.each(reference.classContracts)(
  'pinned custom slot classes and getter/callback order: $input',
  ({ input, trace: expectedTrace, observed: expectedObserved }) => {
    const trace: string[] = [],
      observed: Record<string, object> = {};
    const classes = (family: string, names: string[]) =>
      Object.defineProperties(
        {},
        Object.fromEntries(
          names.map((name) => [
            name,
            {
              enumerable: true,
              get() {
                trace.push(family + ':' + name);
                return family + '-' + name;
              },
            },
          ]),
        ),
      );
    const Slot = (name: string) =>
      forwardRef<ViewInstance, Record<string, any>>(function Slot(props, ref) {
        observed[name] = {
          className: props.className ?? null,
          focusVisibleClassName: props.focusVisibleClassName ?? null,
          disabled: props.disabled ?? null,
        };
        return <View ref={ref}>{props.children}</View>;
      });
    const slotProps = (family: string, names: string[]) =>
      Object.fromEntries(
        names.map((name) => [
          name,
          () => {
            trace.push(family + ':callback:' + name);
            return { className: family + '-slot-' + name };
          },
        ]),
      );
    generator.configure((name) => 'Consumer' + name);
    render(
      <Accordion
        {...input}
        classes={classes('accordion', [
          'root',
          'rounded',
          'expanded',
          'disabled',
          'gutters',
          'heading',
          'region',
        ])}
        className="authored-accordion"
        slots={Object.fromEntries(
          ['root', 'heading', 'region', 'transition'].map((name) => [name, Slot('a-' + name)]),
        )}
        slotProps={slotProps('accordion', ['root', 'heading', 'transition', 'region'])}
      >
        <AccordionSummary
          classes={classes('summary', [
            'root',
            'expanded',
            'disabled',
            'gutters',
            'focusVisible',
            'content',
            'expandIconWrapper',
          ])}
          className="authored-summary"
          focusVisibleClassName="authored-focus"
          expandIcon="Icon"
          slots={Object.fromEntries(
            ['root', 'content', 'expandIconWrapper'].map((name) => [name, Slot('s-' + name)]),
          )}
          slotProps={slotProps('summary', ['root', 'content', 'expandIconWrapper'])}
        >
          Summary
        </AccordionSummary>
        Body
      </Accordion>,
    );
    expect(observed).toEqual(expectedObserved);
    expect(trace).toEqual(expectedTrace);
  },
);

test('configured live helpers leave imported maps fixed and support custom self selectors on every slot', () => {
  const maps = [accordionClasses.root, accordionSummaryClasses.root];
  generator.configure((name) => 'Live' + name);
  render(
    <Accordion
      expanded
      sx={{ '&.LiveMuiAccordion-root': { opacity: 0.8 } }}
      testID="panel"
      slotProps={{
        heading: { testID: 'heading', sx: { '&.LiveMuiAccordion-heading': { padding: 1 } } },
        region: { testID: 'region', sx: { '&.LiveMuiAccordion-region': { padding: 2 } } },
      }}
    >
      <AccordionSummary
        testID="summary"
        expandIcon="Icon"
        sx={{ '&.LiveMuiAccordionSummary-root': { borderTopWidth: 3 } }}
        slotProps={{
          content: {
            testID: 'content',
            sx: { '&.LiveMuiAccordionSummary-content': { padding: 1 } },
          },
          expandIconWrapper: {
            testID: 'icon',
            sx: { '&.LiveMuiAccordionSummary-expandIconWrapper': { padding: 2 } },
          },
        }}
      >
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.getByTestId('panel')).toHaveStyle({ opacity: 0.8 });
  expect(screen.getByTestId('heading')).toHaveStyle({ padding: 8 });
  expect(screen.getByTestId('region')).toHaveStyle({ padding: 16 });
  expect(screen.getByTestId('summary')).toHaveStyle({ borderTopWidth: 3 });
  expect(screen.getByTestId('content')).toHaveStyle({ padding: 8 });
  expect(screen.getByTestId('icon')).toHaveStyle({ padding: 16 });
  expect([accordionClasses.root, accordionSummaryClasses.root]).toEqual(maps);
  expect(getAccordionUtilityClass('root')).toBe('LiveMuiAccordion-root');
  expect(getAccordionSummaryUtilityClass('disabled')).toBe('Mui-disabled');
});

test('Summary focus class selectors follow delivered native key, focus and blur events', async () => {
  class Model extends NativeButtonModel {
    element() {
      return (
        <Accordion>
          <AccordionSummary
            testID="trigger"
            ref={this.attach('trigger')}
            classes={{ focusVisible: 'custom-focus' }}
            focusVisibleClassName="authored-focus"
            sx={{ '&.custom-focus.authored-focus': { borderTopWidth: 5 } }}
            style={{ marginTop: 7 }}
          >
            Summary
          </AccordionSummary>
          Body
        </Accordion>
      );
    }
  }
  const model = new Model();
  await model.mount();
  const button = screen.getByTestId('trigger');
  expect(button).not.toHaveStyle({ borderTopWidth: 5 });
  await model.nativeKey('Tab');
  await model.action({ focus: 'trigger' });
  expect(screen.getByTestId('trigger')).toHaveStyle({ borderTopWidth: 5, marginTop: 7 });
  await act(async () => model.focusEvent('Blur', model.nodes.get('trigger')));
  expect(screen.getByTestId('trigger')).not.toHaveStyle({ borderTopWidth: 5 });
});

test('prepared outer styled selectors bind the final root classes without losing native inline precedence', () => {
  const Panel = styled(Accordion)({ '&.outer-panel': { padding: 3 } });
  const Summary = styled(AccordionSummary)({ '&.outer-summary': { padding: 4 } });
  render(
    <ThemeProvider theme={createTheme({ motion: { reducedMotion: 'always' } })}>
      <Panel className="outer-panel" testID="panel" style={{ paddingTop: 5 }}>
        <Summary className="outer-summary" testID="summary" style={{ paddingTop: 6 }}>
          Summary
        </Summary>
        Body
      </Panel>
    </ThemeProvider>,
  );
  expect(backendEdges(screen.getByTestId('panel').props.style, 'padding', 'ltr', false)).toEqual({
    top: 5,
    right: 3,
    bottom: 3,
    left: 3,
  });
  expect(backendEdges(screen.getByTestId('summary').props.style, 'padding', 'ltr', false)).toEqual({
    top: 6,
    right: 4,
    bottom: 4,
    left: 4,
  });
});

test('custom Summary leaf receives only active focus class metadata and retains full root class names', async () => {
  const Leaf = forwardRef<ViewInstance, Record<string, any>>(function Leaf(
    { className: _className, ...props },
    ref,
  ) {
    return <NativePressable {...props} ref={ref} />;
  });
  class Model extends NativeButtonModel {
    element() {
      return (
        <Accordion>
          <AccordionSummary
            testID="trigger"
            ref={this.attach('trigger')}
            component={Leaf}
            className="authored-root"
            focusVisibleClassName="authored-focus"
          >
            Summary
          </AccordionSummary>
          Body
        </Accordion>
      );
    }
  }
  const model = new Model();
  await model.mount();
  expect(screen.UNSAFE_getByType(Leaf).props.className).toContain('MuiAccordionSummary-root');
  expect(screen.UNSAFE_getByType(Leaf).props.className).toContain('authored-root');
  expect(screen.UNSAFE_getByType(Leaf).props.className).not.toContain('authored-focus');
  await model.nativeKey('Tab');
  await model.action({ focus: 'trigger' });
  expect(screen.UNSAFE_getByType(Leaf).props.className).toContain(
    'Mui-focusVisible authored-focus',
  );
  await act(async () => model.focusEvent('Blur', model.nodes.get('trigger')));
  expect(screen.UNSAFE_getByType(Leaf).props.className).not.toContain('authored-focus');
});

test('Summary slot interaction overrides do not rewrite context-derived class metadata', () => {
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root({ children }, ref) {
    return <View ref={ref}>{children}</View>;
  });
  render(
    <Accordion disabled expanded>
      <AccordionSummary slots={{ root: Root }} slotProps={{ root: { disabled: false } }}>
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.UNSAFE_getByType(Root).props.disabled).toBe(false);
  expect(screen.UNSAFE_getByType(Root).props.className).toContain('Mui-disabled');
  expect(screen.UNSAFE_getByType(Root).props.className).toContain('Mui-expanded');
});

test('inactive and absent slots keep the original getter read policy and supplied class tokens are not deduplicated', () => {
  const icon = jest.fn(() => 'same'),
    focus = jest.fn(() => 'same');
  const classes = Object.defineProperties(
    { root: 'same' },
    { expandIconWrapper: { get: icon }, focusVisible: { get: focus } },
  );
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root({ children }, ref) {
    return <View ref={ref}>{children}</View>;
  });
  render(
    <Accordion>
      <AccordionSummary classes={classes} className="same" slots={{ root: Root }}>
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(icon).toHaveBeenCalledTimes(2);
  expect(focus).toHaveBeenCalledTimes(2);
  expect(screen.UNSAFE_getByType(Root).props.className).toBe(
    'MuiAccordionSummary-root same MuiAccordionSummary-gutters same',
  );
});

test('an explicit undefined focus slot option clears the generated additional focus metadata', () => {
  const Root = forwardRef<ViewInstance, Record<string, any>>(function Root({ children }, ref) {
    return <View ref={ref}>{children}</View>;
  });
  render(
    <Accordion>
      <AccordionSummary
        focusVisibleClassName="authored-focus"
        slots={{ root: Root }}
        slotProps={{ root: { focusVisibleClassName: undefined } }}
      >
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.UNSAFE_getByType(Root).props.focusVisibleClassName).toBeUndefined();
});

test('stock native View Summary roots never receive CSS-only class metadata', () => {
  render(
    <Accordion>
      <AccordionSummary testID="stock-root" component={View} className="custom-root">
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.getByTestId('stock-root').props.className).toBeUndefined();
  expect(screen.getByTestId('stock-root').props.focusVisibleClassName).toBeUndefined();
});

test.each(['panel', 'summary'] as const)(
  'class-aware %s root retains inherited relative text metrics and genuine native absolute overrides',
  (kind) => {
    const body = (
      <Text testID="text" style={{ fontSize: 10 }}>
        Small text
      </Text>
    );
    const tree = (absolute: boolean) => (
      <Accordion
        expanded
        sx={kind === 'panel' ? { fontSize: 20, lineHeight: 1.5 } : undefined}
        style={kind === 'panel' && absolute ? { lineHeight: 32 } : undefined}
      >
        <AccordionSummary
          sx={kind === 'summary' ? { fontSize: 20, lineHeight: 1.5 } : undefined}
          style={kind === 'summary' && absolute ? { lineHeight: 32 } : undefined}
        >
          {kind === 'summary' ? body : 'Summary'}
        </AccordionSummary>
        {kind === 'panel' ? body : 'Body'}
      </Accordion>
    );
    const result = render(tree(false));
    expect(screen.getByTestId('text')).toHaveStyle({ fontSize: 10, lineHeight: 15 });
    result.rerender(tree(true));
    expect(screen.getByTestId('text')).toHaveStyle({ fontSize: 10, lineHeight: 32 });
  },
);

test.each(reference.defaultClassContracts)(
  'pinned inherited Paper/ButtonBase classes and matching override callback arguments: expanded=$expanded',
  ({ expanded, leaves: expectedLeaves, callbacks: expectedCallbacks }) => {
    const callbacks: Record<string, string> = {};
    const publicClass = (value: unknown) =>
      String(value ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .join(' ');
    const override = (name: string) => (props: any) => {
      const [component, slot] = name.split('.');
      const className = publicClass(props.className);
      if (className.split(' ').includes(component + '-' + slot)) callbacks[name] = className;
      return {};
    };
    const components = {
      MuiAccordion: {
        styleOverrides: {
          root: override('MuiAccordion.root'),
          heading: override('MuiAccordion.heading'),
          region: override('MuiAccordion.region'),
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: override('MuiAccordionSummary.root'),
          content: override('MuiAccordionSummary.content'),
          expandIconWrapper: override('MuiAccordionSummary.expandIconWrapper'),
        },
      },
      MuiPaper: {
        styleOverrides: { root: override('MuiPaper.root'), rounded: override('MuiPaper.rounded') },
      },
      MuiButtonBase: { styleOverrides: { root: override('MuiButtonBase.root') } },
    };
    const PanelLeaf = forwardRef<ViewInstance, Record<string, any>>(function PanelLeaf(
      { className: _className, ...props },
      ref,
    ) {
      return <View {...props} ref={ref} />;
    });
    const SummaryLeaf = forwardRef<ViewInstance, Record<string, any>>(function SummaryLeaf(
      { className: _className, ...props },
      ref,
    ) {
      return <NativePressable {...props} ref={ref} />;
    });
    render(
      <ThemeProvider theme={createTheme({ components })}>
        <Accordion
          expanded={expanded}
          component={PanelLeaf}
          classes={{ root: 'custom-panel-root', rounded: 'custom-panel-rounded' }}
          className="authored-panel"
        >
          <AccordionSummary
            component={SummaryLeaf}
            classes={{ root: 'custom-summary-root', content: 'custom-summary-content' }}
            className="authored-summary"
            expandIcon="Icon"
          >
            Summary
          </AccordionSummary>
          Body
        </Accordion>
      </ThemeProvider>,
    );
    expect({
      panel: screen.UNSAFE_getByType(PanelLeaf).props.className,
      summary: screen.UNSAFE_getByType(SummaryLeaf).props.className,
    }).toEqual(expectedLeaves);
    expect(callbacks).toEqual(expectedCallbacks);
  },
);

test('mixed wrapper/base self selectors resolve on the shared native host', () => {
  render(
    <Accordion testID="mixed-panel" sx={{ '&.MuiAccordion-root.MuiPaper-root': { opacity: 0.4 } }}>
      <AccordionSummary
        testID="mixed-summary"
        sx={{ '&.MuiAccordionSummary-root.MuiButtonBase-root': { opacity: 0.5 } }}
      >
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.getByTestId('mixed-panel')).toHaveStyle({ opacity: 0.4 });
  expect(screen.getByTestId('mixed-summary')).toHaveStyle({ opacity: 0.5 });
});

test('stock Text content slots retain native props without CSS metadata', () => {
  render(
    <Accordion>
      <AccordionSummary slotProps={{ content: { component: Text, testID: 'text-slot' } }}>
        Summary
      </AccordionSummary>
      Body
    </Accordion>,
  );
  expect(screen.getByTestId('text-slot').props.className).toBeUndefined();
  expect(screen.getByTestId('text-slot').props.ownerState).toBeUndefined();
});

test('retained mixed selectors preserve genuine native style priority on the shared host', () => {
  const Panel = styled(Accordion)({ '&.MuiAccordion-root.MuiPaper-root': { opacity: 0.4 } });
  const Summary = styled(AccordionSummary)({
    '&.MuiAccordionSummary-root.MuiButtonBase-root': { opacity: 0.5 },
  });
  render(
    <Panel testID="panel-inline" style={{ opacity: 0.9 }}>
      <Summary testID="summary-inline" style={{ opacity: 0.8 }}>
        Summary
      </Summary>
      Body
    </Panel>,
  );
  expect(screen.getByTestId('panel-inline')).toHaveStyle({ opacity: 0.9 });
  expect(screen.getByTestId('summary-inline')).toHaveStyle({ opacity: 0.8 });
});

test('Summary evaluates authored and slot inline style callbacks once for each actual native state', async () => {
  const authored = jest.fn(() => ({ marginTop: 7 })),
    slot = jest.fn(() => ({ marginBottom: 9 }));
  class Model extends NativeButtonModel {
    element() {
      return (
        <Accordion>
          <AccordionSummary
            testID="trigger"
            ref={this.attach('trigger')}
            style={authored}
            slotProps={{ root: { style: slot } }}
          >
            Summary
          </AccordionSummary>
          Body
        </Accordion>
      );
    }
  }
  const model = new Model();
  await model.mount();
  expect(authored).toHaveBeenCalledTimes(1);
  expect(slot).toHaveBeenCalledTimes(1);
  await model.nativeKey('Tab');
  await model.action({ focus: 'trigger' });
  expect(authored).toHaveBeenCalledTimes(2);
  expect(slot).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId('trigger')).toHaveStyle({ marginTop: 7, marginBottom: 9 });
});

test.each(['2em', '200%'])(
  'shared Accordion root uses one inherited font basis for %s',
  (fontSize) => {
    const Custom = forwardRef<ViewInstance, Record<string, any>>(function Custom(
      { style, children, testID, sx },
      ref,
    ) {
      return (
        <Box ref={ref} testID={testID} style={style} sx={sx}>
          {children}
        </Box>
      );
    });
    const tree = (custom: boolean) => (
      <Box sx={{ fontSize: 10 }}>
        <Accordion
          expanded
          testID="relative-root"
          sx={{ fontSize, lineHeight: 1.5 }}
          slots={custom ? { root: Custom } : undefined}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <Text testID="relative-child">Body</Text>
        </Accordion>
      </Box>
    );
    const result = render(tree(false));
    expect(screen.getByTestId('relative-child')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
    result.rerender(tree(true));
    expect(screen.getByTestId('relative-child')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
  },
);

test.each(['paper', 'alias', 'wrapper', 'box'] as const)(
  'Accordion %s roots retain ancestor selectors without multiplying relative text',
  (kind) => {
    const Wrapper = forwardRef<ViewInstance, Record<string, any>>(function Wrapper(
      { children, ...props },
      ref,
    ) {
      return (
        <View {...props} ref={ref}>
          {children}
        </View>
      );
    });
    const root = kind === 'alias' ? 'div' : kind === 'box' ? Box : Wrapper;
    render(
      <Box
        sx={{
          fontSize: 10,
          '& .MuiAccordion-root': {
            paddingLeft: '21px',
            fontSize: '2em',
            lineHeight: 1.5,
          },
        }}
      >
        <Accordion
          expanded
          testID="ancestor-panel"
          slotProps={kind === 'paper' ? undefined : { root: { as: root } }}
        >
          <AccordionSummary>Summary</AccordionSummary>
          <Text testID="ancestor-body">Body</Text>
        </Accordion>
      </Box>,
    );
    expect(screen.getByTestId('ancestor-panel')).toHaveStyle({ paddingLeft: 21 });
    expect(screen.getByTestId('ancestor-body')).toHaveStyle({ fontSize: 20, lineHeight: 30 });
  },
);

test.each(['context', 'authored'] as const)(
  'a %s disabled class blocks native pointer targeting without disabling keyboard activation',
  async (kind) => {
    const changed = jest.fn();
    class Model extends NativeButtonModel {
      element() {
        return (
          <Accordion disabled={kind === 'context'} onChange={changed}>
            <AccordionSummary
              testID="trigger"
              ref={this.attach('trigger')}
              className={kind === 'authored' ? 'Mui-disabled' : undefined}
              slotProps={{ root: { disabled: false, pointerEvents: 'auto' } }}
            >
              Summary
            </AccordionSummary>
            Body
          </Accordion>
        );
      }
    }
    const model = new Model();
    await model.mount();
    expect(screen.getByTestId('trigger').props.pointerEvents).toBe('none');
    expect(screen.getByTestId('trigger').props.accessibilityState.disabled).toBe(false);
    await model.nativeKey('Enter');
    expect(changed).toHaveBeenCalledTimes(1);
  },
);
