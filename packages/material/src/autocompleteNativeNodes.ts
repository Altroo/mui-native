/* Native scrolling adapts MIT-licensed Material UI 9.5.0 useAutocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import type { RefCallback } from 'react';
import type { TextInputInstance, ViewInstance, ScrollViewInstance } from 'react-native';
import type {
  AutocompleteHighlightChangeReason,
  NativeAutocompleteListbox,
} from './useAutocompleteTypes';

type Entry = { node: ViewInstance; disabled: boolean };
const connected = (node: ViewInstance | null | undefined) =>
  Boolean(node && node.isConnected !== false);
export function nativeAutocompleteContains(
  root: ViewInstance | null,
  target: ViewInstance | null,
): boolean {
  return Boolean(
    root &&
      target &&
      connected(root) &&
      connected(target) &&
      (root === target || (typeof target.nodeType === 'number' && root.contains?.(target))),
  );
}

/**
 * Per-instance native nodes, with no DOM attribute queries or global listeners.
 * Ref cleanup is identity-checked so a retired binding cannot remove its replacement.
 * Only real native scroll/content measurements decide the visibility adjustment.
 */
export class NativeAutocompleteNodes {
  input: TextInputInstance | null = null;
  anchor: ViewInstance | null = null;
  listbox: NativeAutocompleteListbox | null = null;
  private readonly options = new Map<number, Entry>();
  private readonly items = new Map<number, Entry>();
  private readonly bindings = new Map<
    string,
    { disabled: boolean; callback: RefCallback<ViewInstance> }
  >();
  private scrollRevision = 0;
  private viewportHeight = 0;
  private contentHeight = 0;
  private offset = 0;
  private groups: Array<{ index: number; key: string }> = [];
  private readonly groupHeights = new Map<number, number>();

  setGroups(groups: Array<{ index: number; key: string }>) {
    if (
      groups.length === this.groups.length &&
      groups.every(
        (entry, index) =>
          entry.index === this.groups[index].index && entry.key === this.groups[index].key,
      )
    )
      return;
    for (const old of this.groups)
      if (!groups.some((group) => group.index === old.index && group.key === old.key))
        this.groupHeights.delete(old.index);
    this.groups = groups;
    this.invalidateScroll();
  }
  updateGroupHeight(index: number, height: number) {
    if (
      !Number.isFinite(height) ||
      height < 0 ||
      !this.groups.some((group) => group.index === index) ||
      this.groupHeights.get(index) === height
    )
      return false;
    this.groupHeights.set(index, height);
    return true;
  }
  private headerHeight(index: number) {
    // Sticky headers scale with native text. Never infer their height from an
    // option row or assume a fixed font size when revealing a keyboard highlight.
    let low = 0,
      high = this.groups.length - 1,
      start = -1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (this.groups[middle].index <= index) {
        start = this.groups[middle].index;
        low = middle + 1;
      } else high = middle - 1;
    }
    return this.groupHeights.get(start) ?? 0;
  }

  bind(kind: 'option' | 'item', index: number, disabled = false): RefCallback<ViewInstance> {
    const key = kind + ':' + index;
    const previous = this.bindings.get(key);
    if (previous?.disabled === disabled) return previous.callback;
    const collection = kind === 'option' ? this.options : this.items;
    let release: (() => void) | undefined;
    const callback: RefCallback<ViewInstance> = (node) => {
      release?.();
      release = undefined;
      if (!node || this.bindings.get(key)?.callback !== callback) return;
      const entry = { node, disabled };
      collection.set(index, entry);
      const cleanup = () => {
        if (release === cleanup) release = undefined;
        if (collection.get(index) === entry) collection.delete(index);
      };
      release = cleanup;
      return cleanup;
    };
    this.bindings.set(key, { disabled, callback });
    return callback;
  }
  isOptionAvailable(index: number, disabledItemsFocusable: boolean) {
    const entry = this.options.get(index);
    return Boolean(entry && connected(entry.node) && (disabledItemsFocusable || !entry.disabled));
  }
  isItemAvailable(index: number) {
    const entry = this.items.get(index);
    return Boolean(entry && !entry.disabled && connected(entry.node));
  }
  itemIndex(target: ViewInstance | null): number {
    if (!target) return -1;
    for (const [index, entry] of this.items)
      if (nativeAutocompleteContains(entry.node, target)) return index;
    return -1;
  }
  containsListbox(target: ViewInstance | null) {
    return nativeAutocompleteContains(this.listbox, target);
  }
  focusItem(index: number) {
    if (index === -1) {
      if (connected(this.input)) this.input?.focus();
      return;
    }
    const entry = this.items.get(index);
    if (entry && !entry.disabled && connected(entry.node)) entry.node.focus();
  }
  updateViewport(height: number) {
    if (Number.isFinite(height)) this.viewportHeight = Math.max(0, height);
  }
  updateContent(height: number) {
    if (Number.isFinite(height)) this.contentHeight = Math.max(0, height);
  }
  updateScroll(offset: number, viewport: number, content: number) {
    if (Number.isFinite(offset)) this.offset = offset;
    this.updateViewport(viewport);
    this.updateContent(content);
  }
  private scrollTo(y: number) {
    const listbox = this.listbox;
    if (!listbox || !('scrollTo' in listbox) || typeof listbox.scrollTo !== 'function') return;
    const offset = Math.max(0, Math.min(y, Math.max(0, this.contentHeight - this.viewportHeight)));
    listbox.scrollTo({ y: offset, animated: false });
    this.offset = offset;
  }
  scrollHighlight(
    index: number,
    reason: AutocompleteHighlightChangeReason | null,
    preserveScroll: boolean,
    grouped: boolean,
  ) {
    const revision = ++this.scrollRevision;
    if (index < 0) {
      if (!preserveScroll) this.scrollTo(0);
      return;
    }
    if (reason === 'mouse' || reason === 'touch') return;
    const listbox = this.listbox,
      entry = this.options.get(index);
    if (
      !listbox ||
      !entry ||
      !connected(entry.node) ||
      this.viewportHeight <= 0 ||
      this.contentHeight <= this.viewportHeight
    )
      return;
    if (!('getInnerViewRef' in listbox) || typeof listbox.getInnerViewRef !== 'function') return;
    const content = (listbox as ScrollViewInstance).getInnerViewRef();
    if (!content) return;
    entry.node.measureLayout(content, (_x, top, _width, height) => {
      if (
        revision !== this.scrollRevision ||
        this.listbox !== listbox ||
        this.options.get(index) !== entry ||
        !connected(entry.node)
      )
        return;
      if (![top, height].every(Number.isFinite) || height <= 0) return;
      const bottom = top + height;
      if (bottom > this.offset + this.viewportHeight) this.scrollTo(bottom - this.viewportHeight);
      else {
        const paddedTop = top - (grouped ? this.headerHeight(index) : 0);
        if (paddedTop < this.offset) this.scrollTo(paddedTop);
      }
    });
  }
  /** Bound the callback cache to the committed collection sizes. */
  prune(optionCount: number, itemCount: number) {
    for (const key of this.bindings.keys()) {
      const [kind, rawIndex] = key.split(':');
      const index = Number(rawIndex),
        count = kind === 'option' ? optionCount : itemCount;
      if (index < 0 || index >= count) {
        this.bindings.delete(key);
        (kind === 'option' ? this.options : this.items).delete(index);
      }
    }
  }
  invalidateScroll() {
    this.scrollRevision++;
  }
  dispose() {
    this.invalidateScroll();
    this.input = null;
    this.anchor = null;
    this.listbox = null;
    this.options.clear();
    this.items.clear();
    this.bindings.clear();
    this.groups = [];
    this.groupHeights.clear();
  }
}
