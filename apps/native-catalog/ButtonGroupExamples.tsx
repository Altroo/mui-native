// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewInstance,
} from 'react-native';
import {
  Button,
  Box,
  ButtonGroup,
  ButtonGroupContext,
  ButtonGroupButtonContext,
  Paper,
  Portal,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
  type ButtonBaseActions,
  type NativePortalBounds,
} from '@mui/material';

// A normal component wrapper owns this state. Group defaults and position flow
// through context, so changing orientation does not remount the action.
function SaveAction() {
  const [count, setCount] = useState(0);
  return (
    <Button testID="group-save" disabled={false} onClick={() => setCount((value) => value + 1)}>
      Save {count}
    </Button>
  );
}
function SurfaceAction({
  label,
  testID,
  action,
  onFocusChange,
  inheritFont = false,
}: {
  label: string;
  testID: string;
  action?: Ref<ButtonBaseActions>;
  onFocusChange?: (focused: boolean) => void;
  inheritFont?: boolean;
}) {
  const [count, setCount] = useState(0);
  return (
    <Button
      testID={testID}
      action={action}
      aria-label={`${label} count ${count}`}
      sx={inheritFont ? { fontSize: 'inherit' } : undefined}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
      onClick={() => setCount((value) => value + 1)}
    >
      {label} {count}
    </Button>
  );
}
function ThemeSurface() {
  const outer = useTheme();
  const [alternate, setAlternate] = useState(false);
  const [focusRequests, setFocusRequests] = useState(0);
  const [focusReceipt, setFocusReceipt] = useState({ focused: false, focus: 0, blur: 0 });
  const recordFocus = useCallback((focused: boolean) => {
    setFocusReceipt((value) => ({
      focused,
      focus: value.focus + (focused ? 1 : 0),
      blur: value.blur + (focused ? 0 : 1),
    }));
  }, []);
  const action = useRef<ButtonBaseActions>(null);
  const theme = useMemo(() => {
    const base = createTheme();
    const shadows = [...base.shadows] as typeof base.shadows;
    const tone = alternate ? '#6d28d9' : '#0f766e';
    shadows[2] = alternate
      ? '0px 4px 12px 0px rgba(109, 40, 217, 0.4)'
      : '0px 2px 6px 0px rgba(15, 118, 110, 0.4)';
    return createTheme({
      palette: { mode: outer.palette.mode, primary: { main: tone } },
      shape: { borderRadius: alternate ? '0.5rem' : '6px' },
      shadows,
      focusVisible: {
        outlineStyle: 'solid',
        outlineColor: tone,
        outlineWidth: 3,
        outlineOffset: 2,
        boxShadow: alternate
          ? '0px 0px 0px 3px rgba(109, 40, 217, 0.4)'
          : '0px 0px 0px 3px rgba(15, 118, 110, 0.4)',
      },
    });
  }, [alternate, outer.palette.mode]);
  return (
    <Stack spacing={1.5} sx={{ py: 1.5 }}>
      <Typography variant="subtitle2">Themed actions</Typography>
      <ThemeProvider theme={theme}>
        <ButtonGroup
          testID="group-closure-themed-actions"
          variant="contained"
          aria-label="Themed actions"
          sx={{ borderRadius: 2 }}
        >
          <SurfaceAction
            testID="group-closure-themed-first"
            label="Review"
            action={action}
            onFocusChange={recordFocus}
          />
          <Button testID="group-closure-themed-second">Approve</Button>
        </ButtonGroup>
      </ThemeProvider>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          testID="group-closure-theme-toggle"
          size="small"
          onClick={() => setAlternate((value) => !value)}
        >
          Switch surface
        </Button>
        <Button
          testID="group-closure-focus-first"
          size="small"
          onClick={() => {
            action.current?.focusVisible();
            setFocusRequests((value) => value + 1);
          }}
        >
          Focus first action
        </Button>
      </Stack>
      <Typography
        testID="group-closure-theme-status"
        variant="caption"
        accessibilityLiveRegion="polite"
      >
        {alternate ? 'Violet · radius 0.5rem' : 'Teal · radius 6px'} · focus requests{' '}
        {focusRequests}
      </Typography>
      <Typography
        testID="group-closure-focus-status"
        variant="caption"
        accessibilityLiveRegion="polite"
      >
        focus {focusReceipt.focus} · blur {focusReceipt.blur} ·{' '}
        {focusReceipt.focused ? 'focused' : 'blurred'}
      </Typography>
    </Stack>
  );
}
function NestedSurface() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Stack spacing={1.5} sx={{ py: 2, borderTopWidth: 1, borderTopColor: 'divider' }}>
      <Typography variant="subtitle2">Related actions</Typography>
      <ButtonGroup
        testID="group-closure-outer"
        variant="text"
        color="secondary"
        sx={{
          columnGap: 1,
          '& .MuiButtonGroup-root': {
            minWidth: expanded ? 220 : 180,
          },
        }}
      >
        <Button>More</Button>
        <ButtonGroup
          testID="group-closure-nested"
          color={expanded ? 'error' : 'success'}
          variant={expanded ? 'outlined' : 'text'}
          size={expanded ? 'large' : 'small'}
          sx={{ '& .MuiButton-root': { flex: 1 } }}
        >
          <SurfaceAction testID="group-closure-nested-first" label="Nested" />
          <Button>Next</Button>
        </ButtonGroup>
      </ButtonGroup>
      <Button
        testID="group-closure-nested-toggle"
        size="small"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Use compact actions' : 'Expand nested actions'}
      </Button>
      <Typography
        testID="group-closure-nested-status"
        variant="caption"
        accessibilityLiveRegion="polite"
      >
        {expanded
          ? 'Expanded · outlined/error/large · minimum 220'
          : 'Compact · text/success/small · minimum 180'}
      </Typography>
    </Stack>
  );
}
// A custom component owns its raw native children. Box explicitly applies the
// library text scope; raw RN View/Text otherwise keep React Native inheritance.
export function PortalSurfaceAction() {
  const context = useContext(ButtonGroupContext);
  const position = useContext(ButtonGroupButtonContext);
  return (
    <Box sx={{ gap: 0.5, alignItems: 'flex-start' }}>
      <Text testID="group-closure-portal-text">Inherited text</Text>
      <SurfaceAction testID="group-closure-portal-action" label="Go" inheritFont />
      <Typography testID="group-closure-portal-context" variant="caption">
        Defaults {context.variant}/{context.color}/{context.size} ·{' '}
        {position?.includes('lastButton') ? 'last' : 'single'}
      </Typography>
    </Box>
  );
}
type SurfaceDestination = 'closed' | 'window' | 'inside' | 'sibling';
function PortalSurfaces() {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [destination, setDestination] = useState<SurfaceDestination>('closed');
  const [presented, setPresented] = useState(false);
  const [alternatePaint, setAlternatePaint] = useState(false);
  const [payloadHeight, setPayloadHeight] = useState(108);
  const payloadLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (height > 0)
      setPayloadHeight((previous) => (Math.abs(previous - height) > 0.5 ? height : previous));
  }, []);
  const [measured, setMeasured] = useState({ inside: false, sibling: false });
  const inside = useRef<ViewInstance>(null);
  const sibling = useRef<ViewInstance>(null);
  const insideContainer = useCallback(() => inside.current, []);
  const siblingContainer = useCallback(() => sibling.current, []);
  const insideLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (inside.current && width > 0 && height > 0)
      setMeasured((value) => (value.inside ? value : { ...value, inside: true }));
  }, []);
  const siblingLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (sibling.current && width > 0 && height > 0)
      setMeasured((value) => (value.sibling ? value : { ...value, sibling: true }));
  }, []);
  const portalLayout = useCallback(
    (bounds: NativePortalBounds | null) => setPresented(bounds !== null),
    [],
  );
  const ready = measured.inside && measured.sibling;
  const dark = theme.palette.mode === 'dark';
  const siblingWidth = alternatePaint ? 140 : 128;
  const insideWidth = alternatePaint ? 108 : 96;
  const selectDestination = (next: SurfaceDestination) => {
    if (next === destination) return;
    setPresented(false);
    setDestination(next);
  };
  return (
    <Stack spacing={1.5} sx={{ py: 2, borderTopWidth: 1, borderTopColor: 'divider' }}>
      <Typography variant="subtitle2">Portal destinations</Typography>
      <Typography variant="caption">
        The defaults stay the same. Changing destination resets local state; repaint keeps it.
      </Typography>
      <ButtonGroup
        testID="group-closure-portal-sibling-group"
        orientation="vertical"
        variant="text"
        size="small"
        sx={{
          width: '100%',
          color: dark ? '#93c5fd' : alternatePaint ? '#0369a1' : '#1565c0',
          fontSize: alternatePaint ? 24 : 22,
          '& .MuiButtonGroup-grouped': {
            minWidth: siblingWidth,
            backgroundColor: dark ? '#172554' : '#dbeafe',
            borderRadius: 0.75,
          },
        }}
      >
        <Typography variant="caption">Sibling surface · {siblingWidth} dp minimum</Typography>
        <View
          ref={sibling}
          collapsable={false}
          testID="group-closure-portal-sibling-target"
          onLayout={siblingLayout}
          style={{
            minHeight: destination === 'sibling' ? Math.max(132, payloadHeight + 24) : 44,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: destination === 'sibling' ? 0 : 1,
            borderStyle: 'dashed',
            borderColor: theme.palette.divider,
            borderRadius: 8,
          }}
        >
          {destination !== 'sibling' ? (
            <Typography variant="caption" color="text.secondary">
              Select Sibling to preview here
            </Typography>
          ) : null}
        </View>
      </ButtonGroup>
      <ButtonGroup
        testID="group-closure-portal-source"
        orientation="vertical"
        variant="text"
        color="inherit"
        size="large"
        sx={{
          width: '100%',
          color: dark ? '#f0abfc' : alternatePaint ? '#be185d' : '#9c27b0',
          fontSize: alternatePaint ? 20 : 18,
          '& .MuiButtonGroup-grouped': {
            minWidth: insideWidth,
            backgroundColor: dark ? '#3b0764' : '#f3e8ff',
            borderRadius: 0.5,
          },
        }}
      >
        <Typography variant="caption">Inside surface · {insideWidth} dp minimum</Typography>
        <View
          ref={inside}
          collapsable={false}
          testID="group-closure-portal-inside-target"
          onLayout={insideLayout}
          style={{
            minHeight: destination === 'inside' ? Math.max(132, payloadHeight + 24) : 44,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: destination === 'inside' ? 0 : 1,
            borderStyle: 'dashed',
            borderRadius: 8,
            borderColor: theme.palette.divider,
          }}
        >
          {destination !== 'inside' ? (
            <Typography variant="caption" color="text.secondary">
              Select Inside to preview here
            </Typography>
          ) : null}
        </View>
        {ready && destination !== 'closed' ? (
          <Portal
            container={
              destination === 'inside'
                ? insideContainer
                : destination === 'sibling'
                  ? siblingContainer
                  : undefined
            }
            onContainerLayout={portalLayout}
          >
            <View
              collapsable={false}
              onLayout={payloadLayout}
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                maxWidth: 320,
                ...(destination === 'window' ? { top: Math.round(height * 0.35) } : { bottom: 12 }),
                padding: 8,
                backgroundColor: theme.palette.background.paper,
                borderWidth: 1,
                borderColor: theme.palette.divider,
                borderRadius: 8,
              }}
            >
              <PortalSurfaceAction />
            </View>
          </Portal>
        ) : null}
      </ButtonGroup>
      <ButtonGroup variant="text" size="small" aria-label="Action destination">
        {(['window', 'inside', 'sibling', 'closed'] as const).map((mode) => (
          <Button
            key={mode}
            testID={`group-closure-portal-${mode === 'closed' ? 'close' : mode}`}
            disabled={!ready}
            accessibilityState={{ selected: destination === mode }}
            onClick={() => selectDestination(mode)}
          >
            {mode === 'closed' ? 'Close' : mode[0].toUpperCase() + mode.slice(1)}
          </Button>
        ))}
      </ButtonGroup>
      <Button
        testID="group-closure-portal-paint-toggle"
        size="small"
        disabled={!ready}
        onClick={() => setAlternatePaint((value) => !value)}
      >
        Repaint the destination
      </Button>
      <Typography
        testID="group-closure-portal-status"
        variant="caption"
        accessibilityLiveRegion="polite"
      >
        {ready
          ? `Targets ready · route ${destination} · ${presented ? 'presented' : 'not presented'} · paint ${alternatePaint ? 'alternate' : 'default'}`
          : 'Waiting for destination layout'}
      </Typography>
    </Stack>
  );
}
function SurfaceExamples() {
  return (
    <Stack testID="group-closure-scene" spacing={2}>
      <Typography variant="h6">Surface examples</Typography>
      <ThemeSurface />
      <NestedSurface />
      <PortalSurfaces />
    </Stack>
  );
}
export function ButtonGroupExamples() {
  const [surfaces, setSurfaces] = useState(false);
  const [vertical, setVertical] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [preview, setPreview] = useState(true);
  const [previewCount, setPreviewCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [receipt, setReceipt] = useState('Awaiting layout');
  const ref = useRef<ViewInstance>(null),
    epoch = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
    };
  }, []);
  const measure = () => {
    const target = ref.current,
      token = ++epoch.current;
    target?.measureInWindow((_x, _y, width, height) => {
      if (mounted.current && token === epoch.current && target === ref.current)
        setReceipt(`Measured ${width.toFixed(1)} × ${height.toFixed(1)}`);
    });
  };
  return (
    <ScrollView
      testID="button-group-scene"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5">From draft to delivery</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep related actions together, wherever the work takes you.
          </Typography>
        </Stack>
        <Paper variant="outlined" elevation={0} sx={{ p: 2, borderRadius: 1 }}>
          <Stack testID="document-content" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                INVOICE NV-0482
              </Typography>
              <Typography variant="h6">Northline Studio</Typography>
              <Typography variant="body2" color="text.secondary">
                Brand identity · Due 18 November
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                $1,240.00
              </Typography>
            </Stack>
            <ButtonGroup
              ref={ref}
              onLayout={measure}
              testID="document-actions"
              fullWidth
              orientation={vertical ? 'vertical' : 'horizontal'}
              disabled={disabled}
              aria-label="Document actions"
            >
              <SaveAction />
              {preview ? (
                <Button
                  testID="group-preview"
                  onClick={() => setPreviewCount((value) => value + 1)}
                >
                  Preview
                </Button>
              ) : null}
              <Button testID="group-send" loading={sending} onClick={() => setSending(true)}>
                Send
              </Button>
            </ButtonGroup>
            <Typography testID="group-status" variant="caption" color="text.secondary">
              {disabled ? 'Actions paused' : sending ? 'Preparing delivery' : 'Draft ready'} ·
              previews {previewCount} · sent {sent}
            </Typography>
            {sending ? (
              <Button
                testID="group-complete"
                variant="contained"
                onClick={() => {
                  setSending(false);
                  setSent((value) => value + 1);
                }}
              >
                Complete local delivery
              </Button>
            ) : null}
          </Stack>
        </Paper>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Adapt the action bar</Typography>
          <ButtonGroup variant="text" fullWidth aria-label="Action layout">
            <Button testID="group-horizontal" onClick={() => setVertical(false)}>
              Horizontal
            </Button>
            <Button testID="group-vertical" onClick={() => setVertical(true)}>
              Vertical
            </Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              testID="group-toggle-disabled"
              variant="outlined"
              size="small"
              onClick={() => setDisabled((value) => !value)}
            >
              {disabled ? 'Enable actions' : 'Pause actions'}
            </Button>
            <Button
              testID="group-toggle-preview"
              variant="outlined"
              size="small"
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? 'Hide preview' : 'Show preview'}
            </Button>
          </Stack>
        </Stack>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Native layout receipt</Typography>
            <Typography testID="group-ref-receipt" variant="caption" color="text.secondary">
              {receipt}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Local sample only. No document leaves this device.
            </Typography>
          </Stack>
        </Paper>
        <Button
          testID="group-closure-toggle"
          variant="outlined"
          onClick={() => setSurfaces((value) => !value)}
        >
          {surfaces ? 'Hide surface examples' : 'Show surface examples'}
        </Button>
        {surfaces ? <SurfaceExamples /> : null}
      </Stack>
    </ScrollView>
  );
}
