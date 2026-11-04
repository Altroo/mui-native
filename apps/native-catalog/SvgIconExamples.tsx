// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  SvgIcon,
  createSvgIcon,
  Stack,
  Typography,
  Paper,
  Button,
  useTheme,
  type SvgIconHandle,
} from '@mui/material';
import { Add, Check, Close, Remove } from '@mui/icons-material';

// Original geometric artwork, supplied through the Material React-node factory.
const ParcelIcon = createSvgIcon(
  React.createElement('path', {
    d: 'M12 2 2 7v10l10 5 10-5V7L12 2Zm0 2.2 6.6 3.3L12 10.8 5.4 7.5 12 4.2ZM4 9.2l7 3.5v6.6l-7-3.5V9.2Zm9 10.1v-6.6l7-3.5v6.6l-7 3.5Z',
  }),
  'Parcel',
);
const sizes = ['small', 'medium', 'large'] as const;
export function SvgIconExamples() {
  const theme = useTheme();
  const [tone, setTone] = useState<'primary' | 'error'>('primary');
  const [presses, setPresses] = useState(0);
  const [receipt, setReceipt] = useState('Ready to verify');
  const ref = useRef<SvgIconHandle>(null),
    epoch = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
    };
  }, []);
  const verify = () => {
    const target = ref.current,
      token = ++epoch.current;
    if (!target) {
      setReceipt('SVG ref unavailable');
      return;
    }
    target.measureInWindow((_x, _y, width, height) => {
      if (!mounted.current || token !== epoch.current || target !== ref.current) return;
      target.toDataURL((data) => {
        if (!mounted.current || token !== epoch.current || target !== ref.current) return;
        setReceipt(
          data.startsWith('iVBORw0KGgo')
            ? `Measured ${width.toFixed(1)} × ${height.toFixed(1)} · PNG ${data.length}`
            : 'Invalid PNG export',
        );
      });
    });
  };
  return (
    <ScrollView
      testID="svg-icon-scene"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h5">Ready for the next stop</Typography>
          <Typography variant="body2" color="text.secondary">
            The same vector follows your colors, sizes and content.
          </Typography>
        </Stack>
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <ParcelIcon titleAccess="Parcel" color="primary" sx={{ fontSize: 48 }} />
            <View style={{ flex: 1 }}>
              <Typography variant="overline" color="text.secondary">
                ORDER NV-0482
              </Typography>
              <Typography variant="subtitle1">Two parcels, one delivery</Typography>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <SvgIcon
                  testID="svg-group-probe"
                  titleAccess="Ready"
                  color="primary"
                  fontSize="small"
                >
                  {React.createElement(
                    'g',
                    { color: theme.palette.success.main },
                    React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
                  )}
                </SvgIcon>
                <Typography variant="body2" color="success.main">
                  Ready for collection
                </Typography>
              </Stack>
            </View>
          </Stack>
        </Paper>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">A size for each context</Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            {sizes.map((size) => (
              <Paper
                key={size}
                elevation={0}
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 102,
                }}
              >
                <Check
                  testID={'svg-size-' + size}
                  titleAccess={'Size ' + size}
                  fontSize={size}
                  color="primary"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {size}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Stack>
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <SvgIcon
                ref={ref}
                testID="svg-paint-probe"
                titleAccess="Live palette sample"
                onClick={() => setPresses((value) => value + 1)}
                color={tone}
                sx={{ fontSize: 48 }}
              >
                {React.createElement('circle', { cx: 12, cy: 12, r: 10 })}
              </SvgIcon>
              <View style={{ flex: 1 }}>
                <Typography variant="subtitle2">One live palette</Typography>
                <Typography testID="svg-palette-value" variant="caption" color="text.secondary">
                  {tone} {theme.palette[tone].main}
                </Typography>
              </View>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                testID="svg-use-primary"
                variant={tone === 'primary' ? 'contained' : 'outlined'}
                onClick={() => setTone('primary')}
              >
                Primary
              </Button>
              <Button
                testID="svg-use-error"
                color="error"
                variant={tone === 'error' ? 'contained' : 'outlined'}
                onClick={() => setTone('error')}
              >
                Error
              </Button>
            </Stack>
            <Button testID="svg-verify" variant="outlined" onClick={verify}>
              Verify SVG ref
            </Button>
            <Typography testID="svg-press-receipt" variant="caption" color="text.secondary">
              SVG taps: {presses}
            </Typography>
            <Typography testID="svg-ref-receipt" variant="caption" color="text.secondary">
              {receipt}
            </Typography>
          </Stack>
        </Paper>
        <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Text follows the SVG font</Typography>
            <Stack direction="row" spacing={1}>
              <SvgIcon
                testID="svg-text-small"
                titleAccess="Small SVG text"
                viewBox="0 0 120 50"
                color="primary"
                sx={{ fontSize: 12, width: 120, height: 50 }}
              >
                {React.createElement('text', { x: 4, y: 36 }, 'AB')}
              </SvgIcon>
              <SvgIcon
                testID="svg-text-large"
                titleAccess="Large SVG text"
                viewBox="0 0 120 50"
                color="primary"
                sx={{ fontSize: 30, width: 120, height: 50 }}
              >
                {React.createElement('text', { x: 4, y: 36 }, 'AB')}
              </SvgIcon>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              One viewport, two font sizes
            </Typography>
          </Stack>
        </Paper>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', fontSize: 30, color: 'text.secondary' }}
        >
          <Add fontSize="inherit" titleAccess="Add" />
          <Remove fontSize="inherit" titleAccess="Remove" />
          <Close fontSize="inherit" titleAccess="Close" />
          <Typography variant="caption" color="text.secondary">
            Existing glyphs, shared inheritance
          </Typography>
        </Stack>
      </Stack>
    </ScrollView>
  );
}
