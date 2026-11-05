// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useContext } from 'react';
import { Text, unstable_TextAncestorContext as TextAncestorContext } from 'react-native';
import { render, cleanup } from '@testing-library/react-native';
import { NativePortalHost } from '../packages/native-host/src';
import { Portal } from '../packages/material/src';

// Observe RN's own text-host decision input. Our text-style scope is a separate
// context and cannot turn a virtual text child into a physical native text root.
function HostKind() {
  const nested = useContext(TextAncestorContext);
  return <Text testID="host-kind">{nested ? 'virtual text' : 'root text'}</Text>;
}
afterEach(cleanup);

test.each([false, true])(
  'a physical Portal canvas resets React Native text ancestry from %s',
  (sourceIsText) => {
    const tree = render(
      <TextAncestorContext.Provider value={sourceIsText}>
        <NativePortalHost revision="text-origin" presented>
          <HostKind />
        </NativePortalHost>
      </TextAncestorContext.Provider>,
    );
    expect(tree.getByTestId('host-kind')).toHaveTextContent('root text');
    // Reset context without inserting an extra native layout box or reparenting
    // the user tree in JavaScript; the installed canvas owns physical placement.
    expect(tree.toJSON()).toMatchObject({
      type: 'AltrooMUIPortalHost',
      children: [{ type: 'AltrooMUIPortalCanvas', children: [{ type: 'Text' }] }],
    });
  },
);

test('inline Portal keeps ordinary text ancestry instead of inventing a View boundary', () => {
  const tree = render(
    <TextAncestorContext.Provider value={true}>
      <Portal disablePortal>
        <HostKind />
      </Portal>
    </TextAncestorContext.Provider>,
  );
  expect(tree.getByTestId('host-kind')).toHaveTextContent('virtual text');
});
