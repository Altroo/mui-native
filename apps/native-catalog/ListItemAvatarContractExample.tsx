// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import {
  Text,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewInstance,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Portal,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
  type ListItemAvatarRootProps,
} from '@mui/material';

const CustomRoot = forwardRef<ViewInstance, ListItemAvatarRootProps>(
  ({ className: _className, ...native }, ref) => <View {...native} ref={ref} />,
);
function StatefulBadge() {
  const [count, setCount] = useState(0);
  return (
    <Button
      testID="avatar-contract-child"
      variant="outlined"
      color="inherit"
      aria-label={`Avatar child count ${count}`}
      onClick={() => setCount((value) => value + 1)}
      style={{ minWidth: 44, padding: 0 }}
    >
      {count}
    </Button>
  );
}
const image = (
  <View
    accessible
    accessibilityRole="image"
    accessibilityLabel="Account owner"
    style={{
      width: 40,
      height: 40,
      backgroundColor: '#d8e8d5',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text>AV</Text>
  </View>
);
type Receipt = {
  local: { x: number; y: number; width: number; height: number };
  window?: { x: number; y: number; width: number; height: number };
};
/** Dedicated measured wrapper scene; the catalog owner chooses where to mount it. */
export function ListItemAvatarContractExample() {
  const outer = useTheme();
  const [top, setTop] = useState(false),
    [rtl, setRtl] = useState(false),
    [customStyle, setCustomStyle] = useState(false);
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const standard = useRef<ViewInstance>(null),
    custom = useRef<ViewInstance>(null),
    portaled = useRef<ViewInstance>(null);
  const revisions = useRef<Record<string, number>>({});
  const { fontScale } = useWindowDimensions();
  const theme = useMemo(
    () =>
      createTheme({
        ...outer,
        direction: rtl ? 'rtl' : 'ltr',
        components: {
          ...outer.components,
          MuiListItemAvatar: { styleOverrides: { root: { minWidth: customStyle ? 64 : 56 } } },
        },
      }),
    [outer, rtl, customStyle],
  );
  const publish = useCallback(
    (key: string, next: Receipt) =>
      setReceipts((previous) =>
        JSON.stringify(previous[key]) === JSON.stringify(next)
          ? previous
          : { ...previous, [key]: next },
      ),
    [],
  );
  const layout = (key: string, node: ViewInstance | null, event: LayoutChangeEvent) => {
    const local = { ...event.nativeEvent.layout };
    const revision = (revisions.current[key] ?? 0) + 1;
    revisions.current[key] = revision;
    if (!node) publish(key, { local });
    else
      node.measureInWindow((x, y, width, height) => {
        if (revisions.current[key] === revision)
          publish(key, { local, window: { x, y, width, height } });
      });
  };
  const row = (key: 'native' | 'custom' | 'portal') => {
    const ref = key === 'native' ? standard : key === 'custom' ? custom : portaled;
    return (
      <ListItem alignItems={top ? 'flex-start' : 'center'} testID={`avatar-contract-row-${key}`}>
        <ListItemAvatar
          ref={ref}
          component={key === 'custom' ? CustomRoot : undefined}
          testID={`avatar-contract-${key}`}
          accessible={false}
          classes={{ root: 'avatar-contract' }}
          sx={
            customStyle
              ? { '&.MuiListItemAvatar-alignItemsFlexStart': { marginTop: '12px' } }
              : undefined
          }
          onLayout={(event) => layout(key, ref.current, event)}
        >
          {key === 'custom' ? <StatefulBadge /> : image}
        </ListItemAvatar>
        <ListItemText
          primary={
            key === 'custom'
              ? 'Live custom root'
              : key === 'portal'
                ? 'Portaled account owner'
                : 'Account owner with a longer name'
          }
          secondary="A multiline account description follows the actual operating system text profile."
        />
      </ListItem>
    );
  };
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 1 }}>
        <Button testID="avatar-contract-alignment" onClick={() => setTop((value) => !value)}>
          Alignment: {top ? 'flex-start' : 'center'}
        </Button>
        <Button testID="avatar-contract-rtl" onClick={() => setRtl((value) => !value)}>
          Direction: {rtl ? 'RTL' : 'LTR'}
        </Button>
        <Button testID="avatar-contract-theme" onClick={() => setCustomStyle((value) => !value)}>
          Style: {customStyle ? 'custom' : 'source defaults'}
        </Button>
        <List>
          {row('native')}
          {row('custom')}
        </List>
        <Typography
          testID="avatar-contract-receipt"
          variant="caption"
          accessibilityLabel={JSON.stringify({ fontScale, top, rtl, customStyle, receipts })}
        >
          Measured {Object.keys(receipts).length}/3 roots · OS {fontScale.toFixed(2)}×
        </Typography>
      </Box>
      <Portal>
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            right: 8,
            bottom: 8,
            backgroundColor: 'background.paper',
          }}
        >
          <ScrollView testID="avatar-contract-portal-scroll" style={{ maxHeight: 160 }}>
            <List>{row('portal')}</List>
          </ScrollView>
        </Box>
      </Portal>
    </ThemeProvider>
  );
}
