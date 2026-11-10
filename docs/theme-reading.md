# Native theme-reading hooks

This contract covers Material `useTheme`, System `useTheme`, and System `useThemeWithoutDefault`. They read the existing native React theme context. Each is complete at **100% for this finite reading contract**, as unpublished development after `0.0.7-prealpha.0`. Theme construction, provider composition, CSS variables and the complete styling engine are separate contracts.

| API                                                         | Native behavior                                                                                                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material `useTheme<T = Theme>()`                            | Returns the truthy Material scope, or the surrounding theme. Without a nonempty context, returns Material's stable fallback. No fallback argument is accepted.            |
| System `useTheme<T = Theme>(defaultTheme?: T)`              | Returns the surrounding nonempty context, otherwise the supplied fallback by identity. An omitted or undefined argument uses the exported `systemDefaultTheme` singleton. |
| System `useThemeWithoutDefault<T = null>(defaultTheme?: T)` | Uses the same context lookup, with `null` as its default fallback. Explicit primitive and object fallbacks retain their values and identities.                            |

Context emptiness follows the pinned source's enumerable own string keys. These hooks do not complete partial themes, merge objects, validate a caller's generic type, copy returned values or swallow getter errors. Material and System own distinct fallback objects. Native theme construction supplies their native Theme shape; this does not introduce a browser CSS-variable engine.

Material reports the raw context envelope through React DevTools in development and omits that hook in production. Context changes propagate without remounting a consumer's state. Its existing `styled`, `useSx`, component-style and theme-props adapters use the same Material fallback. Composed styled constructors retain the first creator's fallback; a memo wrapper remains an actual component boundary.

## Imports

```tsx
import { useTheme } from '@mui/material/styles';
import useMaterialTheme from '@mui/material/styles/useTheme';
import { useTheme as useSystemTheme } from '@mui/system';
import useThemeWithoutDefault from '@mui/system/useThemeWithoutDefault';
```

The corresponding scoped `@altroo/mui-native` and `@altroo/mui-native-system` package entries are available. Root/styles/deep Material imports share their implementation; System root/deep imports share theirs. The compatibility resolver retains original MUI on web.

Call these hooks within a React component or another hook. A generic argument describes the caller's theme; it does not add missing runtime properties. Supply custom tokens through the native ThemeProvider before reading them.

## Evidence and scope

The [reference recorder](../scripts/reference/theme-reading.mjs) verifies the pinned 9.5.0 package integrity, MIT licenses and source bytes before executing the original hooks with React 19.3. Nine recorded context/fallback cases and six constructor/memo cases are checked against native implementations. [Provenance](../upstream/native-theme-reading.json) records the source paths and hashes.

The [maintained regressions](../tests/theme-reading.test.tsx) also cover canonical import identity, explicit defaults, context updates, state retention, fallback mutation isolation, development/production behavior and every Material fallback adapter. The [isolated consumer](../fixtures/theme-reading-consumer/consumer.tsx) checks emitted installed declarations, augmentation, generic inference and expected rejections without workspace source resolution.

These APIs own no native view, input event, slot or ref. Their finite reading contract does not certify the native views consuming their results, physical assistive technology, provider APIs, theme construction or general CSS compatibility. Those remain in their existing component and foundation checklists. No native bridge to an external browser styled-engine context is installed.
