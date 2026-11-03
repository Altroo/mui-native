import type { ViewInstance } from 'react-native';
import type { ButtonBaseActivationEvent } from './buttonBase';
export interface NativeRadioItem {
  id: string;
  node: ViewInstance | null;
  name: string;
  checked: boolean;
  disabled: boolean;
  activate: (source: ButtonBaseActivationEvent) => void;
  focus: () => void;
  available?: () => boolean;
}
/** Commit-coalesced native ordering; no per-radio scan when reading tab ownership. */
export class NativeRadioRegistry {
  private items = new Map<string, () => NativeRadioItem>();
  private listeners = new Set<() => void>();
  private version = 0;
  private queued = false;
  private generation = 0;
  private signature = '';
  private order: NativeRadioItem[] = [];
  private tabs = new Map<string, string>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.version;
  register(id: string, get: () => NativeRadioItem) {
    this.items.set(id, get);
    this.refresh();
    return () => {
      if (this.items.get(id) === get) {
        this.items.delete(id);
        this.refresh();
      }
    };
  }
  refresh = () => {
    if (this.queued) return;
    this.queued = true;
    const generation = this.generation;
    queueMicrotask(() => {
      if (generation === this.generation) this.flush();
    });
  };
  flush = () => {
    this.generation++;
    this.queued = false;
    const order = [...this.items.values()]
      .map((get) => get())
      .filter((item) => item.node && item.node.isConnected !== false);
    order.sort((a, b) => {
      const relation = a.node?.compareDocumentPosition?.(b.node!) ?? 0;
      if (relation & 1) return 0;
      return relation & 4 ? -1 : relation & 2 ? 1 : 0;
    });
    const signature = JSON.stringify(
      order.map((item) => [item.id, item.name, item.checked, item.disabled]),
    );
    this.order = order;
    if (signature === this.signature) return;
    this.signature = signature;
    const owners = new Map<string, { id: string; checked: boolean }>();
    for (const item of order) {
      if (item.disabled) continue;
      const old = owners.get(item.name);
      if (!old || (item.checked && !old.checked))
        owners.set(item.name, { id: item.id, checked: item.checked });
    }
    this.tabs = new Map([...owners].map(([name, item]) => [name, item.id]));
    this.version++;
    for (const fn of this.listeners) fn();
  };
  tabIndex(id: string, name: string) {
    return this.tabs.get(name) === id ? 0 : -1;
  }
  private eligible(item: NativeRadioItem | undefined): item is NativeRadioItem {
    return Boolean(
      item &&
        !item.disabled &&
        item.node &&
        item.node.isConnected !== false &&
        (item.available?.() ?? true),
    );
  }
  move(id: string, step: number, source: ButtonBaseActivationEvent) {
    const current = this.items.get(id)?.();
    if (!current) return;
    const candidates = this.order
      .map((item) => this.items.get(item.id)?.())
      .filter((item): item is NativeRadioItem => this.eligible(item) && item.name === current.name);
    if (!candidates.length) return;
    const index = candidates.findIndex((item) => item.id === id),
      next = candidates[(Math.max(index, 0) + step + candidates.length) % candidates.length];
    next.focus();
    next.activate(source);
  }
  focus() {
    const candidates = this.order
      .map((item) => this.items.get(item.id)?.())
      .filter((item): item is NativeRadioItem => this.eligible(item));
    (candidates.find((item) => item.checked) ?? candidates[0])?.focus();
  }
  dispose() {
    this.generation++;
    this.version++;
    this.queued = false;
    this.signature = '';
    this.items.clear();
    this.order = [];
    this.tabs.clear();
    this.listeners.clear();
  }
}
