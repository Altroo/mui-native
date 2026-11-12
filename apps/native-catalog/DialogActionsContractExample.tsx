// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { View, type ViewInstance, type ViewProps, useWindowDimensions } from 'react-native';
import {
  DialogActions,
  Button,
  Card,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from '@mui/material';

const ActionRoot = forwardRef<
  ViewInstance,
  ViewProps & { className?: string | undefined; ownerState?: unknown }
>(({ className: _className, ownerState: _ownerState, ...native }, ref) => (
  <View {...native} ref={ref} />
));

function SaveChanges() {
  const [saved, setSaved] = useState(0);
  return (
    <Button
      testID="dialog-actions-preview-save"
      variant="contained"
      aria-label={`Saved changes ${saved}`}
      style={{ width: 104 }}
      onClick={() => setSaved((value) => value + 1)}
    >
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}

/** A retained dialog footer with measured native spacing and a real child action. */
export function DialogActionsContractExample() {
  const outer = useTheme();
  const [disableSpacing, setDisableSpacing] = useState(false);
  const [roomy, setRoomy] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [growMode, setGrowMode] = useState<0 | 1 | 2>(0);
  const lifecycle = useRef({ attached: 0, cleaned: 0 });
  const [refs, setRefs] = useState(lifecycle.current);
  const { fontScale } = useWindowDimensions();
  const rootRef = useCallback((host: ViewInstance | null) => {
    if (!host) return;
    lifecycle.current = { ...lifecycle.current, attached: lifecycle.current.attached + 1 };
    setRefs(lifecycle.current);
    return () => {
      lifecycle.current = { ...lifecycle.current, cleaned: lifecycle.current.cleaned + 1 };
      setRefs(lifecycle.current);
    };
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        ...outer,
        direction: rtl ? 'rtl' : 'ltr',
        components: {
          ...outer.components,
          MuiDialogActions: {
            styleOverrides: { spacing: { '&.roomy-dialog-actions': { columnGap: '16px' } } },
          },
        },
      }),
    [outer, rtl],
  );
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 12, gap: 12 }}>
        <Card
          variant="outlined"
          style={{
            padding: 12,
            gap: 6,
            height: growMode ? Math.round(260 * fontScale) : undefined,
          }}
        >
          <Typography variant="h6">Review changes</Typography>
          <Typography variant="body2" color="textSecondary">
            Save your updates or keep editing.
          </Typography>
          <DialogActions
            ref={rootRef}
            component={ActionRoot}
            className={roomy ? 'roomy-dialog-actions' : undefined}
            testID="dialog-actions-preview-row"
            disableSpacing={disableSpacing}
            accessible={false}
            sx={growMode === 1 ? { flex: 1 } : undefined}
            style={{ direction: rtl ? 'rtl' : 'ltr', ...(growMode === 2 ? { flex: 1 } : {}) }}
          >
            <Button testID="dialog-actions-preview-cancel" color="inherit" style={{ width: 104 }}>
              Cancel
            </Button>
            <SaveChanges />
          </DialogActions>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Button
            testID="dialog-actions-preview-spacing"
            onClick={() => setDisableSpacing(!disableSpacing)}
          >
            {disableSpacing ? 'Restore spacing' : 'Remove spacing'}
          </Button>
          <Button testID="dialog-actions-preview-theme" onClick={() => setRoomy(!roomy)}>
            {roomy ? 'Standard gap' : 'Roomier gap'}
          </Button>
          <Button testID="dialog-actions-preview-direction" onClick={() => setRtl(!rtl)}>
            {rtl ? 'Left to right' : 'Right to left'}
          </Button>
          <Button
            testID="dialog-actions-preview-sizing"
            onClick={() => setGrowMode((value) => ((value + 1) % 3) as 0 | 1 | 2)}
          >
            {growMode === 0 ? 'Fill with sx' : growMode === 1 ? 'Use native flex' : 'Reset sizing'}
          </Button>
        </View>
        <Typography
          variant="caption"
          testID="dialog-actions-preview-receipt"
          accessibilityLabel={JSON.stringify({
            disableSpacing,
            roomy,
            rtl,
            growMode,
            refs,
            fontScale,
          })}
        >
          Dialog footer preview
        </Typography>
      </View>
    </ThemeProvider>
  );
}
