// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import {
  nativeStyleContains,
  nativeStyleTree,
  nativeStyleTargetAvailable,
} from '../packages/material/src/nativeStyleAncestry';
test('physical ancestry follows ordinary native parents and rejects detached nodes', () => {
  const group = {},
    container = { parentNode: group },
    child = { parentNode: container };
  expect(nativeStyleContains(group, child)).toBe(true);
  expect(nativeStyleContains(group, container)).toBe(true);
  expect(nativeStyleContains({}, child)).toBe(false);
  expect(nativeStyleContains(group, { parentNode: group, isConnected: false })).toBe(false);
});
test('window portals stop styles despite retained logical React ancestry', () => {
  const group = {},
    canvas = { parentNode: group },
    target = { parentNode: canvas };
  const remove = nativeStyleTree.registerPortal(canvas, null);
  try {
    expect(nativeStyleContains(group, target)).toBe(false);
  } finally {
    remove();
  }
});
test('nested portals follow their actual container, including external and internal moves', () => {
  const group = {},
    inside = { parentNode: group },
    outside = {},
    first = { parentNode: group },
    target = { parentNode: first };
  const removeFirst = nativeStyleTree.registerPortal(first, outside);
  const second = { parentNode: outside },
    child = { parentNode: second };
  const removeSecond = nativeStyleTree.registerPortal(second, target);
  try {
    expect(nativeStyleContains(group, target)).toBe(false);
    expect(nativeStyleContains(group, child)).toBe(false);
    const moveInside = nativeStyleTree.registerPortal(first, inside);
    removeFirst(); // Stale cleanup must not erase the new actual-parent lease.
    expect(nativeStyleContains(group, child)).toBe(true);
    moveInside();
  } finally {
    removeSecond();
    removeFirst();
  }
});
test('cycles terminate and subscriptions see replacement/cleanup exactly once', () => {
  const canvas = {},
    container = { parentNode: canvas },
    calls = jest.fn();
  const unsubscribe = nativeStyleTree.subscribe(calls);
  const remove = nativeStyleTree.registerPortal(canvas, container);
  expect(nativeStyleContains({}, container)).toBe(false);
  remove();
  remove();
  expect(calls).toHaveBeenCalledTimes(2);
  unsubscribe();
});

test('destination queries acquire sibling rules in physical outer-to-inner order', () => {
  const outer = {},
    inner = { parentNode: outer },
    container = { parentNode: inner };
  const first = { element: outer as any, cascade: jest.fn() },
    second = { element: inner as any, cascade: jest.fn() };
  // Mount/effect order must not determine stylesheet ancestry order.
  const removeInner = nativeStyleTree.registerGroup(second);
  const removeOuter = nativeStyleTree.registerGroup(first);
  try {
    expect(nativeStyleTree.groupRulesAt(container)).toEqual([first, second]);
    const release = nativeStyleTree.registerPortal(inner, null);
    expect(nativeStyleTree.groupRulesAt(container)).toEqual([second]);
    release();
    removeInner();
    expect(nativeStyleTree.groupRulesAt(container)).toEqual([first]);
  } finally {
    removeInner();
    removeOuter();
  }
});

test('self-container targets are invalid even before the reparented edge is registered', () => {
  const canvas = {},
    child = { parentNode: canvas };
  expect(nativeStyleTargetAvailable(canvas, child)).toBe(false);
  expect(nativeStyleTargetAvailable(canvas, canvas)).toBe(false);
  const remove = nativeStyleTree.registerPortal(canvas, child);
  try {
    expect(nativeStyleTargetAvailable(canvas, child)).toBe(false);
    expect(nativeStyleTree.groupRulesAt(child)).toEqual([]);
  } finally {
    remove();
  }
});

test('populated exact-host class lookup follows retargeting and removes unmounted scopes', () => {
  const first = {},
    second = {};
  let target = first;
  const classes = [{ cacheKey: 'css', css: 'source-root', sourceOwners: ['owner'] }];
  const outer = {
    element: first as any,
    scopeDepth: 0,
    sourceClasses: classes,
    cascade: jest.fn(),
  };
  const inner = {
    get element() {
      return target as any;
    },
    scopeDepth: 1,
    sourceClasses: classes,
    cascade: jest.fn(),
  };
  const removeInner = nativeStyleTree.registerGroup(inner);
  const removeOuter = nativeStyleTree.registerGroup(outer);
  try {
    expect(nativeStyleTree.exactHostStyle(first)).toBe(inner);
    expect(nativeStyleTree.groupRulesAt(first)).toEqual([inner, outer]);
    target = second;
    nativeStyleTree.changed();
    expect(nativeStyleTree.exactHostStyle(first)).toBe(outer);
    expect(nativeStyleTree.exactHostStyle(second)).toBe(inner);
    removeInner();
    expect(nativeStyleTree.exactHostStyle(second)).toBeUndefined();
    expect(nativeStyleTree.groupRulesAt(first)).toEqual([outer]);
    expect(outer.cascade).not.toHaveBeenCalled();
    expect(inner.cascade).not.toHaveBeenCalled();
  } finally {
    removeInner();
    removeOuter();
  }
  expect(nativeStyleTree.exactHostStyle(first)).toBeUndefined();
});
