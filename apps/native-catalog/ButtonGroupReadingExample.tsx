// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useCallback, useMemo, useState } from 'react';
import { I18nManager, useWindowDimensions, type TextProps } from 'react-native';
import {
  Button,
  ButtonGroup,
  Portal,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
  useTheme,
} from '@mui/material';

type Line = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  capHeight: number;
};
type ReadingMetrics = Record<string, Line[]>;
type TextLayout = NonNullable<TextProps['onTextLayout']>;
const labels = ['Save', 'Review', 'Send'] as const;

function ReadingAction({
  index,
  onLines,
  followSystem,
  uncapped,
}: {
  index: 0 | 1 | 2;
  followSystem: boolean;
  uncapped: boolean;
  onLines: (key: string, event: Parameters<TextLayout>[0]) => void;
}) {
  const [count, setCount] = useState(0);
  const policy =
    index === 1
      ? followSystem
        ? {}
        : { allowFontScaling: false }
      : index === 2
        ? { maxFontSizeMultiplier: uncapped ? 0 : 1.2 }
        : {};
  return (
    <Button
      testID={`group-reading-action-${index}`}
      aria-label={`Reading ${labels[index]} count ${count}`}
      onClick={() => setCount((value) => value + 1)}
    >
      <Typography
        testID={`group-reading-label-${index}`}
        variant="inherit"
        {...policy}
        onTextLayout={(event) => onLines(String(index), event)}
      >
        {labels[index]} {count}
      </Typography>
    </Button>
  );
}

/** Live app direction plus real native text receipts, without changing OS settings. */
export function ButtonGroupReadingExample() {
  const outer = useTheme();
  const { fontScale, height } = useWindowDimensions();
  const [rtl, setRtl] = useState(false);
  const [followSystem, setFollowSystem] = useState(false);
  const [uncapped, setUncapped] = useState(false);
  const [mixedCount, setMixedCount] = useState(0);
  const [vertical, setVertical] = useState(false);
  const [textPortal, setTextPortal] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [metrics, setMetrics] = useState<ReadingMetrics>({});
  const theme = useMemo(
    () => createTheme({ ...outer, direction: rtl ? 'rtl' : 'ltr' }),
    [outer, rtl],
  );
  const onLines = useCallback((key: string, event: Parameters<TextLayout>[0]) => {
    const next = event.nativeEvent.lines.map(({ text, x, y, width, height, capHeight }) => ({
      text,
      x,
      y,
      width,
      height,
      capHeight,
    }));
    // Native text receipts can repeat after unrelated state changes. Publish only
    // changed values so instrumentation observes actual lines without a loop.
    setMetrics((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  return (
    <Stack
      testID="group-reading-scene"
      spacing={1.5}
      sx={{ py: 2, borderTopWidth: 1, borderTopColor: 'divider' }}
    >
      <Typography variant="subtitle2">Reading and direction</Typography>
      <Typography testID="group-reading-policy" variant="caption" color="text.secondary">
        {`Save follows system text size, Review ${followSystem ? 'follows system text size' : 'stays fixed'}, and Send ${uncapped ? 'follows system text size without a cap' : 'caps enlargement at 1.2×'}.`}
      </Typography>
      <ThemeProvider theme={theme}>
        <ButtonGroup
          testID="group-reading-actions"
          fullWidth
          orientation={vertical ? 'vertical' : 'horizontal'}
          aria-label="Reading actions"
        >
          {([0, 1, 2] as const).map((index) => (
            <ReadingAction
              key={index}
              index={index}
              onLines={onLines}
              followSystem={followSystem}
              uncapped={uncapped}
            />
          ))}
        </ButtonGroup>
      </ThemeProvider>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          testID="group-reading-direction"
          size="small"
          onClick={() => setRtl((value) => !value)}
        >
          {rtl ? 'Use left to right' : 'Use right to left'}
        </Button>
        <Button
          testID="group-reading-orientation"
          size="small"
          onClick={() => setVertical((value) => !value)}
        >
          {vertical ? 'Use horizontal actions' : 'Use vertical actions'}
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          testID="group-reading-follow-toggle"
          size="small"
          onClick={() => setFollowSystem((value) => !value)}
        >
          {followSystem ? 'Fix Review text size' : 'Let Review follow system'}
        </Button>
        <Button
          testID="group-reading-cap-toggle"
          size="small"
          onClick={() => setUncapped((value) => !value)}
        >
          {uncapped ? 'Restore Send cap' : 'Remove Send cap'}
        </Button>
      </Stack>
      <Button
        testID="group-reading-mixed-action"
        aria-label={`Reading mixed count ${mixedCount}`}
        variant="outlined"
        onClick={() => setMixedCount((value) => value + 1)}
        sx={{ width: 220, maxWidth: '100%' }}
      >
        <Typography
          variant="inherit"
          testID="group-reading-mixed-first"
          onTextLayout={(event) => onLines('mixed-first', event)}
        >
          Approve
        </Typography>
        {' international '}
        <Typography
          variant="inherit"
          allowFontScaling={false}
          testID="group-reading-mixed-last"
          onTextLayout={(event) => onLines('mixed-last', event)}
          sx={{ fontWeight: 700 }}
        >
          delivery {mixedCount}
        </Typography>
      </Button>
      <Button
        testID="group-reading-text-portal-toggle"
        size="small"
        onClick={() => setTextPortal((value) => !value)}
      >
        {textPortal ? 'Close text Portal' : 'Show text Portal'}
      </Button>
      <Typography testID="group-reading-text-origin" sx={{ fontSize: 28 }}>
        Text origin
        {textPortal ? (
          <Portal>
            <Typography
              testID="group-reading-text-portal"
              allowFontScaling={false}
              onTextLayout={(event) => onLines('portal', event)}
              sx={{
                position: 'absolute',
                top: height * 0.4,
                left: 16,
                right: 16,
                p: 2,
                fontSize: 14,
                lineHeight: 1.75,
                color: 'text.primary',
                backgroundColor: 'background.paper',
                borderWidth: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              Independent window text
            </Typography>
          </Portal>
        ) : null}
      </Typography>
      <Typography testID="group-reading-status" variant="caption" accessibilityLiveRegion="polite">
        {rtl ? 'RTL' : 'LTR'} · {vertical ? 'vertical' : 'horizontal'} · system text{' '}
        {fontScale.toFixed(2)}×
      </Typography>
      <Button
        testID="group-reading-measurements-toggle"
        size="small"
        onClick={() => setShowMeasurements((value) => !value)}
      >
        {showMeasurements ? 'Hide native measurements' : 'Show native measurements'}
      </Button>
      {showMeasurements ? (
        <Typography testID="group-reading-metadata" variant="caption" allowFontScaling={false}>
          {JSON.stringify({
            schemaVersion: 1,
            globalRTL: I18nManager.isRTL,
            leftRightSwap: I18nManager.doLeftAndRightSwapInRTL,
            fontScale,
            direction: rtl ? 'rtl' : 'ltr',
            orientation: vertical ? 'vertical' : 'horizontal',
            followSystem,
            uncapped,
            mixedCount,
            metrics,
          })}
        </Typography>
      ) : null}
    </Stack>
  );
}
