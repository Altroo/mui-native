// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type ViewInstance } from 'react-native';
import {
  Button,
  CircularProgress,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from '@mui/material';

type Frame = { x: number; y: number; width: number; height: number };

/** Exercise the installed public component, including a retained measurable View ref. */
export function CircularProgressContractExample() {
  const outer = useTheme();
  const { fontScale } = useWindowDimensions();
  const [paused, setPaused] = useState(false),
    [percent, setPercent] = useState(25),
    [track, setTrack] = useState(true),
    [customRange, setCustomRange] = useState(false);
  const theme = useMemo(
    () => createTheme({ ...outer, motion: { reducedMotion: paused ? 'always' : 'never' } }),
    [outer, paused],
  );
  const host = useRef<ViewInstance | null>(null);
  const counters = useRef({ attached: 0, cleaned: 0 });
  const revision = useRef(0);
  const [refs, setRefs] = useState(counters.current);
  const [window, setWindow] = useState<Frame>();
  const rootRef = useCallback((node: ViewInstance | null) => {
    if (!node) return;
    host.current = node;
    counters.current = { ...counters.current, attached: counters.current.attached + 1 };
    setRefs(counters.current);
    return () => {
      revision.current++;
      if (host.current === node) host.current = null;
      counters.current = { ...counters.current, cleaned: counters.current.cleaned + 1 };
      setRefs(counters.current);
    };
  }, []);
  const onLayout = useCallback(() => {
    const node = host.current,
      pending = ++revision.current;
    node?.measureInWindow((x, y, width, height) => {
      if (host.current !== node || revision.current !== pending) return;
      const next = { x, y, width, height };
      setWindow((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    });
  }, []);
  const min = customRange ? 20 : 0,
    max = customRange ? 80 : 100;
  const value = min + ((max - min) * percent) / 100;
  return (
    <ThemeProvider theme={theme}>
      <View style={{ gap: 16, padding: 12 }}>
        <View style={{ gap: 4 }}>
          <Typography variant="h6">Circular progress</Typography>
          <Typography variant="body2" color="textSecondary">
            Loading states and measurable progress, with optional tracks.
          </Typography>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          {(['loading', 'determinate', 'fixed'] as const).map((kind) => (
            <View key={kind} style={{ width: 88, alignItems: 'center', gap: 8 }}>
              <View
                testID={'circular-sample-' + kind}
                collapsable={false}
                style={{ width: 80, height: 80, padding: 8, backgroundColor: '#ffffff' }}
              >
                <CircularProgress
                  testID={'circular-progress-' + kind}
                  ref={kind === 'determinate' ? rootRef : undefined}
                  onLayout={kind === 'determinate' ? onLayout : undefined}
                  size={64}
                  variant={kind === 'determinate' ? 'determinate' : 'indeterminate'}
                  {...(kind === 'determinate' ? { value, min, max } : {})}
                  disableShrink={kind === 'fixed'}
                  enableTrackSlot={track}
                  accessibilityLabel={
                    kind === 'determinate'
                      ? 'Upload progress'
                      : kind === 'fixed'
                        ? 'Fixed stroke loading'
                        : 'Loading'
                  }
                />
              </View>
              <Typography variant="body2">
                {kind === 'loading' ? 'Loading' : kind === 'fixed' ? 'Fixed stroke' : percent + '%'}
              </Typography>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            testID="circular-progress-value"
            variant="contained"
            onClick={() => setPercent(percent === 25 ? 75 : 25)}
          >
            Advance progress
          </Button>
          <Button testID="circular-progress-pause" onClick={() => setPaused(!paused)}>
            {paused ? 'Resume motion' : 'Pause motion'}
          </Button>
          <Button testID="circular-progress-track" onClick={() => setTrack(!track)}>
            {track ? 'Hide tracks' : 'Show tracks'}
          </Button>
          <Button testID="circular-progress-range" onClick={() => setCustomRange(!customRange)}>
            {customRange ? 'Standard range' : 'Custom range'}
          </Button>
        </View>
        <Typography
          variant="caption"
          testID="circular-progress-preview-receipt"
          accessibilityLabel={JSON.stringify({
            paused,
            percent,
            track,
            customRange,
            min,
            max,
            value,
            refs,
            fontScale,
            receipts: { progress: { window } },
          })}
        >
          {paused ? 'Motion paused' : 'Motion active'} · {customRange ? '20 to 80' : '0 to 100'}
        </Typography>
      </View>
    </ThemeProvider>
  );
}
