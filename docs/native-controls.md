# Native form controls and calendar layout

These behaviors belong to the installable packages. The catalog is an example consumer. Use the native import mapping described in [installation](installation.md) when retaining `@mui/...` imports.

```tsx
import { FormControlLabel, Radio, RadioGroup, TextField } from '@mui/material';

<RadioGroup defaultValue="email" onChange={(_, value) => setChannel(value)}>
  <FormControlLabel label="Email" control={<Radio value="email" />} />
  <FormControlLabel label="Phone" control={<Radio value="phone" />} />
</RadioGroup>;

<TextField
  label="Reference"
  value={reference}
  onChange={(event) => setReference(event.target.value)}
  slotProps={{ htmlInput: { editable: false } }}
/>;
```

`FormControlLabel` forwards label taps to its Checkbox, Radio or Switch child. Both the label and the control use the same state transition and disabled guard. Radio labels preserve group selection and do not emit a second change when the selected value is tapped again. String, number, array and fragment text labels provide the control's accessible name; an explicit control `aria-label` takes precedence. Unknown rich label content remains accessible; give the control an explicit accessible name to associate that content with the control. Inline labels retain their content width in horizontal RadioGroups.

`TextField` composes native focus/blur and text callbacks with `slotProps.htmlInput` callbacks while keeping its controlled/uncontrolled state. `disabled`, native `readOnly: true` and `editable: false` all prevent editing, even when another native alias requests editability. Placeholder color, selection color and keyboard appearance use the theme unless explicitly supplied. Browser event objects and DOM refs are not available; use the native public event/ref types.

`DateCalendar` uses six explicit week rows with seven equal-width cells and weekday headings. Supplied dates and provider locale changes use the adapter locale for month/weekday display and week start without mutating caller values. Its previous/next month controls and date selection remain native buttons. `DateField` shows its expected format as the default placeholder, unless the text-field slot overrides it. Full picker lifecycle, locale, timezone, time/date-time and keyboard contracts remain tracked separately in the roadmap.

Component tests cover label activation, disabled behavior, slot callbacks, uncontrolled input, weekday labels, month navigation and date selection. These checks do not establish screen-reader behavior, font scaling, RTL, Android interactions or release performance. See [validation](validation.md) for the distinction between component tests and earlier native observations.
