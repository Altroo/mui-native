import React from 'react';
import type { ViewInstance, TextInputInstance } from 'react-native';
import { createTheme, ThemeProvider, Button, TextField } from '@mui/material';
import DeepButton from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import { RichTreeView } from '@mui/x-tree-view';
import { BarChart } from '@mui/x-charts';
import { DatePicker, LocalizationProvider, AdapterDayjs } from '@mui/x-date-pickers';
import type {} from '@mui/material/styles';
declare module '@mui/material/styles' {
  interface Theme {
    status: { danger: string };
  }
  interface ThemeOptions {
    status?: { danger: string };
  }
}
const theme = createTheme({ status: { danger: '#f00' } });
const danger: string = theme.status.danger;
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
    <DataGrid rows={[{ id: 1, name: 'One' }]} columns={[{ field: 'name' }]} />
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
