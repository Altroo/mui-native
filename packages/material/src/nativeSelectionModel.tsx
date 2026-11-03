import React from 'react';
import { nativeLabelText } from './formState';

interface NativeOptionAttributes {
  value?: unknown;
  label?: unknown;
  disabled?: unknown;
  selected?: unknown;
  children?: React.ReactNode;
  id?: string;
  'data-case'?: string;
}
export interface NativeOptionModel {
  key: string;
  value: string;
  label: string;
  text: string;
  disabled: boolean;
  groupDisabled: boolean;
  groupKey: string;
  groupLabel: string;
  selectedAttribute?: boolean;
  element: React.ReactElement<NativeOptionAttributes>;
}
export interface NativeSelectionProps {
  value?: unknown;
  defaultValue?: unknown;
  multiple?: boolean;
  size?: number;
}
export interface NativeSelectionState {
  options: readonly NativeOptionModel[];
  selectedKeys: readonly string[];
  multiple: boolean;
  size: number;
}
const collapse = (text: string) => text.replace(/[\t\n\f\r ]+/g, ' ').replace(/^ | $/g, '');
/** React DOM's select value conversion; functions/symbols do not become values. */
export function nativeSelectionString(value: unknown): string {
  return ['function', 'symbol', 'undefined'].includes(typeof value) ? '' : String(value);
}
export function nativeOptionModels(children: React.ReactNode): NativeOptionModel[] {
  const result: NativeOptionModel[] = [];
  function walk(
    nodes: React.ReactNode,
    path: string,
    group?: { key: string; label: string; disabled: boolean },
  ) {
    React.Children.toArray(nodes).forEach((node, index) => {
      if (!React.isValidElement<any>(node)) return;
      const element = node as React.ReactElement<NativeOptionAttributes>;
      const props = element.props;
      const key = `${path}/${node.key ?? index}`;
      if (node.type === React.Fragment) {
        walk(props.children, key, group);
        return;
      }
      if (node.type === 'optgroup') {
        if (group) throw new Error('MUI Native: nested optgroups are not supported.');
        walk(props.children, key, {
          key,
          label: String(props.label ?? ''),
          disabled: Boolean(props.disabled),
        });
        return;
      }
      if (node.type !== 'option')
        throw new Error(
          'MUI Native: native selection children must be option, optgroup or Fragment configuration.',
        );
      const content = nativeLabelText(props.children);
      if (content == null)
        throw new Error(
          'MUI Native: native option text must be readable; supply literal option content.',
        );
      const text = collapse(content);
      const value =
        props.value == null || ['function', 'symbol'].includes(typeof props.value)
          ? text
          : nativeSelectionString(props.value);
      result.push({
        key,
        value,
        text,
        label: props.label == null ? text : String(props.label),
        disabled: Boolean(props.disabled),
        groupDisabled: group?.disabled ?? false,
        groupKey: group?.key ?? '',
        groupLabel: group?.label ?? '',
        selectedAttribute: props.selected == null ? undefined : Boolean(props.selected),
        element,
      });
    });
  }
  walk(children, '');
  return result;
}
function implicit(options: readonly NativeOptionModel[], multiple: boolean, size: number) {
  const marked = options.filter((option) => option.selectedAttribute);
  if (multiple) return marked.map((option) => option.key);
  if (marked.length) return [marked.at(-1)!.key];
  const first =
    size <= 1 ? options.find((option) => !option.disabled && !option.groupDisabled) : undefined;
  return first ? [first.key] : [];
}
function applyValue(
  options: readonly NativeOptionModel[],
  multiple: boolean,
  value: unknown,
  fallback: readonly string[],
) {
  if (multiple) {
    // React DOM accepts array-like values; valid MUI applications supply arrays.
    const source = value as { length?: number; [index: number]: unknown } | null;
    const wanted = new Set<string>();
    for (let index = 0; index < (source?.length ?? 0); index++)
      wanted.add(nativeSelectionString(source![index]));
    return options.filter((option) => wanted.has(option.value)).map((option) => option.key);
  }
  const match = options.find((option) => option.value === nativeSelectionString(value));
  // React DOM's authored-value fallback checks the option's own disabled flag.
  const first = match ?? options.find((option) => !option.disabled);
  return first ? [first.key] : fallback.slice(0, 1);
}
/** Pure DOM-shaped selection policy; no rendering, global mutation or native UI. */
export function reconcileNativeSelection(
  previous: NativeSelectionState | undefined,
  options: readonly NativeOptionModel[],
  props: NativeSelectionProps,
): NativeSelectionState {
  const multiple = Boolean(props.multiple),
    size = props.size ?? 0;
  let selectedKeys: readonly string[];
  if (!previous) {
    selectedKeys = implicit(options, multiple, size);
    if (props.value != null || props.defaultValue != null)
      selectedKeys = applyValue(options, multiple, props.value ?? props.defaultValue, selectedKeys);
  } else {
    const byKey = new Map(previous.options.map((option) => [option.key, option]));
    const currentKeys = new Set(options.map((option) => option.key));
    let keys = new Set(previous.selectedKeys.filter((key) => currentKeys.has(key)));
    for (const option of options) {
      const old = byKey.get(option.key);
      if (option.selectedAttribute !== old?.selectedAttribute) {
        if (option.selectedAttribute) {
          if (!multiple) keys.clear();
          keys.add(option.key);
        } else keys.delete(option.key);
      }
    }
    if (!multiple && keys.size > 1)
      keys = new Set(
        options
          .filter((option) => keys.has(option.key))
          .slice(-1)
          .map((option) => option.key),
      );
    selectedKeys = options.filter((option) => keys.has(option.key)).map((option) => option.key);
    if (!multiple && !selectedKeys.length && size <= 1)
      selectedKeys = implicit(
        options.map((option) => ({ ...option, selectedAttribute: false })),
        false,
        size,
      );
    if (props.value != null)
      selectedKeys = applyValue(options, multiple, props.value, selectedKeys);
    else if (multiple !== previous.multiple)
      selectedKeys = applyValue(
        options,
        multiple,
        props.defaultValue ?? (multiple ? [] : ''),
        selectedKeys,
      );
  }
  return { options, selectedKeys, multiple, size };
}
export function nativeSelectionProposal(
  state: NativeSelectionState,
  key: string,
  selected: boolean,
): NativeSelectionState | null {
  const option = state.options.find((item) => item.key === key);
  if (!option || option.disabled || option.groupDisabled || (!state.multiple && !selected))
    return null;
  const keys = new Set(state.selectedKeys);
  if (keys.has(key) === selected) return null;
  if (!state.multiple) keys.clear();
  if (selected) keys.add(key);
  else keys.delete(key);
  return {
    ...state,
    selectedKeys: state.options.filter((item) => keys.has(item.key)).map((item) => item.key),
  };
}
export function nativeSelectionValue(state: NativeSelectionState) {
  const selected = new Set(state.selectedKeys);
  return state.options.find((option) => selected.has(option.key))?.value ?? '';
}
