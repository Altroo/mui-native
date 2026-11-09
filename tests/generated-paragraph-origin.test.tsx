// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createRef } from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle, type ViewInstance } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import {
  createTheme,
  renderNativeTextChildren,
  type NativeTextScopeValue,
} from '../packages/system/src';
import { GENERATED_TEXT_ORIGIN_CONTRACT } from '../packages/system/src/generatedParagraphOrigin';

const theme = createTheme();
const style: TextStyle = { color: '#234567', fontSize: 17, lineHeight: 25 };
const scope: NativeTextScopeValue = {
  style,
  literalStyle: style,
  nativeText: false,
  direction: 'ltr',
};
const platformOS = Object.getOwnPropertyDescriptor(Platform, 'OS');
if (!platformOS) throw Error('Expected the installed React Native platform descriptor');
afterEach(() => {
  cleanup();
  Object.defineProperty(Platform, 'OS', platformOS);
  jest.restoreAllMocks();
});
function Normalized({ content, appearance }: { content: React.ReactNode; appearance?: TextStyle }) {
  const selected = appearance ? { ...scope, style: appearance, literalStyle: appearance } : scope;
  return <>{renderNativeTextChildren(content, theme, selected)}</>;
}
const marker = (id: unknown) =>
  typeof id === 'string' && id.startsWith(GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix);

test('the first-party origin value is immutable and versioned', () => {
  expect(GENERATED_TEXT_ORIGIN_CONTRACT).toEqual({
    schema: 1,
    nativeIDPrefix: 'altroo:generated-paragraph:v1:',
  });
  expect(Object.isFrozen(GENERATED_TEXT_ORIGIN_CONTRACT)).toBe(true);
});
test.each(['ios', 'android'])(
  'generated mobile runs keep grouping, keys and text metrics on %s',
  (os) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    const paragraphElement = renderNativeTextChildren(
      ['A', 0, 2n, false, '', null, 'B'],
      theme,
      scope,
    );
    expect(React.isValidElement(paragraphElement)).toBe(true);
    if (!React.isValidElement(paragraphElement))
      throw Error('Expected the existing single-element return');
    expect(paragraphElement.key).toBe('native-text:0');
    const tree = render(<>{paragraphElement}</>);
    const paragraph = tree.getByText('A02B');
    expect(marker(paragraph.props.nativeID)).toBe(true);
    expect(paragraph.props.nativeID.length).toBeGreaterThan(
      GENERATED_TEXT_ORIGIN_CONTRACT.nativeIDPrefix.length,
    );
    expect(StyleSheet.flatten(paragraph.props.style)).toMatchObject(style);
    expect(tree.UNSAFE_getAllByType(Text)).toHaveLength(1);
    expect(tree.UNSAFE_queryAllByType(View)).toHaveLength(0);
  },
);
test('fragment runs have separate stable IDs across text and style updates', () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  const body = (middle: string) => [
    'first',
    <React.Fragment key="part">{middle}</React.Fragment>,
    'last',
  ];
  const tree = render(<Normalized content={body('مرحبا\nA😀\u0000B')} />);
  const before = ['first', 'مرحبا\nA😀\u0000B', 'last'].map(
    (text) => tree.getByText(text, { normalizer: (value) => value }).props.nativeID,
  );
  expect(before.every(marker)).toBe(true);
  expect(new Set(before).size).toBe(3);
  const nextStyle = { color: '#345678', fontSize: 21, lineHeight: 31 };
  tree.rerender(<Normalized content={body('changed')} appearance={nextStyle} />);
  expect(StyleSheet.flatten(tree.getByText('changed').props.style)).toMatchObject(nextStyle);
  expect(
    ['first', 'changed', 'last'].map(
      (text) => tree.getByText(text, { normalizer: (value) => value }).props.nativeID,
    ),
  ).toEqual(before);
});
test('explicit native Text and View retain caller IDs, event handlers and refs', () => {
  const ref = createRef<ViewInstance>(),
    onPress = jest.fn();
  const explicit = (
    <Text nativeID="caller-native" id="caller-id" onPress={onPress}>
      explicit
    </Text>
  );
  const view = <View nativeID="caller-view" testID="caller" ref={ref} />;
  const output = renderNativeTextChildren([explicit, view], theme, scope) as React.ReactElement[];
  expect(output[0]?.props).toMatchObject({ nativeID: 'caller-native', id: 'caller-id', onPress });
  expect(output[1]?.props).toMatchObject({ nativeID: 'caller-view', testID: 'caller', ref });
  const tree = render(<>{output}</>);
  expect(tree.getByText('explicit').props.nativeID).toBe('caller-native');
  expect(tree.getByTestId('caller').props.nativeID).toBe('caller-view');
});
test('native Text scope keeps primitive children without generating an element', () => {
  expect(renderNativeTextChildren(['plain', 3, 4n], theme, { ...scope, nativeText: true })).toEqual(
    ['plain', 3, 4n],
  );
});
test('empty runs elide the generated paragraph and a remount gets a fresh ID', () => {
  const tree = render(<Normalized content="first" />);
  const initial = tree.getByText('first').props.nativeID;
  tree.rerender(<Normalized content={['', false, null, undefined]} />);
  expect(tree.UNSAFE_queryAllByType(Text)).toHaveLength(0);
  tree.rerender(<Normalized content="restored" />);
  const restored = tree.getByText('restored').props.nativeID;
  expect(marker(restored)).toBe(true);
  expect(restored).not.toBe(initial);
});
test('independent mounted roots receive different generated IDs', () => {
  const a = render(<Normalized content="root-a" />);
  const b = render(<Normalized content="root-b" />);
  expect(a.getByText('root-a').props.nativeID).not.toBe(b.getByText('root-b').props.nativeID);
});
test('web keeps the ordinary Text host without a native origin marker', () => {
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  const tree = render(<Normalized content="web literal" />);
  expect(tree.getByText('web literal').props.nativeID).toBeUndefined();
  expect(StyleSheet.flatten(tree.getByText('web literal').props.style)).toMatchObject(style);
});

test.each([
  { nativeID: undefined, id: undefined },
  { nativeID: null, id: null },
  { nativeID: 'native', id: undefined },
  { nativeID: undefined, id: 'id' },
])('explicit own ID absence and values survive normalization: %j', (ids) => {
  // Keep a real React element identity while probing JavaScript nullish props.
  const original = React.createElement(Text, { children: 'caller' });
  let nativeReads = 0,
    idReads = 0;
  const props = Object.defineProperties(
    { ...original.props },
    {
      nativeID: {
        enumerable: true,
        get() {
          nativeReads++;
          return ids.nativeID;
        },
      },
      id: {
        enumerable: true,
        get() {
          idReads++;
          return ids.id;
        },
      },
    },
  );
  const input = { ...original, props };
  const output = renderNativeTextChildren(input, theme, scope);
  if (!React.isValidElement<Record<string, unknown>>(output)) throw Error('Expected explicit Text');
  expect(output.type).toBe(Text);
  expect(Object.hasOwn(output.props, 'nativeID')).toBe(true);
  expect(Object.hasOwn(output.props, 'id')).toBe(true);
  expect(output.props.nativeID).toBe(ids.nativeID);
  expect(output.props.id).toBe(ids.id);
  expect({ nativeReads, idReads }).toEqual({ nativeReads: 1, idReads: 1 });
});
test('StrictMode preserves the generated ID during an ordinary update', () => {
  const scene = (content: string) => (
    <React.StrictMode>
      <Normalized content={content} />
    </React.StrictMode>
  );
  const tree = render(scene('strict-first'));
  const id = tree.getByText('strict-first').props.nativeID;
  tree.rerender(scene('strict-next'));
  expect(marker(id)).toBe(true);
  expect(tree.getByText('strict-next').props.nativeID).toBe(id);
});
