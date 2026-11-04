/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Autocomplete,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  useTheme,
  type AutocompleteRenderInputParams,
  type NativeAutocompleteOptionProps,
  type ChipProps,
} from '@mui/material';
type City = { id: number; city: string; country: string; code: string };
const cities: City[] = [
  { id: 1, city: 'Rabat', country: 'Morocco', code: 'RBA' },
  { id: 2, city: 'Casablanca', country: 'Morocco', code: 'CMN' },
  { id: 3, city: 'Marrakesh', country: 'Morocco', code: 'RAK' },
  { id: 4, city: 'Tangier', country: 'Morocco', code: 'TNG' },
  { id: 5, city: 'Agadir', country: 'Morocco', code: 'AGA' },
  { id: 6, city: 'Paris', country: 'France', code: 'CDG' },
  { id: 7, city: 'Lyon', country: 'France', code: 'LYS' },
  { id: 8, city: 'Marseille', country: 'France', code: 'MRS' },
  { id: 9, city: 'Madrid', country: 'Spain', code: 'MAD' },
  { id: 10, city: 'Barcelona', country: 'Spain', code: 'BCN' },
  { id: 11, city: 'Lisbon', country: 'Portugal', code: 'LIS' },
  { id: 12, city: 'Porto', country: 'Portugal', code: 'OPO' },
];
const modes = [
  'Single',
  'Multiple',
  'Grouped',
  'Free solo',
  'States',
  'Keyboard edge',
  'Dialog',
] as const;
type Mode = (typeof modes)[number];
const label = (option: City | string) => (typeof option === 'string' ? option : option.city);
const identifier = (option: City) => option.id;
// Diagnostics record delivered native focus events; they never request focus.
const FocusReceipt = React.createContext<(value: string) => void>(() => {});
const CatalogChip = React.forwardRef<ViewInstance, ChipProps & { ownerState?: unknown }>(
  function CatalogChip({ ownerState, onFocus, ...props }, ref) {
    const reportFocus = React.useContext(FocusReceipt);
    return (
      <Chip
        {...props}
        ref={ref}
        testID={'autocomplete-chip-' + String(props.label)}
        onFocus={(event) => {
          onFocus?.(event);
          reportFocus('chip:' + String(props.label));
        }}
      />
    );
  },
);
function CityField({ mode }: { mode: Mode }) {
  const theme = useTheme();
  const [value, setValue] = useState<number | string | null>(mode === 'States' ? 1 : null);
  const [selected, setSelected] = useState<number[]>([1, 2]);
  const [lastAction, setLastAction] = useState('No selection yet');
  const [highlighted, setHighlighted] = useState('None');
  const [focusedControl, setFocusedControl] = useState('None');
  const [selectionReceipt, setSelectionReceipt] = useState('None');
  const [disabled, setDisabled] = useState(false),
    [readOnly, setReadOnly] = useState(false),
    [loading, setLoading] = useState(false);
  const options = useMemo(
    () =>
      mode === 'Grouped'
        ? [...cities].sort((left, right) => left.country.localeCompare(right.country))
        : cities,
    [mode],
  );
  const renderInput = (params: AutocompleteRenderInputParams) => (
    <TextField
      {...params}
      label={mode === 'Multiple' ? 'Destinations' : 'Destination'}
      placeholder={mode === 'Free solo' ? 'Search or enter a city' : 'Search cities'}
      helperText={
        mode === 'Free solo'
          ? 'Choose a suggestion or submit your own city.'
          : 'Choose by city name. The stored selection is its numeric ID.'
      }
      slotProps={{
        ...params.slotProps,
        htmlInput: {
          ...params.slotProps.htmlInput,
          testID: 'autocomplete-editor',
          returnKeyType: 'done',
          onFocus: (event) => {
            params.slotProps.htmlInput.onFocus?.(event);
            setFocusedControl('editor');
          },
          onSelectionChange: (event) => {
            params.slotProps.htmlInput.onSelectionChange?.(event);
            const { start, end } = event.nativeEvent.selection;
            setSelectionReceipt(start + ':' + end);
          },
        },
      }}
    />
  );
  const shared = {
    options: loading ? [] : options,
    getOptionValue: identifier,
    getOptionLabel: label,
    autoHighlight: true,
    disabled,
    readOnly,
    loading,
    fullWidth: true,
    noOptionsText: 'No matching cities',
    renderInput,
    slots: { chip: CatalogChip },
    slotProps: {
      clearIndicator: { testID: 'autocomplete-clear' },
      popupIndicator: { testID: 'autocomplete-toggle' },
      listbox: { testID: 'autocomplete-listbox' },
      popper: { testID: 'autocomplete-popup' },
    },
    onHighlightChange: (_: unknown, option: City | null, reason: string) =>
      setHighlighted(option ? option.city + ' (' + reason + ')' : 'None'),
    renderOption: (props: NativeAutocompleteOptionProps, option: City) => {
      const { key, ...bindings } = props;
      return (
        <ButtonBase
          key={key}
          {...bindings}
          testID={'autocomplete-option-' + option.id}
          style={(state) => [
            typeof props.style === 'function' ? props.style(state) : props.style,
            { gap: 12, paddingVertical: 12 },
          ]}
        >
          <View
            style={{
              width: 42,
              paddingVertical: 7,
              borderRadius: 6,
              backgroundColor: theme.palette.action.hover,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" style={{ fontWeight: '600', letterSpacing: 0.6 }}>
              {option.code}
            </Typography>
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="body1">{option.city}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.country}
            </Typography>
          </View>
        </ButtonBase>
      );
    },
  };
  return (
    <View testID={'autocomplete-scene-' + mode} style={{ gap: 20 }}>
      <FocusReceipt.Provider value={setFocusedControl}>
        {mode === 'Multiple' ? (
          <Autocomplete
            {...shared}
            multiple
            filterSelectedOptions
            disableCloseOnSelect
            value={selected}
            onChange={(_, next, reason) => {
              setSelected(next);
              setLastAction(reason + ': ' + next.join(', '));
            }}
            limitTags={2}
          />
        ) : mode === 'Free solo' ? (
          <Autocomplete
            {...shared}
            freeSolo
            value={value}
            onChange={(_, next, reason) => {
              setValue(next);
              setLastAction(reason + ': ' + String(next));
            }}
          />
        ) : (
          <Autocomplete
            {...shared}
            value={typeof value === 'number' ? value : null}
            groupBy={mode === 'Grouped' ? (option) => option.country : undefined}
            getOptionDisabled={mode === 'States' ? (option) => option.id === 3 : undefined}
            onChange={(_, next, reason) => {
              setValue(next);
              setLastAction(reason + ': ' + String(next));
            }}
          />
        )}
      </FocusReceipt.Provider>
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: theme.palette.divider,
          paddingLeft: 12,
          gap: 4,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          SELECTION
        </Typography>
        <Typography testID="autocomplete-selection" variant="body2">
          {lastAction}
        </Typography>
        <Typography testID="autocomplete-highlight" variant="caption" color="text.secondary">
          {highlighted}
        </Typography>
        <Typography testID="autocomplete-focused-control" variant="caption" color="text.secondary">
          {focusedControl}
        </Typography>
        <Typography testID="autocomplete-native-selection" variant="caption" color="text.secondary">
          {selectionReceipt}
        </Typography>
      </View>
      {mode === 'States' ? (
        <View style={{ gap: 4 }}>
          <FormControlLabel
            label="Disabled"
            control={
              <Switch
                testID="autocomplete-disabled"
                checked={disabled}
                onChange={(_, next) => setDisabled(next)}
              />
            }
          />
          <FormControlLabel
            label="Read only"
            control={
              <Switch
                testID="autocomplete-readonly"
                checked={readOnly}
                onChange={(_, next) => setReadOnly(next)}
              />
            }
          />
          <FormControlLabel
            label="Loading"
            control={
              <Switch
                testID="autocomplete-loading"
                checked={loading}
                onChange={(_, next) => setLoading(next)}
              />
            }
          />
          <Typography variant="caption" color="text.secondary">
            Marrakesh is disabled in this example.
          </Typography>
        </View>
      ) : null}
    </View>
  );
}
export function AutocompleteExamples() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('Single'),
    [dialog, setDialog] = useState(false),
    [fullScreen, setFullScreen] = useState(false);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ gap: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 8 }}>
        <Typography variant="overline" color="text.secondary">
          MATERIAL · AUTOCOMPLETE
        </Typography>
        <Typography variant="h5">City search</Typography>
        <Typography variant="body2" color="text.secondary">
          Search cities and choose a destination.
        </Typography>
      </View>
      <ScrollView
        testID="autocomplete-modes"
        style={{ flexGrow: 0, flexShrink: 0 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}
      >
        {modes.map((name) => (
          <Chip
            key={name}
            label={name}
            clickable
            testID={'autocomplete-mode-' + name}
            color={mode === name ? 'primary' : 'default'}
            variant={mode === name ? 'filled' : 'outlined'}
            onClick={() => setMode(name)}
          />
        ))}
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: theme.palette.divider,
          paddingTop: mode === 'Keyboard edge' ? 176 : 24,
          gap: 16,
        }}
      >
        {mode === 'Dialog' ? (
          <>
            <FormControlLabel
              label="Full screen dialog"
              control={
                <Switch
                  testID="autocomplete-dialog-fullscreen"
                  checked={fullScreen}
                  onChange={(_, next) => setFullScreen(next)}
                />
              }
            />
            <Button
              variant="outlined"
              onClick={() => setDialog(true)}
              testID="autocomplete-dialog-open"
            >
              Choose in a dialog
            </Button>
            <Dialog
              open={dialog}
              onClose={() => setDialog(false)}
              fullWidth
              fullScreen={fullScreen}
              slotProps={{
                paper: {
                  testID: 'autocomplete-dialog-paper',
                  // iOS full-screen modals start a new window layout; the
                  // screen's outer SafeAreaView does not inset their content.
                  style:
                    fullScreen && Platform.OS === 'ios'
                      ? { paddingTop: insets.top, paddingBottom: insets.bottom }
                      : undefined,
                },
              }}
            >
              <DialogTitle>Choose a destination</DialogTitle>
              <DialogContent>
                <CityField mode="Dialog" />
              </DialogContent>
              <DialogActions>
                <Button testID="autocomplete-dialog-done" onClick={() => setDialog(false)}>
                  Done
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <CityField key={mode} mode={mode} />
        )}
      </View>
    </ScrollView>
  );
}
