// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState, type Ref } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { Accordion, AccordionSummary, type Theme } from '@mui/material';

type Props = {
  mode: 'rn' | 'mui';
  expanded: boolean;
  disabled: boolean;
  alternateStyle: boolean;
  theme: Theme;
  rootRef: Ref<ViewInstance>;
  testID: string;
  labelID: string;
  detailID: string;
  label: string;
  detail: string;
};
/** Comparison of retained, controlled panels. Motion is excluded from this
 * workload: identical explicit Summary geometry and a zero-time Collapse let
 * the collector acknowledge each native expansion/style/theme endpoint.
 */
export function AccordionBenchmarkRow({
  mode,
  expanded,
  disabled,
  alternateStyle,
  theme,
  rootRef,
  testID,
  labelID,
  detailID,
  label,
  detail,
}: Props) {
  const [presses, setPresses] = useState(0);
  const activate = () => setPresses((old) => old + 1);
  const summaryHeight = alternateStyle ? 64 : 48;
  const root = {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: alternateStyle ? 8 : 4,
    backgroundColor: theme.palette.background.paper,
    width: '100%' as const,
  };
  const summary = {
    height: summaryHeight,
    minHeight: summaryHeight,
    padding: 0,
    opacity: disabled ? theme.palette.action.disabledOpacity : 1,
    backgroundColor: disabled ? theme.palette.action.disabledBackground : 'transparent',
  };
  const labels = (
    <>
      <Text testID={labelID} style={[styles.text, { color: theme.palette.text.primary }]}>
        {label}
      </Text>
      <Text testID={detailID} style={[styles.text, { color: theme.palette.text.primary }]}>
        {detail}
      </Text>
    </>
  );
  const body = (
    <View style={{ height: 40 }}>
      <Text style={[styles.text, { color: theme.palette.text.primary }]}>Retained body</Text>
    </View>
  );
  const summaryProps = {
    testID: testID + '-action',
    accessibilityLabel: `${label} presses ${presses}`,
    style: summary,
  };
  return mode === 'mui' ? (
    <Accordion
      ref={rootRef}
      testID={testID}
      collapsable={false}
      elevation={0}
      disableGutters
      expanded={expanded}
      disabled={disabled}
      onChange={activate}
      style={root}
      slotProps={{ transition: { timeout: 0 } }}
    >
      <AccordionSummary
        {...summaryProps}
        slotProps={{ content: { style: { margin: 0, flexDirection: 'column' } } }}
      >
        {labels}
      </AccordionSummary>
      {body}
    </Accordion>
  ) : (
    <View ref={rootRef} testID={testID} collapsable={false} style={root}>
      <Pressable
        {...summaryProps}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded, disabled }}
        onPress={activate}
      >
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>{labels}</View>
      </Pressable>
      <View
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={{ height: expanded ? 40 : 0, overflow: 'hidden' }}
      >
        {body}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  text: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0,
    textTransform: 'none',
  },
});
