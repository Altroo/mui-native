// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import React, { createRef, forwardRef } from 'react';
import Svg, { type SvgProps } from 'react-native-svg';
import {
  Add,
  Apple,
  MedicationLiquidTwoTone,
  createSvgIcon,
  type SvgIconHandle,
} from '@altroo/mui-native-icons';
import Close, { Close as NamedClose } from '@altroo/mui-native-icons/Close';
import { AccessAlarmTwoTone as OriginalRoot } from '@mui/icons-material';
import { Add as OriginalIndex } from '@mui/icons-material/index';
import { Add as NativeIndex } from '@altroo/mui-native-icons/index';
import OriginalDeep from '@mui/icons-material/AdminPanelSettingsOutlined';
import NativeFactory from '@altroo/mui-native-icons/utils/createSvgIcon';
import OriginalFactory from '@mui/icons-material/utils/createSvgIcon';

const ref = createRef<SvgIconHandle>();
const Custom = forwardRef<Svg, SvgProps & { badge: string }>(function Custom(
  { badge: _badge, ...props },
  forwarded,
) {
  return <Svg {...props} ref={forwarded} />;
});
const Legacy = createSvgIcon('M0 0h4v4z', 'Legacy');
const Native = NativeFactory(React.createElement('path', { d: 'M0 0h4v4z' }), 'Native');
const Original = OriginalFactory(React.createElement('path', { d: 'M0 0h4v4z' }), 'Original');
export const scene = (
  <>
    <Add ref={ref} titleAccess="Add" color="primary" sx={{ opacity: 0.5 }} />
    <Apple fontSize="inherit" />
    <MedicationLiquidTwoTone viewBox="0 0 48 48" />
    <Close ref={ref} />
    <NamedClose />
    <OriginalIndex />
    <NativeIndex />
    <OriginalRoot ref={ref} />
    <OriginalDeep />
    <Add component={Custom} badge="custom" ref={ref} />
    <Legacy />
    <Native />
    <Original />
  </>
);
// @ts-expect-error custom native root keeps its required props
export const missingRootProp = <Add component={Custom} />;
// @ts-expect-error SVG refs cannot be replaced by DOM element refs
export const wrongRef = <Add ref={createRef<HTMLDivElement>()} />;
// @ts-expect-error only original published names exist
export { UnpublishedGlyphName } from '@altroo/mui-native-icons';
// @ts-expect-error nonexistent original deep import remains unavailable
export { default as Missing } from '@mui/icons-material/UnpublishedGlyphName';
