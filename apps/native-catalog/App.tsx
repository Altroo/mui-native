// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
import { useMemo, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ThemeProvider,
  Stack,
  Typography,
  Paper,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { InvoiceGrid } from './InvoiceGrid';
import { PopperExamples } from './PopperExamples';
import { KeyboardExamples } from './KeyboardExamples';
import { InputExamples } from './InputExamples';
import { CollapseExamples } from './CollapseExamples';
import { AccordionExamples } from './AccordionExamples';
import { ButtonGroupExamples } from './ButtonGroupExamples';
import { SvgIconExamples } from './SvgIconExamples';
import { RootLayoutExamples } from './RootLayoutExamples';
import { AutocompleteExamples } from './AutocompleteExamples';
import { createCatalogTheme } from './catalogTheme';
import { CatalogHeader } from './CatalogHeader';
import { CatalogHome } from './CatalogHome';
import { useCatalogNavigation } from './useCatalogNavigation';
import { RichTreeView } from '@mui/x-tree-view';
import { BarChart, LineChart } from '@mui/x-charts';
import { DatePicker, LocalizationProvider, AdapterDayjs } from '@mui/x-date-pickers';
import supported from '../../packages/compat/supported.json';
export default function App() {
  const { section, navigate } = useCatalogNavigation();
  const [query, setQuery] = useState('');
  const [contentWidth, setContentWidth] = useState(362);
  const [dark, setDark] = useState(false);
  const [name, setName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const theme = useMemo(() => createCatalogTheme(dark), [dark]);
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.palette.background.default }}>
          <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
          <CatalogHeader
            section={section}
            onNavigate={navigate}
            dark={dark}
            onDarkChange={setDark}
          />
          <View
            onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
            style={{
              flex: 1,
              paddingHorizontal: section === 'Explore' ? 0 : 16,
              paddingTop: section === 'Explore' ? 0 : 16,
            }}
          >
            {section === 'Explore' ? (
              <CatalogHome query={query} onQueryChange={setQuery} onNavigate={navigate} />
            ) : null}
            {section === 'Autocomplete' ? <AutocompleteExamples /> : null}
            {section === 'Keyboard' ? <KeyboardExamples /> : null}
            {section === 'Inputs' ? <InputExamples /> : null}
            {section === 'Transitions' ? <CollapseExamples /> : null}
            {section === 'Accordion' ? <AccordionExamples /> : null}
            {section === 'Icons' ? <SvgIconExamples /> : null}
            {section === 'Groups' ? <ButtonGroupExamples /> : null}
            {section === 'Wrappers' ? <RootLayoutExamples /> : null}
            {section === 'Form' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                automaticallyAdjustKeyboardInsets
              >
                <Stack spacing={3}>
                  <View>
                    <Typography variant="h5">Contact details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inputs, selection and a review dialog.
                    </Typography>
                  </View>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1">Profile</Typography>
                      <TextField
                        label="Your name"
                        name="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        helperText="The name displayed on your profile"
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={agreed}
                            onChange={(_, checked) => setAgreed(checked)}
                          />
                        }
                        label="I confirm these details are correct"
                      />
                      <Button
                        variant="contained"
                        disabled={!name.trim() || !agreed}
                        onClick={() => {
                          setDraftName(name);
                          setOpen(true);
                        }}
                      >
                        Review profile
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </ScrollView>
            ) : null}
            {section === 'Grid' ? <InvoiceGrid /> : null}
            {section === 'Overlays' ? <PopperExamples /> : null}
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
              <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                <View>
                  <Typography variant="h5">A view of your data</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly orders and account balance.
                  </Typography>
                </View>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" accessibilityRole="header">
                    Orders
                  </Typography>
                  <BarChart
                    width={Math.max(1, contentWidth - 64)}
                    xAxis={[{ data: ['Jan', 'Feb', 'Mar', 'Apr'] }]}
                    series={[{ label: 'Orders', data: [24, 36, 28, 48] }]}
                  />
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" accessibilityRole="header">
                    Balance
                  </Typography>
                  <LineChart
                    width={Math.max(1, contentWidth - 64)}
                    xAxis={[{ data: ['Jan', 'Feb', 'Mar', 'Apr'] }]}
                    series={[{ label: 'Balance', data: [12, -4, 18, 30] }]}
                  />
                </Paper>
              </ScrollView>
            ) : null}
            {section === 'Coverage' ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <Stack spacing={3}>
                  <Typography variant="h6">Port coverage</Typography>
                  <Typography color="text.secondary">
                    These collections preview available Material UI and MUI X Community behavior. A
                    working example does not guarantee full API compatibility.
                  </Typography>
                  {Object.entries(supported).map(([name, config]) => (
                    <Paper key={name} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2">{name}</Typography>
                      <Typography variant="caption" color="primary.main">
                        Preview imports
                      </Typography>
                      <Typography>
                        {config.subpaths.filter((entry) => entry !== 'styles').join(', ') ||
                          'Theme and styling foundation'}
                      </Typography>
                    </Paper>
                  ))}
                  <Typography variant="h6">Remaining compatibility work</Typography>
                  <Typography>
                    API, interaction, accessibility and performance coverage is still being expanded
                    across Material UI and every X Community family. Check the compatibility
                    documentation for the verified scope of each component.
                  </Typography>
                  <Typography color="text.secondary">
                    The complete scope is tracked in ROADMAP.md. Pro and Premium packages are
                    excluded. Scheduler and Chat remain separate preview tracks.
                  </Typography>
                </Stack>
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
              <TextField
                label="Profile name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                fullWidth
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!draftName.trim()}
                onClick={() => {
                  setName(draftName);
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
