import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ThemeProvider,
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
  Snackbar,
} from '@mui/material';
import { InvoiceGrid } from './InvoiceGrid';
import { PopperExamples } from './PopperExamples';
import { createCatalogTheme } from './catalogTheme';
import { RichTreeView } from '@mui/x-tree-view';
import { BarChart, LineChart } from '@mui/x-charts';
import { DatePicker, LocalizationProvider, AdapterDayjs } from '@mui/x-date-pickers';
import supported from '../../packages/compat/supported.json';
export default function App() {
  const [section, setSection] = useState('Grid');
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
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 8,
              backgroundColor: theme.palette.background.paper,
              borderBottomWidth: 1,
              borderColor: theme.palette.divider,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Typography variant="h6">Native catalog</Typography>
                <Typography variant="caption" color="text.secondary">
                  Altroo · Pre-alpha
                </Typography>
              </View>
              <Switch
                checked={dark}
                onChange={(_, checked) => setDark(checked)}
                aria-label="Dark mode"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ flexDirection: 'row', gap: 24 }} accessibilityRole="tablist">
                {['Form', 'Grid', 'Overlays', 'Tree', 'Charts', 'Dates', 'Coverage'].map((name) => (
                  <Pressable
                    key={name}
                    testID={`catalog-tab-${name}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: section === name }}
                    onPress={() => setSection(name)}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: 'center',
                      borderBottomWidth: 2,
                      borderBottomColor:
                        section === name ? theme.palette.primary.main : 'transparent',
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <Typography
                      variant="body2"
                      color={section === name ? 'primary.main' : 'text.secondary'}
                      style={{ fontWeight: section === name ? '600' : '500' }}
                    >
                      {name === 'Grid' ? 'Data grid' : name}
                    </Typography>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
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
            {section === 'Coverage' ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <Stack spacing={3}>
                  <Typography variant="h6">Port coverage</Typography>
                  <Typography color="text.secondary">
                    These demos cover a small part of Material UI and MUI X Community. No component
                    has a complete compatibility claim yet.
                  </Typography>
                  {Object.entries(supported).map(([name, config]) => (
                    <Paper key={name} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2">{name}</Typography>
                      <Typography variant="caption" color="primary.main">
                        Partial prototypes
                      </Typography>
                      <Typography>
                        {config.subpaths.filter((entry) => entry !== 'styles').join(', ') ||
                          'Theme and styling foundation'}
                      </Typography>
                    </Paper>
                  ))}
                  <Typography variant="h6">Still to port</Typography>
                  <Typography>
                    Navigation, menus, Select, Autocomplete, Tabs, Tooltip, Accordion, Slider,
                    Table, Stepper and the remaining eligible Material UI APIs. Each X family also
                    needs substantial API, interaction and accessibility work.
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
