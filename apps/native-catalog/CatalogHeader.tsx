// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { Switch, Typography, useTheme } from '@mui/material';
import { catalogSections, type CatalogRoute } from './catalogSections';

export function CatalogHeader({
  section,
  onNavigate,
  dark,
  onDarkChange,
}: {
  section: CatalogRoute;
  onNavigate: (route: CatalogRoute) => void;
  dark: boolean;
  onDarkChange: (dark: boolean) => void;
}) {
  const theme = useTheme();
  const compact = useWindowDimensions().fontScale > 1.5;
  const scroll = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});
  // Index links can select a tab outside the viewport without a swipe gesture.
  useEffect(() => {
    const x = positions.current[section];
    if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 20), animated: false });
  }, [section]);
  return (
    <View
      style={{
        backgroundColor: theme.palette.background.paper,
        borderBottomWidth: 1,
        borderColor: theme.palette.divider,
      }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 10,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse component library"
          testID="catalog-home"
          onPress={() => onNavigate('Explore')}
          style={({ pressed }) => ({
            flexGrow: 1,
            flexShrink: 1,
            maxWidth: '100%',
            minHeight: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Typography
            style={{
              fontSize: compact ? 16 : 21,
              lineHeight: compact ? 22 : 28,
              fontWeight: '700',
              letterSpacing: -0.7,
            }}
          >
            {compact ? (
              'Native'
            ) : (
              <>
                altroo
                <Typography color="primary.main" style={{ fontSize: 21, fontWeight: '700' }}>
                  {' '}
                  / native
                </Typography>
              </>
            )}
          </Typography>
          {compact ? null : (
            <Typography variant="caption" color="text.secondary">
              COMPONENT LIBRARY · PRE-ALPHA
            </Typography>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {compact ? 'Dark' : 'Dark mode'}
          </Typography>
          <Switch
            testID="catalog-appearance"
            checked={dark}
            onChange={(_, checked) => onDarkChange(checked)}
            aria-label="Dark mode"
          />
        </View>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flexGrow: 0, flexShrink: 0 }}
        testID="catalog-tabs"
        horizontal
        showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 20 }}
      >
        <View style={{ flexDirection: 'row', gap: 20 }} accessibilityRole="tablist">
          {[{ id: 'Explore' as const, label: 'Explore' }, ...catalogSections].map(
            ({ id, label }) => (
              <Pressable
                key={id}
                testID={`catalog-tab-${id}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === id }}
                onPress={() => onNavigate(id)}
                onLayout={({ nativeEvent }) => {
                  positions.current[id] = nativeEvent.layout.x;
                  if (section === id)
                    scroll.current?.scrollTo({
                      x: Math.max(0, nativeEvent.layout.x - 20),
                      animated: false,
                    });
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  justifyContent: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: section === id ? theme.palette.primary.main : 'transparent',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Typography
                  variant="body2"
                  color={section === id ? 'text.primary' : 'text.secondary'}
                  style={{ fontWeight: section === id ? '600' : '400' }}
                >
                  {label}
                </Typography>
              </Pressable>
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}
