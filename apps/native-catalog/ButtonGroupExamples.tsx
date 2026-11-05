// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { ScrollView, type ViewInstance } from 'react-native';
import { Button, ButtonGroup, Paper, Stack, Typography } from '@mui/material';

// A normal component wrapper owns this state. Group defaults and position flow
// through context, so changing orientation does not remount the action.
function SaveAction() {
  const [count, setCount] = useState(0);
  return (
    <Button testID="group-save" disabled={false} onClick={() => setCount((value) => value + 1)}>
      Save {count}
    </Button>
  );
}
export function ButtonGroupExamples() {
  const [vertical, setVertical] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [preview, setPreview] = useState(true);
  const [previewCount, setPreviewCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const [receipt, setReceipt] = useState('Awaiting layout');
  const ref = useRef<ViewInstance>(null),
    epoch = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
    };
  }, []);
  const measure = () => {
    const target = ref.current,
      token = ++epoch.current;
    target?.measureInWindow((_x, _y, width, height) => {
      if (mounted.current && token === epoch.current && target === ref.current)
        setReceipt(`Measured ${width.toFixed(1)} × ${height.toFixed(1)}`);
    });
  };
  return (
    <ScrollView
      testID="button-group-scene"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h5">From draft to delivery</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep related actions together, wherever the work takes you.
          </Typography>
        </Stack>
        <Paper variant="outlined" elevation={0} sx={{ p: 2, borderRadius: 1 }}>
          <Stack testID="document-content" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="overline" color="text.secondary">
                INVOICE NV-0482
              </Typography>
              <Typography variant="h6">Northline Studio</Typography>
              <Typography variant="body2" color="text.secondary">
                Brand identity · Due 18 November
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                $1,240.00
              </Typography>
            </Stack>
            <ButtonGroup
              ref={ref}
              onLayout={measure}
              testID="document-actions"
              fullWidth
              orientation={vertical ? 'vertical' : 'horizontal'}
              disabled={disabled}
              aria-label="Document actions"
            >
              <SaveAction />
              {preview ? (
                <Button
                  testID="group-preview"
                  onClick={() => setPreviewCount((value) => value + 1)}
                >
                  Preview
                </Button>
              ) : null}
              <Button testID="group-send" loading={sending} onClick={() => setSending(true)}>
                Send
              </Button>
            </ButtonGroup>
            <Typography testID="group-status" variant="caption" color="text.secondary">
              {disabled ? 'Actions paused' : sending ? 'Preparing delivery' : 'Draft ready'} ·
              previews {previewCount} · sent {sent}
            </Typography>
            {sending ? (
              <Button
                testID="group-complete"
                variant="contained"
                onClick={() => {
                  setSending(false);
                  setSent((value) => value + 1);
                }}
              >
                Complete local delivery
              </Button>
            ) : null}
          </Stack>
        </Paper>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Adapt the action bar</Typography>
          <ButtonGroup variant="text" fullWidth aria-label="Action layout">
            <Button testID="group-horizontal" onClick={() => setVertical(false)}>
              Horizontal
            </Button>
            <Button testID="group-vertical" onClick={() => setVertical(true)}>
              Vertical
            </Button>
          </ButtonGroup>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              testID="group-toggle-disabled"
              variant="outlined"
              size="small"
              onClick={() => setDisabled((value) => !value)}
            >
              {disabled ? 'Enable actions' : 'Pause actions'}
            </Button>
            <Button
              testID="group-toggle-preview"
              variant="outlined"
              size="small"
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? 'Hide preview' : 'Show preview'}
            </Button>
          </Stack>
        </Stack>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Native layout receipt</Typography>
            <Typography testID="group-ref-receipt" variant="caption" color="text.secondary">
              {receipt}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Local sample only. No document leaves this device.
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </ScrollView>
  );
}
