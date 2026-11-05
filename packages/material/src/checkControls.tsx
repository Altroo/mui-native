import React, {
  forwardRef,
  createContext,
  useContext,
  useRef,
  useState,
  useMemo,
  useId,
  useInsertionEffect,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  useSyncExternalStore,
} from 'react';
import { View, Text, StyleSheet, useWindowDimensions, type ViewInstance } from 'react-native';
import { NativePressable } from '@altroo/mui-native-host';
import {
  useDefaultProps,
  resolveSlotProps,
  NativeTextScope,
  componentStyle,
  alpha,
  diagnostic,
  type NativeStyle,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { ButtonBase, type ButtonBaseActivationEvent, type ButtonBaseRootProps } from './buttonBase';
import { useControlled, FormContext } from './formState';
import { useForkRef } from './utils';
import { useMenuEvent } from './useMenuEvent';
import { selectionEvent } from './selectionEvent';
import { buttonActivationEvent } from './nativeButtonEvents';
import { directionOf, mergeNativeStyles } from './nativeControlStyles';
import { useLabelActivation } from './controlLabelContext';
import { RadioContext, equalRadioValue } from './radioContext';
import { NativeButtonActivationKeys } from './nativeButtonActivationKeys';
import { NativeModalParentContext } from './nativeModalContext';
import { NativeOverlayReadiness } from './nativeOverlayReadiness';
import { NativeMenuFocusReadiness } from './menuContext';
import { nativeModalManager as manager } from './nativeModalManager';
import type {
  CheckboxProps,
  RadioProps,
  NativeCheckedTarget,
  NativeCheckedState,
  NativeCheckedInputHandle,
  NativeCheckedChangeEvent,
  NativeCheckedInputProps,
  NativeCheckedInputComponentProps,
  NativeCheckedRootProps,
} from './checkedTypes';
export * from './checkedTypes';
const none = () => () => {};
const zero = () => 0;
const space = [' '];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const fill = { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } as const;
function valueString(value: unknown) {
  return value == null || typeof value === 'function' || typeof value === 'symbol'
    ? 'on'
    : String(value);
}
export const NativeCheckedInputSurface: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<NativeCheckedInputComponentProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, NativeCheckedInputComponentProps>(function NativeCheckedInputSurface(
  {
    type: _type,
    checked: _checked,
    defaultChecked: _defaultChecked,
    autoFocus: _autoFocus,
    value: _value,
    name: _name,
    id: _id,
    indeterminate: _mixed,
    readOnly: _readOnly,
    required: _required,
    ownerState: _owner,
    onChange: _change,
    ...native
  },
  ref,
) {
  return <NativePressable {...native} ref={ref} />;
});
const InputContext = createContext<{
  Component: React.ComponentType<NativeCheckedInputComponentProps>;
  props: NativeCheckedInputComponentProps;
} | null>(null);
const InputBridge = forwardRef<ViewInstance, ButtonBaseRootProps>(function InputBridge(props, ref) {
  const config = useContext(InputContext)!;
  const Component = config.Component;
  return <Component {...config.props} {...props} ref={ref} />;
});
function Glyph({
  kind,
  checked,
  mixed,
  size,
  color,
  markColor,
}: {
  kind: 'checkbox' | 'radio';
  checked: boolean;
  mixed: boolean;
  size: number;
  color: NativeStyle['color'];
  markColor: NativeStyle['color'];
}) {
  const inner = size * (kind === 'radio' ? 5 / 6 : 0.75),
    mark = size * 0.45;
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderWidth: 2,
          borderRadius: kind === 'radio' ? size : 2,
          borderColor: color,
          backgroundColor: kind === 'checkbox' && (checked || mixed) ? color : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'radio' ? (
          checked ? (
            <View
              style={{
                width: inner * 0.5,
                height: inner * 0.5,
                borderRadius: size,
                backgroundColor: color,
              }}
            />
          ) : null
        ) : mixed ? (
          <View style={{ width: mark, height: 2, backgroundColor: markColor }} />
        ) : checked ? (
          <View
            style={{
              width: mark * 0.6,
              height: mark,
              borderRightWidth: 2,
              borderBottomWidth: 2,
              borderColor: markColor,
              transform: [{ rotate: '45deg' }],
              marginTop: -2,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
const rootOnlyOmissions = new Set([
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'accessibilityLabel',
  'accessibilityLabelledBy',
  'accessibilityHint',
  'accessibilityRole',
  'role',
  'accessibilityState',
  'accessibilityValue',
  'ref',
  'checked',
  'defaultChecked',
  'disabled',
  'required',
  'readOnly',
  'value',
  'name',
  'id',
  'ownerState',
  'classes',
  'className',
  'style',
  'sx',
  'action',
  'autoFocus',
  'indeterminate',
  'indeterminateIcon',
  'onClick',
  'onPress',
  'onChange',
  'onFocus',
  'onBlur',
  'onKeyDown',
  'onKeyUp',
  'onFocusVisible',
  'onPressIn',
  'onPressOut',
  'onLongPress',
  'onHoverIn',
  'onHoverOut',
  'focusRipple',
  'disableRipple',
  'disableTouchRipple',
  'focusableWhenDisabled',
  'suppressFocusVisible',
  'href',
  'to',
  'LinkComponent',
  'android_ripple',
  'android_disableSound',
  'hitSlop',
  'pressRetentionOffset',
]);
function viewProps(props: object) {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !rootOnlyOmissions.has(key)));
}
export interface NativeCheckedVisualState extends NativeCheckedState {
  pressed: boolean;
  hovered: boolean;
  focusVisible: boolean;
}
export interface NativeCheckedPresentation {
  owner: Record<string, unknown>;
  role: 'switch';
  bubbleChange?: boolean;
  style: (state: NativeCheckedVisualState, native: NativeStyle | null | undefined) => NativeStyle;
  mergeStyle?: (
    base: NativeStyle,
    authored: NativeStyle | null | undefined,
    slot: NativeStyle | null | undefined,
  ) => NativeStyle;
  content: (state: NativeCheckedVisualState, style: NativeStyle) => React.ReactNode;
  wrap: (content: React.ReactElement, state: NativeCheckedVisualState) => React.ReactElement;
}
interface CoreProps {
  kind: 'checkbox' | 'radio';
  props: CheckboxProps | RadioProps;
  forwarded: React.ForwardedRef<ViewInstance>;
  presentation?: NativeCheckedPresentation;
}
export function NativeCheckedControl({ kind, props, forwarded, presentation }: CoreProps) {
  const form = useContext(FormContext),
    group = useContext(RadioContext),
    theme = useTheme();
  const { width } = useWindowDimensions();
  const parent = useContext(NativeModalParentContext),
    overlayReady = useContext(NativeOverlayReadiness),
    menuReady = useContext(NativeMenuFocusReadiness);
  const {
    checked: authored,
    defaultChecked,
    disabled: disabledProp,
    readOnly: readOnlyProp,
    required: requiredProp,
    value,
    name: nameProp,
    id: idProp,
    inputRef,
    inputProps: legacy,
    slots = {},
    slotProps = {},
    icon,
    checkedIcon,
    color = 'primary',
    size = 'medium',
    disableRipple,
    disableFocusRipple = false,
    edge = false,
    classes,
    className,
    style,
    sx,
    component,
    action,
    ...other
  } = props;
  if (classes || className)
    diagnostic(
      'checked-classes',
      'Native checked-control class helpers identify slots; use sx, slot props and native styles for presentation.',
    );
  const isRadio = kind === 'radio',
    radioGroup = isRadio ? group : undefined,
    parentDirection = radioGroup?.direction ?? theme.direction;
  const wrapperOwner = presentation?.owner ?? {
    ...props,
    color,
    size,
    disableRipple: disableRipple ?? false,
    ...(isRadio
      ? { disabled: disabledProp ?? form?.disabled ?? false }
      : { indeterminate: (props as CheckboxProps).indeterminate ?? false }),
  };
  const root =
    (resolveSlotProps(slotProps.root as any, wrapperOwner) as Partial<NativeCheckedRootProps>) ??
    {};
  const input = {
    ...legacy,
    ...resolveSlotProps(slotProps.input as any, wrapperOwner),
  } as NativeCheckedInputProps;
  if (input.type != null && input.type !== kind)
    throw new Error('MUI Native: checked input slot type must match its control.');
  const rawChecked =
    root.checked !== undefined
      ? root.checked
      : authored !== undefined
        ? authored
        : radioGroup
          ? equalRadioValue(radioGroup.value, value)
          : undefined;
  const [selected, setSelected] = useControlled(
    rawChecked,
    Boolean(root.defaultChecked ?? defaultChecked),
  );
  const actual = Boolean(input.checked !== undefined ? input.checked : selected);
  const controllerDisabled = Boolean(root.disabled ?? disabledProp ?? form?.disabled ?? false);
  const disabled = controllerDisabled || Boolean(input.disabled);
  const readOnly = Boolean(input.readOnly ?? root.readOnly ?? readOnlyProp),
    required = Boolean(input.required ?? root.required ?? requiredProp);
  const mixed = !isRadio && Boolean((props as CheckboxProps).indeterminate);
  const name = input.name ?? root.name ?? nameProp ?? radioGroup?.name ?? '',
    id = input.id ?? root.id ?? idProp ?? '';
  const rawValue =
    input.value !== undefined ? input.value : root.value !== undefined ? root.value : value;
  const nativeValue = valueString(rawValue),
    node = useRef<ViewInstance | null>(null),
    outer = useRef<ViewInstance | null>(null);
  const mounted = useRef(true),
    proposal = useRef<NativeCheckedTarget | null>(null),
    blockedSpace = useRef(false);
  const [hovered, setHovered] = useState(false),
    [focusVisible, setFocusVisible] = useState(false),
    [pressed, setPressed] = useState(false);
  const state: NativeCheckedState = {
    checked: actual,
    disabled,
    readOnly,
    required,
    indeterminate: mixed,
    value: nativeValue,
    name,
    id,
    node: node.current,
  };
  const latest = useRef(state);
  useInsertionEffect(() => {
    latest.current = state;
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const eligible = useMenuEvent(() => {
    const top = manager.top(),
      target = node.current;
    return (
      mounted.current &&
      Boolean(target) &&
      target!.isConnected !== false &&
      parent?.open !== false &&
      parent?.presented !== false &&
      overlayReady &&
      menuReady &&
      (!top || top.contains(target!))
    );
  });
  const currentTarget = useMenuEvent(
    (checked = latest.current.checked): NativeCheckedTarget => ({
      ...latest.current,
      checked,
      type: kind,
      node: node.current,
    }),
  );
  const focus = useMenuEvent(() => {
    if (!latest.current.disabled && eligible()) node.current?.focus();
  });
  const blur = useMenuEvent(() => node.current?.blur());
  const baseAction = useRef<import('./buttonBase').ButtonBaseActions | null>(null);
  useImperativeHandle(
    root.action ?? action,
    () => ({
      focusVisible: () => {
        if (!latest.current.disabled && eligible()) baseAction.current?.focusVisible();
      },
    }),
    [eligible],
  );
  useLayoutEffect(() => form?.registerInput?.(id, focus), [form?.registerInput, id, focus]);
  const handle = useMemo(() => {
    const object = { focus, blur } as NativeCheckedInputHandle;
    for (const key of [
      'checked',
      'value',
      'indeterminate',
      'name',
      'id',
      'type',
      'disabled',
      'readOnly',
      'required',
      'node',
    ] as const)
      Object.defineProperty(object, key, {
        get: () => (key === 'type' ? kind : (proposal.current ?? currentTarget())[key]),
      });
    return object;
  }, [focus, blur, currentTarget, kind]);
  useImperativeHandle(inputRef, () => handle, [handle]);
  const sourcePrevented = (source: any) =>
    source.defaultPrevented ||
    source.isDefaultPrevented?.() ||
    source.nativeEvent?.defaultPrevented;
  const delivered = useRef(new WeakSet<object>());
  const change = useMenuEvent(
    (
      source: ButtonBaseActivationEvent | NativeCheckedChangeEvent,
      requested?: boolean,
      click = true,
    ) => {
      const token = source.nativeEvent ?? source;
      if (token && typeof token === 'object') {
        if (delivered.current.has(token)) return;
        delivered.current.add(token);
      }
      if (
        !eligible() ||
        latest.current.disabled ||
        ('isComposing' in source && source.isComposing) ||
        ('isCanceled' in source && source.isCanceled) ||
        (source.nativeEvent &&
          'isComposing' in source.nativeEvent &&
          source.nativeEvent.isComposing) ||
        (source.nativeEvent && 'isCanceled' in source.nativeEvent && source.nativeEvent.isCanceled)
      )
        return;
      const previous = latest.current.checked,
        next = requested ?? (isRadio ? true : !previous),
        changed = next !== previous;
      const target = { ...currentTarget(next), type: kind } as NativeCheckedTarget;
      let event = selectionEvent(source, target) as NativeCheckedChangeEvent;
      proposal.current = target;
      try {
        if (click) {
          input.onPress?.(source as any);
          input.onClick?.(event);
          if (!event.isPropagationStopped?.())
            (root.onPress ?? root.onClick ?? props.onPress ?? props.onClick)?.(event);
        }
        if (!mounted.current || (click && !changed)) return;
        if (presentation?.bubbleChange && click) {
          const clickEvent = event;
          let stopped = false;
          event = Object.create(clickEvent);
          Object.defineProperties(event, {
            isPropagationStopped: { value: () => stopped },
            stopPropagation: {
              value: () => {
                stopped = true;
                clickEvent.stopPropagation?.();
              },
            },
          });
        }
        input.onChange?.(event);
        try {
          if (
            !eligible() ||
            latest.current.disabled ||
            latest.current.readOnly ||
            sourcePrevented(event)
          )
            return;
          const checked = Boolean(event.target.checked);
          setSelected(checked);
          if (isRadio) {
            root.onChange?.(event, checked);
            props.onChange?.(event, checked);
            radioGroup?.onChange(event, event.target.value);
          } else
            (presentation?.bubbleChange ? props.onChange : (root.onChange ?? props.onChange))?.(
              event,
              checked,
            );
        } finally {
          if (presentation?.bubbleChange && eligible() && !event.isPropagationStopped?.())
            (root.onChange as ((event: NativeCheckedChangeEvent) => void) | undefined)?.(event);
        }
      } finally {
        proposal.current = null;
      }
    },
  );
  useLabelActivation(
    useMenuEvent((source) => {
      focus();
      change(source);
    }),
  );
  const registry = radioGroup?.registry;
  useSyncExternalStore(registry?.subscribe ?? none, registry?.snapshot ?? zero, zero);
  const radioId = useId(),
    registration = useRef({
      id: radioId,
      node: node.current,
      name,
      checked: actual,
      disabled,
      focus,
      available: eligible,
      activate: (source: ButtonBaseActivationEvent) => change(source, true),
    });
  useInsertionEffect(() => {
    registration.current = {
      id: radioId,
      node: node.current,
      name,
      checked: actual,
      disabled,
      focus,
      available: eligible,
      activate: (source) => change(source, true),
    };
  });
  const registered = useCallback(() => ({ ...registration.current, node: node.current }), []);
  useLayoutEffect(() => registry?.register(radioId, registered), [registry, radioId, registered]);
  useLayoutEffect(() => registry?.refresh());
  const tabIndex =
    input.tabIndex ??
    root.tabIndex ??
    props.tabIndex ??
    (registry ? registry.tabIndex(radioId, name) : 0);
  const inputViewRef = useForkRef(node, input.ref),
    rootRef = useForkRef(outer, forwarded, root.ref);
  const glyphTextRoot = useRef<ViewInstance | null>(null);
  const stateStyle = { pressed, focusVisible, disabled };
  const authoredStyle = StyleSheet.flatten(typeof style === 'function' ? style(stateStyle) : style);
  const slotStyle = StyleSheet.flatten(
    typeof root.style === 'function' ? root.style(stateStyle) : root.style,
  );
  const visualState: NativeCheckedVisualState = {
    ...state,
    checked: Boolean(selected),
    pressed,
    hovered,
    focusVisible,
  };
  const rootStyle = presentation
    ? presentation.style(visualState, StyleSheet.flatten([authoredStyle, slotStyle]))
    : componentStyle(
        theme,
        isRadio ? 'MuiRadio' : 'MuiCheckbox',
        wrapperOwner,
        Object.hasOwn(root, 'sx') ? root.sx : sx,
        {
          width,
          logicalInsets: {
            parentDirection,
            direction: StyleSheet.flatten([authoredStyle, slotStyle])?.direction,
          },
          states: [
            ...(selected ? ['checked'] : []),
            ...(controllerDisabled ? ['disabled'] : []),
            ...(mixed ? ['indeterminate'] : []),
            ...(hovered && !disabled ? ['hover'] : []),
            ...(focusVisible ? ['focusVisible'] : []),
          ],
          overrideKeys: [
            ...(!isRadio && mixed ? ['indeterminate'] : []),
            ...(!isRadio || size !== 'medium' ? [`size${cap(size)}`] : []),
            ...(isRadio || color !== 'default' ? [`color${cap(color)}`] : []),
          ],
          baseStyle: {
            alignSelf: 'flex-start',
            minWidth: 44,
            minHeight: 44,
            padding: 9,
            borderRadius: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            ...(edge
              ? { [edge === 'start' ? 'marginStart' : 'marginEnd']: size === 'small' ? -3 : -12 }
              : {}),
            direction: parentDirection,
            color: theme.palette.text.secondary,
            ...(isRadio ? { '&.Mui-disabled': { color: theme.palette.action.disabled } } : {}),
            ...((theme.palette as any)[color]?.main && color !== 'default'
              ? {
                  ...(!isRadio || !wrapperOwner.disabled
                    ? { '&.Mui-checked': { color: (theme.palette as any)[color].main } }
                    : {}),
                  ...(!isRadio
                    ? {
                        '&.Mui-indeterminate': { color: (theme.palette as any)[color].main },
                        '&.Mui-disabled': { color: theme.palette.action.disabled },
                      }
                    : {}),
                }
              : {}),
            backgroundColor:
              hovered && !disabled && !disableRipple
                ? alpha(
                    (theme.palette as any)[color]?.main ?? theme.palette.action.active,
                    theme.palette.action.hoverOpacity,
                  )
                : 'transparent',
          },
        },
      );
  const computed = presentation?.mergeStyle
    ? presentation.mergeStyle(rootStyle, authoredStyle, slotStyle)
    : mergeNativeStyles(parentDirection, rootStyle, authoredStyle, slotStyle);
  const glyphSize = size === 'small' ? 20 : size === 'large' ? 35 : 24,
    chosen = mixed ? (props as CheckboxProps).indeterminateIcon : selected ? checkedIcon : icon;
  const glyph = presentation ? (
    presentation.content(visualState, computed ?? {})
  ) : chosen === undefined ? (
    <Glyph
      kind={kind}
      checked={Boolean(selected)}
      mixed={mixed}
      size={glyphSize}
      color={computed?.color}
      markColor={theme.palette.background.paper}
    />
  ) : React.isValidElement<any>(chosen) && chosen.type !== View && chosen.type !== Text ? (
    React.cloneElement(chosen as React.ReactElement<{ fontSize?: unknown }>, {
      fontSize: (chosen.props as { fontSize?: unknown }).fontSize ?? size,
    })
  ) : (
    chosen
  );
  const Root = slots.root ?? component ?? View;
  const {
    ref: _inputRef,
    onClick: _inputClick,
    onChange: _inputChange,
    onFocus: _inputFocus,
    onBlur: _inputBlur,
    onKeyDown: _inputDown,
    onKeyUp: _inputUp,
    sx: _inputSx,
    style: _inputStyle,
    ...inputNative
  } = input;
  const {
    ref: _rootRef,
    onClick: _rootClick,
    onPress: _rootPress,
    onChange: _rootChange,
    onFocus: _rootFocus,
    onBlur: _rootBlur,
    onKeyDown: _rootDown,
    onKeyUp: _rootUp,
    style: _rootStyle,
    ...rootNative
  } = root;
  const inputConfig = {
    Component: slots.input ?? NativeCheckedInputSurface,
    props: {
      ...inputNative,
      type: kind,
      checked: actual,
      value: nativeValue,
      name,
      id,
      readOnly,
      required,
      indeterminate: mixed,
      ownerState: wrapperOwner,
      onChange: (source: NativeCheckedChangeEvent) =>
        change(source, Boolean(source.target.checked), false),
    },
  };
  const result = (
    <Root
      {...viewProps(other)}
      {...viewProps(rootNative)}
      {...(Root !== View ? { ownerState: wrapperOwner } : {})}
      ref={rootRef}
      accessible={false}
      focusable={false}
      tabIndex={-1}
      testID={root.testID}
      style={computed}
    >
      <NativeTextScope
        rootRef={glyphTextRoot}
        theme={theme}
        style={[{ color: computed?.color, fontSize: glyphSize }, computed]}
        content={glyph}
      >
        {(_native, content) => (
          <View
            ref={glyphTextRoot}
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {content}
          </View>
        )}
      </NativeTextScope>
      <InputContext.Provider value={inputConfig}>
        <NativeButtonActivationKeys.Provider value={space}>
          <ButtonBase
            component={InputBridge}
            ref={inputViewRef}
            action={baseAction}
            focusable={input.focusable ?? root.focusable ?? props.focusable}
            autoFocus={input.autoFocus ?? root.autoFocus ?? props.autoFocus}
            disabled={disabled}
            disableRipple={root.disableRipple ?? disableRipple}
            disableTouchRipple={root.disableTouchRipple ?? props.disableTouchRipple}
            focusRipple={root.focusRipple ?? props.focusRipple ?? !disableFocusRipple}
            hitSlop={input.hitSlop ?? root.hitSlop ?? props.hitSlop}
            accessibilityRole={
              input.accessibilityRole ??
              input.role ??
              presentation?.role ??
              (isRadio ? 'radio' : 'checkbox')
            }
            nativeID={id || undefined}
            testID={input.testID ?? props.testID}
            accessibilityLabel={
              input['aria-label'] ??
              input.accessibilityLabel ??
              props['aria-label'] ??
              props.accessibilityLabel
            }
            accessibilityLabelledBy={
              input['aria-labelledby'] ??
              input.accessibilityLabelledBy ??
              props['aria-labelledby'] ??
              props.accessibilityLabelledBy
            }
            accessibilityHint={input.accessibilityHint ?? props.accessibilityHint}
            accessibilityState={{
              ...props.accessibilityState,
              ...input.accessibilityState,
              checked: mixed ? 'mixed' : actual,
              disabled,
            }}
            aria-required={required}
            aria-readonly={readOnly}
            tabIndex={tabIndex}
            {...{
              managedKeys: [
                ' ',
                ...(isRadio ? ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] : []),
              ],
            }}
            pressRetentionOffset={
              input.pressRetentionOffset ?? root.pressRetentionOffset ?? props.pressRetentionOffset
            }
            android_disableSound={
              input.android_disableSound ?? root.android_disableSound ?? props.android_disableSound
            }
            android_ripple={input.android_ripple ?? root.android_ripple ?? props.android_ripple}
            onLongPress={(source) => {
              input.onLongPress?.(source);
              (root.onLongPress ?? props.onLongPress)?.(source);
            }}
            onTouchStart={(source) => {
              input.onTouchStart?.(source);
              (root.onTouchStart ?? props.onTouchStart)?.(source);
            }}
            onPointerDownCapture={(source) => {
              input.onPointerDownCapture?.(source);
              (root.onPointerDownCapture ?? props.onPointerDownCapture)?.(source);
            }}
            onPress={(source) => change(source)}
            onKeyDown={(event) => {
              input.onKeyDown?.(event);
              (root.onKeyDown ?? props.onKeyDown)?.(event);
              if (event.key === ' ') blockedSpace.current = sourcePrevented(event);
              if (
                isRadio &&
                registry &&
                !event.defaultPrevented &&
                !event.isComposing &&
                !event.isCanceled &&
                event.target === event.currentTarget &&
                ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
              ) {
                event.preventDefault();
                if (eligible())
                  registry.move(
                    radioId,
                    (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1) *
                      (['ArrowLeft', 'ArrowRight'].includes(event.key) &&
                      directionOf(computed?.direction, parentDirection) === 'rtl'
                        ? -1
                        : 1),
                    buttonActivationEvent(event),
                  );
              }
            }}
            onKeyUp={(event) => {
              input.onKeyUp?.(event);
              (root.onKeyUp ?? props.onKeyUp)?.(event);
              if (event.key === ' ' && blockedSpace.current) {
                blockedSpace.current = false;
                event.preventDefault();
              }
            }}
            onFocus={(source) => {
              if (!eligible() || latest.current.disabled) return;
              const event = selectionEvent(source, { ...currentTarget(), type: kind });
              input.onFocus?.(event);
              if (presentation?.bubbleChange) {
                root.onFocus?.(event);
                if (mounted.current) props.onFocus?.(event);
              } else (root.onFocus ?? props.onFocus)?.(event);
              form?.onFocus?.();
            }}
            onFocusVisible={(source) => {
              if (!eligible() || latest.current.disabled) return;
              setFocusVisible(true);
              props.onFocusVisible?.(source);
            }}
            onBlur={(source) => {
              setFocusVisible(false);
              const event = selectionEvent(source, { ...currentTarget(), type: kind });
              input.onBlur?.(event);
              if (presentation?.bubbleChange) {
                root.onBlur?.(event);
                if (mounted.current) props.onBlur?.(event);
              } else (root.onBlur ?? props.onBlur)?.(event);
              form?.onBlur?.();
            }}
            onHoverIn={(source) => {
              setHovered(true);
              input.onHoverIn?.(source);
              (root.onHoverIn ?? props.onHoverIn)?.(source);
            }}
            onHoverOut={(source) => {
              setHovered(false);
              input.onHoverOut?.(source);
              (root.onHoverOut ?? props.onHoverOut)?.(source);
            }}
            onPressIn={(source) => {
              setPressed(true);
              input.onPressIn?.(source);
              (root.onPressIn ?? props.onPressIn)?.(source);
            }}
            onPressOut={(source) => {
              setPressed(false);
              input.onPressOut?.(source);
              (root.onPressOut ?? props.onPressOut)?.(source);
            }}
            style={(state) => [
              fill,
              { borderRadius: computed?.borderRadius ?? 9999 },
              typeof input.style === 'function' ? input.style(state) : input.style,
            ]}
            sx={input.sx}
          />
        </NativeButtonActivationKeys.Provider>
      </InputContext.Provider>
    </Root>
  );
  return presentation ? presentation.wrap(result, visualState) : result;
}
export const Checkbox: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<CheckboxProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, CheckboxProps>(function Checkbox(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiCheckbox' });
  return <NativeCheckedControl kind="checkbox" props={props} forwarded={ref} />;
});
export const Radio: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<RadioProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, RadioProps>(function Radio(inProps, ref) {
  const props = useDefaultProps({ props: inProps, name: 'MuiRadio' });
  return <NativeCheckedControl kind="radio" props={props} forwarded={ref} />;
});
