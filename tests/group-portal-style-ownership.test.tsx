import { useContext, useState } from 'react';
import { View, StyleSheet, processColor } from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import {
  ButtonGroup,
  Box,
  Typography,
  Button,
  ButtonBase,
  ButtonGroupContext,
  ButtonGroupButtonContext,
  Portal,
  configureDiagnostics,
} from '../packages/material/src';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import { NativePressable } from '../packages/native-host/src';
import { NativePortalModel } from './helpers/nativePortalModel';
import reference from './fixtures/mui-button-group-9.5.0.json';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  jest
    .spyOn(require('react-native'), 'findNodeHandle')
    .mockImplementation((target: any) => target?.tag ?? 11);
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restore();
});
class GroupPortalModel extends NativePortalModel {
  mode: 'default' | 'inside' | 'outside' = 'default';
  contexts: any[] = [];
  element() {
    const model = this;
    function Content() {
      const [count, setCount] = useState(0);
      model.contexts.push({
        ...useContext(ButtonGroupContext),
        position: useContext(ButtonGroupButtonContext),
      });
      return (
        <Button
          testID="action"
          ref={model.attach('button')}
          onClick={() => setCount((value) => value + 1)}
        >
          Action {count}
        </Button>
      );
    }
    return (
      <View ref={this.attach('app')}>
        <ButtonGroup
          ref={this.attach('group')}
          variant="contained"
          color="secondary"
          size="large"
          sx={{ '& .MuiButtonGroup-grouped': { minWidth: 89, backgroundColor: 'rgb(0, 128, 0)' } }}
        >
          <View ref={this.attach('container')} />
          <Portal
            {...this.props}
            ref={this.portal}
            container={
              this.mode === 'default'
                ? undefined
                : () => this.nodes.get(this.mode === 'inside' ? 'container' : 'outside')
            }
          >
            <Content />
          </Portal>
        </ButtonGroup>
        <View ref={this.attach('outside')} />
      </View>
    );
  }
  async wireParents() {
    await act(async () => {
      const parent: Record<string, string | null> = {
        group: 'app',
        container: 'group',
        outside: 'app',
        button: 'group',
        app: null,
      };
      for (const [id, target] of this.nodes)
        Object.defineProperty(target, 'parentNode', {
          configurable: true,
          get: () => (parent[id] ? this.nodes.get(parent[id]!) : null),
        });
      nativeStyleTree.changed();
    });
  }
  style() {
    return StyleSheet.flatten(
      this.tree!.UNSAFE_getByType(ButtonBase).props.style({ pressed: false, focusVisible: false }),
    );
  }
}
test.each(['default', 'inside', 'outside'] as const)(
  'Portal %s retains public defaults while styles follow physical containment',
  async (mode) => {
    const model = new GroupPortalModel();
    model.mode = mode;
    await model.mount();
    await model.wireParents();
    await model.layout();
    const expected = (reference as Record<string, any>).contracts?.portalOwnership?.find(
      (item: any) => item.name === mode,
    );
    const style = model.style();
    expect(style.minWidth).toBe(
      expected ? parseFloat(expected.button.computed.minWidth) : mode === 'inside' ? 89 : 64,
    );
    expect(processColor(style.backgroundColor)).toBe(
      processColor(
        expected?.button.computed.backgroundColor ??
          (mode === 'inside' ? 'rgb(0, 128, 0)' : '#9c27b0'),
      ),
    );
    const context = model.contexts.at(-1);
    expect(context).toMatchObject({
      variant: 'contained',
      color: 'secondary',
      size: 'large',
      position: 'MuiButtonGroup-lastButton',
    });
    if (expected) expect(JSON.parse(JSON.stringify(context))).toEqual(expected.context);
    expect(style.borderTopLeftRadius ?? style.borderRadius).toBe(mode === 'inside' ? 0 : 4);
  },
);
test('reparenting a custom container updates only styles and preserves mounted button state', async () => {
  const model = new GroupPortalModel();
  model.mode = 'inside';
  await model.mount();
  await model.wireParents();
  await model.layout();
  await act(async () => {
    // Native Portal dispatch follows the reparented canvas; RNTL's logical
    // pointerEvents walk stops at the intentionally hidden placeholder host.
    expect(model.portal.current!.presented).toBe(true);
    const button = model.nodes.get('button');
    model.tree!.UNSAFE_getByType(NativePressable).props.onPress!(model.event(button));
  });
  expect(model.tree!.getByText('Action 1')).toBeTruthy();
  const container = model.nodes.get('container');
  let remove: () => void = () => {};
  await act(async () => {
    remove = nativeStyleTree.registerPortal(container, null);
  });
  expect(model.style().minWidth).toBe(64);
  expect(model.tree!.getByText('Action 1')).toBeTruthy();
  await act(async () => remove());
  expect(model.style().minWidth).toBe(89);
  expect(model.tree!.getByText('Action 1')).toBeTruthy();
});
test('disablePortal retains ordinary group styling without registering a native surface', async () => {
  const model = new GroupPortalModel();
  model.props.disablePortal = true;
  await model.mount();
  await model.wireParents();
  expect(model.style().minWidth).toBe(89);
  expect(model.contexts.at(-1)).toMatchObject({
    color: 'secondary',
    position: 'MuiButtonGroup-lastButton',
  });
});

class DestinationPortalModel extends GroupPortalModel {
  logicalGroup = true;
  nested = false;
  destinationColor = 'rgb(30, 80, 140)';
  element() {
    const model = this;
    function Content() {
      model.contexts.push({
        ...useContext(ButtonGroupContext),
        position: useContext(ButtonGroupButtonContext),
      });
      const button = <Button testID="action">Destination action</Button>;
      return model.nested ? (
        <ButtonGroup>
          <ButtonGroup>{button}</ButtonGroup>
        </ButtonGroup>
      ) : (
        button
      );
    }
    const portaled = (
      <Portal ref={this.portal} container={() => this.nodes.get('destination')}>
        <Content />
      </Portal>
    );
    return (
      <View ref={this.attach('app')}>
        <ButtonGroup
          ref={this.attach('destinationGroup')}
          sx={{
            '& .MuiButtonGroup-grouped': { minWidth: 103 },
            '& .MuiButton-root': { backgroundColor: this.destinationColor },
          }}
        >
          <View ref={this.attach('destination')} />
        </ButtonGroup>
        {this.logicalGroup ? (
          <ButtonGroup
            ref={this.attach('source')}
            variant="contained"
            color="secondary"
            size="large"
            sx={{ '& .MuiButtonGroup-grouped': { minWidth: 89 } }}
          >
            {portaled}
          </ButtonGroup>
        ) : (
          portaled
        )}
      </View>
    );
  }
  async wireParents() {
    await act(async () => {
      const parent: Record<string, string> = {
        source: 'app',
        destinationGroup: 'app',
        destination: 'destinationGroup',
      };
      for (const [id, target] of this.nodes)
        Object.defineProperty(target, 'parentNode', {
          configurable: true,
          get: () => (parent[id] ? this.nodes.get(parent[id]) : null),
        });
      nativeStyleTree.changed();
    });
  }
}
test.each([true, false])(
  'Portal acquires physical destination styles with logical group=%s',
  async (logicalGroup) => {
    const model = new DestinationPortalModel();
    model.logicalGroup = logicalGroup;
    await model.mount();
    await model.wireParents();
    await model.layout();
    expect(model.portal.current!.container).toBe(model.nodes.get('destination'));
    expect(nativeStyleTree.groupRulesAt(model.nodes.get('destination'))).toHaveLength(1);
    const expected = reference.contracts.portalDestinations.find(
      (item) => item.logicalGroup === logicalGroup,
    )!;
    expect(model.style().minWidth).toBe(parseFloat(expected.button.computed.minWidth));
    expect(processColor(model.style().backgroundColor)).toBe(
      processColor(expected.button.computed.backgroundColor),
    );
    expect(JSON.parse(JSON.stringify(model.contexts.at(-1)))).toEqual(expected.context);
  },
);

test('nested groups in a custom Portal settle and still receive committed owner updates', async () => {
  const calls = jest.fn();
  const unsubscribe = nativeStyleTree.subscribe(calls);
  const model = new DestinationPortalModel();
  model.nested = true;
  try {
    await model.mount();
    await model.wireParents();
    await model.layout();
    expect(calls.mock.calls.length).toBeLessThan(50);
    expect(processColor(model.style().backgroundColor)).toBe(processColor(model.destinationColor));
    calls.mockClear();
    await act(async () => {
      nativeStyleTree.changed();
    });
    expect(calls.mock.calls.length).toBeLessThan(10);
    model.destinationColor = 'rgb(196, 58, 120)';
    await model.update();
    await model.wireParents();
    await model.layout();
    expect(processColor(model.style().backgroundColor)).toBe(processColor(model.destinationColor));
    expect(calls.mock.calls.length).toBeLessThan(50);
  } finally {
    unsubscribe();
  }
});
class TextPortalModel extends GroupPortalModel {
  textMode: 'default' | 'inside' | 'sibling' | 'raw' = 'default';
  destinationColor = '#008000';
  element() {
    return (
      <View ref={this.attach('app')}>
        <Box
          ref={this.attach('sibling')}
          sx={{ color: this.destinationColor, fontSize: 20, lineHeight: 1.25 }}
        >
          <View
            ref={this.attach('siblingContainer')}
            style={
              this.textMode === 'raw'
                ? ({ color: '#800080', fontSize: 18, lineHeight: 36 } as any)
                : undefined
            }
          />
        </Box>
        <ButtonGroup
          ref={this.attach('group')}
          sx={{ color: '#ff0000', fontSize: 24, lineHeight: 1.5 }}
        >
          <View ref={this.attach('container')} />
          <Portal
            ref={this.portal}
            container={
              this.textMode === 'default'
                ? undefined
                : () =>
                    this.nodes.get(this.textMode === 'inside' ? 'container' : 'siblingContainer')
            }
          >
            <Typography variant="inherit" color="inherit" testID="text">
              Physical text
            </Typography>
          </Portal>
        </ButtonGroup>
      </View>
    );
  }
  async wireParents() {
    await act(async () => {
      const parent: Record<string, string> = {
        group: 'app',
        container: 'group',
        sibling: 'app',
        siblingContainer: 'sibling',
      };
      for (const [id, target] of this.nodes)
        Object.defineProperty(target, 'parentNode', {
          configurable: true,
          get: () => (parent[id] ? this.nodes.get(parent[id]) : null),
        });
      nativeStyleTree.changed();
    });
  }
}
test.each(['default', 'inside', 'sibling', 'raw'] as const)(
  'Portal text follows %s physical inheritance',
  async (textMode) => {
    const model = new TextPortalModel();
    model.textMode = textMode;
    await model.mount();
    await model.wireParents();
    await model.layout();
    const style = StyleSheet.flatten(model.tree!.getByTestId('text').props.style);
    const expected = reference.contracts.portalText.find((item) => item.mode === textMode)!.text
      .computed;
    expect(processColor(style.color)).toBe(processColor(expected.color));
    expect(style.fontSize).toBe(parseFloat(expected.fontSize));
    if (expected.lineHeight !== 'normal')
      expect(style.lineHeight).toBe(parseFloat(expected.lineHeight));
  },
);
test('custom Portal text responds to destination scope changes without remounting its children', async () => {
  const model = new TextPortalModel();
  model.textMode = 'sibling';
  await model.mount();
  await model.wireParents();
  await model.layout();
  const before = model.tree!.getByTestId('text');
  model.destinationColor = '#123456';
  await model.update();
  await model.wireParents();
  const after = model.tree!.getByTestId('text');
  expect(after).toBe(before);
  expect(processColor(StyleSheet.flatten(after.props.style).color)).toBe(processColor('#123456'));
});
test('a custom Portal targeting its own physical descendant stays inactive without feedback', async () => {
  const model = new TextPortalModel();
  model.textMode = 'sibling';
  await model.mount();
  await model.wireParents();
  await model.layout();
  const target = model.nodes.get('siblingContainer'),
    canvas = model.portal.current!.node!;
  const calls = jest.fn(),
    stop = nativeStyleTree.subscribe(calls);
  try {
    await act(async () => {
      // Simulate the public native ancestry after an invalid application move.
      Object.defineProperty(target, 'parentNode', { configurable: true, get: () => canvas });
      nativeStyleTree.changed();
    });
    expect(model.host().props.active).toBe(false);
    expect(model.portal.current!.presented).toBe(false);
    expect(StyleSheet.flatten(model.tree!.getByTestId('text').props.style).fontSize).toBe(16);
    expect(calls.mock.calls.length).toBeLessThan(20);
    await model.wireParents();
    expect(model.host().props.active).toBe(true);
    expect(StyleSheet.flatten(model.tree!.getByTestId('text').props.style).fontSize).toBe(20);
  } finally {
    stop();
  }
});
