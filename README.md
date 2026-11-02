# MUI Native

Independent React Native compatibility for Material UI and MUI X Community, maintained in **one monorepo** by Altroo.

**Status: pre-alpha development. Nothing has been published to npm. This is a partial implementation, not a drop-in replacement for MUI.** The native package versions and upstream compatibility versions are separate.

The runtime uses native views on iOS and Android. The optional Metro resolver retains familiar `@mui/...` application imports. Web applications continue using the original MUI packages. This project is not affiliated with, endorsed by, or an official product of MUI.

[ROADMAP.md](ROADMAP.md) records project scope, progress, and next steps.

## Run the catalog

Use Node 26.11.1 and pnpm 12.16.1. Xcode and an iOS simulator, or Android Studio and an emulator, are required for native development.

```sh
git clone git@github.com:Altroo/mui-native.git
cd mui-native
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
pnpm check
pnpm catalog
```

The catalog uses Expo SDK 58. Press `i` or `a` from Expo's terminal interface to launch the corresponding simulator. `pnpm --filter native-catalog ios` and `pnpm --filter native-catalog android` create development builds when native build prerequisites are installed.

Do not run `npm install @altroo/mui-native` yet. For testing a separate application before publication, use the local tarball instructions in [installation](docs/installation.md).

## Packages

| Package                             | Implemented development subset                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@altroo/mui-native`                | Layout, typography, buttons, inputs, checkbox/radio/switch, dialog, alert, progress, snackbar                       |
| `@altroo/mui-native-system`         | Theme provider, tokens, responsive `sx`, supported state selectors, component defaults/overrides/variants, `styled` |
| `@altroo/mui-native-icons`          | Four original geometric icons; the full upstream icon inventory is tracked                                          |
| `@altroo/mui-native-compat`         | Opt-in Metro import resolver and native TypeScript configuration generator                                          |
| `@altroo/mui-native-x-data-grid`    | Recycled rows, fixed columns, single sorting/filtering, pagination, selection, basic server modes                   |
| `@altroo/mui-native-x-tree-view`    | Rich tree expansion, single/multiple selection, custom item accessors                                               |
| `@altroo/mui-native-x-charts`       | Native SVG bar and line charts, labels, item callbacks                                                              |
| `@altroo/mui-native-x-date-pickers` | Day.js adapter, strict date field, calendar, dialog picker                                                          |

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
- [Native form controls and calendar behavior](docs/native-controls.md)
- [Validation evidence](docs/validation.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Upstream collaboration proposal, not submitted](docs/upstream-proposal.md)

Original implementation: [MIT](LICENSE). Upstream references and notices: [NOTICE](NOTICE), `upstream/licenses/`, and `upstream/state.json`.
