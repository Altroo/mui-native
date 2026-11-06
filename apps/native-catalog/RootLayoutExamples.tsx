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

/** Keep each measured example mounted while its own controls update the root. */
export function RootLayoutExamples() {
  const [example, setExample] = useState<
    'group' | 'avatar' | 'icon' | 'details' | 'menu-styles' | 'typography' | 'benchmark'
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
          style={{ maxWidth: '100%' }}
          testID="root-layout-form-group"
          variant={example === 'group' ? 'contained' : 'outlined'}
          onClick={() => setExample('group')}
        >
          Group
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-avatar"
          variant={example === 'avatar' ? 'contained' : 'outlined'}
          onClick={() => setExample('avatar')}
        >
          Avatar
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-icon"
          variant={example === 'icon' ? 'contained' : 'outlined'}
          onClick={() => setExample('icon')}
        >
          Icon
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-details"
          variant={example === 'details' ? 'contained' : 'outlined'}
          onClick={() => setExample('details')}
        >
          Details
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-menu-styles"
          variant={example === 'menu-styles' ? 'contained' : 'outlined'}
          onClick={() => setExample('menu-styles')}
        >
          Menu
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-typography"
          variant={example === 'typography' ? 'contained' : 'outlined'}
          onClick={() => setExample('typography')}
        >
          Typography
        </Button>
        <Button
          style={{ maxWidth: '100%' }}
          testID="root-layout-benchmark"
          variant={example === 'benchmark' ? 'contained' : 'outlined'}
          onClick={() => setExample('benchmark')}
        >
          Workload
        </Button>
      </ScrollView>
      {example === 'benchmark' ? (
        <LayoutRootBenchmarkExample />
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
