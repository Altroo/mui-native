# Native Autocomplete

Autocomplete composes a native text editor, searchable suggestions, selected-value Chips and a measured Popper. It adapts the MIT-licensed Material UI 9.5.0 contracts, including mapped values and the current `renderValue` and slot APIs.

**Pre-alpha implementation.** Autocomplete and its headless hook are included starting with `0.0.7-prealpha.0`. Use matching Material/native-host packages and rebuild the native application when upgrading from `0.0.6-prealpha.0`. Interactive components require a development or production build containing the native host and managed editor. Expo Go does not contain them.

## Basic use

With the [compatibility routing](installation.md) configured, familiar imports resolve to native implementations on iOS and Android. Web continues using original MUI.

```tsx
import { Autocomplete, TextField } from '@mui/material';

<Autocomplete
  options={['Rabat', 'Casablanca', 'Marrakesh']}
  renderInput={(params) => <TextField {...params} label="City" />}
/>;
```

Direct native imports and the default `@mui/material/Autocomplete` import are also available. Forward the complete `params` object, including both input-container and editable-input bindings. The native TextField composes their refs and handlers.

## Mapped and multiple values

`getOptionValue` stores a scalar ID while labels, filtering, grouping, option renderers and change details retain the original option object.

```tsx
const cities = [
  { id: 1, label: 'Rabat' },
  { id: 2, label: 'Casablanca' },
];

<Autocomplete
  multiple
  options={cities}
  getOptionValue={(option) => option.id}
  getOptionLabel={(option) => option.label}
  value={selectedIds}
  onChange={(_, nextIds) => setSelectedIds(nextIds)}
  filterSelectedOptions
  disableCloseOnSelect
  renderInput={(params) => <TextField {...params} label="Destinations" />}
/>;
```

Without a mapper, selections retain the original option type. With `freeSolo`, arbitrary strings are also values. Mapped free-solo identifiers must be numbers or booleans, leaving strings available for user-created entries. Use stable unique IDs; duplicate or invalid mapper results produce development diagnostics.

Controlled value, input text and popup state remain application-owned. A callback requests a change; it does not mutate caller arrays or objects. Async options can resolve a previously missing mapped label or update an unfocused selected label. A focused draft is preserved. Custom-filter options outside the original collection remain resolvable while selected.

`onChange` preserves source reasons and option-facing details. `onInputChange`, open/close and highlight callbacks retain their native event; programmatic resets can pass `null`. Native declarations include the `createOption` input-reset reason emitted by the pinned runtime for multiple free-solo values.

## Renderers and slots

`renderOption` receives a key, native ref, interaction handlers, selected/disabled metadata, virtual-highlight state and native style. Spread these onto a native interaction component and keep the key explicit:

```tsx
import { ButtonBase, Typography } from '@mui/material';

<Autocomplete
  options={cities}
  renderOption={({ key, ...props }, option) => (
    <ButtonBase key={key} {...props}>
      <Typography>{option.label}</Typography>
    </ButtonBase>
  )}
  renderInput={(params) => <TextField {...params} label="City" />}
/>;
```

`renderValue` handles scalar or multiple values and receives `getItemProps`. Forward its native ref, focus/key handlers and deletion handler to each selected item. It supplies no deletion handler in read-only mode. Custom non-Chip renderers should remove Chip-only props such as `onDelete` before forwarding to an ordinary native View. `limitTags` truncates the displayed array while unfocused without mutating a renderer-owned array.

| Slot             | Native default          | Responsibility                                                 |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| `root`           | Interactive native View | Composite keyboard boundary and forwarded root ref             |
| `chip`           | Chip                    | Selected multiple values and removal                           |
| `clearIndicator` | IconButton              | Clear action                                                   |
| `popupIndicator` | IconButton              | Open/close action                                              |
| `listbox`        | ScrollView              | Scrolling, row refs and keyboard visibility measurements       |
| `status`         | Native View             | Loading/no-options live-region content                         |
| `paper`          | Paper                   | Popup surface                                                  |
| `popper`         | Popper                  | Native anchoring, width, placement and Portal/inline rendering |

Slot props accept owner-state callbacks. Caller refs compose with internal root, listbox and selected-Chip refs, including React 19 cleanup functions. Custom component slots receive owner state and must consume it before forwarding to an ordinary native host. Preserve supplied native handlers and refs when replacing a slot.

Default grouped suggestions use actual native sticky headers. Sort options by `groupBy`; repeated nonadjacent groups produce a diagnostic. A custom `renderGroup` owns its native structure and sticky-header behavior. Default keyboard scrolling uses measured row/header geometry rather than a fixed font-height estimate.

A closing transitioned popup retains its previous nonempty options and grouping mode. Those cached rows cannot select a value and are excluded from native interaction and accessibility until the next open state. Loading/no-options content and free-solo empty-popup suppression follow the pinned component rules.

## Headless use

`useAutocomplete` and `createFilterOptions` are exported from the root and `@mui/material/useAutocomplete`. Bind `getRootProps` to an interactive native host, `getInputProps` to `NativeTextInput` from `@altroo/mui-native-host`, `getListboxProps` to a compatible native scrolling surface, and each option/item ref to its actual native row. The combobox keeps focus in the editor while options receive a virtual highlight.

`createFilterOptions` supports accent/case handling, trimming, prefix/substring matching, limits and custom stringification. Filtering and grouping are memoized across highlight-only renders. The default ScrollView mounts all filtered options; bound expensive searches with a filter limit. Virtualized-listbox keyboard behavior and large-option release performance are not yet verified.

## Native boundaries

- Native refs address actual TextInput/View/ScrollView instances. Browser tags, DOM mutation, CSS class styling, form submission and browser mouse-event objects are not native contracts.
- Class helpers retain the original identifiers as metadata. Use native `sx`, styles, supported state selectors and `MuiAutocomplete` named theme overrides. Generated option state styles do not request native focus or fire focus-visible callbacks.
- Ordinary text, nonempty text deletion, non-boundary caret movement and IME composition remain owned by the native editor. With selected values present, Left at an actual collapsed caret start can enter the last selected item. Left/Right then navigate available selected items, Left stays at the first item, and Right after the final item restores the editor. Empty-draft entry requests popup closure; a free-solo draft resets before entry, following the pinned hook. Native focus requests and input-focus receipts remain ordered within a React batch. `selectOnFocus` uses the native selection policy. The finite editable-command transport and its platform limits are described in [native host](native-host.md) and [issue #55](https://github.com/Altroo/mui-native/issues/55).
- With an editable selected value, declared Backspace in an actually empty editor removes the final selected item. Android checks native text length and collapsed caret zero before the input method can consume the command; UIKit registers its public Backspace command with a separate empty-editor validation action. Native composition and ordinary nonempty deletion retain their editor path. A native boundary receipt can supersede an older JS text observation. Removing the final value withdraws the declaration. The default Material editor also observes explicit software backward-delete requests before editing, preserves stock callbacks/default ordering and rejects ambiguous composition cleanup. Custom stock TextInput slots do not supply that software boundary. Selected Chip deletion occurs on key-up so a key-down cannot remove a second item through the ancestor.
- Android emulator checks cover empty-editor Backspace and selected-Chip Delete. The selected iOS driver cannot deliver Backspace to the independent UIKit command control, so iOS hardware Backspace remains explicitly unverified. Text API deletion is separately tested and does not satisfy that gate. The rebuilt source has a passing scoped visible-software-Delete check on iOS 27. The rebuilt Android API 37/Gboard binary also passes a scoped rapid visible-Delete check: the first key clears the draft while retaining both tags, and the next empty-editor key removes exactly one tag while retaining focus. The earlier failed runs and the bounded native acknowledgement correction are recorded in validation. Other physical keyboards, IMEs and layouts remain open gates. Passing a JavaScript key handler is not proof that a platform delivers every key.
- The native list exposes the platform's available list/option roles and a polite status live region. Complete combobox announcements, active-descendant behavior and VoiceOver/TalkBack operation remain unverified.
- In full-screen native modals, apply safe-area insets inside the modal layout. An outer screen wrapper does not inset a separate native window. The catalog uses its existing safe-area provider.
- Keep the containing screen usable with the keyboard open. Popper observes native keyboard/viewport changes; application scroll and keyboard-avoidance layout still matter when selected Chips wrap.
- An intermittent Android first-character omission under synthetic burst typing remains under investigation. Later passing bursts do not establish its cause or a fix; see [validation](validation.md).
- RTL, large fonts, custom windows/containers, interrupted transitions, physical devices/IMEs and calibrated release performance remain validation gates. No full Material UI compatibility claim is made.

## Validation

The original reference script is `node scripts/reference/autocomplete-component.mjs --check`. Serve `.cache/autocomplete-component-reference` locally and run `window.verifyReference()` in Chromium. Eighteen original observations cover callback/value composition, mapped selections, renderValue, grouping during cached exits, owner state and loading/free-solo states. `autocomplete-values.mjs` verifies another 41 original filtering observations. Reference artifacts include package integrity, source hashes and MIT-license fingerprints. The separate `autocomplete-tags.mjs --check` reference verifies 16 original DOM observations for caret/range guards, tag traversal, unavailable items, popup-close requests and free-solo resets. Its focus oracle rejects missing, foreign or invalid item targets.

Local tests cover native state/ref lifecycles, controlled and async values, disabled options, retained callbacks, software submission, grouped scrolling, custom slots, immutable render arrays, style state and covered/closed overlays. Consumer fixtures cover root/deep imports, mapped generics, typed memo/createElement wrappers and rejected browser refs. Native catalog examples exercise Single, Multiple, Grouped, Free solo, States, Keyboard edge and Dialog modes. Device checks and remaining gates are recorded in [validation](validation.md).
