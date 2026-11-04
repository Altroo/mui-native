import React, { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet, type ViewInstance } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  ButtonBase,
  Collapse,
  accordionClasses,
  accordionSummaryClasses,
  accordionDetailsClasses,
  accordionActionsClasses,
  getAccordionUtilityClass,
  getAccordionSummaryUtilityClass,
  getAccordionDetailsUtilityClass,
  getAccordionActionsUtilityClass,
  ThemeProvider,
  createTheme,
  configureDiagnostics,
  type AccordionProps,
  type AccordionSummaryProps,
  type AccordionSummaryRootSlotProps,
  type NativeAccordionSlotProps,
  type CollapseProps,
} from '@altroo/mui-native';
import { NativeButtonModel } from './helpers/nativeButtonModel';
import reference from './fixtures/mui-accordion-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  jest.useFakeTimers();
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  restore();
});
function authored(input: Record<string, any> | undefined) {
  const { $undefined = [], ...props } = input ?? {};
  for (const key of $undefined) props[key] = undefined;
  return props;
}
const event = () => ({
  nativeEvent: { source: 'accordion' },
  preventDefault: jest.fn(),
  persist: jest.fn(),
});
const tick = () => act(() => jest.runOnlyPendingTimers());
const theme = createTheme({ motion: { reducedMotion: 'always' } });
function tree(props: Partial<AccordionProps> = {}, child: React.ReactNode = 'Details') {
  return (
    <ThemeProvider theme={theme}>
      <Accordion {...props}>
        <AccordionSummary testID="summary" id="summary-id" aria-controls="region-id">
          Account
        </AccordionSummary>
        <AccordionDetails testID="details">{child}</AccordionDetails>
      </Accordion>
    </ThemeProvider>
  );
}
test('publishes the four pinned class vocabularies including shared state names', () => {
  expect({
    Accordion: accordionClasses,
    AccordionSummary: accordionSummaryClasses,
    AccordionDetails: accordionDetailsClasses,
    AccordionActions: accordionActionsClasses,
  }).toEqual(reference.classes);
  for (const helper of [
    getAccordionUtilityClass,
    getAccordionSummaryUtilityClass,
    getAccordionDetailsUtilityClass,
    getAccordionActionsUtilityClass,
  ])
    expect(helper('disabled')).toBe('Mui-disabled');
});

test.each(reference.fixtures)(
  'pinned original composition and callback order: $input.name',
  (fixture) => {
    const input: any = fixture.input;
    let current = { ...input.props };
    const trace: string[] = [],
      snapshots: unknown[] = [];
    let summary: AccordionSummaryRootSlotProps, region: any, transition: CollapseProps;
    const Root = forwardRef<ViewInstance, any>(function Root({ children }, ref) {
      return <View ref={ref}>{children}</View>;
    });
    const SummaryRoot = forwardRef<ViewInstance, AccordionSummaryRootSlotProps>(
      function SummaryRoot(props, ref) {
        summary = props;
        return <View ref={ref}>{props.children}</View>;
      },
    );
    const Region = forwardRef<ViewInstance, NativeAccordionSlotProps>(function Region(props, ref) {
      region = props;
      return <View ref={ref}>{props.children}</View>;
    });
    const Transition = (props: CollapseProps) => {
      transition = props;
      return <View>{props.children}</View>;
    };
    const node = () => (
      <ThemeProvider
        theme={createTheme({ components: { MuiAccordion: { defaultProps: input.defaults } } })}
      >
        <Accordion
          {...current}
          onChange={(_event, expanded) => trace.push(`change:${expanded}`)}
          slots={{ root: Root, region: Region, transition: Transition }}
          slotProps={{ region: input.region, transition: input.transition }}
        >
          <AccordionSummary
            id="summary"
            aria-controls="region"
            expandIcon="Expand"
            {...authored(input.summaryProps)}
            onClick={() => trace.push('summary')}
            slots={{ root: SummaryRoot }}
            slotProps={{
              root: {
                ...authored(input.summarySlot),
                onClick: (e) => {
                  trace.push('slot');
                  if (input.prevent) e.preventDefault();
                },
              },
            }}
          >
            Account
          </AccordionSummary>
          <Text>Details</Text>
        </Accordion>
      </ThemeProvider>
    );
    const snapshot = () =>
      snapshots.push({
        expanded: summary['aria-expanded'],
        disabled: summary.disabled,
        ripple: { disableRipple: summary.disableRipple, focusRipple: summary.focusRipple },
        owner: {
          expanded: summary.ownerState?.expanded,
          disabled: summary.ownerState?.disabled,
          disableGutters: summary.ownerState?.disableGutters,
        },
        region: { id: region.nativeID, labelledBy: region['aria-labelledby'], role: region.role },
        transition: {
          in: transition.in,
          timeout: transition.timeout,
          ...(transition.unmountOnExit === undefined
            ? {}
            : { unmountOnExit: transition.unmountOnExit }),
        },
      });
    const result = render(node());
    snapshot();
    for (const action of input.actions) {
      if (action === 'click') act(() => summary.onClick!(event() as any));
      else {
        current = { ...current, expanded: action };
        result.rerender(node());
      }
      snapshot();
    }
    expect(trace).toEqual(fixture.trace);
    expect(snapshots).toEqual(fixture.snapshots);
  },
);

test('actual ButtonBase touch activation expands and collapses once with the original event', () => {
  const changed = jest.fn();
  render(tree({ onChange: changed }));
  const e = event();
  fireEvent.press(screen.getByTestId('summary'), e);
  expect(changed).toHaveBeenLastCalledWith(e, true);
  expect(screen.getByTestId('summary').props.accessibilityState).toMatchObject({
    expanded: true,
    disabled: false,
  });
  fireEvent.press(screen.getByTestId('summary'), e);
  expect(changed.mock.calls.map((x) => x[1])).toEqual([true, false]);
});
test('controlled expansion proposes changes and waits for the owner to update', () => {
  const changed = jest.fn(),
    result = render(tree({ expanded: false, onChange: changed }));
  fireEvent.press(screen.getByTestId('summary'), event());
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(changed.mock.calls.map((x) => x[1])).toEqual([true, true]);
  expect(screen.getByTestId('summary').props.accessibilityState.expanded).toBe(false);
  result.rerender(tree({ expanded: true, onChange: changed }));
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(changed).toHaveBeenLastCalledWith(expect.anything(), false);
});
test('changing defaultExpanded after mount preserves local state', () => {
  const result = render(tree({ defaultExpanded: true }));
  result.rerender(tree({ defaultExpanded: false }));
  expect(screen.getByTestId('summary').props.accessibilityState.expanded).toBe(true);
});
test('disabled summaries do not dispatch or change expansion on touch', () => {
  const changed = jest.fn();
  render(tree({ disabled: true, onChange: changed }));
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByTestId('summary').props.accessibilityState).toMatchObject({
    expanded: false,
    disabled: true,
  });
});
test('native onPress aliases preserve the slot-change-authored callback order', () => {
  const calls: string[] = [];
  render(
    <Accordion onChange={() => calls.push('change')}>
      <AccordionSummary
        testID="summary"
        onPress={() => calls.push('authored')}
        slotProps={{ root: { onPress: () => calls.push('slot') } }}
      >
        Account
      </AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(calls).toEqual(['slot', 'change', 'authored']);
});
test('separate accordions maintain independent state', () => {
  render(
    <>
      <Accordion>
        <AccordionSummary testID="a">A</AccordionSummary>
        <Text>One</Text>
      </Accordion>
      <Accordion>
        <AccordionSummary testID="b">B</AccordionSummary>
        <Text>Two</Text>
      </Accordion>
    </>,
  );
  fireEvent.press(screen.getByTestId('a'), event());
  expect(screen.getByTestId('a').props.accessibilityState.expanded).toBe(true);
  expect(screen.getByTestId('b').props.accessibilityState.expanded).toBe(false);
});
test('nested body accordion does not toggle its expanded parent', () => {
  render(
    <Accordion defaultExpanded>
      <AccordionSummary testID="parent">Parent</AccordionSummary>
      <Accordion>
        <AccordionSummary testID="child">Child</AccordionSummary>
        <Text>Nested body</Text>
      </Accordion>
    </Accordion>,
  );
  fireEvent.press(screen.getByTestId('child'), event());
  expect(screen.getByTestId('parent').props.accessibilityState.expanded).toBe(true);
  expect(screen.getByTestId('child').props.accessibilityState.expanded).toBe(true);
});
test('body state is retained across closing and reopening; unmountOnExit is opt-in', () => {
  const changes: string[] = [];
  function Editor() {
    const [value, setValue] = useState('Draft');
    return (
      <TextInput
        testID="editor"
        value={value}
        onChangeText={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    );
  }
  render(
    tree(
      {
        defaultExpanded: true,
        slotProps: { transition: { timeout: 0, slotProps: { wrapper: { testID: 'measured' } } } },
      },
      <Editor />,
    ),
  );
  fireEvent(screen.getByTestId('measured'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 60 } },
  });
  tick();
  fireEvent.changeText(screen.getByTestId('editor'), 'Retained');
  fireEvent.press(screen.getByTestId('summary'), event());
  tick();
  expect(screen.getByTestId('editor', { includeHiddenElements: true }).props.value).toBe(
    'Retained',
  );
  fireEvent.press(screen.getByTestId('summary'), event());
  tick();
  expect(screen.getByTestId('editor').props.value).toBe('Retained');
  expect(changes).toEqual(['Retained']);
  expect(screen.UNSAFE_getByType(Collapse).props.in).toBe(true);
});
test('unmountOnExit removes the body after exit and remounts it on the next expansion', () => {
  render(
    tree({
      slotProps: {
        transition: {
          timeout: 0,
          unmountOnExit: true,
          slotProps: { wrapper: { testID: 'measured' } },
        },
      },
    }),
  );
  expect(screen.queryByTestId('details', { includeHiddenElements: true })).toBeNull();
  fireEvent.press(screen.getByTestId('summary'), event());
  fireEvent(screen.getByTestId('measured'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 60 } },
  });
  tick();
  expect(screen.getByTestId('details')).toBeTruthy();
  fireEvent.press(screen.getByTestId('summary'), event());
  tick();
  expect(screen.queryByTestId('details', { includeHiddenElements: true })).toBeNull();
});
test('summary IDs link the native region and explicit region slot props replace them', () => {
  const result = render(
    tree({ defaultExpanded: true, slotProps: { region: { testID: 'region' } } }),
  );
  expect(screen.getByTestId('region').props).toMatchObject({
    nativeID: 'region-id',
    'aria-labelledby': 'summary-id',
    role: 'region',
  });
  result.rerender(
    tree({
      defaultExpanded: true,
      slotProps: {
        region: { testID: 'region', id: 'custom', 'aria-labelledby': 'custom-summary' },
      },
    }),
  );
  expect(screen.getByTestId('region').props).toMatchObject({
    nativeID: 'custom',
    'aria-labelledby': 'custom-summary',
  });
});
test('summary can render independently with no expansion owner', () => {
  const clicked = jest.fn();
  render(
    <AccordionSummary testID="summary" onClick={clicked}>
      Independent
    </AccordionSummary>,
  );
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(clicked).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('summary').props.accessibilityState.expanded).toBeUndefined();
});
test.each([
  'Text',
  <React.Fragment key="invalid">
    <Text>Wrapped</Text>
  </React.Fragment>,
])('invalid summary content fails with a useful contract message: %p', (child) => {
  expect(() =>
    render(
      <Accordion>
        {child}
        <Text>Body</Text>
      </Accordion>,
    ),
  ).toThrow(/summary element as its first child/);
});
test('native root/content/region styles, gutter states and theme defaults compose', () => {
  const configured = createTheme({
    motion: { reducedMotion: 'always' },
    components: {
      MuiAccordion: {
        defaultProps: { defaultExpanded: true, disableGutters: true },
        styleOverrides: { root: { paddingTop: 3 }, region: { paddingBottom: 5 } },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          content: ({ ownerState }: { ownerState: Record<string, unknown> }) => ({
            opacity: ownerState.expanded ? 0.8 : 0.4,
          }),
        },
      },
      MuiAccordionDetails: { styleOverrides: { root: { paddingTop: 7 } } },
      MuiAccordionActions: { styleOverrides: { spacing: { paddingBottom: 9 } } },
    },
  });
  render(
    <ThemeProvider theme={configured}>
      <Accordion testID="root" sx={{ paddingTop: 2 }} slotProps={{ region: { testID: 'region' } }}>
        <AccordionSummary testID="summary" slotProps={{ content: { testID: 'content' } }}>
          Settings
        </AccordionSummary>
        <AccordionDetails testID="details">Body</AccordionDetails>
        <AccordionActions testID="actions">
          <Text>Cancel</Text>
          <Text>Save</Text>
        </AccordionActions>
      </Accordion>
    </ThemeProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('root').props.style)).toMatchObject({
    paddingTop: 16,
    marginTop: 0,
    marginBottom: 0,
  });
  expect(StyleSheet.flatten(screen.getByTestId('summary').props.style)).toMatchObject({
    minHeight: 48,
  });
  expect(StyleSheet.flatten(screen.getByTestId('content').props.style)).toMatchObject({
    opacity: 0.8,
    marginTop: 12,
    marginBottom: 12,
  });
  expect(StyleSheet.flatten(screen.getByTestId('region').props.style)).toMatchObject({
    paddingBottom: 5,
  });
  expect(StyleSheet.flatten(screen.getByTestId('details').props.style)).toMatchObject({
    paddingTop: 7,
    paddingBottom: 16,
    paddingStart: 16,
  });
  expect(StyleSheet.flatten(screen.getByTestId('actions').props.style)).toMatchObject({
    columnGap: 8,
    paddingBottom: 9,
  });
});
test('root slot sx replaces authored sx and native styles win last', () => {
  render(
    tree({
      testID: 'root',
      sx: { paddingTop: 5 },
      style: { paddingBottom: 21 },
      slotProps: { root: { sx: { paddingTop: 2 }, style: { paddingBottom: 23 } } },
    }),
  );
  expect(StyleSheet.flatten(screen.getByTestId('root').props.style)).toMatchObject({
    paddingTop: 16,
    paddingBottom: 23,
  });
});
test('actions spacing can be removed and literal children render through native text scopes', () => {
  render(
    <AccordionActions testID="actions" disableSpacing>
      <Text>Cancel</Text>Save
    </AccordionActions>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('actions').props.style)).toMatchObject({
    columnGap: 0,
  });
  expect(screen.getByText('Save')).toBeTruthy();
});
test('summary icon wrapper tracks expansion and slot overrides', () => {
  render(
    <Accordion>
      <AccordionSummary
        testID="summary"
        expandIcon="Expand"
        slotProps={{ expandIconWrapper: { testID: 'icon', style: { padding: 3 } } }}
      >
        Account
      </AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('icon').props.style)).toMatchObject({
    transform: [{ rotate: '0deg' }],
    padding: 3,
  });
  fireEvent.press(screen.getByTestId('summary'), event());
  expect(StyleSheet.flatten(screen.getByTestId('icon').props.style)).toMatchObject({
    transform: [{ rotate: '180deg' }],
    padding: 3,
  });
});
class AccordionModel extends NativeButtonModel {
  summaryProps: Partial<AccordionSummaryProps> = {};
  expanded = false;
  proposals: boolean[] = [];
  element() {
    return (
      <Accordion expanded={this.expanded} onChange={(_event, next) => this.proposals.push(next)}>
        <AccordionSummary {...this.summaryProps} testID="trigger" ref={this.attach('trigger')}>
          Keyboard
        </AccordionSummary>
        <Text>Body</Text>
      </Accordion>
    );
  }
}
test('native summary Enter and Space delivery use the shared ButtonBase activation contract', async () => {
  const model = new AccordionModel();
  await model.mount();
  await model.nativeKey('Enter');
  await model.nativeKey('Enter', true);
  expect(model.proposals).toEqual([true]);
  model.expanded = true;
  await act(async () => model.tree!.rerender(model.element()));
  await model.nativeKey(' ');
  expect(model.proposals).toEqual([true]);
  await model.nativeKey(' ', true);
  expect(model.proposals).toEqual([true, false]);
  await act(async () => model.tree!.unmount());
});

test('empty content fails with a useful contract message', () => {
  expect(() => render(<Accordion>{[]}</Accordion>)).toThrow(/summary element as its first child/);
});

test('default Accordion styles do not emit unsupported native-style diagnostics', () => {
  const codes: string[] = [];
  const undo = configureDiagnostics(({ code }) => codes.push(code));
  try {
    render(tree({ defaultExpanded: true }));
    expect(codes).toEqual([]);
  } finally {
    undo();
  }
});

test('authored ARIA and explicit undefined preserve source priority in native accessibility state', () => {
  const result = render(
    <Accordion expanded>
      <AccordionSummary testID="summary" aria-expanded={false}>
        Settings
      </AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  expect(screen.getByTestId('summary').props.accessibilityState.expanded).toBe(false);
  result.rerender(
    <Accordion expanded>
      <AccordionSummary testID="summary" aria-expanded={undefined}>
        Settings
      </AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  expect(screen.getByTestId('summary').props.accessibilityState.expanded).toBeUndefined();
});
test('explicit undefined disabled overrides contextual additional props before ButtonBase defaults', () => {
  render(
    <Accordion disabled>
      <AccordionSummary testID="summary" disabled={undefined}>
        Settings
      </AccordionSummary>
      <Text>Body</Text>
    </Accordion>,
  );
  expect(screen.getByTestId('summary').props.accessibilityState.disabled).toBe(false);
});
test('authored ripple choices override generated Summary defaults', () => {
  render(
    <AccordionSummary disableRipple={false} focusRipple>
      Settings
    </AccordionSummary>,
  );
  expect(screen.UNSAFE_getByType(ButtonBase).props).toMatchObject({
    disableRipple: false,
    focusRipple: true,
  });
});

test('root, slot and part refs preserve one instance and React 19 cleanup across ref replacement', () => {
  const Leaf = forwardRef<ViewInstance, { children?: React.ReactNode }>(function Leaf(
    { children },
    ref,
  ) {
    const node = useRef({} as ViewInstance);
    useImperativeHandle(ref, () => node.current, []);
    return <View>{children}</View>;
  });
  const root = React.createRef<ViewInstance>(),
    summary = React.createRef<ViewInstance>(),
    details = React.createRef<ViewInstance>(),
    actions = React.createRef<ViewInstance>();
  const events: string[] = [];
  const old: React.RefCallback<ViewInstance> = (node) => {
    expect(node).toBeTruthy();
    events.push('old attach');
    return () => {
      events.push('old cleanup');
    };
  };
  const next: React.RefCallback<ViewInstance> = (node) => {
    expect(node).toBeTruthy();
    events.push('new attach');
    return () => {
      events.push('new cleanup');
    };
  };
  const node = (ref: React.Ref<ViewInstance>) => (
    <Accordion defaultExpanded ref={root} slots={{ root: Leaf }} slotProps={{ root: { ref } }}>
      <AccordionSummary ref={summary} slots={{ root: Leaf }}>
        Settings
      </AccordionSummary>
      <AccordionDetails ref={details} component={Leaf}>
        Body
      </AccordionDetails>
      <AccordionActions ref={actions} component={Leaf}>
        Done
      </AccordionActions>
    </Accordion>
  );
  const result = render(node(old)),
    original = root.current;
  expect(original).not.toBeNull();
  expect(summary.current).not.toBeNull();
  expect(details.current).not.toBeNull();
  expect(actions.current).not.toBeNull();
  result.rerender(node(next));
  expect(root.current).toBe(original);
  expect(events).toEqual(['old attach', 'old cleanup', 'new attach']);
  result.unmount();
  expect(events).toEqual(['old attach', 'old cleanup', 'new attach', 'new cleanup']);
  for (const ref of [root, summary, details, actions]) expect(ref.current).toBeNull();
});
test('summary action focus styling and disabled cleanup use ButtonBase state', async () => {
  const action = React.createRef<import('@altroo/mui-native').ButtonBaseActions>();
  const model = new AccordionModel();
  model.summaryProps = { action };
  await model.mount();
  act(() => action.current!.focusVisible());
  expect(StyleSheet.flatten(model.native().style)).toMatchObject({
    backgroundColor: theme.palette.action.focus,
  });
  model.summaryProps = { action, disabled: true };
  await act(async () => model.tree!.rerender(model.element()));
  expect(model.native().accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(model.native().style)).toMatchObject({
    opacity: theme.palette.action.disabledOpacity,
  });
  await act(async () => model.tree!.unmount());
});
