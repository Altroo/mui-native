import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Collapse,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  ThemeProvider,
  Typography,
  useTheme,
} from '@mui/material';

/** Retained edits and both axes exercise the public Collapse component. */
export function CollapseExamples() {
  const theme = useTheme();
  const [vertical, setVertical] = useState(false),
    [horizontal, setHorizontal] = useState(false),
    [reduced, setReduced] = useState(false),
    [slow, setSlow] = useState(false);
  const [notes, setNotes] = useState(0),
    [phase, setPhase] = useState('Collapsed'),
    [horizontalPhase, setHorizontalPhase] = useState('Collapsed');
  const [receipts, setReceipts] = useState({ entered: 0, exited: 0 });
  const [gestures, setGestures] = useState({ touches: 0, activations: 0 });
  const motionTheme = useMemo(
    () => ({
      ...theme,
      motion: {
        ...theme.motion,
        reducedMotion: reduced ? ('always' as const) : ('never' as const),
      },
    }),
    [theme, reduced],
  );
  return (
    <ThemeProvider theme={motionTheme}>
      <ScrollView testID="collapse-scroll" contentContainerStyle={{ paddingBottom: 32 }}>
        <Stack spacing={3}>
          <View style={{ gap: 5 }}>
            <Typography variant="overline" color="text.secondary">
              Material · Collapse
            </Typography>
            <Typography variant="h5">Room for the details</Typography>
            <Typography variant="body2" color="text.secondary">
              Expand content in place. Reverse a transition, keep an edit, or make a compact row
              wider.
            </Typography>
          </View>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Typography variant="subtitle1">Dispatch details</Typography>
                <Typography variant="caption" color="text.secondary">
                  {`NV-0482 · vertical, ${slow ? '5 s preview' : 'auto timing'}`}
                </Typography>
              </View>
              <Button
                testID="collapse-vertical-toggle"
                size="small"
                variant={vertical ? 'outlined' : 'contained'}
                accessibilityState={{ expanded: vertical }}
                aria-controls="collapse-dispatch"
                onTouchEnd={() => setGestures((old) => ({ ...old, touches: old.touches + 1 }))}
                onClick={() => {
                  setGestures((old) => ({ ...old, activations: old.activations + 1 }));
                  setVertical((old) => !old);
                }}
              >
                {vertical ? 'Hide' : 'Show'}
              </Button>
            </View>
            <Collapse
              in={vertical}
              timeout={slow ? 5000 : 'auto'}
              id="collapse-dispatch"
              slotProps={{
                root: { testID: 'collapse-vertical-root' },
                wrapper: { testID: 'collapse-vertical-wrapper' },
              }}
              onEnter={() => setPhase('Expanding')}
              onExit={() => setPhase('Collapsing')}
              onEntered={() => {
                setPhase('Expanded');
                setReceipts((old) => ({ ...old, entered: old.entered + 1 }));
              }}
              onExited={() => {
                setPhase('Collapsed');
                setReceipts((old) => ({ ...old, exited: old.exited + 1 }));
              }}
            >
              <View style={{ paddingTop: 20, gap: 14 }}>
                <View style={{ height: 1, backgroundColor: theme.palette.divider }} />
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      DESTINATION
                    </Typography>
                    <Typography variant="body2">Rabat, Morocco</Typography>
                  </View>
                  <View style={{ gap: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      CONTENTS
                    </Typography>
                    <Typography variant="body2">2 parcels</Typography>
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <Typography testID="collapse-note-count" variant="body2">
                    {notes === 0 ? 'No delivery note' : `Delivery notes: ${notes}`}
                  </Typography>
                  {Array.from({ length: notes }, (_, index) => (
                    <Typography key={index} variant="body2" color="text.secondary">
                      {index + 1}. Keep this note when the panel closes.
                    </Typography>
                  ))}
                  <Button
                    testID="collapse-add-note"
                    size="small"
                    variant="text"
                    onClick={() => setNotes((old) => old + 1)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add a note
                  </Button>
                </View>
              </View>
            </Collapse>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
              }}
            >
              <Typography testID="collapse-phase" variant="caption" color="text.secondary">
                {phase}
              </Typography>
              <Typography
                testID="collapse-receipts"
                variant="caption"
                color="text.secondary"
              >{`Entered ${receipts.entered} · Exited ${receipts.exited}`}</Typography>
            </View>
            <Typography
              testID="collapse-gestures"
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              {`Touches ${gestures.touches} · Activations ${gestures.activations}`}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Typography variant="subtitle1">A little more context</Typography>
                <Typography variant="caption" color="text.secondary">
                  Horizontal · 480 ms
                </Typography>
              </View>
              <Button
                testID="collapse-horizontal-toggle"
                size="small"
                variant="outlined"
                accessibilityState={{ expanded: horizontal }}
                onClick={() => setHorizontal((old) => !old)}
              >
                {horizontal ? 'Close' : 'Reveal'}
              </Button>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.palette.action.selected,
                }}
              >
                <Typography variant="subtitle2">NV</Typography>
              </View>
              <Collapse
                in={horizontal}
                orientation="horizontal"
                timeout={480}
                onEnter={() => setHorizontalPhase('Expanding')}
                onEntered={() => setHorizontalPhase('Expanded')}
                onExit={() => setHorizontalPhase('Collapsing')}
                onExited={() => setHorizontalPhase('Collapsed')}
                slotProps={{
                  root: { testID: 'collapse-horizontal-root' },
                  wrapper: { testID: 'collapse-horizontal-wrapper' },
                }}
              >
                <View
                  style={{
                    width: 184,
                    minHeight: 64,
                    borderRadius: 12,
                    padding: 12,
                    justifyContent: 'center',
                    backgroundColor: theme.palette.action.hover,
                  }}
                >
                  <Typography variant="body2">Tracking is ready</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated a moment ago
                  </Typography>
                </View>
              </Collapse>
            </View>
          </Paper>
          <View style={{ gap: 4 }}>
            <Typography testID="collapse-horizontal-phase" variant="caption" color="text.secondary">
              {`Horizontal: ${horizontalPhase}`}
            </Typography>
            <FormControlLabel
              label="Slow preview"
              control={
                <Switch
                  testID="collapse-slow"
                  checked={slow}
                  onChange={(_, checked) => setSlow(checked)}
                />
              }
            />
            <Typography variant="caption" color="text.secondary">
              Use five seconds to inspect a vertical transition or reverse it midway.
            </Typography>
            <FormControlLabel
              label="Reduce motion"
              control={
                <Switch
                  testID="collapse-reduced"
                  checked={reduced}
                  onChange={(_, checked) => setReduced(checked)}
                />
              }
            />
            <Typography variant="caption" color="text.secondary">
              The same content and completion callbacks remain available when animation is reduced.
            </Typography>
          </View>
        </Stack>
      </ScrollView>
    </ThemeProvider>
  );
}
