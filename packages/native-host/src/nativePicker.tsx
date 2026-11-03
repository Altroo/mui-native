import React, { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ViewProps, ViewInstance, NativeSyntheticEvent } from 'react-native';
import type { PickerOption } from './AltrooMUINativePickerNativeComponent';
let implementation: typeof import('./AltrooMUINativePickerNativeComponent') | undefined;
let sequence = 0;
const token = () => `mui-picker-${++sequence}`;
export interface NativePickerOption {
  id: string;
  label: string;
  groupId?: string;
  groupLabel?: string;
  enabled?: boolean;
  selected?: boolean;
}
export interface NativePickerSelection {
  sessionId: string;
  revision: string;
  optionId: string;
  selected: boolean;
}
export type NativePickerDismissReason =
  | 'selected'
  | 'cancel'
  | 'done'
  | 'background'
  | 'unavailable';
export interface NativePickerDismiss {
  sessionId: string;
  reason: NativePickerDismissReason;
}
export interface NativePickerProps extends Omit<ViewProps, 'children'> {
  children?: never;
  open: boolean;
  /** Change this key to replace a presentation while open remains true. */
  requestKey?: string;
  options: readonly NativePickerOption[];
  multiple?: boolean;
  title?: string;
  doneText?: string;
  cancelText?: string;
  colorScheme?: 'system' | 'light' | 'dark';
  onSelection?: (event: NativeSyntheticEvent<NativePickerSelection>) => void;
  onDismiss?: (event: NativeSyntheticEvent<NativePickerDismiss>) => void;
}
function normalizeOptions(
  options: readonly NativePickerOption[],
  multiple: boolean,
): PickerOption[] {
  if (!Array.isArray(options)) throw new Error('MUI Native: picker options must be an array.');
  const ids = new Set<string>(),
    groups = new Map<string, string>();
  let selected = 0;
  return options.map((option) => {
    if (!option || typeof option !== 'object')
      throw new Error('MUI Native: picker options must be objects.');
    if (typeof option.id !== 'string' || !option.id || ids.has(option.id))
      throw new Error('MUI Native: picker option ids must be nonempty and unique.');
    if (typeof option.label !== 'string')
      throw new Error('MUI Native: picker labels must be strings.');
    ids.add(option.id);
    const groupId = option.groupId ?? '',
      groupLabel = option.groupLabel ?? '';
    if (typeof groupId !== 'string' || typeof groupLabel !== 'string' || (!groupId && groupLabel))
      throw new Error('MUI Native: picker groups require a string id and label.');
    if (groups.has(groupId) && groups.get(groupId) !== groupLabel)
      throw new Error('MUI Native: one picker group id cannot have conflicting labels.');
    groups.set(groupId, groupLabel);
    if (option.selected && ++selected > 1 && !multiple)
      throw new Error('MUI Native: a single picker cannot have multiple selected options.');
    return {
      id: option.id,
      label: option.label,
      groupId,
      groupLabel,
      enabled: option.enabled !== false,
      selected: Boolean(option.selected),
    };
  });
}
// Presentation-only native anchor. The caller renders and owns its activation control.
export const NativePicker: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativePickerProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, NativePickerProps>(function NativePicker(
  {
    open,
    requestKey,
    options,
    multiple = false,
    title = '',
    doneText = '',
    cancelText = '',
    colorScheme = 'system',
    children: unsupportedChildren,
    onSelection,
    onDismiss,
    ...viewProps
  },
  ref,
) {
  if (unsupportedChildren != null)
    throw new Error('MUI Native: picker options are configuration; children are not rendered.');
  if (!['system', 'light', 'dark'].includes(colorScheme))
    throw new Error('MUI Native: picker colorScheme must be system, light or dark.');
  const normalized = normalizeOptions(options, multiple);
  // Canonical comparison avoids native list reloads from equivalent caller arrays.
  // The native revision is a small unique token, not the serialized option list.
  const signature = JSON.stringify([multiple, normalized]);
  const model = useMemo(() => ({ options: normalized, revision: token() }), [signature]);
  const [sessionId, setSessionId] = useState('');
  const dismissed = useRef('');
  const live = useRef<{
    active: boolean;
    sessionId: string;
    revision: string;
    multiple: boolean;
    options: readonly PickerOption[];
    onSelection: NativePickerProps['onSelection'];
    onDismiss: NativePickerProps['onDismiss'];
  } | null>(null);
  useLayoutEffect(() => {
    setSessionId(open ? token() : '');
  }, [open, requestKey]);
  useLayoutEffect(() => {
    live.current = {
      active: open && Boolean(sessionId) && dismissed.current !== sessionId,
      sessionId,
      revision: model.revision,
      multiple,
      options: model.options,
      onSelection,
      onDismiss,
    };
    return () => {
      live.current = null;
    };
  });
  const selection = useCallback((event: NativeSyntheticEvent<NativePickerSelection>) => {
    const current = live.current,
      data = event.nativeEvent;
    if (
      !current?.active ||
      data.sessionId !== current.sessionId ||
      data.revision !== current.revision ||
      typeof data.selected !== 'boolean' ||
      (!current.multiple && !data.selected)
    )
      return;
    const option = current.options.find((item) => item.id === data.optionId);
    if (!option?.enabled || option.selected === data.selected) return;
    event.persist();
    current.onSelection?.(event);
  }, []);
  const dismiss = useCallback((event: NativeSyntheticEvent<NativePickerDismiss>) => {
    const current = live.current,
      data = event.nativeEvent;
    if (
      !current?.active ||
      data.sessionId !== current.sessionId ||
      !['selected', 'cancel', 'done', 'background', 'unavailable'].includes(data.reason)
    )
      return;
    dismissed.current = current.sessionId;
    current.active = false;
    event.persist();
    current.onDismiss?.(event);
  }, []);
  const Host = (implementation ??= require('./AltrooMUINativePickerNativeComponent')).default;
  return (
    <Host
      {...viewProps}
      ref={ref}
      active={open && Boolean(sessionId)}
      sessionId={sessionId}
      revision={model.revision}
      options={model.options}
      multiple={multiple}
      title={title}
      doneText={doneText}
      cancelText={cancelText}
      colorScheme={colorScheme}
      onPickerSelection={selection}
      onPickerDismiss={dismiss}
      collapsable={false}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, viewProps.style]}
    />
  );
});
