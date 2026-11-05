// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import type { ViewInstance } from 'react-native';
export type MenuFocusSource = 'keyboard' | 'pointer' | null;
export interface NativeMenuRecord {
  id: string;
  element: ViewInstance;
  token: object;
  disabled: boolean;
  focusableWhenDisabled: boolean;
  focusable: boolean;
  selected: boolean;
  textValue?: string;
  focus(source: MenuFocusSource): void;
}
export const menuNavigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End'] as const;
export function menuConnected(item: NativeMenuRecord): boolean {
  return item.element.isConnected === true;
}
export function menuFocusable(item: NativeMenuRecord): boolean {
  return menuConnected(item) && item.focusable && (!item.disabled || item.focusableWhenDisabled);
}
export function menuText(item: NativeMenuRecord): string {
  return item.textValue ?? item.element.textContent ?? '';
}
export interface MenuTextCriteria {
  keys: string[];
  repeating: boolean;
  previousKeyMatched: boolean;
  lastTime: number | null;
}
export function menuTextMatches(item: NativeMenuRecord, criteria: MenuTextCriteria): boolean {
  const text = menuText(item).trim().toLowerCase();
  return (
    Boolean(text.length) &&
    (criteria.repeating ? text[0] === criteria.keys[0] : text.startsWith(criteria.keys.join('')))
  );
}
/** Actual native tree order is authoritative, including wrapped/keyed/reordered items. */
export function orderedMenuItems(map: Map<string, NativeMenuRecord>): NativeMenuRecord[] {
  return [...map.values()].filter(menuConnected).sort((a, b) => {
    if (a.element === b.element) return 0;
    const position = a.element.compareDocumentPosition(b.element);
    if (position & 1) return 0;
    if (position & 4 || position & 16) return -1;
    if (position & 2 || position & 8) return 1;
    return 0;
  });
}
export function nextMenuItem(
  items: NativeMenuRecord[],
  index: number,
  direction: 'next' | 'previous',
  wrap: boolean,
  filter = menuFocusable,
): NativeMenuRecord | null {
  if (!items.length) return null;
  let current = index;
  // Bounded even when focus is outside the registry and every item is disabled.
  for (let visited = 0; visited < items.length; visited++) {
    current += direction === 'next' ? 1 : -1;
    if (current < 0 || current >= items.length) {
      if (!wrap) return null;
      current = direction === 'next' ? 0 : items.length - 1;
    }
    if (filter(items[current])) return items[current];
  }
  return null;
}
export function resolveMenuActive(
  candidate: string | null,
  items: NativeMenuRecord[],
  variant: 'menu' | 'selectedMenu',
): string | null {
  if (candidate != null) {
    const index = items.findIndex((item) => item.id === candidate);
    if (index < 0) return items.find(menuFocusable)?.id ?? null;
    return menuFocusable(items[index])
      ? candidate
      : (nextMenuItem(items, index, 'next', false)?.id ?? null);
  }
  return (
    (variant === 'selectedMenu'
      ? items.find((item) => item.selected && menuFocusable(item))
      : undefined
    )?.id ??
    items.find(menuFocusable)?.id ??
    null
  );
}
export class NativeMenuRegistry {
  readonly items = new Map<string, NativeMenuRecord>();
  private order: string[] = [];
  private readonly notify: () => void;
  constructor(notify: () => void) {
    this.notify = notify;
  }
  set(item: NativeMenuRecord) {
    const previous = this.items.get(item.id);
    if (previous && Object.keys(item).every((key) => (previous as any)[key] === (item as any)[key]))
      return;
    this.items.set(item.id, item);
    this.notify();
  }
  remove(id: string, token: object) {
    if (this.items.get(id)?.token !== token) return;
    this.items.delete(id);
    this.notify();
  }
  ordered() {
    return orderedMenuItems(this.items);
  }
  refreshOrder() {
    const order = this.ordered().map((item) => item.id);
    if (order.length === this.order.length && order.every((id, index) => id === this.order[index]))
      return;
    this.order = order;
    this.notify();
  }
}
