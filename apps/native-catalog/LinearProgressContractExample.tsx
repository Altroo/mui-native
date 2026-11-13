// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions, type ViewInstance } from 'react-native';
import { RtlProvider } from '@altroo/mui-native-system';
import {
  Button,
  LinearProgress,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from '@mui/material';

type Frame = { x: number; y: number; width: number; height: number };
/** Public import, four source variants and a retained native host, rather than a mock preview. */
export function LinearProgressContractExample() {
  const outer = useTheme(),
    { fontScale } = useWindowDimensions();
  const [paused, setPaused] = useState(false),
    [percent, setPercent] = useState(25),
    [customRange, setCustomRange] = useState(false),
    [rtl, setRtl] = useState(false),
    [dark, setDark] = useState(false);
  const theme = useMemo(
    () =>
      createTheme({
        ...outer,
        palette: {
          mode: dark ? 'dark' : 'light',
          primary: outer.palette.primary,
          secondary: outer.palette.secondary,
        },
        motion: { reducedMotion: paused ? 'always' : 'never' },
      }),
    [outer, paused, dark],
  );
  const host = useRef<ViewInstance | null>(null),
    counters = useRef({ attached: 0, cleaned: 0 }),
    revision = useRef(0);
  const [refs, setRefs] = useState(counters.current),
    [window, setWindow] = useState<Frame>();
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
    max = customRange ? 80 : 100,
    value = min + ((max - min) * percent) / 100,
    valueBuffer = min + (max - min) * 0.85;
  return (
    <ThemeProvider theme={theme}>
      <RtlProvider value={rtl}>
        <View
          style={{
            padding: 12,
            gap: 12,
            backgroundColor: dark ? '#121212' : '#ffffff',
            borderRadius: 8,
          }}
        >
          <View style={{ gap: 4 }}>
            <Typography variant="h6">Linear progress</Typography>
            <Typography variant="body2" color="textSecondary">
              Transfer status, measured progress and buffered loading.
            </Typography>
          </View>
          <View style={{ gap: 8 }}>
            {(['indeterminate', 'determinate', 'buffer', 'query'] as const).map((variant) => (
              <View key={variant} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Typography variant="body2">
                    {variant === 'indeterminate'
                      ? 'Loading'
                      : variant === 'determinate'
                        ? 'Uploaded'
                        : variant === 'buffer'
                          ? 'Buffered'
                          : 'Checking'}
                  </Typography>
                  {variant === 'determinate' ? (
                    <Typography variant="body2">{percent}%</Typography>
                  ) : null}
                </View>
                <View
                  testID={'linear-sample-' + variant}
                  collapsable={false}
                  style={{ height: 24, justifyContent: 'center' }}
                >
                  <LinearProgress
                    ref={variant === 'determinate' ? rootRef : undefined}
                    onLayout={variant === 'determinate' ? onLayout : undefined}
                    testID={'linear-progress-' + variant}
                    accessibilityLabel={
                      variant === 'determinate'
                        ? 'Upload progress'
                        : variant === 'buffer'
                          ? 'Buffered upload'
                          : variant === 'query'
                            ? 'Checking connection'
                            : 'Loading records'
                    }
                    variant={variant}
                    min={variant === 'determinate' || variant === 'buffer' ? min : undefined}
                    max={variant === 'determinate' || variant === 'buffer' ? max : undefined}
                    value={value}
                    valueBuffer={valueBuffer}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              testID="linear-progress-value"
              variant="contained"
              onClick={() => setPercent(percent === 25 ? 75 : 25)}
            >
              Advance
            </Button>
            <Button testID="linear-progress-pause" onClick={() => setPaused(!paused)}>
              {paused ? 'Resume motion' : 'Pause motion'}
            </Button>
            <Button testID="linear-progress-range" onClick={() => setCustomRange(!customRange)}>
              {customRange ? 'Standard range' : 'Custom range'}
            </Button>
            <Button testID="linear-progress-direction" onClick={() => setRtl(!rtl)}>
              {rtl ? 'Left to right' : 'Right to left'}
            </Button>
            <Button testID="linear-progress-theme" onClick={() => setDark(!dark)}>
              {dark ? 'Light theme' : 'Dark theme'}
            </Button>
          </View>
          <Typography
            variant="caption"
            testID="linear-progress-preview-receipt"
            accessibilityLabel={JSON.stringify({
              percent,
              paused,
              customRange,
              rtl,
              dark,
              min,
              max,
              value,
              valueBuffer,
              refs,
              fontScale,
              receipts: { progress: { window } },
            })}
          >
            {paused ? 'Motion paused' : 'Motion active'} · {customRange ? '20 to 80' : '0 to 100'} ·{' '}
            {rtl ? 'RTL' : 'LTR'}
          </Typography>
        </View>
      </RtlProvider>
    </ThemeProvider>
  );
}
