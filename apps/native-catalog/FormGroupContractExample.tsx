// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { forwardRef, useCallback, useMemo, useRef, useState, type RefCallback } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewInstance,
  type ViewProps,
} from 'react-native';
import {
  Box,
  Button,
  FormControl,
  FormGroup,
  ThemeProvider,
  Typography,
  createTheme,
  styled,
  useTheme,
} from '@mui/material';

const CustomRoot = forwardRef<ViewInstance, ViewProps & { className?: string | undefined }>(
  ({ className: _className, ...native }, ref) => <View {...native} ref={ref} />,
);
// These selectors exercise the final inherited classes after shared styled resolution.
const WrappedGroup = styled(FormGroup)({
  '&.MuiFormGroup-row': { borderRightWidth: 4 },
  '&.Mui-error': { opacity: 0.6 },
});
const resetInsets = StyleSheet.create({ reset: { margin: 0, padding: 0 } });
const keys = ['inherited', 'own-false', 'custom', 'styled'] as const;
type GroupKey = (typeof keys)[number];
type Rect = { x: number; y: number; width: number; height: number };
type Receipt = { local: Rect; window?: Rect };
const titles: Record<GroupKey, string> = {
  inherited: 'Inherited error',
  'own-false': 'Own error=false',
  custom: 'Custom native root',
  styled: 'Wrapped styled root',
};
function StatefulOption({ group }: { group: GroupKey }) {
  const [count, setCount] = useState(0);
  return (
    <Button
      testID={`form-group-contract-child-${group}`}
      variant="outlined"
      color="inherit"
      onClick={() => setCount((value) => value + 1)}
    >
      Choice {count}
    </Button>
  );
}
/** Standalone native contract scene; the catalog owner chooses its route. */
export function FormGroupContractExample() {
  const outer = useTheme();
  const [row, setRow] = useState(false),
    [parentError, setParentError] = useState(false),
    [themed, setThemed] = useState(false),
    [rtl, setRtl] = useState(false),
    [alternateText, setAlternateText] = useState(false);
  const fontSize = alternateText ? 20 : 16;
  const { fontScale } = useWindowDimensions();
  const [receipts, setReceipts] = useState<Partial<Record<GroupKey, Receipt>>>({});
  const nodes = useRef<Partial<Record<GroupKey, ViewInstance>>>({});
  const revisions = useRef<Record<GroupKey, number>>({
    inherited: 0,
    'own-false': 0,
    custom: 0,
    styled: 0,
  });
  const refs = useRef<Record<GroupKey, { attached: number; cleaned: number }>>({
    inherited: { attached: 0, cleaned: 0 },
    'own-false': { attached: 0, cleaned: 0 },
    custom: { attached: 0, cleaned: 0 },
    styled: { attached: 0, cleaned: 0 },
  });
  const rootRefs = useMemo(() => {
    const track =
      (key: GroupKey): RefCallback<ViewInstance> =>
      (node) => {
        const release = () => {
          if (nodes.current[key]) {
            delete nodes.current[key];
            refs.current[key].cleaned += 1;
            revisions.current[key] += 1;
          }
        };
        if (!node) {
          release();
          return;
        }
        nodes.current[key] = node;
        refs.current[key].attached += 1;
        return () => {
          if (nodes.current[key] === node) release();
        };
      };
    return {
      inherited: track('inherited'),
      'own-false': track('own-false'),
      custom: track('custom'),
      styled: track('styled'),
    };
  }, []);
  const publish = useCallback((key: GroupKey, next: Receipt) => {
    setReceipts((previous) =>
      JSON.stringify(previous[key]) === JSON.stringify(next)
        ? previous
        : { ...previous, [key]: next },
    );
  }, []);
  const layouts = useMemo(() => {
    const track = (key: GroupKey) => (event: LayoutChangeEvent) => {
      const local = { ...event.nativeEvent.layout };
      const revision = ++revisions.current[key];
      const node = nodes.current[key];
      if (!node) publish(key, { local });
      else
        node.measureInWindow((x, y, width, height) => {
          if (revisions.current[key] === revision && nodes.current[key] === node)
            publish(key, { local, window: { x, y, width, height } });
        });
    };
    return {
      inherited: track('inherited'),
      'own-false': track('own-false'),
      custom: track('custom'),
      styled: track('styled'),
    };
  }, [publish]);
  const theme = useMemo(
    () =>
      createTheme({
        ...outer,
        direction: rtl ? 'rtl' : 'ltr',
        components: {
          ...outer.components,
          MuiFormGroup: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderWidth: themed ? 2 : 1,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
                color: themed ? theme.palette.text.secondary : theme.palette.text.primary,
                marginTop: 8,
                paddingLeft: 7,
                paddingTop: 9,
                '&.Mui-error': {
                  borderColor: theme.palette.error.main,
                  color: theme.palette.error.main,
                },
              }),
              row: { paddingRight: 11 },
            },
          },
        },
      }),
    [outer, rtl, themed],
  );
  const group = (key: GroupKey) => {
    const Root = key === 'styled' ? WrappedGroup : FormGroup;
    return (
      <Box key={key} sx={{ marginBottom: 1 }}>
        <Typography variant="caption">{titles[key]}</Typography>
        <Root
          testID={`form-group-contract-${key}`}
          ref={rootRefs[key]}
          row={row}
          error={key === 'own-false' ? false : undefined}
          component={key === 'custom' ? CustomRoot : undefined}
          accessible={false}
          onLayout={layouts[key]}
          style={resetInsets.reset}
        >
          {`Literal ${key}`}
          <StatefulOption key="retained-choice" group={key} />
          <Typography
            key="smaller-text"
            variant="inherit"
            testID={`form-group-contract-text-${key}`}
            sx={{ fontSize: '0.8em' }}
          >
            Inherited text
          </Typography>
        </Root>
      </Box>
    );
  };
  const metadata = {
    schemaVersion: 1,
    row,
    parentError,
    rtl,
    themed,
    fontSize,
    fontScale,
    refs: refs.current,
    receipts,
  };
  const attached = keys.reduce((total, key) => total + refs.current[key].attached, 0);
  const cleaned = keys.reduce((total, key) => total + refs.current[key].cleaned, 0);
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ padding: 1 }}>
        <Typography variant="h6" accessibilityRole="header">
          Form group
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Arrange related controls and inherit form state.
        </Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            testID="form-group-contract-row"
            variant="outlined"
            onClick={() => setRow((value) => !value)}
          >
            Layout: {row ? 'row' : 'column'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            testID="form-group-contract-error"
            variant="outlined"
            onClick={() => setParentError((value) => !value)}
          >
            Parent error: {parentError ? 'on' : 'off'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            testID="form-group-contract-theme"
            variant="outlined"
            onClick={() => setThemed((value) => !value)}
          >
            Theme: {themed ? 'alternate' : 'muted'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            testID="form-group-contract-rtl"
            variant="outlined"
            onClick={() => setRtl((value) => !value)}
          >
            Direction: {rtl ? 'RTL' : 'LTR'}
          </Button>
          <Button
            size="small"
            style={{ minHeight: 44 }}
            testID="form-group-contract-text"
            variant="outlined"
            onClick={() => setAlternateText((value) => !value)}
          >
            Authored text: {fontSize}
          </Button>
        </View>
        <Box sx={{ direction: rtl ? 'rtl' : 'ltr', fontSize, lineHeight: 1.4, marginTop: 1 }}>
          <FormControl fullWidth error={parentError}>
            {keys.map(group)}
          </FormControl>
        </Box>
        <Typography variant="caption">Wrapped selectors follow row and error state.</Typography>
        <Typography
          variant="caption"
          testID="form-group-contract-receipt"
          accessibilityLabel={JSON.stringify(metadata)}
        >
          Refs {attached}/{cleaned} · layouts {Object.keys(receipts).length}/4 · OS{' '}
          {fontScale.toFixed(2)}×
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
