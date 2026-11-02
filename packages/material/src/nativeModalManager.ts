export interface NativeFocusTarget {
  focus(): void;
  readonly isConnected?: boolean;
}
export interface NativeModalEntry {
  id: symbol;
  parent?: symbol;
  host: symbol;
  open: boolean;
  restore: boolean;
  restoreTarget?: NativeFocusTarget | null;
  explicitRestore?: () => NativeFocusTarget | null | undefined;
  contains(target: NativeFocusTarget): boolean;
  focus(): void;
  escape(event: unknown): void;
}
/** Native stack ownership only. No DOM containers or global device mutations. */
export class NativeModalManager {
  private stack: NativeModalEntry[] = [];
  private listeners = new Set<() => void>();
  private version = 0;
  private focusVersion = 0;
  private focusOwner: NativeModalEntry | undefined;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.version;
  top = () => this.stack.at(-1);
  index(entry: NativeModalEntry) {
    return this.stack.indexOf(entry);
  }
  isTop(entry: NativeModalEntry) {
    return this.top() === entry;
  }
  private changed() {
    this.version++;
    if (this.focusOwner !== this.top()) {
      this.focusOwner = this.top();
      this.focusVersion++;
    }
    for (const listener of this.listeners) listener();
  }
  isDescendant(entry: NativeModalEntry, ancestor: symbol): boolean {
    let parent = entry.parent;
    const visited = new Set<symbol>();
    while (parent && !visited.has(parent)) {
      if (parent === ancestor) return true;
      visited.add(parent);
      parent = this.stack.find((item) => item.id === parent)?.parent;
    }
    return false;
  }
  add(entry: NativeModalEntry) {
    if (this.stack.includes(entry)) return;
    // Child layout effects run first; insert late-registering parents beneath them.
    const before = this.stack.findIndex((item) => this.isDescendant(item, entry.id));
    this.stack.splice(before < 0 ? this.stack.length : before, 0, entry);
    this.changed();
  }
  remove(entry: NativeModalEntry): () => void {
    const index = this.stack.indexOf(entry);
    if (index < 0) return () => {};
    const wasTop = this.isTop(entry);
    for (const item of this.stack)
      if (item.parent === entry.id) {
        item.parent = entry.parent;
        if (!item.explicitRestore) item.restoreTarget = entry.restoreTarget;
      }
    this.stack.splice(index, 1);
    this.changed();
    const version = this.focusVersion;
    return () => {
      // A later focus owner cancels restoration. Background removals do not steal ownership.
      if (!wasTop || !entry.restore || version !== this.focusVersion) return;
      const top = this.top();
      const target = entry.explicitRestore?.() ?? entry.restoreTarget;
      if (top && (!target || target.isConnected === false || !top.contains(target))) top.focus();
      else if (typeof target?.focus === 'function' && target.isConnected !== false) target.focus();
    };
  }
  requestFrom(entry: NativeModalEntry, event: unknown) {
    const top = this.top();
    if (top?.open && (top === entry || top.host === entry.id)) top.escape(event);
  }
}
export const nativeModalManager = new NativeModalManager();
