import { NativeOverlayReadiness } from '../packages/material/src/nativeOverlayReadiness';
import { nativeModalManager } from '../packages/material/src/nativeModalManager';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import type { TextInputChangeEvent, TextInputInstance, ViewInstance } from 'react-native';
import type { NativeHostKeyEvent } from '@altroo/mui-native-host';
import type { NativeAutocompleteRootProps } from '@altroo/mui-native';
import {
  useNativeAutocomplete,
  type NativeAutocompleteConfiguration,
} from '../packages/material/src/useNativeAutocomplete';

const options = [
  'Option 00',
  'Option 01',
  'Option 02',
  'Option 03',
  'Option 04',
  'Option 05',
  'Option 06',
];
const nativeNode = () =>
  ({
    isConnected: true,
    nodeType: 1,
    focus: jest.fn(),
    blur: jest.fn(),
    setNativeProps: jest.fn(),
    contains: () => false,
  }) as unknown as ViewInstance;
function event(key = '', target: unknown = null) {
  let prevented = false,
    stopped = false;
  return {
    type: key ? 'keydown' : 'change',
    target,
    currentTarget: target,
    nativeEvent: {
      key,
      code: key,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      isComposing: false,
      isCanceled: false,
    },
    persist: jest.fn(),
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {
      stopped = true;
    },
    isDefaultPrevented: () => prevented,
    isPropagationStopped: () => stopped,
    get defaultPrevented() {
      return prevented;
    },
  } as unknown as NativeHostKeyEvent;
}
function model(initial: Partial<NativeAutocompleteConfiguration> = {}) {
  const hook = renderHook(
    (props: NativeAutocompleteConfiguration) => useNativeAutocomplete(props),
    { initialProps: { options, ...initial } as NativeAutocompleteConfiguration },
  );
  const input = nativeNode() as unknown as TextInputInstance;
  const ref = hook.result.current.getInputProps().ref;
  act(() => {
    if (typeof ref === 'function') ref(input);
  });
  const focus = () => act(() => hook.result.current.getInputProps().onFocus?.(event() as never));
  const key = (name: string, other: NativeAutocompleteRootProps = {}) => {
    const source = event(name, input);
    act(() => hook.result.current.getRootProps(other).onKeyDown?.(source));
    return source;
  };
  const listbox = nativeNode();
  const mountList = () =>
    act(() => {
      hook.result.current.native.filteredOptions.forEach((option, index) => {
        const ref = hook.result.current.getOptionProps({ option, index }).ref;
        if (typeof ref === 'function') ref(nativeNode());
      });
      const ref = hook.result.current.getListboxProps().ref;
      if (typeof ref === 'function' && hook.result.current.native.collection.listbox !== listbox)
        ref(listbox);
    });
  const type = (text: string) => {
    const source = event();
    Object.assign(source.nativeEvent, { text, target: 1, eventCount: 1 });
    act(() =>
      hook.result.current.getInputProps().onChange?.(source as unknown as TextInputChangeEvent),
    );
    mountList();
    return source;
  };
  const press = (index: number) => {
    const option = hook.result.current.native.filteredOptions[index],
      source = event();
    act(() => hook.result.current.getOptionProps({ option, index }).onClick?.(source as never));
    return source;
  };
  focus();
  return { ...hook, input, key, focus, mountList, type, press };
}
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test('opening key retains an unhighlighted editor, then arrows skip disabled options and Enter selects', () => {
  const change = jest.fn(),
    highlight = jest.fn(),
    close = jest.fn();
  const m = model({
    onChange: change,
    onHighlightChange: highlight,
    onClose: close,
    getOptionDisabled: (option) => option === 'Option 01',
  });
  expect(m.key('ArrowDown').defaultPrevented).toBe(true);
  expect(m.result.current.popupOpen).toBe(true);
  m.mountList();
  expect(m.result.current.native.highlightedIndex).toBe(-1);
  m.key('ArrowDown');
  expect(m.result.current.native.highlightedIndex).toBe(0);
  m.key('ArrowDown');
  expect(m.result.current.native.highlightedIndex).toBe(2);
  const source = m.key('Enter');
  expect(change.mock.calls[0].slice(1)).toEqual([
    'Option 02',
    'selectOption',
    { option: 'Option 02' },
  ]);
  expect(change.mock.calls[0][0].nativeEvent).toBe(source.nativeEvent);
  expect(m.result.current.value).toBe('Option 02');
  expect(m.result.current.inputValue).toBe('Option 02');
  expect(m.result.current.popupOpen).toBe(false);
  expect(close.mock.calls[0][1]).toBe('selectOption');
  expect(highlight.mock.calls.map((call) => call[2])).toEqual(['keyboard', 'keyboard']);
});
test('Page/Home/End and wrapping use the original five-option page step', () => {
  const m = model({ open: true });
  m.mountList();
  m.key('Home');
  expect(m.result.current.native.highlightedIndex).toBe(0);
  m.key('PageDown');
  expect(m.result.current.native.highlightedIndex).toBe(5);
  m.key('PageDown');
  expect(m.result.current.native.highlightedIndex).toBe(6);
  m.key('ArrowDown');
  expect(m.result.current.native.highlightedIndex).toBe(0);
  m.key('End');
  m.key('PageUp');
  expect(m.result.current.native.highlightedIndex).toBe(1);
});
test('input inclusion and no-wrap preserve distinct navigation bounds', () => {
  const m = model({ open: true, includeInputInList: true, disableListWrap: true });
  m.mountList();
  m.key('End');
  m.key('ArrowDown');
  expect(m.result.current.native.highlightedIndex).toBe(-1);
  m.key('ArrowUp');
  expect(m.result.current.native.highlightedIndex).toBe(6);
  m.key('ArrowUp');
  expect(m.result.current.native.highlightedIndex).toBe(5);
});
test('caller cancellation uses defaultMuiPrevented and keeps native event provenance', () => {
  const m = model({ open: true });
  m.mountList();
  let received: unknown;
  const source = m.key('ArrowDown', {
    onKeyDown: (event: any) => {
      received = event.nativeEvent;
      event.defaultMuiPrevented = true;
    },
  } as never);
  expect(received).toBe(source.nativeEvent);
  expect(source.defaultPrevented).toBe(false);
  expect(m.result.current.native.highlightedIndex).toBe(-1);
});
test('active composition and canceled native keys do not move highlight', () => {
  const m = model({ open: true });
  m.mountList();
  for (const flag of ['isComposing', 'isCanceled']) {
    const source = event('ArrowDown', m.input);
    Object.assign(source.nativeEvent, { [flag]: true });
    act(() => m.result.current.getRootProps().onKeyDown?.(source));
    expect(m.result.current.native.highlightedIndex).toBe(-1);
  }
});
test('mapped multiple values toggle without mutating caller arrays and details expose options', () => {
  const city = { id: 1, label: 'Rabat' },
    original: number[] = [],
    change = jest.fn();
  const m = model({
    options: [city],
    getOptionValue: (option) => option.id,
    multiple: true,
    defaultValue: original,
    open: true,
    disableCloseOnSelect: true,
    onChange: change,
  });
  m.mountList();
  m.press(0);
  expect(m.result.current.value).toEqual([1]);
  expect(original).toEqual([]);
  expect(change.mock.calls[0].slice(1)).toEqual([[1], 'selectOption', { option: city }]);
  m.press(0);
  expect(m.result.current.value).toEqual([]);
  expect(change.mock.calls[1].slice(1)).toEqual([[], 'removeOption', { option: city }]);
});
test('controlled value/open request changes while authored state remains authoritative', () => {
  const change = jest.fn(),
    close = jest.fn();
  const m = model({ value: 'Option 00', open: true, onChange: change, onClose: close });
  m.mountList();
  m.press(2);
  expect(m.result.current.value).toBe('Option 00');
  expect(m.result.current.popupOpen).toBe(true);
  expect(change.mock.calls[0][1]).toBe('Option 02');
  expect(close.mock.calls[0][1]).toBe('selectOption');
});
test('typed free-solo text wins over an incidental auto-highlight on hardware Enter', () => {
  const change = jest.fn(),
    m = model({ freeSolo: true, autoHighlight: true, onChange: change });
  m.type('Option');
  expect(m.result.current.native.highlightedIndex).toBe(0);
  m.key('Enter');
  expect(change.mock.calls[0].slice(1)).toEqual(['Option', 'createOption', { option: 'Option' }]);
});
test('software submission applies the same free-solo/programmatic-highlight decision', () => {
  const change = jest.fn(),
    m = model({ freeSolo: true, autoHighlight: true, onChange: change });
  m.type('Option');
  act(() => m.result.current.getInputProps().onSubmitEditing?.(event() as never));
  expect(change.mock.calls[0].slice(1)).toEqual(['Option', 'createOption', { option: 'Option' }]);
});
test('a touch-scroll invalidates incidental highlight until deliberate keyboard navigation', () => {
  const change = jest.fn(),
    close = jest.fn(),
    m = model({ open: true, onChange: change, onClose: close });
  m.mountList();
  const props = m.result.current.getOptionProps({ option: options[0], index: 0 });
  act(() => props.onTouchStart?.(event() as never));
  act(() =>
    m.result.current.getListboxProps().onScroll?.({
      nativeEvent: {
        contentOffset: { y: 30 },
        layoutMeasurement: { height: 100 },
        contentSize: { height: 400 },
      },
    } as never),
  );
  m.key('Enter');
  expect(change).not.toHaveBeenCalled();
  expect(close.mock.calls[0][1]).toBe('escape');
});
test('async option resolution fills untouched mapped input but never replaces a draft', () => {
  const change = jest.fn(),
    mapper = (option: any) => option.id;
  const m = model({ options: [], value: 1, getOptionValue: mapper, onInputChange: change });
  const city = { id: 1, label: 'Rabat' };
  m.rerender({ options: [city], value: 1, getOptionValue: mapper, onInputChange: change });
  expect(m.result.current.inputValue).toBe('Rabat');
  expect(change.mock.calls.at(-1)).toEqual([null, 'Rabat', 'reset']);
  m.type('Cas');
  m.rerender({
    options: [city, { id: 2, label: 'Casablanca' }],
    value: 1,
    getOptionValue: mapper,
    onInputChange: change,
  });
  expect(m.result.current.inputValue).toBe('Cas');
});
test('async reordering preserves deliberate highlight without duplicate highlight callback', () => {
  const highlight = jest.fn(),
    m = model({ open: true, onHighlightChange: highlight });
  m.mountList();
  m.key('ArrowDown');
  m.key('ArrowDown');
  expect(m.result.current.native.highlightedIndex).toBe(1);
  const count = highlight.mock.calls.length;
  m.rerender({
    options: [options[1], options[0], ...options.slice(2)],
    open: true,
    onHighlightChange: highlight,
  });
  m.mountList();
  expect(m.result.current.native.highlightedIndex).toBe(0);
  expect(highlight).toHaveBeenCalledTimes(count);
});
test('native input and anchor ref cleanup cannot retire a replacement node', () => {
  const m = model(),
    next = nativeNode() as unknown as TextInputInstance;
  const ref = m.result.current.getInputProps().ref;
  let oldRelease: unknown;
  act(() => {
    if (typeof ref === 'function') oldRelease = ref(m.input);
  });
  act(() => {
    if (typeof ref === 'function') ref(next);
  });
  act(() => {
    if (typeof oldRelease === 'function') oldRelease();
  });
  expect(m.result.current.native.collection.input).toBe(next);
  const oldAnchor = nativeNode(),
    newAnchor = nativeNode();
  let release: unknown;
  act(() => {
    release = m.result.current.setAnchorEl(oldAnchor);
  });
  act(() => {
    m.result.current.setAnchorEl(newAnchor);
  });
  act(() => {
    if (typeof release === 'function') release();
  });
  expect(m.result.current.anchorEl).toBe(newAnchor);
});

test('same mapped ID resolves updated labels only while the editor has no draft focus', async () => {
  const mapper = (option: any) => option.id;
  const m = model({ options: [{ id: 1, label: 'Old' }], getOptionValue: mapper, value: 1 });
  expect(m.result.current.inputValue).toBe('Old');
  await act(async () => m.result.current.getInputProps().onBlur?.(event() as never));
  expect(m.result.current.focused).toBe(false);
  m.rerender({ options: [{ id: 1, label: 'New' }], getOptionValue: mapper, value: 1 });
  expect(m.result.current.inputValue).toBe('New');
  m.focus();
  m.type('Draft');
  m.rerender({ options: [{ id: 1, label: 'Latest' }], getOptionValue: mapper, value: 1 });
  expect(m.result.current.inputValue).toBe('Draft');
});
test('virtual highlight navigation does not repeat unchanged filtering or grouping', () => {
  const filterOptions = jest.fn((items: any[]) => items),
    groupBy = jest.fn(() => 'Group');
  const m = model({ open: true, filterOptions, groupBy });
  m.mountList();
  const filtered = filterOptions.mock.calls.length,
    grouped = groupBy.mock.calls.length;
  m.key('ArrowDown');
  m.key('ArrowDown');
  m.key('ArrowUp');
  expect(filterOptions).toHaveBeenCalledTimes(filtered);
  expect(groupBy).toHaveBeenCalledTimes(grouped);
});

test('retained option handlers cannot act after close or async row replacement', () => {
  const change = jest.fn(),
    highlight = jest.fn();
  const m = model({ open: true, onChange: change, onHighlightChange: highlight });
  m.mountList();
  const old = m.result.current.getOptionProps({ option: options[0], index: 0 });
  m.rerender({ options, open: false, onChange: change, onHighlightChange: highlight });
  act(() => {
    old.onClick?.(event() as never);
    old.onHoverIn?.(event() as never);
    old.onTouchStart?.(event() as never);
  });
  expect(change).not.toHaveBeenCalled();
  expect(highlight).not.toHaveBeenCalled();
  m.rerender({
    options: ['Replacement'],
    open: true,
    onChange: change,
    onHighlightChange: highlight,
  });
  m.mountList();
  act(() => old.onClick?.(event() as never));
  expect(change).not.toHaveBeenCalled();
});

test('nested editable item releases cannot delete the selected item', () => {
  const change = jest.fn(),
    m = model({ multiple: true, defaultValue: ['Option 00'], onChange: change });
  const item = m.result.current.getItemProps({ index: 0 }),
    source = event('Backspace');
  Object.assign(source, { target: nativeNode(), currentTarget: nativeNode() });
  act(() => item.onKeyUp?.(source as never));
  expect(change).not.toHaveBeenCalled();
  expect(m.result.current.value).toEqual(['Option 00']);
});
test('closed overlay ignores pending submit, item deletion and focus restoration', async () => {
  let ready = true;
  const change = jest.fn(),
    input = nativeNode() as unknown as TextInputInstance;
  const hook = renderHook(
    () =>
      useNativeAutocomplete({
        options,
        freeSolo: true,
        multiple: true,
        defaultValue: ['Option 00'],
        inputValue: 'Draft',
        autoSelect: true,
        onChange: change,
      }),
    {
      wrapper: ({ children }) => (
        <NativeOverlayReadiness.Provider value={ready}>{children}</NativeOverlayReadiness.Provider>
      ),
    },
  );
  act(() => {
    const ref = hook.result.current.getInputProps().ref;
    if (typeof ref === 'function') ref(input);
  });
  const submit = hook.result.current.getInputProps().onSubmitEditing!,
    item = hook.result.current.getItemProps({ index: 0 });
  ready = false;
  hook.rerender({});
  await act(async () => {
    submit(event() as never);
    item.onKeyUp?.(event('Backspace') as never);
    hook.result.current.getInputProps().onBlur?.(event() as never);
  });
  expect(change).not.toHaveBeenCalled();
  expect(input.focus).not.toHaveBeenCalled();
});
test('a newly covering modal blocks retained headless interactions without a hook rerender', () => {
  const change = jest.fn(),
    m = model({ open: true, onChange: change });
  m.mountList();
  const click = m.result.current.getOptionProps({ option: options[0], index: 0 }).onClick!;
  const modal = {
    id: Symbol(),
    host: Symbol(),
    open: true,
    restore: false,
    contains: () => false,
    focus: jest.fn(),
    escape: jest.fn(),
  };
  nativeModalManager.add(modal);
  try {
    act(() => click(event() as never));
    expect(change).not.toHaveBeenCalled();
  } finally {
    nativeModalManager.remove(modal);
  }
});
test('native selectTextOnFocus follows the source selection policy', () => {
  const m = model({ defaultValue: 'Option 00' });
  expect(m.result.current.getInputProps().selectTextOnFocus).toBe(true);
  m.rerender({ options, defaultValue: 'Option 00', selectOnFocus: false });
  expect(m.result.current.getInputProps().selectTextOnFocus).toBe(false);
});

test.each(['disabled', 'readOnly'] as const)(
  'retained clear/toggle actions cannot focus an editor after %s becomes true',
  (lock) => {
    const change = jest.fn(),
      m = model({ defaultValue: options[0], onChange: change });
    const clear = m.result.current.getClearProps().onClick!,
      toggle = m.result.current.getPopupIndicatorProps().onClick!;
    m.rerender({ options, defaultValue: options[0], [lock]: true, onChange: change });
    act(() => {
      clear(event() as never);
      toggle(event() as never);
    });
    expect(change).not.toHaveBeenCalled();
    expect(m.input.focus).not.toHaveBeenCalled();
    expect(m.result.current.value).toBe(options[0]);
  },
);

test.each([false, true])(
  'batched text and Enter commit the latest uncontrolled draft (multiple=%s)',
  (multiple) => {
    const change = jest.fn(),
      m = model({ freeSolo: true, multiple, onChange: change });
    const input = event();
    Object.assign(input.nativeEvent, { text: 'New city', target: 1, eventCount: 1 });
    const enter = event('Enter', m.input);
    act(() => {
      m.result.current.getInputProps().onChange?.(input as unknown as TextInputChangeEvent);
      m.result.current.getRootProps().onKeyDown?.(enter);
    });
    expect(change.mock.calls[0]?.slice(1)).toEqual([
      multiple ? ['New city'] : 'New city',
      'createOption',
      { option: 'New city' },
    ]);
    expect(m.result.current.inputValue).toBe(multiple ? '' : 'New city');
    m.key('Enter');
    expect(change).toHaveBeenCalledTimes(1);
  },
);

test('an authored input value remains authoritative within a native event group', () => {
  const change = jest.fn(),
    m = model({ freeSolo: true, inputValue: 'Locked', onChange: change });
  const source = event();
  Object.assign(source.nativeEvent, { text: 'Unaccepted draft' });
  act(() => {
    m.result.current.getInputProps().onChange?.(source as unknown as TextInputChangeEvent);
    m.result.current.getRootProps().onKeyDown?.(event('Enter', m.input));
  });
  expect(change.mock.calls[0][1]).toBe('Locked');
  expect(m.result.current.inputValue).toBe('Locked');
});
test('software submit uses complete native text and respects a deleted draft', () => {
  const change = jest.fn(),
    m = model({ freeSolo: true, onChange: change });
  m.type('New cit');
  const source = event();
  Object.assign(source.nativeEvent, { text: 'New city' });
  act(() => m.result.current.getInputProps().onSubmitEditing?.(source as never));
  expect(change.mock.calls[0][1]).toBe('New city');
  change.mockClear();
  Object.assign(source.nativeEvent, { text: '' });
  act(() => m.result.current.getInputProps().onSubmitEditing?.(source as never));
  expect(change).not.toHaveBeenCalled();
});

test('batched typing then deletion cannot create a stale free-solo draft', () => {
  const change = jest.fn(),
    m = model({ freeSolo: true, onChange: change });
  act(() => {
    for (const text of ['A', '']) {
      const source = event();
      Object.assign(source.nativeEvent, { text });
      m.result.current.getInputProps().onChange?.(source as unknown as TextInputChangeEvent);
    }
    m.result.current.getRootProps().onKeyDown?.(event('Enter', m.input));
  });
  expect(change).not.toHaveBeenCalled();
  expect(m.result.current.inputValue).toBe('');
});
test.each([false, true])(
  'two batched free-solo commits preserve selected-value authority (controlled=%s)',
  (controlled) => {
    const change = jest.fn(),
      m = model({
        freeSolo: true,
        multiple: true,
        ...(controlled ? { value: [] } : {}),
        onChange: change,
      });
    act(() => {
      for (const text of ['A', 'B']) {
        const source = event();
        Object.assign(source.nativeEvent, { text });
        m.result.current.getInputProps().onChange?.(source as unknown as TextInputChangeEvent);
        m.result.current.getRootProps().onKeyDown?.(event('Enter', m.input));
      }
    });
    expect(change.mock.calls.map((call) => call[1])).toEqual(
      controlled ? [['A'], ['B']] : [['A'], ['A', 'B']],
    );
    expect(m.result.current.value).toEqual(controlled ? [] : ['A', 'B']);
    expect(m.result.current.inputValue).toBe('');
  },
);

test('raw free-solo creation never resolves a null selection as an option', () => {
  const getOptionLabel = jest.fn((option: string | { label: string }) =>
    typeof option === 'string' ? option : option.label,
  );
  const change = jest.fn(),
    m = model({ options: [{ label: 'Rabat' }], freeSolo: true, getOptionLabel, onChange: change });
  m.type('New city');
  m.key('Enter');
  expect(change.mock.calls[0][1]).toBe('New city');
  expect(getOptionLabel.mock.calls.every(([option]) => option !== null)).toBe(true);
});
test('batched local close retires option handlers before the next React commit', () => {
  const change = jest.fn(),
    close = jest.fn(),
    m = model({ defaultValue: null, onChange: change, onClose: close });
  act(() => m.result.current.getInputProps().onPressIn?.(event() as never));
  m.mountList();
  const row = m.result.current.getOptionProps({ option: options[0], index: 0 });
  act(() => {
    m.result.current.getRootProps().onKeyDown?.(event('Escape', m.input));
    row.onClick?.(event() as never);
    m.result.current.getRootProps().onKeyDown?.(event('Escape', m.input));
  });
  expect(change).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
});

test.each([false, true])(
  'batched indicator toggles preserve open authority (controlled=%s)',
  (controlled) => {
    const open = jest.fn(),
      close = jest.fn(),
      m = model({ ...(controlled ? { open: false } : {}), onOpen: open, onClose: close });
    act(() => {
      m.result.current.getPopupIndicatorProps().onClick?.(event() as never);
      m.result.current.getPopupIndicatorProps().onClick?.(event() as never);
    });
    expect(open).toHaveBeenCalledTimes(controlled ? 2 : 1);
    expect(close).toHaveBeenCalledTimes(controlled ? 0 : 1);
    expect(m.result.current.popupOpen).toBe(false);
  },
);
test('batched generated mapped selections retain every accepted option label', () => {
  const generated = [
    { id: 1, label: 'Generated A' },
    { id: 2, label: 'Generated B' },
  ];
  const m = model({
    options: [],
    open: true,
    multiple: true,
    disableCloseOnSelect: true,
    getOptionValue: (option: { id: number }) => option.id,
    getOptionLabel: (option: { label: string }) => option.label,
    filterOptions: () => generated,
  });
  m.mountList();
  const rows = generated.map((option, index) => m.result.current.getOptionProps({ option, index }));
  act(() => rows.forEach((row) => row.onClick?.(event() as never)));
  expect(m.result.current.value).toEqual([1, 2]);
  expect(m.result.current.getOptionFromValue(1)).toEqual({ option: generated[0] });
  expect(m.result.current.getOptionFromValue(2)).toEqual({ option: generated[1] });
});

test('batched presses of a nonempty input observe the current local popup state', () => {
  const open = jest.fn(),
    close = jest.fn(),
    m = model({ onOpen: open, onClose: close });
  m.type('Option');
  m.key('Escape');
  open.mockClear();
  close.mockClear();
  act(() => {
    m.result.current.getInputProps().onPressIn?.(event() as never);
    m.result.current.getInputProps().onPressIn?.(event() as never);
  });
  expect(open).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  expect(m.result.current.popupOpen).toBe(true);
  open.mockClear();
  act(() => {
    m.result.current.getRootProps().onKeyDown?.(event('Escape', m.input));
    m.result.current.getInputProps().onPressIn?.(event() as never);
  });
  expect(close).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledTimes(1);
  expect(m.result.current.popupOpen).toBe(true);
});

describe('selected-item caret navigation', () => {
  function tags(props: Partial<NativeAutocompleteConfiguration> = {}) {
    const close = jest.fn();
    const m = model({
      multiple: true,
      defaultValue: options.slice(0, 3),
      open: true,
      onClose: close,
      ...props,
    });
    const items = [nativeNode(), nativeNode(), nativeNode()];
    act(() =>
      items.forEach((node, index) => {
        const ref = m.result.current.getItemProps({ index }).ref;
        if (typeof ref === 'function') ref(node);
      }),
    );
    return { ...m, items, close };
  }
  test('Left enters the last item, closes suggestions and clamps at the first item', () => {
    const m = tags();
    m.key('ArrowLeft');
    expect(m.result.current.focusedItem).toBe(2);
    expect(m.items[2].focus).toHaveBeenCalledTimes(1);
    expect(m.close.mock.calls[0][1]).toBe('toggleInput');
    for (const index of [1, 0, 0]) {
      m.key('ArrowLeft');
      expect(m.result.current.focusedItem).toBe(index);
    }
    for (const index of [1, 2, -1]) {
      m.key('ArrowRight');
      expect(m.result.current.focusedItem).toBe(index);
    }
    expect(m.input.focus).toHaveBeenCalled();
  });
  test('a free-solo draft at caret start resets before entering the last selected item', () => {
    const inputChange = jest.fn(),
      m = tags({ freeSolo: true, onInputChange: inputChange });
    m.type('Draft');
    m.key('ArrowLeft');
    expect(m.result.current.focusedItem).toBe(2);
    expect(m.result.current.inputValue).toBe('');
    expect(inputChange.mock.calls.at(-1)?.slice(1)).toEqual(['', 'reset']);
  });
  test.each([
    { start: 2, end: 2 },
    { start: 0, end: 2 },
  ])('unbridged Left respects the observed selection %o', (selection) => {
    const m = tags();
    act(() =>
      m.result.current.getInputProps().onSelectionChange?.({ nativeEvent: { selection } } as never),
    );
    m.key('ArrowLeft');
    expect(m.result.current.focusedItem).toBe(-1);
    expect(m.items.every((item) => !(item.focus as jest.Mock).mock.calls.length)).toBe(true);
  });
  test('a native boundary receipt supersedes an older JS selection observation', () => {
    const m = tags();
    act(() =>
      m.result.current
        .getInputProps()
        .onSelectionChange?.({ nativeEvent: { selection: { start: 2, end: 2 } } } as never),
    );
    const source = event('ArrowLeft', m.input);
    Object.assign(source.nativeEvent, { muiKeySource: 'hardware', isEditable: true });
    act(() => m.result.current.getRootProps().onKeyDown?.(source));
    expect(m.result.current.focusedItem).toBe(2);
  });
  test('rapid native keys in one React batch use the preceding focus request', () => {
    const m = tags();
    act(() => {
      const key = m.result.current.getRootProps().onKeyDown!;
      key(event('ArrowLeft', m.input));
      key(event('ArrowLeft', m.items[2]));
      key(event('ArrowLeft', m.items[1]));
    });
    expect(m.result.current.focusedItem).toBe(0);
    expect(m.items.map((item) => (item.focus as jest.Mock).mock.calls.length)).toEqual([1, 1, 1]);
  });
  test('an input-focus receipt in a key batch retires the preceding tag focus request', () => {
    const m = tags();
    act(() => {
      const key = m.result.current.getRootProps().onKeyDown!;
      key(event('ArrowLeft', m.input));
      m.result.current.getInputProps().onFocus?.(event() as never);
      key(event('ArrowLeft', m.input));
    });
    expect(m.result.current.focusedItem).toBe(2);
    expect(m.items[2].focus).toHaveBeenCalledTimes(2);
    expect(m.items[1].focus).not.toHaveBeenCalled();
  });
  test.each(['ArrowDown', 'Enter'])(
    'a batched Left then %s restores editor focus before the next action',
    (name) => {
      const m = tags();
      m.mountList();
      act(() => {
        const key = m.result.current.getRootProps().onKeyDown!;
        key(event('ArrowLeft', m.input));
        key(event(name, m.items[2]));
      });
      expect(m.items[2].focus).toHaveBeenCalledTimes(1);
      expect(m.input.focus).toHaveBeenCalledTimes(1);
      expect(m.result.current.focusedItem).toBe(-1);
    },
  );
  test('only available selected items participate and empty selections declare no editor Left', () => {
    const m = tags();
    act(() => {
      const ref = m.result.current.getItemProps({ index: 1, disabled: true }).ref;
      if (typeof ref === 'function') ref(m.items[1]);
    });
    m.key('ArrowLeft');
    m.key('ArrowLeft');
    expect(m.result.current.focusedItem).toBe(0);
    m.key('ArrowRight');
    expect(m.result.current.focusedItem).toBe(2);
    expect(m.result.current.getRootProps().managedDescendantKeys).toContain('ArrowLeft');
    const empty = model({ multiple: true, defaultValue: [] });
    expect(empty.result.current.getRootProps().managedDescendantKeys).not.toContain('ArrowLeft');
  });
});

describe('native empty-editor Backspace', () => {
  test.each(['hardware', 'command'] as const)(
    'uses the native empty boundary despite an older draft (%s)',
    (source) => {
      const change = jest.fn();
      const m = model({
        multiple: true,
        defaultValue: options.slice(0, 2),
        inputValue: 'older draft',
        onChange: change,
      });
      expect(m.result.current.getRootProps().managedDescendantKeys).toContain('Backspace');
      const receipt = event('Backspace', m.input);
      Object.assign(receipt.nativeEvent, { muiKeySource: source, isEditable: true });
      act(() => m.result.current.getRootProps().onKeyDown?.(receipt));
      expect(m.result.current.value).toEqual([options[0]]);
      expect(change).toHaveBeenCalledTimes(1);
      expect(change.mock.calls[0].slice(1)).toEqual([
        [options[0]],
        'removeOption',
        { option: options[1] },
      ]);
    },
  );
  test.each([
    { muiKeySource: undefined, isEditable: true },
    { muiKeySource: 'hardware', isEditable: false },
    { muiKeySource: 'hardware', isEditable: true, isComposing: true },
    { muiKeySource: 'hardware', isEditable: true, isCanceled: true },
  ])('ordinary or invalid receipts retain the nonempty draft and values (%o)', (metadata) => {
    const change = jest.fn();
    const m = model({
      multiple: true,
      defaultValue: options.slice(0, 2),
      inputValue: 'draft',
      onChange: change,
    });
    const receipt = event('Backspace', m.input);
    Object.assign(receipt.nativeEvent, metadata);
    act(() => m.result.current.getRootProps().onKeyDown?.(receipt));
    expect(change).not.toHaveBeenCalled();
    expect(m.result.current.value).toEqual(options.slice(0, 2));
  });
  test.each([{ disabled: true }, { readOnly: true }, { defaultValue: [] }])(
    'does not declare deletion without an editable selection (%o)',
    (props) => {
      const m = model({ multiple: true, defaultValue: options.slice(0, 2), ...props });
      expect(m.result.current.getRootProps().managedDescendantKeys).not.toContain('Backspace');
    },
  );
  test('successive native downs use the updated value and stop after the final item', () => {
    const change = jest.fn();
    const m = model({ multiple: true, defaultValue: options.slice(0, 2), onChange: change });
    act(() => {
      for (let index = 0; index < 3; index++) {
        const receipt = event('Backspace', m.input);
        Object.assign(receipt.nativeEvent, { muiKeySource: 'hardware', isEditable: true });
        m.result.current.getRootProps().onKeyDown?.(receipt);
      }
    });
    expect(m.result.current.value).toEqual([]);
    expect(change).toHaveBeenCalledTimes(2);
    expect(m.result.current.getRootProps().managedDescendantKeys).not.toContain('Backspace');
  });
});
