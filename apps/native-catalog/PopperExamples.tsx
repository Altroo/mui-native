/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useMemo, useState } from 'react';
import { ScrollView, View, type ViewInstance } from 'react-native';
import {
  Button,
  FormControlLabel,
  Paper,
  Popper,
  Stack,
  Switch,
  Typography,
  useTheme,
  type NativePopperModifier,
  type PopperPlacementType,
} from '@mui/material';
import { catalogArrowEdge } from './popperArrow';

export function PopperExamples() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);
  const [transformed, setTransformed] = useState(false);
  const [bounded, setBounded] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const [placement, setPlacement] = useState<PopperPlacementType>('bottom-start');
  const [anchor, setAnchor] = useState<ViewInstance | null>(null);
  const [boundary, setBoundary] = useState<ViewInstance | null>(null);
  const [arrow, setArrow] = useState<ViewInstance | null>(null);
  const modifiers = useMemo<NativePopperModifier[]>(
    () => [
      { name: 'offset', options: { offset: [0, 10] } },
      catalogArrowEdge,
      ...(arrow ? [{ name: 'arrow', options: { element: arrow } }] : []),
      ...(bounded && boundary
        ? [
            { name: 'preventOverflow', options: { boundary } },
            { name: 'flip', options: { boundary } },
          ]
        : []),
    ],
    [arrow, boundary, bounded],
  );
  return (
    <ScrollView
      testID="overlays-scroll"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Stack spacing={2}>
        <View>
          <Typography variant="h5">Anchored surfaces</Typography>
          <Typography variant="body2" color="text.secondary">
            Open the delivery note, then scroll its trigger. Compare a window portal with inline
            placement.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Read confirmations: {confirmed}
          </Typography>
        </View>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <FormControlLabel
              label="Render inline"
              control={
                <Switch
                  testID="popper-inline-toggle"
                  checked={inline}
                  onChange={(_, value) => setInline(value)}
                />
              }
            />
            <FormControlLabel
              label="Transform the frame"
              control={
                <Switch
                  testID="popper-transform-toggle"
                  checked={transformed}
                  onChange={(_, value) => setTransformed(value)}
                />
              }
            />
            <FormControlLabel
              label="Keep inside the frame"
              control={
                <Switch
                  testID="popper-boundary-toggle"
                  checked={bounded}
                  onChange={(_, value) => setBounded(value)}
                />
              }
            />
            <Button
              variant="outlined"
              onClick={() =>
                setPlacement((value) => (value === 'bottom-start' ? 'top-end' : 'bottom-start'))
              }
            >
              Preferred: {placement}
            </Button>
          </Stack>
        </Paper>
        <View
          ref={setBoundary}
          testID="delivery-frame"
          style={{
            height: 340,
            borderWidth: 2,
            borderColor: theme.palette.divider,
            borderRadius: 16,
            padding: 12,
            overflow: 'hidden',
            transform: transformed ? [{ rotate: '6deg' }, { scale: 0.92 }] : undefined,
          }}
        >
          <ScrollView
            testID="delivery-scroll"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ minHeight: 480 }}
          >
            <View style={{ paddingTop: 20, paddingHorizontal: 12 }}>
              <Typography variant="overline" color="text.secondary">
                Delivery 024
              </Typography>
              <Button
                ref={setAnchor}
                aria-label="Delivery note"
                testID="delivery-trigger"
                variant="contained"
                onClick={() => setOpen((value) => !value)}
              >
                {open ? 'Hide delivery note' : 'Show delivery note'}
              </Button>
              <Popper
                open={open}
                anchorEl={anchor}
                disablePortal={inline}
                placement={placement}
                modifiers={modifiers}
                style={{ width: 236, zIndex: 10 }}
                testID="delivery-note"
              >
                {({ placement: actual }) => (
                  <>
                    <View
                      ref={setArrow}
                      pointerEvents="none"
                      testID="delivery-arrow"
                      style={{ position: 'absolute', width: 10, height: 10, zIndex: 1 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: theme.palette.background.paper,
                          transform: [{ rotate: '45deg' }],
                        }}
                      />
                    </View>
                    <Paper elevation={1} sx={{ p: 2, borderWidth: 1, borderColor: 'divider' }}>
                      <Stack spacing={1}>
                        <Typography variant="subtitle1">Arrives Thursday</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your delivery window is 14:00 to 16:00.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Placement: {actual}
                        </Typography>
                        <Button size="small" onClick={() => setConfirmed((value) => value + 1)}>
                          Mark as read
                        </Button>
                      </Stack>
                    </Paper>
                  </>
                )}
              </Popper>
              <Typography variant="body2" color="text.secondary" style={{ marginTop: 180 }}>
                Scroll back to find the trigger.
              </Typography>
            </View>
          </ScrollView>
        </View>
      </Stack>
    </ScrollView>
  );
}
