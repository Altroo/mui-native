import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ThemeProvider,
  createTheme,
  Stack,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { RichTreeView } from '@mui/x-tree-view';
import { BarChart, LineChart } from '@mui/x-charts';
import { DatePicker, LocalizationProvider, AdapterDayjs } from '@mui/x-date-pickers';
const rows = Array.from({ length: 10000 }, (_, index) => ({
  id: index + 1,
  name: `Record ${index + 1}`,
  amount: (index * 37) % 1000,
}));
const columns = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: 'Name', width: 180 },
  { field: 'amount', headerName: 'Amount', width: 120, type: 'number' as const },
];
export default function App() {
  const [section, setSection] = useState('Form');
  const [dark, setDark] = useState(false);
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const theme = useMemo(() => createTheme({ palette: { mode: dark ? 'dark' : 'light' } }), [dark]);
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.palette.background.default }}>
          <View style={{ padding: 20, paddingTop: 40 }}>
            <Typography variant="overline" color="primary.main">
              ALTROO / NATIVE LAB
            </Typography>
            <Typography variant="h5">Familiar API. Native views.</Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Stack direction="row">
                {['Form', 'Grid', 'Tree', 'Charts', 'Dates'].map((name) => (
                  <Button
                    key={name}
                    variant={section === name ? 'contained' : 'text'}
                    onClick={() => setSection(name)}
                  >
                    {name}
                  </Button>
                ))}
              </Stack>
            </ScrollView>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {section === 'Form' ? (
              <ScrollView>
                <Stack spacing={3}>
                  <Typography color="text.secondary">
                    This catalog uses original @mui imports through the native resolver.
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={dark} onChange={(_, checked) => setDark(checked)} />}
                    label="Dark mode"
                  />
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Typography variant="h6">Profile form</Typography>
                      <TextField
                        label="Your name"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        helperText="Native input with a MUI-style change event"
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={agreed}
                            onChange={(_, checked) => setAgreed(checked)}
                          />
                        }
                        label="I reviewed the compatibility limits"
                      />
                      <Button
                        variant="contained"
                        disabled={!name.trim() || !agreed}
                        onClick={() => setOpen(true)}
                      >
                        Review profile
                      </Button>
                    </Stack>
                  </Paper>
                  <Divider />
                  <Alert severity="info">
                    Pre-alpha: supported props are documented in the repository.
                  </Alert>
                </Stack>
              </ScrollView>
            ) : null}
            {section === 'Grid' ? (
              <DataGrid
                rows={rows}
                columns={columns}
                height={480}
                checkboxSelection
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
              />
            ) : null}
            {section === 'Tree' ? (
              <RichTreeView
                height={400}
                items={[
                  {
                    id: 'core',
                    label: 'Material UI',
                    children: [
                      { id: 'button', label: 'Button' },
                      { id: 'field', label: 'TextField' },
                    ],
                  },
                  {
                    id: 'x',
                    label: 'MUI X Community',
                    children: [
                      { id: 'grid', label: 'Data Grid' },
                      { id: 'charts', label: 'Charts' },
                    ],
                  },
                ]}
              />
            ) : null}
            {section === 'Charts' ? (
              <ScrollView>
                <BarChart
                  width={330}
                  xAxis={[{ data: ['Jan', 'Feb', 'Mar', 'Apr'] }]}
                  series={[{ label: 'Orders', data: [24, 36, 28, 48] }]}
                />
                <LineChart
                  width={330}
                  xAxis={[{ data: ['Jan', 'Feb', 'Mar', 'Apr'] }]}
                  series={[{ label: 'Balance', data: [12, -4, 18, 30] }]}
                />
              </ScrollView>
            ) : null}
            {section === 'Dates' ? (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker label="Delivery date" />
              </LocalizationProvider>
            ) : null}
          </View>
          <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
            <DialogTitle>Save profile?</DialogTitle>
            <DialogContent>
              <Typography>Name: {name}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={() => {
                  setOpen(false);
                  setSaved(true);
                }}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>
          <Snackbar
            open={saved}
            message="Profile saved locally"
            autoHideDuration={4000}
            onClose={() => setSaved(false)}
          />
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
