/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
  findNodeHandle,
  type TextInputInstance,
  type ViewInstance,
} from 'react-native';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Paper,
  Popper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  InteractiveView,
  type NativeDescendantKey,
  type NativeHostKeyEvent,
} from '@altroo/mui-native-host';

const navigation: readonly NativeDescendantKey[] = [
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Enter',
  'Escape',
];
type Receipt = {
  stage: string;
  key: string;
  source?: string;
  inputTarget: boolean;
  editable?: boolean;
  code: string;
  repeat?: boolean;
};

/** Developer fixture for the native transport, separate from Autocomplete behavior. */
export function KeyboardExamples() {
  const [enabled, setEnabled] = useState(true);
  const [nested, setNested] = useState(false);
  const [portal, setPortal] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [city, setCity] = useState('Rabat');
  const [submissions, setSubmissions] = useState(0);
  const [nativeSubmissions, setNativeSubmissions] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [anchor, setAnchor] = useState<ViewInstance | null>(null);
  const input = useRef<TextInputInstance | null>(null);
  const record = (stage: string, event: NativeHostKeyEvent) => {
    const target = (event.nativeEvent as { target?: number }).target;
    const inputTarget = Boolean(
      input.current && (event.target === input.current || target === findNodeHandle(input.current)),
    );
    setReceipts((previous) =>
      [
        ...previous,
        {
          stage,
          key: event.nativeEvent.key,
          source: event.nativeEvent.muiKeySource,
          inputTarget,
          editable: event.nativeEvent.isEditable,
          code: event.nativeEvent.code,
          repeat: event.nativeEvent.repeat,
        },
      ].slice(-24),
    );
  };
  const editor = (
    <InteractiveView
      testID="keyboard-inner-owner"
      focusable={false}
      managedDescendantKeys={nested ? ['ArrowDown'] : []}
      onKeyDown={(event) => {
        record('inner', event);
        if (nested && event.nativeEvent.key === 'ArrowDown') event.stopPropagation();
      }}
    >
      <TextField
        label="Delivery city"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        inputRef={input}
        fullWidth
        slotProps={{
          htmlInput: {
            testID: 'keyboard-editor',
            showSoftInputOnFocus: false,
            onKeyDown: (event) => record('input', event),
            onKeyUp: (event) => record('input-up', event),
            onSubmitEditing: () => setSubmissions((previous) => previous + 1),
          },
        }}
      />
    </InteractiveView>
  );

  const commandOwner = (
    <InteractiveView
      testID="keyboard-outer-owner"
      focusable={false}
      managedDescendantKeys={enabled ? navigation : []}
      onKeyDownCapture={(event) => record('capture', event)}
      onKeyDown={(event) => {
        record('outer', event);
        if (event.nativeEvent.key === 'Enter') setEnabled(false);
      }}
      onKeyUp={(event) => record('outer-up', event)}
    >
      {portal ? (
        <>
          <Button
            ref={setAnchor}
            variant="outlined"
            onClick={() => input.current?.focus()}
            testID="keyboard-portal-anchor"
          >
            Focus portal editor
          </Button>
          <Popper open={Boolean(anchor)} anchorEl={anchor} placement="bottom-start">
            <Paper sx={{ width: 280, p: 2 }}>{editor}</Paper>
          </Popper>
        </>
      ) : (
        editor
      )}
    </InteractiveView>
  );
  const outsideInput = (
    <TextField
      label="Outside the command owner"
      defaultValue="Native editing"
      fullWidth
      slotProps={{ htmlInput: { testID: 'keyboard-other', showSoftInputOnFocus: false } }}
    />
  );
  const resetButton = (
    <Button
      variant="outlined"
      testID="keyboard-reset"
      onClick={() => {
        // A repeated tap on an already-focused UIKit caret opens its edit menu.
        // Reset focus as well as receipts before the next hardware probe.
        input.current?.blur();
        setReceipts([]);
        setSubmissions(0);
        setNativeSubmissions(0);
        setEnabled(true);
      }}
    >
      Reset receipts
    </Button>
  );
  const receiptText = JSON.stringify({
    enabled,
    nested,
    portal,
    dialog,
    submissions,
    nativeSubmissions,
    receipts,
  });
  const receiptPanel = (
    <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
      <Typography variant="caption">Native command receipts</Typography>
      <Text
        testID="keyboard-receipt"
        numberOfLines={3}
        style={{ fontSize: 10, lineHeight: 14 }}
        accessibilityLabel={receiptText}
      >
        {receiptText}
      </Text>
    </Paper>
  );
  const fields = (
    <Stack spacing={2}>
      {commandOwner}
      {outsideInput}
      {resetButton}
    </Stack>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        testID="keyboard-scene-scroll"
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Stack spacing={2}>
          <Typography variant="h5">Editable keyboard commands</Typography>
          <Typography color="text.secondary">
            Native command transport for composite inputs. This scene does not implement
            Autocomplete.
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <FormControlLabel
                label="Outer commands"
                control={
                  <Switch
                    testID="keyboard-enabled-toggle"
                    checked={enabled}
                    onChange={(_, value) => setEnabled(value)}
                  />
                }
              />
              <FormControlLabel
                label="Inner owner: Arrow Down"
                control={
                  <Switch
                    testID="keyboard-inner-toggle"
                    checked={nested}
                    onChange={(_, value) => setNested(value)}
                  />
                }
              />
              <FormControlLabel
                label="Editor in window Portal"
                control={
                  <Switch
                    testID="keyboard-portal-toggle"
                    checked={portal}
                    onChange={(_, value) => setPortal(value)}
                  />
                }
              />
            </Stack>
          </Paper>
          {!dialog ? (
            <Stack spacing={2}>
              {fields}
              <Stack spacing={1}>
                <Typography variant="caption">Plain React Native editing control</Typography>
                <Paper variant="outlined">
                  <TextInput
                    testID="keyboard-plain-native"
                    accessibilityLabel="Plain native editor"
                    defaultValue="Native"
                    autoCorrect={false}
                    autoCapitalize="none"
                    showSoftInputOnFocus={false}
                    onSubmitEditing={() => setNativeSubmissions((previous) => previous + 1)}
                    style={{ minHeight: 48, padding: 12 }}
                  />
                </Paper>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Enter disables the outer declaration during key-down. Text and unowned keys keep
                their native behavior.
              </Typography>
              <Button
                variant="outlined"
                testID="keyboard-dialog-open"
                onClick={() => {
                  setPortal(false);
                  setDialog(true);
                }}
              >
                Open native dialog
              </Button>
            </Stack>
          ) : null}
        </Stack>
      </ScrollView>
      {!dialog ? receiptPanel : null}
      {dialog ? (
        <Dialog open fullWidth onClose={() => setDialog(false)}>
          <DialogTitle>Native dialog keyboard</DialogTitle>
          <DialogContent>
            {fields}
            {receiptPanel}
          </DialogContent>
          <DialogActions>
            <Button testID="keyboard-dialog-close" onClick={() => setDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </View>
  );
}
