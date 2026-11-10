// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { Text, type TextStyle } from 'react-native';
import { cleanup, render } from '@testing-library/react-native';
import { createTheme } from '../packages/system/src/theme';
import { styled } from '../packages/system/src/provider';
import { NativeTextScope, type NativeTextScopeValue } from '../packages/system/src/textScope';
import { normalizeTextStyle } from '../packages/system/src/nativeText';
import { cloneElement, isValidElement, type ReactElement } from 'react';
import * as provenance from '../packages/system/src/nativeTextProvenance';

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('ordinary normalization remains untracked', () => {
  const normalized = normalizeTextStyle({ fontSize: '1em' }, createTheme());
  expect(provenance.finishNativeTextProvenance(normalized, {}, {}, {}, undefined)).toBeUndefined();
});
test('tracked owned normalization keeps opaque leaves and rejects unknown frames without reading them', () => {
  const theme = createTheme();
  let reads = 0;
  const leaf = new Proxy(
    {},
    {
      get() {
        reads++;
        throw Error('opaque');
      },
      ownKeys() {
        reads++;
        throw Error('opaque');
      },
    },
  );
  Object.defineProperty(theme.typography.body1, 'fontSize', { value: leaf });
  const normalized = normalizeTextStyle(
    { fontSize: 16 },
    theme,
    provenance.trackNativeTextContext({}),
  );
  const native = {},
    literal = {};
  const frame = provenance.finishNativeTextProvenance(normalized, native, literal, {}, undefined)!;
  expect(frame.normalization.bodyFont).toBe(leaf);
  const element = <Text style={native} />;
  expect(provenance.sealNativeTextElement(element, native, frame)).toBe(element);
  expect(provenance.nativeTextElementProvenance(element)?.style).toBe(native);
  expect(provenance.nativeTextElementProvenance(leaf)).toBeUndefined();
  expect(() => provenance.sealNativeTextElement({}, {}, leaf as typeof frame)).toThrow('Untracked');
  expect(reads).toBe(0);
});
test('equivalent stable literal styles retain fresh per-element raw context and three render arguments', () => {
  const theme = createTheme();
  const makeTheme = (fontSize: string) => ({
    ...theme,
    typography: { ...theme.typography, body1: { ...theme.typography.body1, fontSize } },
  });
  const receipts: NonNullable<ReturnType<typeof provenance.nativeTextElementProvenance>>[] = [];
  const seal = provenance.sealNativeTextEmission;
  jest.spyOn(provenance, 'sealNativeTextEmission').mockImplementation((...args) => {
    const element = seal(...args),
      receipt = provenance.nativeTextElementProvenance(element);
    if (receipt) receipts.push(receipt);
    return element;
  });
  const scopes: NativeTextScopeValue[] = [],
    arity: number[] = [];
  const content = (selected: ReturnType<typeof makeTheme>) => (
    <NativeTextScope theme={selected} style={{ fontSize: 16 }} content="literal">
      {function (_style, children, scope) {
        arity.push(arguments.length);
        scopes.push(scope);
        return children;
      }}
    </NativeTextScope>
  );
  const tree = render(content(makeTheme('16px')));
  const first = receipts.at(-1)!;
  tree.rerender(content(makeTheme('1rem')));
  const last = receipts.at(-1)!;
  expect(scopes[0]).toBe(scopes.at(-1));
  expect(first.style).toBe(last.style);
  expect(first.provenance.normalization.bodyFont).toBe('16px');
  expect(last.provenance.normalization.bodyFont).toBe('1rem');
  expect(provenance.nativeTextStyleProvenance(first.style)).toBe(first.provenance);
  expect(arity.every((count) => count === 3)).toBe(true);
});
test('styled Text final handoff keeps consumer props and exact emitted style identity', () => {
  const receipts: NonNullable<ReturnType<typeof provenance.nativeTextElementProvenance>>[] = [];
  const seal = provenance.sealNativeTextElement;
  jest.spyOn(provenance, 'sealNativeTextElement').mockImplementation((...args) => {
    const element = seal(...args),
      receipt = provenance.nativeTextElementProvenance(element);
    if (receipt) receipts.push(receipt);
    return element;
  });
  const Styled = styled(Text)({ fontSize: '1.25em' });
  const tree = render(
    <Styled testID="consumer" nativeID="own-id" style={{ lineHeight: 14 }}>
      text
    </Styled>,
  );
  expect(tree.getByTestId('consumer').props.nativeID).toBe('own-id');
  expect(tree.getByText('text')).toBeTruthy();
  const receipt = receipts.at(-1)!;
  expect((receipt.style as TextStyle).lineHeight).toBe(14);
  expect(receipt.rnProcessingValidated).toBe(false);
});

test.each(['replace-equal', 'replace-different', 'mutate', 'accessor'])(
  'public callback %s style stays renderable but unsealed',
  (kind) => {
    const theme = createTheme(),
      style = normalizeTextStyle({ fontSize: '1.5em' }, theme);
    const receipts: unknown[] = [];
    const seal = provenance.sealNativeTextEmission;
    jest.spyOn(provenance, 'sealNativeTextEmission').mockImplementation((...args) => {
      const element = seal(...args),
        receipt = provenance.nativeTextElementProvenance(element);
      if (receipt) receipts.push(receipt);
      return element;
    });
    const tree = render(
      <NativeTextScope theme={theme} style={style} content="literal">
        {(_native, child) => {
          if (!isValidElement<{ style: TextStyle }>(child))
            throw Error('Expected generated element');
          if (kind === 'mutate') Object.assign(child.props.style, { fontSize: 40 });
          if (kind === 'accessor')
            Object.defineProperty(child.props.style, 'fontSize', {
              get() {
                return 40;
              },
              enumerable: true,
              configurable: true,
            });
          return kind.startsWith('replace')
            ? cloneElement(child as ReactElement<{ style: TextStyle }>, {
                style: { fontSize: kind === 'replace-equal' ? 24 : 40 },
              })
            : child;
        }}
      </NativeTextScope>,
    );
    expect(tree.getByText('literal')).toBeTruthy();
    expect(receipts).toHaveLength(0);
  },
);

test('a fresh generated child cannot borrow authority from a prior public prop', () => {
  const base = createTheme(),
    theme = (fontSize: string) => ({
      ...base,
      typography: { ...base.typography, body1: { ...base.typography.body1, fontSize } },
    });
  const receipts: unknown[] = [];
  const seal = provenance.sealNativeTextEmission;
  jest.spyOn(provenance, 'sealNativeTextEmission').mockImplementation((...args) => {
    const element = seal(...args),
      receipt = provenance.nativeTextElementProvenance(element);
    if (receipt) receipts.push(receipt);
    return element;
  });
  let phase = 0,
    oldToken: unknown;
  const node = (font: string) => (
    <NativeTextScope theme={theme(font)} style={{ fontSize: 16 }} content="literal">
      {(_style, child) => {
        if (!isValidElement<{ emission?: unknown }>(child))
          throw Error('Expected generated element');
        expect(Object.hasOwn(child.props, 'emission')).toBe(false);
        if (!phase) {
          oldToken = child.props.emission;
          return child;
        }
        return cloneElement(child, { emission: oldToken });
      }}
    </NativeTextScope>
  );
  const tree = render(node('16px'));
  expect(receipts).toHaveLength(1);
  receipts.length = 0;
  phase = 1;
  tree.rerender(node('1rem'));
  expect(receipts).toHaveLength(0);
  expect(tree.getByText('literal')).toBeTruthy();
});
test.each(['value', 'delete', 'accessor', 'enumerability'])(
  'explicit Text post-seal %s remains renderable but unsealed',
  (kind) => {
    const theme = createTheme();
    let actual: ReactElement | undefined;
    const tree = render(
      <NativeTextScope theme={theme} content={<Text style={{ fontSize: 24 }}>literal</Text>}>
        {(_style, child) => {
          if (!isValidElement<{ style: TextStyle }>(child)) throw Error('Expected Text element');
          actual = child;
          if (kind === 'value') Object.assign(child.props.style, { fontSize: 40 });
          if (kind === 'delete') Reflect.deleteProperty(child.props.style, 'fontSize');
          if (kind === 'accessor')
            Object.defineProperty(child.props.style, 'fontSize', {
              get() {
                return 40;
              },
              enumerable: true,
              configurable: true,
            });
          if (kind === 'enumerability')
            Object.defineProperty(child.props.style, 'fontSize', { value: 24, enumerable: false });
          return child;
        }}
      </NativeTextScope>,
    );
    expect(provenance.nativeTextElementProvenance(actual)).toBeUndefined();
    expect(tree.getByText('literal')).toBeTruthy();
  },
);
