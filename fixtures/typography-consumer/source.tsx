// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React from 'react';
import { Text, type TextInstance, type TextProps } from 'react-native';
import Typography, { type TypographyProps } from '@mui/material/Typography';
const Custom = React.forwardRef<TextInstance, TextProps & { tone: 'quiet' }>(
  ({ tone, ...props }, ref) => <Text {...props} accessibilityHint={tone} ref={ref} />,
);
export const props: TypographyProps<typeof Custom> = { component: Custom, tone: 'quiet' };
export const content = (
  <Typography {...props} component={Custom} ref={React.createRef<TextInstance>()} />
);
// @ts-expect-error Required custom-root props remain required when checking source.
export const missing = <Typography component={Custom} />;
// @ts-expect-error Default roots do not acquire custom-root-only props.
export const defaultRoot = <Typography tone="quiet" />;
// @ts-expect-error Semantic native strings do not accept browser refs.
export const browserRef = <Typography component="h2" ref={React.createRef<HTMLHeadingElement>()} />;
