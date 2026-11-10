// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Paper, TextField, Typography, useTheme } from '@mui/material';
import { catalogGroups, catalogSections, type CatalogSection } from './catalogSections';

export function CatalogHome({
  query,
  onQueryChange,
  onNavigate,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onNavigate: (route: CatalogSection) => void;
}) {
  const theme = useTheme();
  const [presses, setPresses] = useState(0);
  const needle = query.trim().toLowerCase();
  const matches = catalogSections.filter(({ label, detail, keywords }) =>
    `${label} ${detail} ${keywords}`.toLowerCase().includes(needle),
  );
  return (
    <ScrollView
      testID="catalog-explore"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
    >
      <View style={{ gap: 8 }}>
        <Typography
          accessibilityRole="header"
          style={{ fontSize: 30, lineHeight: 36, letterSpacing: -0.9, fontWeight: '700' }}
        >
          Explore the library.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live examples for Material UI and MUI X Community, built for native interaction.
        </Typography>
      </View>
      {!needle ? (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
          <View style={{ gap: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 4,
              }}
            >
              <Typography variant="subtitle2">Button</Typography>
              <Typography variant="caption" color="text.secondary">
                Live preview
              </Typography>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Button
                testID="catalog-preview-try"
                variant="contained"
                onClick={() => setPresses((value) => value + 1)}
              >
                Try it
              </Button>
              <Button
                testID="catalog-preview-reset"
                variant="outlined"
                onClick={() => setPresses(0)}
                disabled={presses === 0}
              >
                Reset
              </Button>
              <Button onClick={() => onNavigate('Groups')}>View examples</Button>
            </View>
            <Typography variant="caption" color="text.secondary" accessibilityLiveRegion="polite">
              {presses
                ? `Pressed ${presses} ${presses === 1 ? 'time' : 'times'}.`
                : 'Real components. Tap to interact.'}
            </Typography>
          </View>
        </Paper>
      ) : null}
      <View style={{ gap: 8 }}>
        <Typography variant="subtitle1" accessibilityRole="header">
          Components
        </Typography>
        <TextField
          slotProps={{ htmlInput: { testID: 'catalog-search' } }}
          label="Search components"
          placeholder="Button, Data Grid, DatePicker…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          fullWidth
        />
      </View>
      {matches.length ? (
        catalogGroups.map((group) => {
          const entries = matches.filter((entry) => entry.group === group);
          return entries.length ? (
            <View key={group} style={{ gap: 8 }}>
              <Typography variant="overline" color="text.secondary" accessibilityRole="header">
                {group}
              </Typography>
              <View
                style={{
                  backgroundColor: theme.palette.background.paper,
                  borderWidth: 1,
                  borderColor: theme.palette.divider,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {entries.map(({ id, label, detail }, index) => (
                  <Pressable
                    key={id}
                    testID={`catalog-open-${id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}. ${detail}`}
                    onPress={() => onNavigate(id)}
                    style={({ pressed }) => ({
                      minHeight: 72,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderTopWidth: index ? 1 : 0,
                      borderColor: theme.palette.divider,
                      backgroundColor: pressed ? theme.palette.action.selected : 'transparent',
                    })}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Typography variant="subtitle2">{label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {detail}
                      </Typography>
                    </View>
                    <Typography color="text.secondary" style={{ fontSize: 22 }} accessible={false}>
                      ›
                    </Typography>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null;
        })
      ) : (
        <View style={{ gap: 8, alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" accessibilityLiveRegion="polite">
            No matching examples
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try a component name such as Button or Card.
          </Typography>
          <Button variant="outlined" onClick={() => onQueryChange('')}>
            Clear search
          </Button>
        </View>
      )}
      <Typography variant="caption" color="text.secondary">
        Pre-alpha previews demonstrate available behavior. Check Compatibility for current limits
        before using a component in your app.
      </Typography>
    </ScrollView>
  );
}
