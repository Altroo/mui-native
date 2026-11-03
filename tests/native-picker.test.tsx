import React from 'react';
import { type ViewInstance } from 'react-native';
import { render, act, cleanup } from '@testing-library/react-native';
import { NativePicker, type NativePickerProps } from '../packages/native-host/src';
afterEach(cleanup);
const options = [
  { id: 'a', label: 'Alpha', selected: true },
  { id: 'b', label: 'Beta' },
];
function setup(props: Partial<NativePickerProps> = {}) {
  let current = { open: true, options, ...props };
  const tree = render(<NativePicker testID="picker" {...current} />);
  const host = () => tree.getByTestId('picker', { includeHiddenElements: true }).props;
  return {
    tree,
    host,
    update(next: Partial<NativePickerProps>) {
      current = { ...current, ...next };
      tree.rerender(<NativePicker testID="picker" {...current} />);
    },
  };
}
function event(host: any, extra: Record<string, unknown> = {}) {
  return {
    nativeEvent: {
      sessionId: host.sessionId,
      revision: host.revision,
      optionId: 'b',
      selected: true,
      ...extra,
    },
    persist: jest.fn(),
  } as any;
}
test('host keeps actual anchor refs, hides its carrier, and initializes a native presentation session', () => {
  const ref = React.createRef<ViewInstance>();
  const tree = render(<NativePicker ref={ref} open options={options} testID="picker" />);
  const native = tree.getByTestId('picker', { includeHiddenElements: true });
  expect(ref.current).not.toBeNull();
  expect(native.props.active).toBe(true);
  expect(native.props.sessionId).toMatch(/^mui-picker-/);
  expect(native.props.pointerEvents).toBe('none');
  expect(native.props.accessibilityElementsHidden).toBe(true);
  expect(native.props.collapsable).toBe(false);
});
test('selection preserves the exact native event and persists before the caller', () => {
  let observed: any;
  const model = setup({
    onSelection: (source) => {
      expect((source.persist as jest.Mock).mock.calls).toHaveLength(1);
      observed = source;
    },
  });
  const source = event(model.host());
  act(() => model.host().onPickerSelection(source));
  expect(observed === source).toBe(true);
  expect(observed.nativeEvent.optionId).toBe('b');
});
test('equivalent option arrays keep the native model revision stable', () => {
  const model = setup(),
    revision = model.host().revision;
  model.update({ options: options.map((option) => ({ ...option })) });
  expect(model.host().revision).toBe(revision);
});
test.each(['label', 'enabled', 'selected', 'group'])(
  'an old row cannot select after its %s model changes',
  (field) => {
    const change = jest.fn(),
      model = setup({ onSelection: change });
    const callback = model.host().onPickerSelection,
      source = event(model.host());
    const next = options.map((item) =>
      item.id !== 'b'
        ? { ...item, selected: false }
        : {
            ...item,
            ...(field === 'label'
              ? { label: 'Changed' }
              : field === 'enabled'
                ? { enabled: false }
                : field === 'selected'
                  ? { selected: true }
                  : { groupId: 'g', groupLabel: 'Group' }),
          },
    );
    model.update({ options: next });
    act(() => callback(source));
    expect(change).not.toHaveBeenCalled();
  },
);
test('a new request rejects both selection and dismissal from the old presentation', () => {
  const change = jest.fn(),
    close = jest.fn(),
    model = setup({ onSelection: change, onDismiss: close });
  const old = model.host(),
    source = event(old),
    cancel = event(old, { reason: 'cancel' });
  model.update({ requestKey: 'replace' });
  expect(model.host().sessionId).not.toBe(old.sessionId);
  act(() => {
    old.onPickerSelection(source);
    old.onPickerDismiss(cancel);
  });
  expect(change).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
test('closing and reopening creates a fresh session even with the same options', () => {
  const change = jest.fn(),
    model = setup({ onSelection: change });
  const old = model.host(),
    source = event(old);
  model.update({ open: false });
  expect(model.host().active).toBe(false);
  act(() => old.onPickerSelection(source));
  model.update({ open: true });
  expect(model.host().sessionId).not.toBe(old.sessionId);
  act(() => old.onPickerSelection(source));
  expect(change).not.toHaveBeenCalled();
});
test.each([
  { optionId: 'missing' },
  { optionId: 'a', selected: true },
  { selected: false },
  { selected: 'true' },
  { revision: 'old' },
  { sessionId: 'old' },
])('invalid, unchanged or foreign selection is ignored: %p', (data) => {
  const change = jest.fn(),
    model = setup({ onSelection: change });
  act(() => model.host().onPickerSelection(event(model.host(), data)));
  expect(change).not.toHaveBeenCalled();
});
test('disabled current rows cannot activate', () => {
  const change = jest.fn(),
    model = setup({ onSelection: change, options: [{ id: 'b', label: 'Beta', enabled: false }] });
  act(() => model.host().onPickerSelection(event(model.host())));
  expect(change).not.toHaveBeenCalled();
});
test('multiple selection publishes a toggle request while authored checks stay controlled', () => {
  const change = jest.fn(),
    model = setup({ multiple: true, onSelection: change });
  act(() =>
    model.host().onPickerSelection(event(model.host(), { optionId: 'a', selected: false })),
  );
  expect(change).toHaveBeenCalledTimes(1);
  expect(model.host().options[0].selected).toBe(true);
  model.update({ options: options.map((item) => ({ ...item, selected: false })) });
  expect(model.host().options[0].selected).toBe(false);
});
test.each(['selected', 'cancel', 'done', 'background', 'unavailable'])(
  'native %s dismisses once and blocks subsequent selections',
  (reason) => {
    const change = jest.fn(),
      close = jest.fn(),
      model = setup({ onSelection: change, onDismiss: close });
    const old = model.host(),
      dismissal = event(old, { reason });
    act(() => {
      old.onPickerDismiss(dismissal);
      old.onPickerDismiss(dismissal);
      old.onPickerSelection(event(old));
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
    model.update({ title: 'Unrelated update' });
    act(() => model.host().onPickerSelection(event(model.host())));
    expect(change).not.toHaveBeenCalled();
  },
);
test('an unknown dismissal reason cannot consume the live session', () => {
  const close = jest.fn(),
    change = jest.fn(),
    model = setup({ onDismiss: close, onSelection: change });
  act(() => {
    model.host().onPickerDismiss(event(model.host(), { reason: 'invented' }));
    model.host().onPickerSelection(event(model.host()));
  });
  expect(close).not.toHaveBeenCalled();
  expect(change).toHaveBeenCalledTimes(1);
});
test('unmount rejects retained native callbacks', () => {
  const change = jest.fn(),
    close = jest.fn(),
    model = setup({ onSelection: change, onDismiss: close });
  const old = model.host(),
    source = event(old);
  model.tree.unmount();
  act(() => {
    old.onPickerSelection(source);
    old.onPickerDismiss(event(old, { reason: 'cancel' }));
  });
  expect(change).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
test.each(
  [
    [null],
    [{ id: '', label: 'Empty' }],
    [
      { id: 'same', label: 'First' },
      { id: 'same', label: 'Second' },
    ],
    [{ id: 'a', label: 12 }],
    [
      { id: 'a', label: 'A', selected: true },
      { id: 'b', label: 'B', selected: true },
    ],
    [{ id: 'a', label: 'A', groupLabel: 'Missing group id' }],
    [
      { id: 'a', label: 'A', groupId: 'g', groupLabel: 'First' },
      { id: 'b', label: 'B', groupId: 'g', groupLabel: 'Other' },
    ],
  ].map((items) => [items]),
)('invalid native option models fail before presentation: %p', (items) => {
  const silent = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() => render(<NativePicker open options={items as any} />)).toThrow(/MUI Native/);
  } finally {
    silent.mockRestore();
  }
});

test('invalid native color schemes fail in JavaScript before codegen enum conversion', () => {
  const silent = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() =>
      render(<NativePicker open options={options} colorScheme={'invalid' as any} />),
    ).toThrow(/MUI Native/);
  } finally {
    silent.mockRestore();
  }
});

test('untyped children fail before a native carrier can mount them', () => {
  const silent = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(() =>
      render(
        React.createElement(NativePicker, { open: true, options, children: 'Invalid' } as any),
      ),
    ).toThrow(/MUI Native/);
  } finally {
    silent.mockRestore();
  }
});

function phase(host: any, state: string, terminal: boolean, reason = '') {
  return {
    nativeEvent: { sessionId: host.sessionId, state, terminal, reason },
    persist: jest.fn(),
  } as any;
}
test('programmatic close retains its session until the actual native dismissal acknowledgement', () => {
  const changed = jest.fn(),
    close = jest.fn(),
    model = setup({ requestKey: 'first', onPresentationChange: changed, onDismiss: close });
  const old = model.host(),
    done = phase(old, 'dismissed', true, 'programmatic');
  model.update({ open: false });
  expect(model.host().sessionId).toBe(old.sessionId);
  act(() => {
    old.onPickerPresentation(done);
    old.onPickerPresentation(done);
  });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith(done, { requestKey: 'first' });
  expect(close).not.toHaveBeenCalled();
});
test('replaced presentation acknowledgements retain their original request context', () => {
  const changed = jest.fn(),
    selection = jest.fn(),
    model = setup({ requestKey: 'first', onPresentationChange: changed, onSelection: selection });
  const old = model.host();
  model.update({ requestKey: 'second' });
  act(() => old.onPickerPresentation(phase(old, 'dismissed', true, 'replaced')));
  expect(changed.mock.calls[0][1]).toEqual({ requestKey: 'first' });
  act(() => model.host().onPickerSelection(event(model.host())));
  expect(selection).toHaveBeenCalledTimes(1);
});
test('nonterminal configuration dismissal does not consume a still-active presentation session', () => {
  const changed = jest.fn(),
    selection = jest.fn(),
    model = setup({ onPresentationChange: changed, onSelection: selection });
  const host = model.host();
  act(() => {
    host.onPickerPresentation(phase(host, 'presented', false));
    host.onPickerPresentation(phase(host, 'dismissed', false, 'configuration'));
    host.onPickerPresentation(phase(host, 'presented', false));
    host.onPickerSelection(event(host));
  });
  expect(changed).toHaveBeenCalledTimes(3);
  expect(selection).toHaveBeenCalledTimes(1);
});
test('terminal acknowledgement rejects late presented and selection events', () => {
  const changed = jest.fn(),
    selection = jest.fn(),
    model = setup({ onPresentationChange: changed, onSelection: selection });
  const host = model.host();
  act(() => {
    host.onPickerPresentation(phase(host, 'dismissed', true, 'unavailable'));
    host.onPickerPresentation(phase(host, 'presented', false));
    host.onPickerSelection(event(host));
  });
  expect(changed).toHaveBeenCalledTimes(1);
  expect(selection).not.toHaveBeenCalled();
});
test.each([
  ['unknown', false],
  ['presented', true],
  ['dismissed', 'true'],
])('invalid presentation payloads are ignored: %s/%s', (state, terminal) => {
  const changed = jest.fn(),
    model = setup({ onPresentationChange: changed });
  act(() =>
    model.host().onPickerPresentation(phase(model.host(), state as string, terminal as boolean)),
  );
  expect(changed).not.toHaveBeenCalled();
});
test('unmounted lifecycle callbacks cannot publish', () => {
  const changed = jest.fn(),
    model = setup({ onPresentationChange: changed });
  const old = model.host();
  model.tree.unmount();
  act(() => old.onPickerPresentation(phase(old, 'dismissed', true, 'programmatic')));
  expect(changed).not.toHaveBeenCalled();
});
