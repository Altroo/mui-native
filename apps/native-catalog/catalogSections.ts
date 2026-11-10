// Copyright (c) 2026 Altroo and contributors. SPDX-License-Identifier: MIT
/** Route IDs also identify native test scenes. Labels can change independently. */
export const catalogSections = [
  {
    id: 'Form',
    label: 'Forms & selection',
    group: 'Inputs',
    detail: 'TextField, Checkbox, Switch',
    keywords: 'profile FormControlLabel Dialog DialogTitle DialogContent DialogActions Snackbar',
  },
  {
    id: 'Grid',
    label: 'Data grid',
    group: 'Data & visualization',
    detail: 'Adaptive cards and tables',
    keywords: 'DataGrid rows search sort filter invoice',
  },
  {
    id: 'Overlays',
    label: 'Overlays',
    group: 'Interaction',
    detail: 'Popper, Portal and positioning',
    keywords: 'anchor popup placement',
  },
  {
    id: 'Tree',
    label: 'Tree view',
    group: 'Data & visualization',
    detail: 'Expandable, nested collections',
    keywords: 'RichTreeView hierarchy',
  },
  {
    id: 'Charts',
    label: 'Charts',
    group: 'Data & visualization',
    detail: 'Bar and line series',
    keywords: 'BarChart LineChart graph',
  },
  {
    id: 'Dates',
    label: 'Date pickers',
    group: 'Inputs',
    detail: 'Date selection and localization',
    keywords: 'DatePicker LocalizationProvider AdapterDayjs calendar time',
  },
  {
    id: 'Coverage',
    label: 'Compatibility',
    group: 'Project',
    detail: 'Scope and current limitations',
    keywords: 'coverage status progress imports roadmap',
  },
  {
    id: 'Autocomplete',
    label: 'Autocomplete',
    group: 'Inputs',
    detail: 'Suggestions and multiple selection',
    keywords: 'combobox search select',
  },
  {
    id: 'Keyboard',
    label: 'Keyboard',
    group: 'Interaction',
    detail: 'Focus, shortcuts and text entry',
    keywords: 'input navigation accessibility',
  },
  {
    id: 'Inputs',
    label: 'Text inputs',
    group: 'Inputs',
    detail: 'Labels, adornments and validation',
    keywords: 'Input InputBase OutlinedInput FilledInput TextField password',
  },
  {
    id: 'Transitions',
    label: 'Transitions',
    group: 'Interaction',
    detail: 'Expandable content and motion',
    keywords: 'Collapse animation',
  },
  {
    id: 'Accordion',
    label: 'Accordion',
    group: 'Layout & surfaces',
    detail: 'Expandable, grouped content',
    keywords: 'AccordionSummary AccordionDetails',
  },
  {
    id: 'Icons',
    label: 'Icons',
    group: 'Layout & surfaces',
    detail: 'SVG artwork, sizes and colors',
    keywords: 'SvgIcon createSvgIcon material symbols',
  },
  {
    id: 'Groups',
    label: 'Button groups',
    group: 'Inputs',
    detail: 'Connected actions and variants',
    keywords: 'Button ButtonBase ButtonGroup',
  },
  {
    id: 'Wrappers',
    label: 'Layout & surfaces',
    group: 'Layout & surfaces',
    detail: 'Box, Paper, Card and typography',
    keywords: 'FormGroup ListItemAvatar ListItemIcon Avatar Icon Divider ListItem AccordionDetails',
  },
] as const;
export type CatalogSection = (typeof catalogSections)[number]['id'];
export type CatalogRoute = CatalogSection | 'Explore';
export const catalogGroups = [
  'Inputs',
  'Layout & surfaces',
  'Data & visualization',
  'Interaction',
  'Project',
] as const;
