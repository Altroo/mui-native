// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type TextInstance } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogTitle,
  ThemeProvider,
  Typography,
  createTheme,
  styled,
  useTheme,
} from '@mui/material';

const PreviewTitle = styled(DialogTitle)({
  '&.roomy-title': { paddingTop: '24px', paddingBottom: '24px' },
});
type Frame = { x: number; y: number; width: number; height: number };

/** Retain a real styled Text root while changing its classes and title context. */
export function DialogTitleContractExample() {
  const outer = useTheme();
  const { fontScale } = useWindowDimensions();
  const [roomy, setRoomy] = useState(false);
  const [reading, setReading] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [explicitId, setExplicitId] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  const host = useRef<TextInstance | null>(null);
  const revision = useRef(0);
  const counters = useRef({ attached: 0, cleaned: 0 });
  const [refs, setRefs] = useState(counters.current);
  const [window, setWindow] = useState<Frame>();
  const rootRef = useCallback((node: TextInstance | null) => {
    if (!node) return;
    host.current = node;
    counters.current = { ...counters.current, attached: counters.current.attached + 1 };
    setRefs(counters.current);
    return () => {
      revision.current += 1;
      if (host.current === node) host.current = null;
      counters.current = { ...counters.current, cleaned: counters.current.cleaned + 1 };
      setRefs(counters.current);
    };
  }, []);
  const onLayout = useCallback(() => {
    const node = host.current;
    const pending = ++revision.current;
    node?.measureInWindow((x, y, width, height) => {
      if (host.current !== node || revision.current !== pending) return;
      const next = { x, y, width, height };
      setWindow((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    });
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        ...outer,
        direction: rtl ? 'rtl' : 'ltr',
      }),
    [outer, rtl],
  );
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 12, gap: 12 }}>
        <Card variant="outlined">
          <PreviewTitle
            testID="dialog-title-preview"
            ref={rootRef}
            onLayout={onLayout}
            className={roomy ? 'roomy-title' : undefined}
            variant={reading ? 'body1' : 'h6'}
            id={explicitId ? 'workspace-settings-title' : undefined}
            style={{ direction: rtl ? 'rtl' : 'ltr' }}
          >
            Workspace settings
          </PreviewTitle>
          <Typography variant="body2" color="textSecondary" sx={{ px: 3, pb: 2 }}>
            Keep your team preferences in one place.
          </Typography>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Button testID="dialog-title-preview-spacing" onClick={() => setRoomy(!roomy)}>
            {roomy ? 'Standard heading' : 'Roomier heading'}
          </Button>
          <Button testID="dialog-title-preview-variant" onClick={() => setReading(!reading)}>
            {reading ? 'Heading style' : 'Reading style'}
          </Button>
          <Button testID="dialog-title-preview-direction" onClick={() => setRtl(!rtl)}>
            {rtl ? 'Left to right' : 'Right to left'}
          </Button>
          <Button
            testID="dialog-title-preview-identifier"
            onClick={() => setExplicitId(!explicitId)}
          >
            {explicitId ? 'Automatic IDs' : 'Explicit IDs'}
          </Button>
          <Button
            testID="dialog-title-preview-open"
            variant="contained"
            onClick={() => setOpen(true)}
          >
            Review changes
          </Button>
        </View>
        <Typography
          variant="caption"
          testID="dialog-title-preview-receipt"
          accessibilityLabel={JSON.stringify({
            roomy,
            reading,
            rtl,
            explicitId,
            open,
            saved,
            refs,
            fontScale,
            receipts: { title: { window } },
          })}
        >
          Dialog title preview
        </Typography>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          aria-labelledby={explicitId ? 'dialog-title-confirmation' : undefined}
          slotProps={{ paper: { testID: 'dialog-title-preview-paper' } }}
        >
          <DialogTitle testID="dialog-title-modal-title">Review changes</DialogTitle>
          <Typography variant="body2" color="textSecondary" sx={{ px: 3, pb: 2 }}>
            Save the updated workspace settings?
          </Typography>
          <DialogActions>
            <Button
              testID="dialog-title-modal-cancel"
              color="inherit"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              testID="dialog-title-modal-save"
              variant="contained"
              onClick={() => {
                setSaved((value) => value + 1);
                setOpen(false);
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </View>
    </ThemeProvider>
  );
}
