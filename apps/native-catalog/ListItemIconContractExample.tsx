// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState, type RefCallback } from 'react';
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
type Receipt = { local: Frame; window?: Frame };
const rootKeys = ['native', 'custom', 'menu'] as const;
type RootKey = (typeof rootKeys)[number];
/** Bounded wrapper scene. The catalog owner chooses when and where to mount it. */
export function ListItemIconContractExample() {
  const [top, setTop] = useState(false),
    [custom, setCustom] = useState(false),
    [menuCount, setMenuCount] = useState(0);
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const [receipts, setReceipts] = useState<Partial<Record<RootKey, Receipt>>>({});
  const [refRevision, setRefRevision] = useState(0);
  const nodes = useRef<Partial<Record<RootKey, ViewInstance>>>({});
  const initialNodes = useRef<Partial<Record<RootKey, ViewInstance>>>({});
  const revisions = useRef<Record<RootKey, number>>({ native: 0, custom: 0, menu: 0 });
  const refs = useRef<Record<RootKey, { attached: number; cleaned: number }>>({
    native: { attached: 0, cleaned: 0 },
    custom: { attached: 0, cleaned: 0 },
    menu: { attached: 0, cleaned: 0 },
  });
  const rootRefs = useMemo(() => {
    const track =
      (key: RootKey): RefCallback<ViewInstance> =>
      (node) => {
        const release = () => {
          if (nodes.current[key]) {
            delete nodes.current[key];
            refs.current[key].cleaned++;
            revisions.current[key]++;
            setRefRevision((previous) => previous + 1);
          }
        };
        if (!node) {
          release();
          return;
        }
        nodes.current[key] = node;
        initialNodes.current[key] ??= node;
        refs.current[key].attached++;
        setRefRevision((previous) => previous + 1);
        return () => {
          if (nodes.current[key] === node) release();
        };
      };
    return { native: track('native'), custom: track('custom'), menu: track('menu') };
  }, []);
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
  const publish = useCallback((key: RootKey, next: Receipt) => {
    setReceipts((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  const layouts = useMemo(() => {
    const track = (key: RootKey) => (event: LayoutChangeEvent) => {
      const local = { ...event.nativeEvent.layout };
      setFrames((previous) => {
        const old = previous[key];
        return old &&
          old.x === local.x &&
          old.y === local.y &&
          old.width === local.width &&
          old.height === local.height
          ? previous
          : { ...previous, [key]: local };
      });
      const revision = ++revisions.current[key];
      const node = nodes.current[key];
      if (!node) publish(key, { local });
      else
        node.measureInWindow((x, y, width, height) => {
          if (revisions.current[key] === revision && nodes.current[key] === node)
            publish(key, { local, window: { x, y, width, height } });
        });
    };
    return { native: track('native'), custom: track('custom'), menu: track('menu') };
  }, [publish]);
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
          <ListItem testID="icon-contract-row-native" alignItems={top ? 'flex-start' : 'center'}>
            <ListItemIcon
              ref={rootRefs.native}
              testID="icon-contract-native"
              accessible={false}
              onLayout={layouts.native}
            >
              <Notifications />
            </ListItemIcon>
            <ListItemText
              primary="Shipment notifications"
              secondary="Receive an update when your order leaves the warehouse."
            />
          </ListItem>
          <ListItem testID="icon-contract-row-custom" alignItems={top ? 'flex-start' : 'center'}>
            <ListItemIcon
              ref={rootRefs.custom}
              component={CustomRoot}
              testID="icon-contract-custom"
              classes={{ root: 'acknowledgment-icon' }}
              sx={{ '&.MuiListItemIcon-alignItemsFlexStart': { marginTop: '12px' } }}
              onLayout={layouts.custom}
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
            <ListItemIcon
              ref={rootRefs.menu}
              testID="icon-contract-menu"
              accessible={false}
              onLayout={layouts.menu}
            >
              <Check testID="icon-contract-menu-glyph" />
            </ListItemIcon>
            <ListItemText primary="Mark as received" />
          </MenuItem>
        </MenuList>
        <Typography
          testID="icon-contract-receipt"
          variant="caption"
          accessibilityLabel={JSON.stringify({
            top,
            custom,
            fontScale,
            frames,
            menuCount,
            receipts,
            refRevision,
            refs: Object.fromEntries(
              rootKeys.map((key) => [
                key,
                {
                  ...refs.current[key],
                  sameRoot:
                    Boolean(nodes.current[key]) && nodes.current[key] === initialNodes.current[key],
                },
              ]),
            ),
          })}
        >
          Menu actions {menuCount} · Measured {Object.keys(receipts).length}/3 roots · OS{' '}
          {fontScale.toFixed(2)}×
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
