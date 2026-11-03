# MUI Native

[![Validate](https://github.com/Altroo/mui-native/actions/workflows/ci.yml/badge.svg)](https://github.com/Altroo/mui-native/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Independent React Native compatibility for Material UI and MUI X Community, maintained in **one monorepo** by Altroo.

**Status: public pre-alpha. Nothing has been published to npm. This is a partial implementation, not a drop-in replacement for MUI.** The native package versions and upstream compatibility versions are separate.

The runtime uses native views on iOS and Android. The optional Metro resolver retains familiar `@mui/...` application imports. Web applications continue using the original MUI packages. This project is not affiliated with, endorsed by, or an official product of MUI.

[ROADMAP.md](ROADMAP.md) records project scope, progress, and next steps.

## Why I started this project

At work, I was tasked with migrating existing web applications to React Native. Those applications were built with Material UI (`@mui/material`), and I could not find a React Native solution that provided the API compatibility they needed.

I started MUI Native to address that gap: preserve familiar MUI component APIs and theming while rendering native iOS and Android interfaces. The aim is to make similar migrations more practical and provide a reusable library for other developers facing the same challenge.

## What you can explore

- Native Material components with shared theme tokens, supported `sx` styles and familiar root/deep imports.
- Community Grid, Tree View, Charts and Date Picker prototypes in separate packages.
- Contract tests, installed-package validation and an upstream release monitor that keeps detected versions separate from verified support.

This is active library development. APIs and behavior can change. Start with the catalog or a disposable consumer; review the [implemented subset and gaps](docs/compatibility.md) before migrating an application.

## Run the catalog

Use Node 26.11.1 and pnpm 12.16.1. Xcode and an iOS simulator, or Android Studio and an emulator, are required for native development.

```sh
git clone https://github.com/Altroo/mui-native.git
cd mui-native
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
pnpm check
pnpm catalog
```

The catalog uses Expo SDK 58. Rendering interactive rows or Modal/Dialog/Popover/Menu/Select requires a native development build because Expo Go does not include the library's interaction host. See [installation](docs/installation.md) and [native host](docs/native-host.md). Press `i` or `a` from Expo's terminal interface to launch the corresponding simulator. `pnpm --filter native-catalog ios` and `pnpm --filter native-catalog android` create development builds when native build prerequisites are installed.

Do not run `npm install @altroo/mui-native` yet. For testing a separate application before publication, use the local tarball instructions in [installation](docs/installation.md).

## Packages

| Package                             | Implemented development subset                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@altroo/mui-native`                | Layout, typography, buttons, inputs, Select/TextField select, lists, menu items/lists, checkbox/radio/switch, dialog, popover, menu, alert, progress, snackbar |
| `@altroo/mui-native-system`         | Theme provider, tokens, responsive `sx`, supported state selectors, component defaults/overrides/variants, `styled`                                            |
| `@altroo/mui-native-icons`          | Four original geometric icons; the full upstream icon inventory is tracked                                                                                     |
| `@altroo/mui-native-host`           | Fabric keyboard/focus, in-window Portal and platform picker hosts; native rebuild required                                                                     |
| `@altroo/mui-native-compat`         | Opt-in Metro import resolver and native TypeScript configuration generator                                                                                     |
| `@altroo/mui-native-x-data-grid`    | Recycled rows, fixed columns, single sorting/filtering, pagination, selection, basic server modes                                                              |
| `@altroo/mui-native-x-tree-view`    | Rich tree expansion, single/multiple selection, custom item accessors                                                                                          |
| `@altroo/mui-native-x-charts`       | Native SVG bar and line charts, labels, item callbacks                                                                                                         |
| `@altroo/mui-native-x-date-pickers` | Day.js adapter, strict date field, calendar, dialog picker                                                                                                     |

These are prototypes with limited contracts. See [compatibility](docs/compatibility.md) before migrating application code. Scheduler and Chat are monitored but not implemented. Pro/Premium source and paid-only feature parity are excluded.

## Example

```tsx
import { useState } from 'react';
import { Button, TextField, ThemeProvider, createTheme } from '@altroo/mui-native';

const theme = createTheme({ palette: { primary: { main: '#1976d2' } } });

export function Example() {
  const [name, setName] = useState('');
  return (
    <ThemeProvider theme={theme}>
      <TextField label="Your name" value={name} onChange={(event) => setName(event.target.value)} />
      <Button variant="contained" onClick={() => console.log(name)}>
        Save
      </Button>
    </ThemeProvider>
  );
}
```

`onClick` receives a native gesture event. Text-field `onChange` receives a documented value/name adapter, not a browser `ChangeEvent`. Native `onPress` takes precedence when both handlers are supplied.

## Staying current

GitHub Actions checks upstream at 07:17 and 19:17 UTC and on manual dispatch. It creates deduplicated release issues and updates an Upstream Updates dashboard. Candidate PRs are created manually; automatic PR creation, approval, merging and publishing are disabled. Run the local checks and `pnpm upstream:simulate` before hosted runs; see [upstream operations](docs/upstream.md).

[Update operations](docs/upstream.md) explains licensing gates, outage recovery, permissions, and the distinction between detected, candidate, verified, and released support.

## Development and release

- [Roadmap and milestone gates](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Installation and native import mapping](docs/installation.md)
- [Compatibility boundaries](docs/compatibility.md)
- [Generated declaration inventory and remaining gaps](docs/coverage.md)
- [Native palette and color helpers](docs/theming.md)
- [Typography themes, native units and inheritance](docs/typography.md)
- [Theme defaults and slot prop composition](docs/default-props.md)
- [Native TextField slots and refs](docs/textfield-slots.md)
- [Native input variants and adornments](docs/inputs.md)
- [Native labels, helper text and floating fields](docs/form-labels.md)
- [Nested and scoped theme providers](docs/theme-providers.md)
- [Native Modal, Backdrop and Dialog coordination](docs/modals.md)
- [Native Fade, transition timing and reduced motion](docs/transitions.md)
- [Native Grow and automatic height timing](docs/grow.md)
- [Native anchored Popover](docs/popover.md)
- [Native ButtonBase activation and focus](docs/button-base.md)
- [Native List composition, slots and scrolling](docs/lists.md)
- [Native MenuItem/MenuList registration and keyboard](docs/menu-list.md)
- [Native anchored Menu and overlay focus](docs/menu.md)
- [Native Select and TextField selection](docs/select.md)
- [Native interaction host and custom roots](docs/native-host.md)
- [Platform-native picker host](docs/native-picker.md)
- [Text rendering and inheritance in native containers](docs/text-containers.md)
- [Spacing, breakpoints and responsive styles](docs/layout-system.md)
- [Native Button and IconButton](docs/button.md)
- [Native Checkbox, Radio, groups and labels](docs/check-controls.md)
- [Native Switch slots, events and motion](docs/switch.md)
- [Native Chip display, activation and deletion](docs/chip.md)
- [Native in-window Portal](docs/portal.md)
- [Native form controls and calendar behavior](docs/native-controls.md)
- [Adaptive grid cards and table mode](docs/adaptive-grid.md)
- [Performance measurement gates](docs/performance.md)
- [Validation evidence](docs/validation.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Upstream collaboration proposal, not submitted](docs/upstream-proposal.md)

Original implementation: [MIT](LICENSE). Upstream references and notices: [NOTICE](NOTICE), `upstream/licenses/`, and `upstream/state.json`.

NativeSelect and the native Select/TextField branch use platform picker rows with string/selectedOptions events and native refs. See the [native selection guide](docs/native-select.md). Physical device gates remain open.
