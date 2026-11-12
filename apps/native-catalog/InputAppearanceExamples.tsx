// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, InputAdornment, TextField, Typography } from '@mui/material';
const profiles = [
  'Idle',
  'Focused',
  'Filled',
  'Error',
  'Disabled',
  'Small',
  'Adorned',
  'Multiline',
  'Rounded',
] as const;
type Profile = (typeof profiles)[number];

/** The same field content makes variant and state differences easy to compare. */
export function InputAppearanceExamples() {
  const [profile, setProfile] = useState<Profile>('Focused');
  return (
    <View testID={'appearance-scene-' + profile} style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Choose a state to compare all three variants.
        </Typography>
      </View>
      <ScrollView
        testID="appearance-states"
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}
      >
        {profiles.map((name) => (
          <Chip
            key={name}
            label={name}
            testID={'appearance-state-' + name}
            clickable
            color={profile === name ? 'primary' : 'default'}
            variant={profile === name ? 'filled' : 'outlined'}
            onClick={() => setProfile(name)}
          />
        ))}
      </ScrollView>
      {(['outlined', 'filled', 'standard'] as const).map((variant) => (
        <View key={variant} testID={'appearance-frame-' + variant} style={{ gap: 10 }}>
          <Typography variant="overline" color="text.secondary">
            {variant}
          </Typography>
          <TextField
            key={profile}
            testID={'appearance-field-' + variant}
            variant={variant}
            label="Destination"
            placeholder="Choose a city"
            defaultValue={['Filled', 'Error', 'Disabled'].includes(profile) ? 'Casablanca' : ''}
            focused={['Focused', 'Rounded'].includes(profile) ? true : undefined}
            error={profile === 'Error'}
            disabled={profile === 'Disabled'}
            size={profile === 'Small' ? 'small' : 'medium'}
            multiline={profile === 'Multiline'}
            minRows={profile === 'Multiline' ? 2 : undefined}
            helperText={profile === 'Error' ? 'Choose an available destination.' : undefined}
            fullWidth
            slotProps={{
              input:
                profile === 'Adorned'
                  ? {
                      startAdornment: (
                        <InputAdornment testID={'appearance-adornment-' + variant} position="start">
                          To
                        </InputAdornment>
                      ),
                    }
                  : profile === 'Rounded'
                    ? {
                        style: { borderRadius: 24 },
                        ...(variant === 'outlined'
                          ? { slotProps: { notchedOutline: { style: { borderRadius: 24 } } } }
                          : {}),
                      }
                    : undefined,
              htmlInput: {
                testID: 'appearance-editor-' + variant,
                autoCorrect: false,
                returnKeyType: 'done',
              },
            }}
          />
        </View>
      ))}
    </View>
  );
}
