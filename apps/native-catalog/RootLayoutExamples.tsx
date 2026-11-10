// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@mui/material';
import { FormGroupContractExample } from './FormGroupContractExample';
import { ListItemAvatarContractExample } from './ListItemAvatarContractExample';
import { LayoutRootBenchmarkExample } from './LayoutRootBenchmarkExample';
import { ListItemIconContractExample } from './ListItemIconContractExample';
import { AccordionDetailsContractExample } from './AccordionDetailsContractExample';
import { MenuIconCascadeExample } from './MenuIconCascadeExample';
import { TypographyContractExample } from './TypographyContractExample';
import { DividerContractExample } from './DividerContractExample';
import { PaperContractExample } from './PaperContractExample';
import { CardContractExample } from './CardContractExample';
import { StructuralObservationProbeEntry } from './StructuralObservationProbeEntry';
import { BoxContractExample } from './BoxContractExample';
import { PaperBenchmarkExample } from './PaperBenchmarkExample';

/** Keep each measured example mounted while its own controls update the root. */
export function RootLayoutExamples() {
  const [example, setExample] = useState<
    | 'group'
    | 'avatar'
    | 'icon'
    | 'details'
    | 'menu-styles'
    | 'typography'
    | 'divider'
    | 'paper'
    | 'card'
    | 'structure'
    | 'box'
    | 'benchmark'
    | 'paper-benchmark'
  >('group');
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        testID="root-layout-navigation"
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0, flexShrink: 0, marginBottom: 8 }}
        contentContainerStyle={{ flexDirection: 'row', gap: 8 }}
      >
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-form-group"
          accessibilityState={{ selected: example === 'group' }}
          variant={example === 'group' ? 'contained' : 'text'}
          onClick={() => setExample('group')}
        >
          Group
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-avatar"
          accessibilityState={{ selected: example === 'avatar' }}
          variant={example === 'avatar' ? 'contained' : 'text'}
          onClick={() => setExample('avatar')}
        >
          Avatar
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-icon"
          accessibilityState={{ selected: example === 'icon' }}
          variant={example === 'icon' ? 'contained' : 'text'}
          onClick={() => setExample('icon')}
        >
          Icon
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-details"
          accessibilityState={{ selected: example === 'details' }}
          variant={example === 'details' ? 'contained' : 'text'}
          onClick={() => setExample('details')}
        >
          Details
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-menu-styles"
          accessibilityState={{ selected: example === 'menu-styles' }}
          variant={example === 'menu-styles' ? 'contained' : 'text'}
          onClick={() => setExample('menu-styles')}
        >
          Menu
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-typography"
          accessibilityState={{ selected: example === 'typography' }}
          variant={example === 'typography' ? 'contained' : 'text'}
          onClick={() => setExample('typography')}
        >
          Typography
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-divider"
          accessibilityState={{ selected: example === 'divider' }}
          variant={example === 'divider' ? 'contained' : 'text'}
          onClick={() => setExample('divider')}
        >
          Divider
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-paper"
          accessibilityState={{ selected: example === 'paper' }}
          variant={example === 'paper' ? 'contained' : 'text'}
          onClick={() => setExample('paper')}
        >
          Paper
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-card"
          accessibilityState={{ selected: example === 'card' }}
          variant={example === 'card' ? 'contained' : 'text'}
          onClick={() => setExample('card')}
        >
          Card
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-structure"
          accessibilityState={{ selected: example === 'structure' }}
          variant={example === 'structure' ? 'contained' : 'text'}
          onClick={() => setExample('structure')}
        >
          Structure
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-box"
          accessibilityState={{ selected: example === 'box' }}
          variant={example === 'box' ? 'contained' : 'text'}
          onClick={() => setExample('box')}
        >
          Box
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-benchmark"
          accessibilityState={{ selected: example === 'benchmark' }}
          variant={example === 'benchmark' ? 'contained' : 'text'}
          onClick={() => setExample('benchmark')}
        >
          Workload
        </Button>
        <Button
          size="small"
          style={{ maxWidth: '100%', minHeight: 44 }}
          testID="root-layout-paper-benchmark"
          accessibilityState={{ selected: example === 'paper-benchmark' }}
          variant={example === 'paper-benchmark' ? 'contained' : 'text'}
          onClick={() => setExample('paper-benchmark')}
        >
          Paper workload
        </Button>
      </ScrollView>
      {example === 'benchmark' ? (
        <LayoutRootBenchmarkExample />
      ) : example === 'paper-benchmark' ? (
        <PaperBenchmarkExample />
      ) : (
        <ScrollView
          testID="root-layout-scroll"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {example === 'group' ? (
            <FormGroupContractExample />
          ) : example === 'avatar' ? (
            <ListItemAvatarContractExample />
          ) : example === 'icon' ? (
            <ListItemIconContractExample />
          ) : example === 'details' ? (
            <AccordionDetailsContractExample />
          ) : example === 'divider' ? (
            <DividerContractExample />
          ) : example === 'paper' ? (
            <PaperContractExample />
          ) : example === 'card' ? (
            <CardContractExample />
          ) : example === 'structure' ? (
            <StructuralObservationProbeEntry />
          ) : example === 'box' ? (
            <BoxContractExample />
          ) : example === 'typography' ? (
            <TypographyContractExample />
          ) : (
            <MenuIconCascadeExample />
          )}
        </ScrollView>
      )}
    </View>
  );
}
