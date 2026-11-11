/* Accordion composition, event ordering and slots adapt MIT-licensed Material UI 9.5.0.
 * Copyright (c) MUI contributors. See NOTICE and upstream/accordion.json.
 * Native layout and interaction: Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
 * Details contract observations: upstream/accordion-details.json. */
import React, { createContext, forwardRef, useCallback, useContext, useMemo } from 'react';
import { Text, View, useWindowDimensions, type ViewInstance, type StyleProp } from 'react-native';
import {
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  useNativeRootProps,
  joinClassNames,
  applyNativeTextMetrics,
  nativeStyleTextMetrics,
  resolveSlotProps,
  componentRootStyle,
  type NativeStyle,
  type SxProps,
} from '@altroo/mui-native-system';
import { Paper } from './layout';
import { ButtonBase, type ButtonBaseState, type ButtonBaseActivationEvent } from './buttonBase';
import { Collapse } from './collapse';
import { useControlled } from './formState';
import { useTheme, useComponentStyle, useComponentRootStyle } from './themeProvider';
import { useForkRef } from './utils';
import {
  getAccordionActionsUtilityClass,
  getAccordionUtilityClass,
  getAccordionSummaryUtilityClass,
  getAccordionDetailsUtilityClass,
} from './accordionClasses';
import { mergeNativeRootStyle } from './nativeControlStyles';
import type {
  AccordionProps,
  AccordionRootSlotProps,
  AccordionOwnerState,
  AccordionSummaryProps,
  AccordionSummaryOwnerState,
  AccordionSummaryRootSlotProps,
  NativeAccordionSlotProps,
  AccordionDetailsProps,
  AccordionActionsProps,
} from './accordionTypes';
export * from './accordionTypes';
export * from './accordionClasses';

interface ExpansionContext {
  expanded: boolean;
  disabled: boolean;
  disableGutters: boolean;
  toggle: (event: ButtonBaseActivationEvent) => void;
}
// Only the summary receives this scope. A nested body accordion owns its own state.
const AccordionContext = createContext<ExpansionContext | null>(null);
// Preserve source slot order and the two reads of a truthy authored class getter.
function slotClasses<Slots extends Record<string, readonly (string | false | undefined)[]>>(
  slots: Slots,
  utility: (slot: string) => string,
  supplied?: object,
): Record<keyof Slots, string> {
  const custom = supplied as Record<string, string | undefined> | undefined;
  return Object.fromEntries(
    Object.entries(slots).map(([key, names]) => [
      key,
      names
        .filter((name): name is string => !!name)
        .map((name) => {
          const generated = utility(name);
          return custom?.[name] ? generated + ' ' + custom[name] : generated;
        })
        .join(' '),
    ]),
  ) as Record<keyof Slots, string>;
}
interface FrameProps {
  name: string;
  className?: string;
  slot?: string;
  owner: object;
  resolved?: NativeAccordionSlotProps<any>;
  component?: React.ComponentType<any>;
  base?: SxProps;
  states?: string[];
  overrideKeys?: string[];
  children?: React.ReactNode;
}
const Frame = forwardRef<ViewInstance, FrameProps>(function Frame(
  {
    name,
    className,
    slot = 'root',
    owner,
    resolved = {},
    component: Component = View,
    base,
    states,
    overrideKeys,
    children,
  },
  forwarded,
) {
  const theme = useTheme(),
    parent = useNativeTextContext();
  const {
    sx,
    style,
    className: slotClassName,
    component,
    as,
    ownerState: _ownerState,
    ref: slotRef,
    children: _children,
    id,
    ...native
  } = resolved;
  const ref = useForkRef(forwarded, slotRef);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const Element = Component === View ? (component ?? as ?? View) : Component;
  const fullClassName = joinClassNames(className, slotClassName);
  const computed = useComponentStyle(name, { ...owner }, sx, {
    ...nativeTextStyleContext(parent, style, theme),
    slot,
    rootSlot: slot,
    classes: fullClassName.split(/\s+/).filter(Boolean),
    rootProps: { ...resolved, className: fullClassName, ownerState: owner },
    skipVariants: slot !== 'root',
    states,
    overrideKeys,
    baseStyle: base,
  });
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={[computed, style]} content={children}>
      {(viewStyle, content) => (
        <Element
          {...native}
          nativeID={id ?? native.nativeID}
          ref={scopeRef}
          {...(Element === View || Element === Text
            ? {}
            : { ownerState: owner, className: fullClassName })}
          {...(Component !== View && (component ?? as) ? { as: component ?? as } : {})}
          style={viewStyle}
        >
          {content}
        </Element>
      )}
    </NativeTextScope>
  );
});

export const Accordion: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AccordionProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, AccordionProps>(function Accordion(inProps, forwarded) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordion',
  });
  const {
    children,
    defaultExpanded = false,
    disabled = false,
    disableGutters = false,
    expanded: expandedProp,
    onChange,
    slots = {},
    slotProps = {},
    component,
    sx,
    style,
    classes,
    className,
    ...other
  } = props;
  const [expanded, setExpanded] = useControlled(expandedProp, defaultExpanded);
  const toggle = useCallback(
    (event: ButtonBaseActivationEvent) => {
      setExpanded(!expanded);
      onChange?.(event, !expanded);
    },
    [expanded, onChange, setExpanded],
  );
  const context = useMemo(
    () => ({ expanded, disabled, disableGutters, toggle }),
    [expanded, disabled, disableGutters, toggle],
  );
  const owner: AccordionOwnerState = { ...props, expanded, disabled, disableGutters };
  const composed = slotClasses(
    {
      root: [
        'root',
        !props.square && 'rounded',
        expanded && 'expanded',
        disabled && 'disabled',
        !disableGutters && 'gutters',
      ],
      heading: ['heading'],
      region: ['region'],
    },
    getAccordionUtilityClass,
    classes,
  );
  const root = resolveSlotProps(slotProps.root, owner) ?? {};
  const heading = resolveSlotProps(slotProps.heading, owner) ?? {};
  const transition = resolveSlotProps(slotProps.transition, owner) ?? {};
  const region = resolveSlotProps(slotProps.region, owner) ?? {};
  const {
    sx: rootSx,
    style: rootStyle,
    className: rootSlotClass,
    component: rootComponent,
    as: rootAs,
    ref: slotRef,
    ownerState: _ownerState,
    children: _rootChildren,
    ...rootNative
  } = root;
  const ref = useForkRef(forwarded, slotRef);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  const states = [...(expanded ? ['expanded'] : []), ...(disabled ? ['disabled'] : [])];
  const rootClass = joinClassNames(composed.root, className, rootSlotClass);
  const { computed, authored, programme } = componentRootStyle(
    theme,
    'MuiAccordion',
    { ...owner },
    Object.hasOwn(root, 'sx') ? rootSx : sx,
    preparedStyle,
    {
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: { ...props, ...root, className: rootClass, ownerState: owner },
      width,
      ...nativeTextStyleContext(parent, [style, rootStyle], theme),
      states,
      overrideKeys: [
        ...(!props.square ? ['rounded'] : []),
        ...(!disableGutters ? ['gutters'] : []),
      ],
      baseStyle: {
        position: 'relative',
        direction: theme.direction,
        marginTop: expanded && !disableGutters ? 16 : 0,
        marginBottom: expanded && !disableGutters ? 16 : 0,
        ...(disabled ? { backgroundColor: theme.palette.action.disabledBackground } : {}),
      },
    },
    true,
  );
  // Paper binds retained selectors to the final shared host, including its own classes.
  const rootInline = [authored, rootStyle];
  const rootMerged = mergeNativeRootStyle(
    parent?.direction ?? theme.direction,
    computed,
    rootInline,
  );
  const rootStyleResult =
    applyNativeTextMetrics(rootMerged, computed, nativeStyleTextMetrics([computed, rootInline])) ??
    rootMerged;
  const [summary, ...body] = React.Children.toArray(children);
  if (
    !React.isValidElement<{ id?: string; 'aria-controls'?: string }>(summary) ||
    summary.type === React.Fragment
  )
    throw new Error(
      'MUI Native: Accordion requires a summary element as its first child; use AccordionSummary directly rather than a Fragment.',
    );
  // The private slot keeps its existing runtime contract; public Paper retains
  // its stricter generic root inference at direct call sites.
  const Root = slots.root ?? (Paper as React.ComponentType<AccordionRootSlotProps>),
    Transition = slots.transition ?? Collapse;
  const leaf = rootComponent ?? component ?? rootAs;
  const renderRoot = (viewStyle: StyleProp<NativeStyle>) => (
    <Root
      {...other}
      {...rootNative}
      ref={scopeRef}
      component={leaf}
      {...(Root === View ? {} : { className: rootClass })}
      {...(Root === Paper || Root === View ? {} : { ownerState: owner })}
      style={viewStyle}
    >
      <Frame
        name="MuiAccordion"
        slot="heading"
        className={composed.heading}
        owner={owner}
        resolved={heading}
        component={slots.heading}
      >
        <AccordionContext.Provider value={context}>{summary}</AccordionContext.Provider>
      </Frame>
      <Transition
        in={expanded}
        timeout="auto"
        {...transition}
        {...(Transition === Collapse ? {} : { ownerState: owner })}
      >
        <Frame
          name="MuiAccordion"
          slot="region"
          className={composed.region}
          owner={owner}
          component={slots.region}
          resolved={{
            role: 'region',
            'aria-labelledby': summary.props.id,
            id: summary.props['aria-controls'],
            ...region,
          }}
        >
          {body}
        </Frame>
      </Transition>
    </Root>
  );
  // Paper owns this physical root's text scope; a second scope would resolve em/% twice.
  return Root === Paper ? (
    renderRoot([programme, rootStyle])
  ) : (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={rootStyleResult}>
      {renderRoot}
    </NativeTextScope>
  );
});

export const AccordionSummary: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<AccordionSummaryProps> & React.RefAttributes<ViewInstance>
> = forwardRef<ViewInstance, AccordionSummaryProps>(function AccordionSummary(inProps, forwarded) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionSummary',
  });
  const {
    children,
    expandIcon,
    slots = {},
    slotProps = {},
    sx,
    style,
    classes,
    className,
    focusVisibleClassName,
    onClick,
    onPress,
    ...other
  } = props;
  const context = useContext(AccordionContext);
  const owner: AccordionSummaryOwnerState = {
    ...props,
    expanded: context?.expanded,
    disabled: context?.disabled ?? false,
    disableGutters: context?.disableGutters,
  };
  const composed = slotClasses(
    {
      root: [
        'root',
        owner.expanded && 'expanded',
        owner.disabled && 'disabled',
        !owner.disableGutters && 'gutters',
      ],
      focusVisible: ['focusVisible'],
      content: ['content', owner.expanded && 'expanded'],
      expandIconWrapper: ['expandIconWrapper', owner.expanded && 'expanded'],
    },
    getAccordionSummaryUtilityClass,
    classes,
  );
  const root = resolveSlotProps(slotProps.root, owner) ?? {};
  const content = resolveSlotProps(slotProps.content, owner) ?? {};
  const icon = resolveSlotProps(slotProps.expandIconWrapper, owner) ?? {};
  const {
    sx: rootSx,
    style: rootStyle,
    className: rootSlotClass,
    focusVisibleClassName: rootFocusClass,
    ownerState: _ownerState,
    ref: slotRef,
    onClick: rootClick,
    onPress: rootPress,
    children: _rootChildren,
    as: rootAs,
    component: rootComponent,
    ...rootNative
  } = root;
  const ref = useForkRef(forwarded, slotRef);
  const theme = useTheme(),
    parent = useNativeTextContext(),
    { width } = useWindowDimensions();
  // Presence matters: an explicit undefined replaces generated additional props upstream.
  const merged = {
    disabled: owner.disabled,
    'aria-expanded': owner.expanded,
    ...other,
    ...rootNative,
  };
  const disabled = merged.disabled;
  const ariaExpanded = merged['aria-expanded'];
  const expanded = owner.expanded,
    gutters = !owner.disableGutters;
  const states = [...(expanded ? ['expanded'] : []), ...(owner.disabled ? ['disabled'] : [])];
  const rootClass = joinClassNames(composed.root, className, rootSlotClass);
  const focusClass = Object.hasOwn(root, 'focusVisibleClassName')
    ? rootFocusClass
    : joinClassNames(composed.focusVisible, focusVisibleClassName);
  let cache:
    | { pressed: boolean; focused: boolean; disabled: boolean; style: StyleProp<NativeStyle> }
    | undefined;
  const styled = (state: ButtonBaseState): StyleProp<NativeStyle> => {
    if (
      cache &&
      cache.pressed === state.pressed &&
      cache.focused === state.focusVisible &&
      cache.disabled === state.disabled
    )
      return cache.style;
    const result = componentRootStyle(
      theme,
      'MuiAccordionSummary',
      { ...owner },
      Object.hasOwn(root, 'sx') ? rootSx : sx,
      typeof preparedStyle === 'function' ? preparedStyle(state) : preparedStyle,
      {
        classes: joinClassNames(rootClass, state.focusVisible && focusClass)
          .split(/\s+/)
          .filter(Boolean),
        rootProps: {
          ...props,
          ...root,
          className: rootClass,
          focusVisibleClassName: focusClass,
          disabled,
          'aria-expanded': ariaExpanded,
          ownerState: owner,
        },
        ...nativeTextStyleContext(parent, typeof style === 'function' ? undefined : style, theme),
        width,
        states: [
          ...states,
          ...(state.disabled ? ['disabled'] : []),
          ...(state.focusVisible ? ['focusVisible'] : []),
        ],
        overrideKeys: gutters ? ['gutters'] : [],
        baseStyle: {
          width: '100%',
          minHeight: expanded && gutters ? 64 : 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: theme.spacing(0, 2),
          direction: theme.direction,
          ...(owner.disabled || state.disabled
            ? { opacity: theme.palette.action.disabledOpacity }
            : {}),
          ...(state.focusVisible ? { backgroundColor: theme.palette.action.focus } : {}),
        },
      },
      true,
    );
    const slotInline = typeof rootStyle === 'function' ? rootStyle(state) : rootStyle;
    const inline = [result.authored, slotInline];
    const merged = mergeNativeRootStyle(
      parent?.direction ?? theme.direction,
      result.computed,
      inline,
    );
    const resolvedStyle =
      applyNativeTextMetrics(
        merged,
        result.computed,
        nativeStyleTextMetrics([result.computed, inline]),
      ) ?? merged;
    // Base adds its own classes before resolving these sheets; authored native layers stay separate.
    const output = Root === ButtonBase ? [result.programme, slotInline] : resolvedStyle;
    cache = {
      pressed: state.pressed,
      focused: state.focusVisible,
      disabled: state.disabled,
      style: output,
    };
    return output;
  };
  const Root = slots.root ?? (ButtonBase as React.ComponentType<AccordionSummaryRootSlotProps>);
  return (
    <Root
      focusRipple={false}
      disableRipple
      {...other}
      {...rootNative}
      ref={ref}
      component={rootComponent ?? other.component ?? rootAs}
      className={rootClass}
      {...(Root === ButtonBase
        ? {
            _muiNativeClassName: rootClass,
            _muiNativeClassMetadata: { root: rootClass, focusVisible: focusClass },
          }
        : { focusVisibleClassName: focusClass })}
      {...(Root === ButtonBase ? {} : { ownerState: owner })}
      disabled={disabled}
      aria-expanded={ariaExpanded}
      accessibilityState={{
        ...other.accessibilityState,
        ...rootNative.accessibilityState,
        ...(ariaExpanded !== undefined ? { expanded: ariaExpanded } : {}),
        ...(disabled !== undefined ? { disabled } : {}),
      }}
      style={styled}
      onClick={(event) => {
        if (disabled) return;
        // Slot callbacks precede expansion and authored callbacks, including when prevented.
        (rootPress ?? rootClick)?.(event);
        context?.toggle(event);
        (onPress ?? onClick)?.(event);
      }}
    >
      <Frame
        name="MuiAccordionSummary"
        slot="content"
        className={composed.content}
        owner={owner}
        resolved={content}
        component={slots.content}
        states={states}
        base={{
          flexDirection: 'row',
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          marginTop: expanded && gutters ? 20 : 12,
          marginBottom: expanded && gutters ? 20 : 12,
        }}
      >
        {children}
      </Frame>
      {expandIcon && (
        <Frame
          name="MuiAccordionSummary"
          slot="expandIconWrapper"
          className={composed.expandIconWrapper}
          owner={owner}
          resolved={icon}
          component={slots.expandIconWrapper}
          states={states}
          base={{
            flexShrink: 0,
            color: theme.palette.action.active,
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          {expandIcon}
        </Frame>
      )}
    </Root>
  );
});

interface NativeAccordionDetailsComponent
  extends Omit<
    React.ForwardRefExoticComponent<
      React.PropsWithoutRef<AccordionDetailsProps> & React.RefAttributes<ViewInstance>
    >,
    never
  > {
  (props: AccordionDetailsProps & React.RefAttributes<ViewInstance>): React.JSX.Element;
}
export const AccordionDetails: NativeAccordionDetailsComponent = forwardRef<
  ViewInstance,
  AccordionDetailsProps
>(function AccordionDetails(inProps, ref) {
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(ref);
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionDetails',
  });
  const { classes, className, component: Root = View, children, sx, style, ...native } = props;
  const theme = useTheme(),
    parent = useNativeTextContext();
  const utility = getAccordionDetailsUtilityClass('root');
  // composeClasses intentionally reads an active custom class accessor twice.
  const rootClass = joinClassNames(
    classes?.root ? `${utility} ${classes.root}` : utility,
    className,
  );
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiAccordionDetails',
    props,
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...props,
        ...(props.component ? { as: props.component } : {}),
        className: rootClass,
      },
      baseStyle: { padding: theme.spacing(1, 2, 2) },
    },
  );
  const merged = mergeNativeRootStyle(parent?.direction ?? theme.direction, resolved, authored);
  const computed =
    applyNativeTextMetrics(merged, resolved, nativeStyleTextMetrics([resolved, authored])) ??
    merged;
  return (
    <NativeTextScope rootRef={scopeRoot} theme={theme} style={computed} content={children}>
      {(style, content) => (
        <Root
          {...native}
          {...(Root === View ? {} : { className: rootClass })}
          ref={scopeRef}
          style={style}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
}) as NativeAccordionDetailsComponent;
interface NativeAccordionActionsComponent
  extends React.ForwardRefExoticComponent<
    React.PropsWithoutRef<AccordionActionsProps> & React.RefAttributes<ViewInstance>
  > {
  (props: AccordionActionsProps & React.RefAttributes<ViewInstance>): React.JSX.Element;
}
export const AccordionActions: NativeAccordionActionsComponent = forwardRef<
  ViewInstance,
  AccordionActionsProps
>(function AccordionActions(inProps, ref) {
  const { props, style: preparedStyle } = useNativeRootProps({
    props: inProps,
    name: 'MuiAccordionActions',
  });
  const {
    classes,
    className,
    component: Component = View,
    as,
    ref: slotRef,
    ownerState: _ownerState,
    children,
    disableSpacing = false,
    id,
    sx,
    style,
    ...native
  } = props as AccordionActionsProps & NativeAccordionSlotProps;
  const Root = Component === View ? (as ?? View) : Component;
  const mergedRef = useForkRef(ref, slotRef);
  const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(mergedRef);
  const theme = useTheme(),
    parent = useNativeTextContext();
  const token = (slot: 'root' | 'spacing') => {
    let value = getAccordionActionsUtilityClass(slot);
    // Match composeClasses: a truthy active entry is read once again when appended.
    if (classes && classes[slot]) value += ' ' + classes[slot];
    return value;
  };
  const rootClass = joinClassNames(token('root'), !disableSpacing && token('spacing'), className);
  const owner = { ...props, disableSpacing };
  const { disableSpacing: _disableSpacing, ...styledProps } = props;
  const { computed: resolved, authored } = useComponentRootStyle(
    'MuiAccordionActions',
    owner,
    sx,
    preparedStyle,
    {
      ...nativeTextStyleContext(parent, style, theme),
      slot: 'root',
      overrideKeys: disableSpacing ? [] : ['spacing'],
      classes: rootClass.split(/\s+/).filter(Boolean),
      rootProps: {
        ...styledProps,
        ...(as || Component !== View ? { as: as ?? Component } : {}),
        className: rootClass,
      },
      baseStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 8,
        // Yoga gap preserves caller-owned children and mirrors with the native row direction.
        columnGap: disableSpacing ? 0 : 8,
      },
    },
  );
  // Keep native array precedence: an inline gap does not erase a named columnGap.
  return (
    <NativeTextScope
      rootRef={scopeRoot}
      theme={theme}
      style={[resolved, authored]}
      content={children}
    >
      {(rootStyle, content) => (
        <Root
          {...native}
          nativeID={id ?? native.nativeID}
          {...(Root === View ? {} : { className: rootClass, ownerState: owner })}
          {...(Component !== View && as ? { as } : {})}
          ref={scopeRef}
          style={rootStyle}
        >
          {content}
        </Root>
      )}
    </NativeTextScope>
  );
}) as NativeAccordionActionsComponent;
