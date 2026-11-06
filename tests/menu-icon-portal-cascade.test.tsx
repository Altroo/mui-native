// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { act, cleanup } from '@testing-library/react-native';
import {
  MenuList,
  MenuItem,
  ListItemIcon,
  Portal,
  Button,
  configureDiagnostics,
} from '../packages/material/src';
import Check from '../packages/icons/src/Check';
import { NativePressable } from '../packages/native-host/src';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import { NativePortalModel } from './helpers/nativePortalModel';
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
class MenuIconPortalModel extends NativePortalModel {
  mode: 'window' | 'inside' | 'sibling' | 'outside' = 'window';
  width = 73;
  showSource = true;
  Content = () => {
    const [count, setCount] = useState(0);
    return (
      <ListItemIcon testID="icon" ref={this.attach('icon')} sx={{ minWidth: 80 }}>
        <Check />
        <Button
          testID="increment"
          ref={this.attach('button')}
          onClick={() => setCount((value) => value + 1)}
        >
          Count {count}
        </Button>
      </ListItemIcon>
    );
  };
  element() {
    const Content = this.Content;
    const portal = (
      <Portal
        ref={this.portal}
        container={
          this.mode === 'window'
            ? undefined
            : () =>
                this.nodes.get(
                  this.mode === 'inside'
                    ? 'inside'
                    : this.mode === 'sibling'
                      ? 'sibling'
                      : 'outside',
                )
        }
      >
        <Content />
      </Portal>
    );
    return (
      <View ref={this.attach('app')}>
        <MenuList ref={this.attach('list')}>
          <MenuItem
            ref={this.attach('destination')}
            sx={{
              '& .MuiListItemIcon-root': { minWidth: this.width },
              '& .MuiListItemIcon-root svg': { fontSize: 34 },
            }}
          >
            <View ref={this.attach('sibling')} />
          </MenuItem>
          {this.showSource ? (
            <MenuItem
              dense
              ref={this.attach('source')}
              sx={{ '& .MuiListItemIcon-root': { minWidth: 69 } }}
            >
              <View ref={this.attach('inside')} />
              {portal}
            </MenuItem>
          ) : (
            portal
          )}
        </MenuList>
        <View ref={this.attach('outside')} />
      </View>
    );
  }
  async wire() {
    await act(async () => {
      const parent: Record<string, string | null> = {
        app: null,
        list: 'app',
        source: 'list',
        inside: 'source',
        destination: 'list',
        sibling: 'destination',
        outside: 'app',
        icon: 'source',
        button: 'icon',
      };
      for (const [id, value] of this.nodes)
        Object.defineProperty(value, 'parentNode', {
          configurable: true,
          get: () => (parent[id] ? this.nodes.get(parent[id]!) : null),
        });
      nativeStyleTree.changed();
    });
  }
  font() {
    return this.tree!.UNSAFE_getByType(Svg).props.width;
  }
}
test.each(['window', 'inside', 'sibling', 'outside'] as const)(
  'Portal %s follows actual destination Menu CSS, with no logical dense leak',
  async (mode) => {
    const model = new MenuIconPortalModel();
    model.mode = mode;
    await model.mount();
    await model.wire();
    await model.layout();
    expect(model.tree!.getByTestId('icon')).toHaveStyle({
      minWidth: mode === 'inside' ? 69 : mode === 'sibling' ? 73 : 80,
    });
    expect(model.font()).toBe(mode === 'inside' ? 20 : mode === 'sibling' ? 34 : 24);
  },
);
test('same destination repaint changes physical CSS without remounting content or looping', async () => {
  const model = new MenuIconPortalModel();
  model.mode = 'sibling';
  await model.mount();
  await model.wire();
  await model.layout();
  await act(async () => {
    model
      .tree!.UNSAFE_getAllByType(NativePressable)
      .find((node) => node.props.testID === 'increment')!.props.onPress!(
      model.event(model.nodes.get('button')),
    );
  });
  expect(model.tree!.getByText('Count 1')).toBeTruthy();
  model.width = 77;
  await model.update();
  await model.wire();
  await model.layout();
  expect(model.tree!.getByTestId('icon')).toHaveStyle({ minWidth: 77 });
  expect(model.tree!.getByText('Count 1')).toBeTruthy();
  expect(model.font()).toBe(34);
});
