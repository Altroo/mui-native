/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Autocomplete, Button, TextField, Typography, useTheme } from '@mui/material';

const modes = ['native', 'field', 'autocomplete', 'uncontrolled'] as const;
type Mode = (typeof modes)[number];
const labels: Record<Mode, string> = {
  native: 'React Native',
  field: 'TextField',
  autocomplete: 'Autocomplete',
  uncontrolled: 'Uncontrolled',
};
const cities = ['Rabat', 'Casablanca', 'Marrakesh'];

/** Matched cold editors separate native input delivery from composite behavior. */
function InputTrial({ mode, generation }: { mode: Mode; generation: number }) {
  const theme = useTheme();
  const [receipt, setReceipt] = useState({ value: '', count: 0, reason: 'initial' });
  const [authored, setAuthored] = useState<string | null>(null);
  const displayed = authored ?? receipt.value;
  const [selection, setSelection] = useState<string | null>(null);
  const record = (value: string, reason: string) => {
    setAuthored(null);
    setReceipt((previous) => ({ value, reason, count: previous.count + 1 }));
  };
  const editorProps = {
    testID: 'typing-editor',
    autoCorrect: false,
    autoCapitalize: 'none' as const,
    returnKeyType: 'done' as const,
  };
  return (
    <View testID={`typing-scene-${mode}-${generation}`} style={{ gap: 16 }}>
      <Typography variant="subtitle1">{labels[mode]}</Typography>
      {mode === 'native' ? (
        <TextInput
          {...editorProps}
          accessibilityLabel="Destination"
          placeholder="Search or enter a city"
          value={displayed}
          onChange={(event) => record(event.nativeEvent.text, 'input')}
          style={{
            minHeight: 56,
            borderWidth: 1,
            borderRadius: theme.shape.borderRadius,
            borderColor: theme.palette.divider,
            paddingHorizontal: 14,
            color: theme.palette.text.primary,
            fontSize: 16,
          }}
        />
      ) : mode === 'field' ? (
        <TextField
          label="Destination"
          placeholder="Search or enter a city"
          value={displayed}
          onChange={(event) => record(event.target.value, 'input')}
          fullWidth
          slotProps={{ htmlInput: editorProps }}
        />
      ) : (
        <Autocomplete
          freeSolo
          options={cities}
          value={selection}
          onChange={(_, next) => setSelection(next)}
          {...(mode === 'autocomplete' ? { inputValue: displayed } : {})}
          onInputChange={(_, next, reason) => record(next, reason)}
          fullWidth
          slotProps={{ popper: { testID: 'typing-popup' } }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Destination"
              placeholder="Search or enter a city"
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, ...editorProps },
              }}
            />
          )}
        />
      )}
      <Button
        testID="typing-replace"
        variant="outlined"
        disabled={mode === 'uncontrolled'}
        onClick={() =>
          setAuthored((previous) => (previous === 'JS replacement' ? '' : 'JS replacement'))
        }
      >
        {authored === 'JS replacement' ? 'Clear authored value' : 'Replace from JavaScript'}
      </Button>
      <View style={{ borderLeftWidth: 2, borderColor: theme.palette.divider, paddingLeft: 12 }}>
        <Typography variant="caption" color="text.secondary">
          LAST INPUT
        </Typography>
        <Text testID="typing-receipt" style={{ color: theme.palette.text.primary, fontSize: 12 }}>
          {JSON.stringify({ mode, generation, ...receipt })}
        </Text>
        <Text
          testID="typing-authored"
          style={{ color: theme.palette.text.secondary, fontSize: 12 }}
        >
          {JSON.stringify({ value: authored })}
        </Text>
      </View>
    </View>
  );
}

/** Developer comparison fixture, with the same text policy and no input retries. */
export function InputExamples() {
  const [scene, setScene] = useState<{ mode: Mode; generation: number }>({
    mode: 'native',
    generation: 0,
  });
  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ gap: 20, paddingBottom: 24 }}>
        <View style={{ gap: 4 }}>
          <Typography variant="h5">Input delivery</Typography>
          <Typography variant="body2" color="text.secondary">
            Compare fresh editors with the same text. Each mode button remounts its editor.
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {modes.map((mode) => (
            <Button
              key={mode}
              testID={'typing-mode-' + mode}
              variant={scene.mode === mode ? 'contained' : 'outlined'}
              onClick={() =>
                setScene((previous) => ({ mode, generation: previous.generation + 1 }))
              }
            >
              {labels[mode]}
            </Button>
          ))}
        </View>
        <InputTrial key={scene.generation} {...scene} />
      </View>
    </ScrollView>
  );
}
