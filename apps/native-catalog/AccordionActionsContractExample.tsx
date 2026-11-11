// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { View, type ViewInstance, type ViewProps, useWindowDimensions } from 'react-native';
import {
  AccordionActions,
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

function SaveNote() {
  const [saved, setSaved] = useState(0);
  return (
    <Button
      testID="actions-preview-save"
      variant="contained"
      aria-label={`Saved notes ${saved}`}
      style={{ width: 104 }}
      onClick={() => setSaved((value) => value + 1)}
    >
      Save note
    </Button>
  );
}

/** A retained action row with measured native spacing and a real child action. */
export function AccordionActionsContractExample() {
  const outer = useTheme();
  const [disableSpacing, setDisableSpacing] = useState(false);
  const [roomy, setRoomy] = useState(false);
  const [rtl, setRtl] = useState(false);
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
          MuiAccordionActions: {
            styleOverrides: { spacing: { '&.roomy-actions': { columnGap: '16px' } } },
          },
        },
      }),
    [outer, rtl],
  );
  return (
    <ThemeProvider theme={theme}>
      <View style={{ padding: 12, gap: 12 }}>
        <Card variant="outlined" style={{ padding: 12, gap: 6 }}>
          <Typography variant="h6">Delivery note</Typography>
          <Typography variant="body2" color="text.secondary">
            Save your delivery instructions or leave the draft as it is.
          </Typography>
          <AccordionActions
            ref={rootRef}
            component={ActionRoot}
            className={roomy ? 'roomy-actions' : undefined}
            testID="actions-preview-row"
            disableSpacing={disableSpacing}
            accessible={false}
            style={{ direction: rtl ? 'rtl' : 'ltr' }}
          >
            <Button testID="actions-preview-keep" color="inherit" style={{ width: 104 }}>
              Keep draft
            </Button>
            <SaveNote />
          </AccordionActions>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Button
            testID="actions-preview-spacing"
            onClick={() => setDisableSpacing(!disableSpacing)}
          >
            {disableSpacing ? 'Restore spacing' : 'Remove spacing'}
          </Button>
          <Button testID="actions-preview-theme" onClick={() => setRoomy(!roomy)}>
            {roomy ? 'Standard gap' : 'Roomier gap'}
          </Button>
          <Button testID="actions-preview-direction" onClick={() => setRtl(!rtl)}>
            {rtl ? 'Left to right' : 'Right to left'}
          </Button>
        </View>
        <Typography
          variant="caption"
          testID="actions-preview-receipt"
          accessibilityLabel={JSON.stringify({ disableSpacing, roomy, rtl, refs, fontScale })}
        >
          Action row preview
        </Typography>
      </View>
    </ThemeProvider>
  );
}
