/* Component composition adapts MIT-licensed Material UI 9.5.0 Autocomplete.
 * Copyright (c) 2014 Call-Em-All. See NOTICE and upstream/reuse.json.
 * Native adaptation copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import React, { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { InteractiveView } from '@altroo/mui-native-host';
import {
  useDefaultProps,
  resolveSlotProps,
  componentStyle,
  NativeTextScope,
  useNativeTextRootRef,
  useNativeTextContext,
  nativeTextStyleContext,
  isNativeTextStyleProperty,
  alpha,
  diagnostic,
  type NativeStyle,
  type SxProps,
} from '@altroo/mui-native-system';
import { useTheme } from './themeProvider';
import { useForkRef } from './utils';
import { useNativeAutocomplete } from './useNativeAutocomplete';
import { ButtonBase } from './buttonBase';
import { IconButton } from './buttons';
import { Chip } from './chip';
import { Paper } from './layout';
import { Popper } from './popper';
import { Typography } from './typography';
import { autocompleteClasses } from './autocompleteClasses';
import type {
  AutocompleteProps,
  AutocompleteOwnerState,
  NativeAutocompleteComponent,
  NativeAutocompleteSlotProps,
  NativeAutocompleteListboxSlotProps,
} from './autocompleteTypes';
import type {
  NativeAutocompleteOptionProps,
  AutocompleteGroupedOption,
} from './useAutocompleteTypes';
export * from './autocompleteTypes';
export * from './autocompleteClasses';
export { createFilterOptions } from './autocompleteValues';
export type {
  AutocompleteChangeDetails,
  AutocompleteChangeReason,
  AutocompleteCloseReason,
  AutocompleteInputChangeReason,
  AutocompleteMappedValue,
  AutocompleteValue,
} from './useAutocompleteTypes';
type RuntimeProps = AutocompleteProps<any, boolean, boolean, boolean, any, any>;
const viewStyle = (value: StyleProp<NativeStyle>): StyleProp<ViewStyle> => {
  const flat = StyleSheet.flatten(value);
  return (
    flat &&
    Object.fromEntries(Object.entries(flat).filter(([key]) => !isNativeTextStyleProperty(key)))
  );
};
const DefaultRoot = forwardRef<ViewInstance, NativeAutocompleteSlotProps>(function DefaultRoot(
  { ownerState, className, sx, style, ...props },
  ref,
) {
  return <InteractiveView {...props} ref={ref} style={viewStyle(style)} />;
});
const DefaultStatus = forwardRef<ViewInstance, NativeAutocompleteSlotProps>(function DefaultStatus(
  { ownerState, className, sx, style, ...props },
  ref,
) {
  return <View {...props} ref={ref} style={viewStyle(style)} />;
});
const DefaultListbox = forwardRef<any, NativeAutocompleteListboxSlotProps>(function DefaultListbox(
  { ownerState, className, sx, ...props },
  ref,
) {
  return <ScrollView {...props} ref={ref} />;
});
// An item is a component boundary so caller refs can be composed with a
// stable hook lifecycle for every selected Chip, including React 19 cleanup.
function SelectedChip({
  Component,
  bindings,
  external,
  ...props
}: {
  Component: React.ComponentType<any>;
  bindings: any;
  external: any;
  label: React.ReactNode;
  size: string;
  ownerState?: unknown;
  className?: string;
}) {
  const ref = useForkRef(bindings.ref, external.ref);
  const style = external.style;
  return (
    <Component
      {...bindings}
      {...props}
      {...external}
      ref={ref}
      onFocus={(event: any) => {
        bindings.onFocus?.(event);
        external.onFocus?.(event);
      }}
      style={
        typeof style === 'function'
          ? (state: any) => [bindings.style, style(state)]
          : [bindings.style, style]
      }
    />
  );
}
// These two elementary shapes use native views, avoiding a material -> icons ->
// material dependency cycle or an SVG installation requirement for Autocomplete.
function Indicator({ clear = false }: { clear?: boolean }) {
  const theme = useTheme(),
    parent = useNativeTextContext();
  const color = parent?.style.color ?? theme.palette.action.active;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
    >
      {clear ? (
        <>
          <View
            style={{
              position: 'absolute',
              width: 15,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 15,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </>
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 5,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
            marginTop: 2,
          }}
        />
      )}
    </View>
  );
}
const hookKeys = new Set([
  'unstable_classNamePrefix',
  'unstable_isActiveElementInListbox',
  'autoComplete',
  'autoHighlight',
  'autoSelect',
  'blurOnSelect',
  'clearOnBlur',
  'clearOnEscape',
  'componentName',
  'id',
  'defaultValue',
  'disableClearable',
  'disableCloseOnSelect',
  'disabledItemsFocusable',
  'disableListWrap',
  'filterOptions',
  'filterSelectedOptions',
  'freeSolo',
  'getOptionDisabled',
  'getOptionKey',
  'getOptionValue',
  'getOptionLabel',
  'groupBy',
  'handleHomeEndKeys',
  'includeInputInList',
  'inputValue',
  'isOptionEqualToValue',
  'multiple',
  'onChange',
  'onClose',
  'onHighlightChange',
  'onInputChange',
  'onOpen',
  'open',
  'openOnFocus',
  'readOnly',
  'resetHighlightOnMouseLeave',
  'selectOnFocus',
  'value',
]);

export const Autocomplete = forwardRef<ViewInstance, RuntimeProps>(
  function Autocomplete(inProps, forwarded) {
    const props = useDefaultProps({ props: inProps, name: 'MuiAutocomplete' });
    const {
      options,
      disabled = false,
      disablePortal = false,
      forcePopupIcon = 'auto',
      fullWidth = false,
      getLimitTagsText = (more) => '+' + more,
      loading = false,
      loadingText = 'Loading…',
      limitTags = -1,
      noOptionsText = 'No options',
      openText = 'Open',
      closeText = 'Close',
      clearText = 'Clear',
      clearIcon = <Indicator clear />,
      popupIcon = <Indicator />,
      renderInput,
      renderGroup,
      renderOption,
      renderValue,
      size = 'medium',
      slots = {},
      slotProps = {},
      classes,
      className,
      sx,
      style,
      ...rest
    } = props;
    const state = useNativeAutocomplete({ ...props, options });
    const {
      popupOpen,
      focused,
      focusedItem,
      dirty,
      expanded,
      groupedOptions,
      anchorEl,
      inputValue,
      value,
      native,
    } = state;
    const theme = useTheme(),
      textParent = useNativeTextContext(),
      { width } = useWindowDimensions();
    const hasClearIcon = !props.disableClearable && !disabled && dirty && !props.readOnly;
    const hasPopupIcon = (!props.freeSolo || forcePopupIcon === true) && forcePopupIcon !== false;
    const owner: AutocompleteOwnerState<any, boolean, boolean, boolean, any, any> = {
      ...props,
      disabled,
      disablePortal,
      expanded,
      focused,
      fullWidth,
      getOptionLabel: props.getOptionLabel ?? ((option) => option?.label ?? option),
      hasClearIcon,
      hasPopupIcon,
      inputFocused: focusedItem === -1,
      popupOpen,
      size,
    };
    const root = resolveSlotProps(slotProps.root, owner) ?? {},
      listbox = resolveSlotProps(slotProps.listbox, owner) ?? {},
      chip = resolveSlotProps(slotProps.chip, owner) ?? {},
      clear = resolveSlotProps(slotProps.clearIndicator, owner) ?? {},
      popup = resolveSlotProps(slotProps.popupIndicator, owner) ?? {},
      paper = resolveSlotProps(slotProps.paper, owner) ?? {},
      popper = resolveSlotProps(slotProps.popper, owner) ?? {},
      status = resolveSlotProps(slotProps.status, owner) ?? {};
    const states = [
      ...(focused ? ['focused'] : []),
      ...(expanded ? ['expanded'] : []),
      ...(disabled ? ['disabled'] : []),
    ];
    const named = (
      slot: string,
      base: SxProps = {},
      ownSx?: SxProps,
      extra: string[] = [],
      keys: string[] = [],
    ) =>
      componentStyle(theme, 'MuiAutocomplete', { ...owner }, ownSx, {
        ...nativeTextStyleContext(textParent, style, theme),
        width,
        rootSlot: slot,
        slot,
        skipVariants: slot !== 'root',
        states: [...(slot === 'root' ? states : []), ...extra],
        overrideKeys: keys,
        baseStyle: base,
      });
    const rootStyle = [
      named(
        'root',
        { minWidth: 0, ...(fullWidth ? { width: '100%' } : {}) },
        Object.hasOwn(root, 'sx') ? root.sx : sx,
        [],
        [
          ...(fullWidth ? ['fullWidth'] : []),
          ...(hasClearIcon ? ['hasClearIcon'] : []),
          ...(hasPopupIcon ? ['hasPopupIcon'] : []),
        ],
      ),
      style,
      root.style,
    ];
    const direction =
      StyleSheet.flatten(rootStyle)?.direction === 'rtl'
        ? 'rtl'
        : StyleSheet.flatten(rootStyle)?.direction === 'ltr'
          ? 'ltr'
          : textParent?.style.writingDirection === 'rtl'
            ? 'rtl'
            : theme.direction;
    if (classes || className || root.className)
      diagnostic(
        'autocomplete-classes',
        'Autocomplete class helpers identify slots; use native styles, sx or theme overrides.',
      );
    const Root = (slots.root ?? DefaultRoot) as React.ComponentType<any>,
      Listbox = (slots.listbox ?? DefaultListbox) as React.ComponentType<any>,
      ChipSlot = (slots.chip ?? Chip) as React.ComponentType<any>,
      Clear = (slots.clearIndicator ?? IconButton) as React.ComponentType<any>,
      Popup = (slots.popupIndicator ?? IconButton) as React.ComponentType<any>,
      Status = (slots.status ?? DefaultStatus) as React.ComponentType<any>,
      PaperSlot = (slots.paper ?? Paper) as React.ComponentType<any>,
      PopperSlot = (slots.popper ?? Popper) as React.ComponentType<any>;
    const rootRef = useForkRef(forwarded, root.ref);
    const { root: scopeRoot, ref: scopeRef } = useNativeTextRootRef(rootRef);
    const listBindings = state.getListboxProps(listbox);
    const listRef = useForkRef(listBindings.ref, listbox.ref);
    const [anchorWidth, setAnchorWidth] = useState<number>();
    const anchorGeneration = useRef(0);
    const measureAnchor = useCallback((node: ViewInstance | null) => {
      const generation = ++anchorGeneration.current;
      node?.measure((_x, _y, measuredWidth) => {
        if (anchorGeneration.current === generation && Number.isFinite(measuredWidth))
          setAnchorWidth(measuredWidth);
      });
      return () => {
        if (anchorGeneration.current === generation) anchorGeneration.current++;
      };
    }, []);
    const anchorRef = useForkRef(state.setAnchorEl, measureAnchor);
    const previousOptions = useRef<{ options: any[]; grouped: boolean }>({
      options: [],
      grouped: false,
    });
    const wasOpen = useRef(false),
      grouped = Boolean(props.groupBy);
    // Exit transitions keep the last nonempty collection and its grouping mode.
    // Cached rows remain visually stable, but cannot select a stale option.
    const rendered = popupOpen ? { options: groupedOptions, grouped } : previousOptions.current;
    useLayoutEffect(() => {
      if (popupOpen && !wasOpen.current) previousOptions.current = { options: [], grouped };
      wasOpen.current = popupOpen;
      if (popupOpen && groupedOptions.length)
        previousOptions.current = { options: groupedOptions, grouped };
    }, [popupOpen, groupedOptions, grouped]);
    const tagClass = [
      autocompleteClasses.tag,
      size === 'small' ? autocompleteClasses.tagSizeSmall : autocompleteClasses.tagSizeMedium,
    ].join(' ');
    const itemProps = (args?: { index?: number; disabled?: boolean }) => ({
      className: tagClass,
      _muiNativeClassName: tagClass,
      disabled: disabled || Boolean(args?.disabled),
      ...state.getItemProps(args),
      style: named(
        'tag',
        { margin: 3, maxWidth: '100%' },
        undefined,
        [],
        [size === 'small' ? 'tagSizeSmall' : 'tagSizeMedium'],
      ),
    });
    let startAdornment: React.ReactNode;
    if (props.multiple && value.length) {
      startAdornment = renderValue
        ? renderValue(value, itemProps as any, owner)
        : value.map((item: any, index: number) => {
            const {
              key,
              className: itemClass,
              ...bindings
            } = itemProps({ index, disabled: disabled || Boolean(chip.disabled) });
            const resolved = state.getOptionFromValue(item);
            return (
              <SelectedChip
                key={key}
                Component={ChipSlot}
                label={resolved ? owner.getOptionLabel(resolved.option) : ''}
                size={size}
                bindings={bindings}
                external={chip}
                {...(slots.chip ? { className: itemClass, ownerState: owner } : {})}
              />
            );
          });
    } else if (!props.multiple && renderValue && value != null)
      startAdornment = renderValue(value, itemProps as any, owner);
    if (
      limitTags > -1 &&
      Array.isArray(startAdornment) &&
      !focused &&
      startAdornment.length > limitTags
    ) {
      const more = startAdornment.length - limitTags;
      // Never splice a renderer-owned array; it may be reused or frozen by its owner.
      startAdornment = [
        ...startAdornment.slice(0, limitTags),
        <Typography key="more" style={named('tag', { margin: 3 })}>
          {getLimitTagsText(more)}
        </Typography>,
      ];
    }
    const clearBindings = state.getClearProps(),
      popupBindings = state.getPopupIndicatorProps();
    const control = (kind: 'clearIndicator' | 'popupIndicator') => {
      const isClear = kind === 'clearIndicator',
        Component = isClear ? Clear : Popup,
        external = isClear ? clear : popup,
        bindings = isClear ? clearBindings : popupBindings;
      const { sx: slotSx, style: slotStyle, className: slotClass, ...externalProps } = external;
      const base = named(
        kind,
        {
          width: 44,
          height: 44,
          padding: 0,
          color: theme.palette.action.active,
          ...(!isClear && popupOpen ? { transform: [{ rotate: '180deg' }] } : {}),
        },
        slotSx,
        [],
        !isClear && popupOpen ? ['popupIndicatorOpen'] : [],
      );
      const metadata = slotClass ?? autocompleteClasses[kind];
      return (
        <Component
          {...bindings}
          {...externalProps}
          disabled={Boolean(bindings.disabled) || disabled || Boolean(external.disabled)}
          accessibilityLabel={
            external.accessibilityLabel ?? (isClear ? clearText : popupOpen ? closeText : openText)
          }
          onPressIn={(event: any) => {
            bindings.onPressIn?.(event);
            external.onPressIn?.(event);
          }}
          style={
            typeof slotStyle === 'function'
              ? (visual: any) => [base, slotStyle(visual)]
              : [base, slotStyle]
          }
          {...((isClear ? slots.clearIndicator : slots.popupIndicator)
            ? {
                ownerState: owner,
                className: metadata,
                _muiNativeClassName: slotClass == null ? metadata : undefined,
              }
            : {})}
        >
          {isClear ? clearIcon : popupIcon}
        </Component>
      );
    };
    const endAdornment =
      hasClearIcon || hasPopupIcon ? (
        <View
          style={viewStyle(
            named('endAdornment', {
              position: 'absolute',
              end: 0,
              top: 0,
              bottom: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }),
          )}
        >
          {hasClearIcon ? control('clearIndicator') : null}
          {hasPopupIcon ? control('popupIndicator') : null}
        </View>
      ) : undefined;
    const optionRow = (option: any, index: number) => {
      const bindings = state.getOptionProps({ option, index });
      const highlighted = native.highlightedIndex === index;
      const selected = bindings['aria-selected'];
      const activeStates = [
        ...(selected ? ['selected'] : []),
        ...(highlighted ? ['focused'] : []),
        ...(highlighted && native.highlightReason === 'keyboard' ? ['focusVisible'] : []),
        ...(bindings.disabled ? ['disabled'] : []),
      ];
      const optionStyle = named(
        'option',
        {
          ...theme.typography.body1,
          minHeight: 48,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 6,
          paddingBottom: 6,
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
          backgroundColor: selected
            ? alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            : 'transparent',
          ...(highlighted
            ? {
                backgroundColor: selected
                  ? alpha(
                      theme.palette.primary.main,
                      theme.palette.action.selectedOpacity + theme.palette.action.focusOpacity,
                    )
                  : theme.palette.action.focus,
              }
            : {}),
          ...(bindings.disabled ? { opacity: theme.palette.action.disabledOpacity } : {}),
        },
        undefined,
        activeStates,
      );
      const classMetadata = [autocompleteClasses.option, classes?.option, bindings.className]
        .filter(Boolean)
        .join(' ');
      const optionProps: NativeAutocompleteOptionProps = {
        ...bindings,
        className: classMetadata,
        _muiNativeClassName: classMetadata,
        style: optionStyle,
        pointerEvents: popupOpen ? bindings.pointerEvents : 'none',
        onClick: (event) => {
          if (popupOpen) bindings.onClick?.(event);
        },
      };
      if (renderOption)
        return renderOption(optionProps, option, { selected, index, inputValue }, owner);
      const { key, ...nativeProps } = optionProps;
      return (
        <ButtonBase key={key} {...nativeProps}>
          <Typography>{owner.getOptionLabel(option)}</Typography>
        </ButtonBase>
      );
    };
    useLayoutEffect(() => {
      native.collection.setGroups(
        popupOpen && rendered.grouped && !renderGroup
          ? rendered.options.map((group: AutocompleteGroupedOption<any>) => ({
              index: group.index,
              key: group.group,
            }))
          : [],
      );
    }, [popupOpen, rendered.grouped, rendered.options, renderGroup, native.collection]);
    const stickyHeaderIndices: number[] = [];
    const rows = rendered.options.flatMap((option, index) => {
      if (!rendered.grouped) return [optionRow(option, index)];
      const group = option as AutocompleteGroupedOption<any>;
      const children = group.options.map((entry, offset) => optionRow(entry, group.index + offset));
      if (renderGroup) return [renderGroup({ key: group.key, group: group.group, children })];
      stickyHeaderIndices.push(index * 2);
      return [
        <View
          key={'header-' + group.key}
          onLayout={(event) => {
            if (native.collection.updateGroupHeight(group.index, event.nativeEvent.layout.height))
              native.collection.scrollHighlight(
                native.highlightedIndex,
                native.highlightReason,
                true,
                true,
              );
          }}
          style={viewStyle(
            named('groupLabel', {
              backgroundColor: theme.palette.background.paper,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }),
          )}
        >
          <Typography variant="body2" color="text.secondary">
            {group.group}
          </Typography>
        </View>,
        <View key={'group-' + group.key} style={viewStyle(named('groupUl'))}>
          {children}
        </View>,
      ];
    });
    const rootOther = Object.fromEntries(
      Object.entries(rest).filter(([key]) => !hookKeys.has(key)),
    );
    const {
      sx: rootSx,
      style: ignoredRootStyle,
      ref: ignoredRootRef,
      ownerState: ignoredOwner,
      className: ignoredClass,
      ...rootExternal
    } = root;
    const rootBindings = state.getRootProps({ ...rootOther, ...rootExternal });
    const params = {
      id: state.id,
      disabled,
      fullWidth: props.fullWidth ?? true,
      size: size === 'small' ? ('small' as const) : undefined,
      slotProps: {
        inputLabel: state.getInputLabelProps(),
        input: {
          ref: anchorRef,
          className: autocompleteClasses.inputRoot,
          startAdornment,
          endAdornment,
          style: viewStyle(
            named('inputRoot', {
              flexWrap: 'wrap',
              padding: size === 'small' ? 4 : 8,
              paddingEnd: (hasClearIcon ? 44 : 0) + (hasPopupIcon ? 44 : 0) + 8,
            }),
          ),
          slotProps: {
            root: {
              onLayout: (event: any) => setAnchorWidth(event.nativeEvent.layout.width),
              onTouchEnd: (event: any) => {
                if (!disabled && event.target === event.currentTarget) native.focusInputArea();
              },
            },
          },
        },
        htmlInput: {
          ...state.getInputProps(),
          style: named(
            'input',
            {
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: 30,
              minWidth: 30,
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: size === 'small' ? 4 : 8,
              paddingBottom: size === 'small' ? 4 : 8,
            },
            undefined,
            focusedItem === -1 ? ['inputFocused'] : [],
          ),
        },
      },
    };
    const hasPopupContent =
      rendered.options.length > 0 || loading || !props.freeSolo || popper.keepMounted;
    const { sx: popperSx, style: popperStyle, className: popperClass, ...popperProps } = popper;
    const { sx: paperSx, style: paperStyle, ...paperProps } = paper;
    const {
      sx: statusSx,
      style: statusStyle,
      className: statusClass,
      ownerState: statusOwner,
      ...statusProps
    } = status;
    return (
      <NativeTextScope rootRef={scopeRoot} theme={theme} style={rootStyle}>
        {() => (
          <>
            <Root
              {...rootBindings}
              ref={scopeRef}
              style={rootStyle}
              {...(slots.root
                ? {
                    ownerState: owner,
                    className: root.className ?? className ?? autocompleteClasses.root,
                  }
                : {})}
            >
              {renderInput(params)}
            </Root>
            {anchorEl && hasPopupContent ? (
              <PopperSlot
                role="presentation"
                placement="bottom-start"
                direction={direction}
                disablePortal={disablePortal}
                anchorEl={anchorEl}
                open={popupOpen}
                {...popperProps}
                pointerEvents={popupOpen ? popper.pointerEvents : 'none'}
                accessibilityElementsHidden={!popupOpen}
                importantForAccessibility={
                  popupOpen ? popper.importantForAccessibility : 'no-hide-descendants'
                }
                style={[
                  named(
                    'popper',
                    { zIndex: 1300, width: anchorWidth },
                    popperSx,
                    [],
                    disablePortal ? ['popperDisablePortal'] : [],
                  ),
                  popperStyle,
                ]}
                {...(slots.popper
                  ? { ownerState: owner, className: popperClass ?? autocompleteClasses.popper }
                  : {})}
              >
                <PaperSlot
                  {...(slots.paper ? { ownerState: owner } : {})}
                  elevation={1}
                  {...paperProps}
                  style={[named('paper', { overflow: 'hidden' }, paperSx), paperStyle]}
                >
                  <Status
                    {...statusProps}
                    accessibilityLiveRegion={status.accessibilityLiveRegion ?? 'polite'}
                    style={[named('status', {}, statusSx), statusStyle]}
                    {...(slots.status
                      ? { ownerState: owner, className: statusClass ?? autocompleteClasses.status }
                      : {})}
                  >
                    {loading && rendered.options.length === 0 ? (
                      <Typography
                        style={named('loading', {
                          paddingLeft: 16,
                          paddingRight: 16,
                          paddingTop: 14,
                          paddingBottom: 14,
                          color: theme.palette.text.secondary,
                        })}
                      >
                        {loadingText}
                      </Typography>
                    ) : null}
                    {!loading && !props.freeSolo && rendered.options.length === 0 ? (
                      <Typography
                        style={named('noOptions', {
                          paddingLeft: 16,
                          paddingRight: 16,
                          paddingTop: 14,
                          paddingBottom: 14,
                          color: theme.palette.text.secondary,
                        })}
                      >
                        {noOptionsText}
                      </Typography>
                    ) : null}
                  </Status>
                  {rows.length ? (
                    <Listbox
                      {...listBindings}
                      ref={listRef}
                      ownerState={owner}
                      stickyHeaderIndices={
                        listbox.stickyHeaderIndices ??
                        (renderGroup ? undefined : stickyHeaderIndices)
                      }
                      scrollEventThrottle={listbox.scrollEventThrottle ?? 16}
                      style={[
                        named(
                          'listbox',
                          { maxHeight: 320, flexGrow: 0, paddingTop: 8, paddingBottom: 8 },
                          listbox.sx,
                        ),
                        listbox.style,
                      ]}
                    >
                      {rows}
                    </Listbox>
                  ) : null}
                </PaperSlot>
              </PopperSlot>
            ) : null}
          </>
        )}
      </NativeTextScope>
    );
  },
) as unknown as NativeAutocompleteComponent;
Autocomplete.displayName = 'Autocomplete';
export default Autocomplete;
