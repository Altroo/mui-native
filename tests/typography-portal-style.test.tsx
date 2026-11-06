// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useContext, useState } from 'react';
import {
  Text,
  View,
  unstable_TextAncestorContext as TextAncestorContext,
  type TextInstance,
  type TextProps,
} from 'react-native';
import { act, cleanup } from '@testing-library/react-native';
import { Typography, Portal, configureDiagnostics } from '../packages/material/src';
import { nativeStyleTree } from '../packages/material/src/nativeStyleAncestry';
import { NativePortalModel } from './helpers/nativePortalModel';
let restore: () => void;
beforeEach(() => {
  restore = configureDiagnostics(() => {});
  jest
    .spyOn(require('react-native'), 'findNodeHandle')
    .mockImplementation((target: unknown) =>
      target && typeof target === 'object' && 'tag' in target ? Number(target.tag) : 11,
    );
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  restore();
});
const Root = forwardRef<TextInstance, TextProps & { className?: string | undefined }>(
  ({ className: _className, ...props }, ref) => {
    const nested = useContext(TextAncestorContext);
    return <Text {...props} accessibilityHint={nested ? 'virtual text' : 'root text'} ref={ref} />;
  },
);
class TypographyPortalModel extends NativePortalModel {
  mode: 'window' | 'inside' | 'outside' | 'inline' = 'window';
  Content = () => {
    const [count, setCount] = useState(0);
    return (
      <Typography
        component={Root}
        variant="body2"
        testID="portaled"
        ref={this.attach('text')}
        sx={{ color: 'red', direction: 'ltr', textAlign: 'left' }}
        onPress={() => setCount((value) => value + 1)}
      >
        Count {count}
      </Typography>
    );
  };
  element() {
    const Content = this.Content;
    return (
      <View ref={this.attach('app')}>
        <Typography
          component="span"
          ref={this.attach('source')}
          sx={{ direction: 'rtl', '& .MuiTypography-body2': { color: '#123456' } }}
        >
          <View ref={this.attach('inside')} />
          <TextAncestorContext.Provider value={true}>
            <Portal
              disablePortal={this.mode === 'inline'}
              container={
                this.mode === 'inside' || this.mode === 'outside'
                  ? () => this.nodes.get(this.mode)
                  : undefined
              }
            >
              <Content />
            </Portal>
          </TextAncestorContext.Provider>
        </Typography>
        <View ref={this.attach('outside')} />
      </View>
    );
  }
  async wire() {
    await act(async () => {
      const parents: Record<string, string | null> = {
        app: null,
        source: 'app',
        inside: 'source',
        outside: 'app',
        text: 'source',
      };
      for (const [id, node] of this.nodes)
        Object.defineProperty(node, 'parentNode', {
          configurable: true,
          get: () => (parents[id] ? this.nodes.get(parents[id]!) : null),
        });
      nativeStyleTree.changed();
    });
  }
}
test.each(['window', 'inside', 'outside', 'inline'] as const)(
  'Typography in a %s Portal follows physical style ownership and actual RN text ancestry',
  async (mode) => {
    const model = new TypographyPortalModel();
    model.mode = mode;
    await model.mount();
    await model.wire();
    if (mode !== 'inline') await model.layout();
    const tree = model.tree!;
    expect(tree.getByTestId('portaled')).toHaveStyle({
      color: mode === 'inside' || mode === 'inline' ? '#123456' : 'red',
    });
    expect(tree.getByTestId('portaled').props.accessibilityHint).toBe(
      mode === 'inline' ? 'virtual text' : 'root text',
    );
    // Pinned RN mirrors explicit left/right in RTL paragraphs. A virtual Text
    // belongs to its outer paragraph; the physical Portal canvas starts another.
    expect(tree.getByTestId('portaled')).toHaveStyle({
      textAlign: mode === 'inline' ? 'right' : 'left',
    });
    const instance = model.nodes.get('text');
    // Native placement leaves the logical pointerEvents=none placeholder. The
    // model delivers the event to the final Text callback, as the canvas does.
    await act(async () => tree.getByTestId('portaled').props.onPress(model.event(instance)));
    if (mode !== 'inline') await model.layout({ width: 640, height: 480 });
    expect(model.nodes.get('text')).toBe(instance);
    expect(tree.getByTestId('portaled')).toHaveTextContent('Count 1');
    tree.unmount();
    expect(nativeStyleTree.groupRulesAt(instance)).toHaveLength(0);
  },
);
