import React from 'react';
import { act, render } from '@testing-library/react-native';
import {
  MenuList,
  MenuItem,
  type MenuListProps,
  type MenuItemProps,
  type ButtonBaseState,
} from '../../packages/material/src';
import { Commands } from '../../packages/native-host/src/AltrooMUIInteractiveViewNativeComponent';
export interface ModelItem {
  id: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  textValue?: string;
  role?: MenuItemProps['role'];
}
export interface ModelInput {
  items: ModelItem[];
  autoFocus?: boolean;
  autoFocusItem?: boolean;
  variant?: MenuListProps['variant'];
  disabledItemsFocusable?: boolean;
  disableListWrap?: boolean;
  focusSource?: MenuListProps['focusSource'];
  cancelCapture?: boolean;
  actions?: any[];
}
export class NativeMenuModel {
  items: ModelItem[];
  readonly nodes = new Map<string, any>();
  readonly parents = new Map<string, string | null>();
  readonly trace: string[] = [];
  readonly visible = new Map<string, boolean>();
  readonly callbacks = new Map<string, (node: any) => any>();
  current: any = null;
  time = 0;
  tree: ReturnType<typeof render> | undefined;
  extra: React.ReactNode = null;
  listProps: Partial<MenuListProps> = {};
  itemProps: Partial<MenuItemProps> = {};
  constructor(readonly input: ModelInput) {
    this.items = input.items.map((item) => ({ ...item }));
  }
  attach(id: string) {
    if (this.callbacks.has(id)) return this.callbacks.get(id)!;
    const callback = (node: any) => {
      if (!node) return;
      let connected = true;
      this.nodes.set(id, node);
      Object.defineProperties(node, {
        nodeType: { configurable: true, value: 1 },
        isConnected: { configurable: true, get: () => connected },
        textContent: {
          configurable: true,
          get: () => this.items.find((item) => item.id === id)?.label ?? '',
        },
        contains: {
          configurable: true,
          value: (other: any) => {
            if (node === other) return true;
            let entry = [...this.nodes.entries()].find(
              ([, value]) => value === other && value.isConnected,
            )?.[0];
            const visited = new Set<string>();
            while (entry && !visited.has(entry)) {
              visited.add(entry);
              entry = this.parents.has(entry)
                ? (this.parents.get(entry) ?? undefined)
                : entry === 'list'
                  ? undefined
                  : 'list';
              if (entry === id) return true;
            }
            return false;
          },
        },
        compareDocumentPosition: {
          configurable: true,
          value: (other: any) => {
            if (node === other) return 0;
            const otherId = [...this.nodes.entries()].find(([, value]) => value === other)?.[0];
            if (!connected || !other?.isConnected) return 1;
            if (id === 'list') return 20;
            if (otherId === 'list') return 10;
            return this.items.findIndex((item) => item.id === id) <
              this.items.findIndex((item) => item.id === otherId)
              ? 4
              : 2;
          },
        },
      });
      return () => {
        connected = false;
      };
    };
    this.callbacks.set(id, callback);
    return callback;
  }
  event(target: any, key?: string, extra: any = {}) {
    let prevented = false,
      stopped = false;
    return {
      target,
      currentTarget: target,
      nativeEvent: {
        key,
        code: key,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
        repeat: false,
        isComposing: false,
        isCanceled: false,
        ...extra,
      },
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        prevented = true;
      },
      isDefaultPrevented: () => prevented,
      stopPropagation() {
        stopped = true;
      },
      isPropagationStopped: () => stopped,
      persist() {},
    } as any;
  }
  eventPath(node: any) {
    const path = [node],
      seen = new Set<string>();
    let id = [...this.nodes.entries()].find(([, value]) => value === node)?.[0];
    while (id && !seen.has(id)) {
      seen.add(id);
      const parent = this.parents.has(id) ? this.parents.get(id) : id === 'list' ? null : 'list';
      if (!parent || !this.nodes.has(parent)) break;
      path.push(this.nodes.get(parent));
      id = parent;
    }
    return path;
  }
  focusEvent(kind: 'Focus' | 'Blur', node: any) {
    const path = this.eventPath(node);
    const event = this.event(node);
    for (const target of [...path].reverse()) {
      event.currentTarget = target;
      target.props?.['onMUI' + kind + 'Capture']?.(event);
    }
    for (const target of path) {
      event.currentTarget = target;
      target.props?.['onMUI' + kind]?.(event);
    }
  }
  focus(node: any) {
    if (!node?.isConnected || node.props.nativeFocusable === false) return;
    const old = this.current;
    this.current = node;
    if (old && old !== node) this.focusEvent('Blur', old);
    this.focusEvent('Focus', node);
  }
  installCommands() {
    jest.spyOn(Commands, 'focus').mockImplementation((node: any) => this.focus(node));
    jest.spyOn(Commands, 'blur').mockImplementation((node: any) => {
      if (this.current === node) {
        this.current = null;
        this.focusEvent('Blur', node);
      }
    });
    jest.spyOn(Commands, 'setPressed').mockImplementation(() => {});
    jest.spyOn(Commands, 'setHotspot').mockImplementation(() => {});
    jest.spyOn(performance, 'now').mockImplementation(() => this.time);
  }
  element() {
    return (
      <MenuList
        ref={this.attach('list')}
        testID="list"
        autoFocus={this.input.autoFocus}
        autoFocusItem={this.input.autoFocusItem}
        variant={this.input.variant}
        disabledItemsFocusable={this.input.disabledItemsFocusable}
        disableListWrap={this.input.disableListWrap}
        focusSource={this.input.focusSource}
        onKeyDownCapture={(event) => {
          if (this.input.cancelCapture) event.preventDefault();
        }}
        onKeyDown={(event) =>
          this.trace.push(`key:${event.key}:${Boolean(event.defaultPrevented)}`)
        }
        {...this.listProps}
      >
        {this.items.map((item) => (
          <MenuItem
            key={item.id}
            testID={item.id}
            ref={this.attach(item.id)}
            selected={item.selected}
            disabled={item.disabled}
            textValue={item.textValue}
            role={item.role}
            disableRipple
            style={(state: ButtonBaseState) => {
              this.visible.set(item.id, state.focusVisible);
              return undefined;
            }}
            onClick={() => this.trace.push('click:' + item.id)}
            {...this.itemProps}
          >
            {item.label}
          </MenuItem>
        ))}
        {this.extra}
      </MenuList>
    );
  }
  async mount() {
    this.installCommands();
    this.tree = render(this.element());
    await act(async () => {
      await Promise.resolve();
    });
    return this;
  }
  async update() {
    await act(async () => {
      this.tree!.rerender(this.element());
      await Promise.resolve();
    });
  }
  async action(action: any) {
    await act(async () => {
      if (action.wait != null) {
        this.time += action.wait;
        return;
      }
      if (action.reorder) {
        this.items = action.reorder.map((id: string) => this.items.find((item) => item.id === id)!);
        this.tree!.rerender(this.element());
        await Promise.resolve();
        return;
      }
      if (action.remove) {
        this.items = this.items.filter((item) => item.id !== action.remove);
        this.tree!.rerender(this.element());
        await Promise.resolve();
        return;
      }
      if (action.focus) {
        this.nodes.get(action.focus)?.focus();
        return;
      }
      const root = this.nodes.get('list'),
        target = this.current ?? root,
        e = this.event(target, action.key ?? action.keyUp, action);
      const kind = action.key ? 'KeyDown' : 'KeyUp';
      const path = this.eventPath(target);
      for (const node of [...path].reverse()) {
        e.currentTarget = node;
        node.props?.['onMUI' + kind + 'Capture']?.(e);
        if (e.isPropagationStopped()) return;
      }
      for (const node of path) {
        e.currentTarget = node;
        node.props?.['onMUI' + kind]?.(e);
        if (e.isPropagationStopped()) return;
      }
    });
  }
  snapshot() {
    return {
      focus: [...this.nodes.entries()].find(([, node]) => node === this.current)?.[0] ?? null,
      items: this.items.map((item) => {
        const node = this.nodes.get(item.id);
        return {
          id: item.id,
          tabIndex: node.props.nativeTabIndex ?? null,
          disabled: node.props.accessibilityState.disabled === true,
          focusVisible: this.visible.get(item.id) ?? false,
        };
      }),
      trace: [...this.trace],
    };
  }
}
