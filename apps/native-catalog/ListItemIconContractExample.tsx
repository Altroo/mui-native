// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type LayoutChangeEvent, type ViewInstance } from 'react-native';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuList,
  MenuItem,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
  type ListItemIconRootProps,
} from '@mui/material';
import Notifications from '@mui/icons-material/NotificationsNoneRounded';
import Check from '@mui/icons-material/Check';

const CustomRoot = forwardRef<ViewInstance, ListItemIconRootProps>(
  ({ className: _className, ...native }, ref) => <View {...native} ref={ref} />,
);
function StatefulAcknowledgment() {
  const [count, setCount] = useState(0);
  return (
    <Typography
      variant="inherit"
      testID="icon-contract-child"
      accessibilityRole="button"
      accessible
      accessibilityLabel={`Acknowledgments ${count}`}
      onPress={() => setCount((value) => value + 1)}
      style={{ textAlign: 'center', minWidth: 44, minHeight: 44, lineHeight: 44 }}
    >
      {count}
    </Typography>
  );
}
type Frame = { x: number; y: number; width: number; height: number };
/** Bounded wrapper scene. The catalog owner chooses when and where to mount it. */
export function ListItemIconContractExample() {
  const [top, setTop] = useState(false),
    [custom, setCustom] = useState(false),
    [menuCount, setMenuCount] = useState(0);
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const native = useRef<ViewInstance>(null),
    customRoot = useRef<ViewInstance>(null);
  const { fontScale } = useWindowDimensions();
  const outerTheme = useTheme();
  const theme = useMemo(
    () =>
      createTheme({
        ...outerTheme,
        spacing: custom ? 10 : 8,
        palette: {
          ...outerTheme.palette,
          action: {
            ...outerTheme.palette.action,
            active:
              outerTheme.palette.mode === 'dark'
                ? custom
                  ? '#8eb7e8'
                  : '#bac7d8'
                : custom
                  ? '#385b86'
                  : '#55616f',
          },
        },
      }),
    [custom, outerTheme],
  );
  const record = (key: string, event: LayoutChangeEvent) => {
    const next = { ...event.nativeEvent.layout };
    setFrames((previous) => {
      const old = previous[key];
      return old &&
        old.x === next.x &&
        old.y === next.y &&
        old.width === next.width &&
        old.height === next.height
        ? previous
        : { ...previous, [key]: next };
    });
  };
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 1 }}>
        <Typography variant="subtitle1">Delivery updates</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Icon space follows the theme. The number remains caller-owned state.
        </Typography>
        <Box sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginTop: 1 }}>
          <Button testID="icon-contract-alignment" onClick={() => setTop((value) => !value)}>
            Align: {top ? 'top' : 'center'}
          </Button>
          <Button testID="icon-contract-theme" onClick={() => setCustom((value) => !value)}>
            Theme: {custom ? 'custom' : 'default'}
          </Button>
        </Box>
        <List>
          <ListItem alignItems={top ? 'flex-start' : 'center'}>
            <ListItemIcon
              ref={native}
              testID="icon-contract-native"
              accessible={false}
              onLayout={(event) => record('native', event)}
            >
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Shipment notifications"
              secondary="Receive an update when your order leaves the warehouse."
            />
          </ListItem>
          <ListItem alignItems={top ? 'flex-start' : 'center'}>
            <ListItemIcon
              ref={customRoot}
              component={CustomRoot}
              testID="icon-contract-custom"
              classes={{ root: 'acknowledgment-icon' }}
              sx={{ '&.MuiListItemIcon-alignItemsFlexStart': { marginTop: '12px' } }}
              onLayout={(event) => record('custom', event)}
            >
              <StatefulAcknowledgment />
            </ListItemIcon>
            <ListItemText
              primary="Acknowledged updates"
              secondary="Tap the number, then change alignment or theme."
            />
          </ListItem>
        </List>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Existing dense menu context
        </Typography>
        <MenuList dense>
          <MenuItem
            testID="icon-contract-menu-item"
            onClick={() => setMenuCount((value) => value + 1)}
          >
            <ListItemIcon testID="icon-contract-menu">
              <Check />
            </ListItemIcon>
            <ListItemText primary="Mark as received" />
          </MenuItem>
        </MenuList>
        <Typography
          testID="icon-contract-receipt"
          variant="caption"
          accessibilityLabel={JSON.stringify({ top, custom, fontScale, frames, menuCount })}
        >
          Menu actions {menuCount} · Measured {Object.keys(frames).length}/2 roots · OS{' '}
          {fontScale.toFixed(2)}×
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
