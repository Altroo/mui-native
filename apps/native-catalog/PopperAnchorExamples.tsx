/*
 * Copyright (c) 2026 Altroo and contributors.
 * SPDX-License-Identifier: MIT
 */
import { useCallback, useMemo, useState } from 'react';
import { View, type ViewInstance } from 'react-native';
import {
  Button,
  FormControlLabel,
  Paper,
  Popper,
  Stack,
  Switch,
  Typography,
  type NativePopperModifier,
} from '@mui/material';

function SharedNote({ onClose }: { onClose: () => void }) {
  // Keep this state in the actual popup child: remounting during retarget or
  // anchor recovery must not be mistaken for successful state preservation.
  const [reads, setReads] = useState(0);
  return (
    <Paper elevation={2} sx={{ p: 1.5, borderWidth: 1, borderColor: 'divider' }}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Delivery instructions</Typography>
        <Typography testID="shared-read-count" variant="caption">
          Read count: {reads}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button testID="shared-read" size="small" onClick={() => setReads((value) => value + 1)}>
            Read note
          </Button>
          <Button testID="shared-close" size="small" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

/** One mounted popup follows two native stops and survives missing anchors. */
export function PopperAnchorExamples() {
  const [selected, setSelected] = useState<'a' | 'b'>('a');
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [first, setFirst] = useState<ViewInstance | null>(null);
  const [second, setSecond] = useState<ViewInstance | null>(null);
  // Deliberately retain the last instance after removal. This exercises native
  // disconnection even when a consumer still holds its previous anchor ref.
  const firstRef = useCallback((node: ViewInstance | null) => {
    if (node) setFirst(node);
  }, []);
  const secondRef = useCallback((node: ViewInstance | null) => {
    if (node) setSecond(node);
  }, []);
  const modifiers = useMemo<NativePopperModifier[]>(
    () => [{ name: 'offset', options: { offset: [0, 10] } }],
    [],
  );
  const choose = (stop: 'a' | 'b') => {
    setSelected(stop);
    setOpen(true);
  };
  return (
    <Paper variant="outlined" sx={{ p: 2 }} testID="shared-example">
      <Stack spacing={1}>
        <View>
          <Typography variant="h6">One note, two stops</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a stop. Read counts stay with the note while its anchor changes.
          </Typography>
          <Typography testID="shared-selection" variant="caption">
            Following stop {selected.toUpperCase()}
          </Typography>
        </View>
        <FormControlLabel
          label="Render this note inline"
          control={
            <Switch
              testID="shared-inline-toggle"
              checked={inline}
              onChange={(_, value) => setInline(value)}
            />
          }
        />
        <FormControlLabel
          label="Show delivery stops"
          control={
            <Switch
              testID="shared-mounted-toggle"
              checked={mounted}
              onChange={(_, value) => setMounted(value)}
            />
          }
        />
        <View testID="shared-frame" style={{ height: 300 }} collapsable={false}>
          {mounted ? (
            <>
              <Button
                ref={firstRef}
                testID="shared-anchor-a"
                variant={selected === 'a' ? 'contained' : 'outlined'}
                onClick={() => choose('a')}
                style={{ position: 'absolute', left: 0, top: 16 }}
              >
                Stop A
              </Button>
              <Button
                ref={secondRef}
                testID="shared-anchor-b"
                variant={selected === 'b' ? 'contained' : 'outlined'}
                onClick={() => choose('b')}
                style={{ position: 'absolute', right: 0, top: 200 }}
              >
                Stop B
              </Button>
            </>
          ) : null}
          <Popper
            testID="shared-note"
            open={open}
            anchorEl={selected === 'a' ? first : second}
            placement={selected === 'a' ? 'bottom-start' : 'bottom-end'}
            disablePortal={inline}
            modifiers={modifiers}
            style={{ width: 216, zIndex: 10 }}
          >
            <SharedNote onClose={() => setOpen(false)} />
          </Popper>
        </View>
      </Stack>
    </Paper>
  );
}
