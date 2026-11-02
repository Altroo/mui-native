import React from 'react';
import type { ViewInstance, TextInputInstance } from 'react-native';
import { createTheme, ThemeProvider, Button, TextField } from '@mui/material';
import DeepButton from '@mui/material/Button';
import { DataGrid, type NativeGridLayout, type NativeGridCardParams } from '@mui/x-data-grid';
import DeepDataGrid from '@mui/x-data-grid/DataGrid';
import { RichTreeView } from '@mui/x-tree-view';
import { BarChart } from '@mui/x-charts';
import { DatePicker, LocalizationProvider, AdapterDayjs } from '@mui/x-date-pickers';
import { alpha, type PaletteColor, type PaletteColorOptions } from '@mui/material/styles';
import { darken } from '@mui/system/colorManipulator';
import { createSpacing, createBreakpoints, type Breakpoint } from '@mui/system';
declare module '@mui/material/styles' {
  interface Theme {
    status: { danger: string };
  }
  interface ThemeOptions {
    status?: { danger: string };
  }
  interface BreakpointOverrides {
    xs: false;
    sm: false;
    md: false;
    lg: false;
    xl: false;
    mobile: true;
    tablet: true;
    desktop: true;
  }
  interface Palette {
    brand: PaletteColor;
  }
  interface PaletteOptions {
    brand?: PaletteColorOptions;
  }
}
const base = createTheme({
  spacing: [0, 4, 8, 16],
  breakpoints: { values: { mobile: 0, tablet: 640, desktop: 1200 } },
  palette: {
    primary: { main: '#123456' },
    tonalOffset: { light: 0.1, dark: 0.4 },
    contrastThreshold: 4.5,
  },
});
const theme = createTheme(base, {
  status: { danger: '#f00' },
  palette: { brand: base.palette.augmentColor({ color: { main: '#36c' }, name: 'brand' }) },
});
const contrast: string = theme.palette.getContrastText(theme.palette.brand.main);
const overlay: string = alpha(darken(theme.palette.primary.main, 0.2), 0.4);
const danger: string = theme.status.danger;
const layout: NativeGridLayout = 'auto';
const content = (
  <ThemeProvider theme={theme}>
    <Button loading={null} loadingPosition="start" onClick={(event) => event.nativeEvent.pageX}>
      Save
    </Button>
    <DeepButton
      ref={React.createRef<ViewInstance>()}
      loading
      loadingPosition="end"
      loadingIndicator="Saving"
    >
      Deep
    </DeepButton>
    <TextField
      inputRef={React.createRef<TextInputInstance>()}
      onChange={(event) => event.target.value.toUpperCase()}
    />
    <DataGrid
      rows={[{ id: 1, name: 'One' }]}
      columns={[{ field: 'name' }]}
      nativeLayout={layout}
      nativeCardTitleField="name"
      nativeRenderCard={({ row, selectionControl, renderCell }) => (
        <>
          <Button>{row.name}</Button>
          {selectionControl}
          {renderCell('name')}
        </>
      )}
    />
    <RichTreeView items={[{ id: 'one', label: 'One' }]} />
    <BarChart series={[{ data: [1, 2, 3] }]} />
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker />
    </LocalizationProvider>
  </ThemeProvider>
);
// @ts-expect-error Loading positions use the supported MUI names.
const badLoadingPosition = <Button loadingPosition="left" />;
// @ts-expect-error Browser element refs are intentionally incompatible.
const bad = <Button ref={React.createRef<{ innerHTML: string }>()} />;
// @ts-expect-error Unsupported commercial imports must not resolve.
import { DataGridPremium } from '@mui/x-data-grid-premium';

const breakpoint: Breakpoint = 'tablet';
const query: string = theme.breakpoints.between('mobile', breakpoint);
const customBreakpoints = createBreakpoints({ values: { mobile: 0, tablet: 640, desktop: 1200 } });
const spacing: string = createSpacing([0, 4, '1rem'])(1, 'auto', 2);
// @ts-expect-error Disabled default breakpoint names must not remain in the public type.
theme.breakpoints.up('sm');
// @ts-expect-error Spacing exposes at most four arguments.
theme.spacing(1, 2, 3, 4, 5);

// @ts-expect-error Only the documented native presentations are supported.
const badGridLayout = <DataGrid rows={[]} columns={[]} nativeLayout="tiles" />;

type CardRow = { id: number; name: string };
const renderTypedCard = ({ row, renderCell, selectionControl }: NativeGridCardParams<CardRow>) => {
  const name: string = row.name;
  // @ts-expect-error Generic card values must retain the row's declared types.
  const invalidNumber: number = row.name;
  // @ts-expect-error An undeclared field must not become any through the generic constraint.
  const missing = row.missing;
  return (
    <>
      {name}
      {renderCell('name')}
      {selectionControl}
    </>
  );
};
const deepGrid = (
  <DeepDataGrid<CardRow>
    rows={[{ id: 1, name: 'One' }]}
    columns={[{ field: 'name' }]}
    nativeLayout="cards"
    nativeRenderCard={renderTypedCard}
  />
);
