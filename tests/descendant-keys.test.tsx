import React from 'react';
import { TextInput, Platform, Modal as NativeModal } from 'react-native';
import { cleanup, act, fireEvent } from '@testing-library/react-native';
import { configureDiagnostics } from '../packages/material/src';
import { getNativeFocusedView } from '@altroo/mui-native-host';
import { clearNativeFocus } from '../packages/native-host/src/nativeFocus';
import { NativeMenuOverlayModel } from './helpers/nativeMenuOverlayModel';
import { buttonKeyEvent } from '../packages/material/src/nativeButtonEvents';
let restore: () => void;
beforeEach(() => {
  jest.useFakeTimers();
  restore = configureDiagnostics(() => {});
});
afterEach(() => {
  cleanup();
  clearNativeFocus(getNativeFocusedView());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  restore();
});
async function fixture(source: 'hardware' | 'command', onInput?: (event: any) => void) {
  const trace: string[] = [],
    close = jest.fn((event, reason) =>
      trace.push(`close:${reason}:${event?.target === model.nodes.get('input')}`),
    );
  const model = new NativeMenuOverlayModel({ items: [{ id: 'a', label: 'Alpha' }] });
  model.menuProps = { onClose: close };
  model.listProps = { onKeyDown: (event) => trace.push('list:' + event.defaultPrevented) };
  model.extra = (
    <TextInput
      ref={model.attach('input')}
      testID="input"
      onKeyDown={(event) => {
        trace.push('input:' + event.nativeEvent.key);
        onInput?.(event);
      }}
    />
  );
  await model.mount();
  const send = async (key: string, extra: object = {}, up = false) => {
    const target = model.nodes.get('input'),
      event = model.event(target, key, {
        code: source === 'command' ? 'Unidentified' : key,
        muiKeySource: source,
        isEditable: true,
        ...(key === 'Escape' && source === 'hardware' ? { muiKeySequence: '1:111:10' } : {}),
        ...extra,
      });
    if (source === 'command') delete event.nativeEvent.repeat;
    await act(async () => {
      const path = model.eventPath(target);
      const kind = up ? 'KeyUp' : 'KeyDown';
      for (const node of [...path].reverse()) {
        event.currentTarget = node;
        node.props?.['on' + kind + 'Capture']?.(event);
        if (event.isPropagationStopped()) return;
      }
      for (const node of path) {
        event.currentTarget = node;
        node.props?.['on' + kind]?.(event);
        if (event.isPropagationStopped()) return;
      }
    });
    return event;
  };
  return { model, trace, close, send };
}
test.each(['hardware', 'command'] as const)(
  'raw TextInput Tab reaches Menu with the actual source target (%s)',
  async (source) => {
    const { model, trace, close, send } = await fixture(source);
    const event = await send('Tab', { shiftKey: true });
    expect(trace).toEqual(['input:Tab', 'close:tabKeyDown:true', 'list:true']);
    expect(close).toHaveBeenCalledTimes(1);
    expect(close.mock.calls[0][0].nativeEvent).toBe(event.nativeEvent);
    expect(close.mock.calls[0][0].nativeEvent.muiKeySource).toBe(source);
    expect(close.mock.calls[0][0].muiKeySource).toBe(source);
    expect(close.mock.calls[0][0].isEditable).toBe(true);
    expect(model.nodes.get('list').props.managedDescendantKeys).toEqual(['Tab']);
    expect(model.nodes.get('overlay').props.managedDescendantKeys).toEqual(['Escape']);
  },
);
test('a child key handler can stop Tab propagation before Menu dismissal', async () => {
  const { trace, close, send } = await fixture('hardware', (event) => event.stopPropagation());
  await send('Tab');
  expect(trace).toEqual(['input:Tab']);
  expect(close).not.toHaveBeenCalled();
});
test('command events do not invent a physical code or repeat bit', async () => {
  const { close, send } = await fixture('command');
  await send('Tab');
  const event = close.mock.calls[0][0];
  expect(event.code).toBe('Unidentified');
  expect(event.repeat).toBeUndefined();
});
test('inline bridged composing or canceled descendant events do not close Menu', async () => {
  const { close, send } = await fixture('hardware');
  await send('Tab', { isComposing: true });
  await send('Tab', { isCanceled: true });
  await send('Escape', { isCanceled: true });
  expect(close).not.toHaveBeenCalled();
});
test('unmarked framework events are not forwarded again by the private host', async () => {
  const { trace, close, send } = await fixture('hardware');
  await send('Tab', { muiKeySource: undefined });
  expect(trace).toEqual(['input:Tab']);
  expect(close).not.toHaveBeenCalled();
});
test('inline Escape reaches Modal with native target identity and standard callbacks', async () => {
  const { close, send } = await fixture('command');
  const event = await send('Escape');
  expect(close).toHaveBeenCalledTimes(1);
  expect(close.mock.calls[0][0]).toBe(event);
  expect(close.mock.calls[0][1]).toBe('escapeKeyDown');
});
test('closed Menu removes declared descendant ownership and ignores stale keys', async () => {
  const { model, close, send } = await fixture('hardware');
  model.menuProps = { ...model.menuProps, keepMounted: true };
  model.open = false;
  await model.update();
  expect(model.nodes.get('list').props.managedDescendantKeys).toEqual([]);
  expect(model.nodes.get('overlay').props.managedDescendantKeys).toEqual([]);
  await send('Tab');
  await send('Escape');
  expect(close).not.toHaveBeenCalled();
});
test('Android window policy retains one request-close route for descendant Escape', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware');
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  expect(model.nodes.get('overlay').props.managedDescendantKeys).toEqual(['Escape']);
  await send('Escape');
  expect(close).not.toHaveBeenCalled();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'requestClose');
  expect(close.mock.calls).toEqual([[null, 'escapeKeyDown']]);
});

test('descendant capture handlers preserve the actual child before the bubbling close', async () => {
  const { model, trace, send } = await fixture('hardware');
  model.listProps = {
    ...model.listProps,
    onKeyDownCapture: (event) =>
      trace.push('listCapture:' + (event.target === model.nodes.get('input'))),
  };
  model.extra = React.cloneElement(model.extra as React.ReactElement<any>, {
    onKeyDownCapture: () => trace.push('inputCapture'),
  });
  await model.update();
  await send('Tab');
  expect(trace).toEqual([
    'listCapture:true',
    'inputCapture',
    'input:Tab',
    'close:tabKeyDown:true',
    'list:true',
  ]);
});
test('hardware key-up reaches the child and ancestor without a second Tab close', async () => {
  const { model, trace, close, send } = await fixture('hardware');
  model.listProps = { ...model.listProps, onKeyUp: () => trace.push('listUp') };
  model.extra = React.cloneElement(model.extra as React.ReactElement<any>, {
    onKeyUp: () => trace.push('inputUp'),
  });
  await model.update();
  await send('Tab');
  await send('Tab', {}, true);
  expect(trace).toEqual(['input:Tab', 'close:tabKeyDown:true', 'list:true', 'inputUp', 'listUp']);
  expect(close).toHaveBeenCalledTimes(1);
});

test('Android window descendant Escape closes once on its owned release', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware');
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  expect(close).not.toHaveBeenCalled();
  const release = await send('Escape', {}, true);
  expect(close).toHaveBeenCalledTimes(1);
  expect(close.mock.calls[0][0]).toBe(release);
  expect(close.mock.calls[0][1]).toBe('escapeKeyDown');
  await send('Escape', {}, true);
  expect(close).toHaveBeenCalledTimes(1);
});

test('a child consuming Android Escape-down cannot dismiss its parent on key-up', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware', (event) => event.stopPropagation());
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  await send('Escape', {}, true);
  expect(close).not.toHaveBeenCalled();
});

test('a new consumed Escape-down retires an earlier unreleased parent request', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  let consume = false;
  const { model, close, send } = await fixture('hardware', (event) => {
    if (consume) event.stopPropagation();
  });
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  consume = true;
  await send('Escape');
  await send('Escape', {}, true);
  expect(close).not.toHaveBeenCalled();
});

test.each([{ isCanceled: true }, { isComposing: true }])(
  'a canceled/composing Android release retires the request without closing: %o',
  async (metadata) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const { model, close, send } = await fixture('hardware');
    model.menuProps = { ...model.menuProps, disablePortal: false };
    await model.update();
    fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
    await act(async () => {});
    await send('Escape');
    await send('Escape', metadata, true);
    await send('Escape', {}, true);
    expect(close).not.toHaveBeenCalled();
  },
);

test('a consumed repeat cannot acquire the parent after its first down was consumed', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware', (event) => {
    if (!event.nativeEvent.repeat) event.stopPropagation();
  });
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  await send('Escape', { repeat: true });
  await send('Escape', {}, true);
  expect(close).not.toHaveBeenCalled();
});

test('Escape ownership is independent across simultaneous native devices', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware', (event) => {
    if (event.nativeEvent.muiKeySequence === '2:111:20') event.stopPropagation();
  });
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  await send('Escape', { muiKeySequence: '2:111:20' });
  await send('Escape', { muiKeySequence: '2:111:20' }, true);
  expect(close).not.toHaveBeenCalled();
  await send('Escape', {}, true);
  expect(close).toHaveBeenCalledTimes(1);
});

test('a stopped key-up retires its request before a later orphan release', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware');
  model.menuProps = { ...model.menuProps, disablePortal: false };
  model.extra = React.cloneElement(model.extra as React.ReactElement<any>, {
    onKeyUp: (event: any) => event.stopPropagation(),
  });
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape');
  await send('Escape', {}, true);
  model.extra = React.cloneElement(model.extra as React.ReactElement<any>, { onKeyUp: undefined });
  await model.update();
  await send('Escape', {}, true);
  expect(close).not.toHaveBeenCalled();
});

test('older host events without a pairing token retain the independent platform close route', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { model, close, send } = await fixture('hardware');
  model.menuProps = { ...model.menuProps, disablePortal: false };
  await model.update();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'show', { nativeEvent: {} });
  await act(async () => {});
  await send('Escape', { muiKeySequence: undefined });
  await send('Escape', { muiKeySequence: undefined }, true);
  expect(close).not.toHaveBeenCalled();
  fireEvent(model.tree!.UNSAFE_getByType(NativeModal), 'requestClose');
  expect(close).toHaveBeenCalledTimes(1);
  expect(close.mock.calls[0][0]).toBeNull();
});

test('adapted keyboard events project the native sequence token without copying its event', () => {
  const source = {
    nativeEvent: { key: 'Escape', muiKeySource: 'hardware', muiKeySequence: '1:111:10' },
  };
  const adapted = buttonKeyEvent(source as any);
  expect(adapted.nativeEvent).toBe(source.nativeEvent);
  expect(adapted.muiKeySequence).toBe('1:111:10');
  source.nativeEvent.muiKeySequence = '1:111:20';
  expect(adapted.muiKeySequence).toBe('1:111:20');
  delete (source.nativeEvent as { muiKeySequence?: string }).muiKeySequence;
  expect(adapted.muiKeySequence).toBeUndefined();
});
