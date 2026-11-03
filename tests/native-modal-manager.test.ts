import {
  NativeModalManager,
  type NativeModalEntry,
} from '../packages/material/src/nativeModalManager';
function entry(parent?: symbol): NativeModalEntry {
  return {
    id: Symbol(),
    host: Symbol(),
    parent,
    open: true,
    restore: true,
    contains: () => false,
    focus: jest.fn(),
    escape: jest.fn(),
  };
}
test('child-first effects register ancestors below descendants and deduplicate registration', () => {
  const manager = new NativeModalManager();
  const parent = entry(),
    child = entry(parent.id),
    grandchild = entry(child.id);
  const listener = jest.fn();
  const stop = manager.subscribe(listener);
  manager.add(grandchild);
  manager.add(child);
  manager.add(parent);
  manager.add(parent);
  expect(manager.top()).toBe(grandchild);
  expect(manager.index(parent)).toBe(0);
  expect(manager.index(child)).toBe(1);
  expect(listener).toHaveBeenCalledTimes(3);
  stop();
  manager.remove(parent);
  expect(listener).toHaveBeenCalledTimes(3);
});
test('only the top layer or its owning native host routes close requests', () => {
  const manager = new NativeModalManager();
  const parent = entry(),
    child = entry(parent.id);
  child.host = parent.id;
  manager.add(parent);
  manager.add(child);
  manager.requestFrom(parent, null);
  expect(child.escape).toHaveBeenCalledWith(null);
  expect(parent.escape).not.toHaveBeenCalled();
  child.open = false;
  manager.requestFrom(parent, null);
  expect(child.escape).toHaveBeenCalledTimes(1);
  const other = entry();
  manager.add(other);
  manager.requestFrom(parent, null);
  expect(other.escape).not.toHaveBeenCalled();
});
test('non-top removal never steals focus and children inherit the surviving restore chain', () => {
  const manager = new NativeModalManager();
  const target = { focus: jest.fn() };
  const parent = entry(),
    child = entry(parent.id);
  parent.restoreTarget = target;
  manager.add(child);
  manager.add(parent);
  manager.remove(parent)();
  expect(target.focus).not.toHaveBeenCalled();
  manager.remove(child)();
  expect(target.focus).toHaveBeenCalledTimes(1);
});
test('restoration stays inside the remaining top layer and ignores disconnected targets', () => {
  const manager = new NativeModalManager();
  const parent = entry(),
    child = entry(parent.id);
  child.restoreTarget = { focus: jest.fn(), isConnected: false };
  manager.add(parent);
  manager.add(child);
  manager.remove(child)();
  expect(parent.focus).toHaveBeenCalledTimes(1);
});
test('a later stack mutation invalidates pending restoration and disabled restoration stays silent', () => {
  const manager = new NativeModalManager();
  const target = { focus: jest.fn() };
  const old = entry();
  old.restoreTarget = target;
  manager.add(old);
  const restore = manager.remove(old);
  manager.add(entry());
  restore();
  expect(target.focus).not.toHaveBeenCalled();
  const last = manager.top()!;
  last.restoreTarget = target;
  last.restore = false;
  manager.remove(last)();
  expect(target.focus).not.toHaveBeenCalled();
});

test('removing a background layer does not cancel restoration to the unchanged top layer', () => {
  const manager = new NativeModalManager();
  const background = entry(),
    parent = entry(),
    closing = entry(parent.id);
  const target = { focus: jest.fn() };
  parent.contains = () => true;
  closing.restoreTarget = target;
  manager.add(background);
  manager.add(parent);
  manager.add(closing);
  const restore = manager.remove(closing);
  manager.remove(background);
  restore();
  expect(target.focus).toHaveBeenCalledTimes(1);
});
