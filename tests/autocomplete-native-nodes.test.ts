import type { ViewInstance, ScrollViewInstance } from 'react-native';
import { NativeAutocompleteNodes } from '../packages/material/src/autocompleteNativeNodes';
const node = (extra: object = {}) =>
  ({ isConnected: true, focus: jest.fn(), ...extra }) as unknown as ViewInstance;
function bind(
  nodes: NativeAutocompleteNodes,
  kind: 'item' | 'option',
  index: number,
  view: ViewInstance,
  disabled = false,
) {
  return nodes.bind(kind, index, disabled)(view) as () => void;
}

test('retired callback cleanup cannot remove a replacement row binding', () => {
  const nodes = new NativeAutocompleteNodes(),
    old = node(),
    next = node();
  const releaseOld = bind(nodes, 'item', 0, old);
  const replacement = nodes.bind('item', 0, true);
  const releaseNext = replacement(next) as () => void;
  releaseOld();
  nodes.focusItem(0);
  expect(next.focus).not.toHaveBeenCalled();
  releaseNext();
  bind(nodes, 'item', 0, next);
  releaseOld();
  nodes.focusItem(0);
  expect(next.focus).toHaveBeenCalledTimes(1);
  expect(old.focus).not.toHaveBeenCalled();
});

test('disconnected/disabled items never receive focus and disabled option focus is explicit', () => {
  const nodes = new NativeAutocompleteNodes(),
    dead = node({ isConnected: false }),
    disabled = node();
  bind(nodes, 'item', 0, dead);
  bind(nodes, 'item', 1, disabled, true);
  nodes.focusItem(0);
  nodes.focusItem(1);
  expect(dead.focus).not.toHaveBeenCalled();
  expect(disabled.focus).not.toHaveBeenCalled();
  bind(nodes, 'option', 0, disabled, true);
  expect(nodes.isOptionAvailable(0, false)).toBe(false);
  expect(nodes.isOptionAvailable(0, true)).toBe(true);
  expect(nodes.isOptionAvailable(1, true)).toBe(false);
});

function scrollModel() {
  const nodes = new NativeAutocompleteNodes(),
    scrollTo = jest.fn();
  const content = node();
  nodes.listbox = node({
    scrollTo,
    getInnerViewRef: () => content,
  }) as unknown as ScrollViewInstance;
  nodes.updateScroll(0, 100, 400);
  const callbacks: Array<(x: number, y: number, width: number, height: number) => void> = [];
  const measureLayout = jest.fn((_content, callback) => callbacks.push(callback));
  return { nodes, scrollTo, callbacks, measureLayout };
}
test('a late native layout reply cannot scroll a newer highlighted option', () => {
  const { nodes, callbacks, measureLayout, scrollTo } = scrollModel();
  bind(nodes, 'option', 0, node({ measureLayout }));
  bind(nodes, 'option', 1, node({ measureLayout }));
  nodes.scrollHighlight(0, 'keyboard', false, false);
  nodes.scrollHighlight(1, 'keyboard', false, false);
  callbacks[0](0, 250, 50, 20);
  expect(scrollTo).not.toHaveBeenCalled();
  callbacks[1](0, 180, 50, 40);
  expect(scrollTo).toHaveBeenCalledWith({ y: 120, animated: false });
});
test('closing or replacing a row invalidates an outstanding native scroll reply', () => {
  const { nodes, callbacks, measureLayout, scrollTo } = scrollModel();
  const release = bind(nodes, 'option', 0, node({ measureLayout }));
  nodes.scrollHighlight(0, 'keyboard', false, false);
  release();
  bind(nodes, 'option', 0, node());
  callbacks[0](0, 250, 50, 20);
  expect(scrollTo).not.toHaveBeenCalled();
  nodes.scrollHighlight(-1, null, true, false);
  nodes.dispose();
  callbacks[0](0, 250, 50, 20);
  expect(scrollTo).not.toHaveBeenCalled();
});
test('native scrolling preserves touch position and includes grouped context for keyboard navigation', () => {
  const { nodes, callbacks, measureLayout, scrollTo } = scrollModel();
  bind(nodes, 'option', 0, node({ measureLayout }));
  nodes.updateScroll(150, 100, 600);
  nodes.setGroups([{ index: 0, key: 'Group' }]);
  nodes.updateGroupHeight(0, 26);
  nodes.scrollHighlight(0, 'touch', false, true);
  expect(measureLayout).not.toHaveBeenCalled();
  nodes.scrollHighlight(0, 'keyboard', false, true);
  callbacks[0](0, 160, 50, 20);
  expect(scrollTo).toHaveBeenCalledWith({ y: 134, animated: false });
  nodes.scrollHighlight(-1, null, true, false);
  expect(scrollTo).toHaveBeenCalledTimes(1);
  nodes.scrollHighlight(-1, null, false, false);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
});

test('keyboard visibility uses actual scaled sticky header height and drops retired groups', () => {
  const { nodes, callbacks, measureLayout, scrollTo } = scrollModel();
  bind(nodes, 'option', 3, node({ measureLayout }));
  nodes.setGroups([
    { index: 0, key: 'A' },
    { index: 3, key: 'B' },
  ]);
  nodes.updateGroupHeight(0, 26);
  nodes.updateGroupHeight(3, 52);
  nodes.updateScroll(150, 100, 600);
  nodes.scrollHighlight(3, 'keyboard', false, true);
  callbacks[0](0, 160, 50, 20);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 108, animated: false });
  nodes.setGroups([{ index: 0, key: 'New' }]);
  expect(nodes.updateGroupHeight(3, 52)).toBe(false);
  nodes.updateScroll(150, 100, 600);
  nodes.scrollHighlight(3, 'keyboard', false, true);
  callbacks[1](0, 160, 50, 20);
  expect(scrollTo).toHaveBeenCalledTimes(1);
});

test('adding and removing other groups preserves an unchanged header measurement', () => {
  const { nodes, callbacks, measureLayout, scrollTo } = scrollModel();
  bind(nodes, 'option', 0, node({ measureLayout }));
  nodes.setGroups([{ index: 0, key: 'A' }]);
  nodes.updateGroupHeight(0, 52);
  nodes.setGroups([
    { index: 0, key: 'A' },
    { index: 3, key: 'B' },
  ]);
  nodes.updateScroll(150, 100, 600);
  nodes.scrollHighlight(0, 'keyboard', false, true);
  callbacks[0](0, 160, 50, 20);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 108, animated: false });
  nodes.setGroups([{ index: 0, key: 'A' }]);
  nodes.updateScroll(150, 100, 600);
  nodes.scrollHighlight(0, 'keyboard', false, true);
  callbacks[1](0, 160, 50, 20);
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 108, animated: false });
});
