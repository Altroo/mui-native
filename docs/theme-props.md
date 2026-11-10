# Native theme-prop hooks

Material and System `useThemeProps` implement the complete finite native theme-context lookup contract of MUI 9.5.0. Both are **100% for this contract**, as unpublished development after `0.0.7-prealpha.0`. These hooks do not render a native host. Theme construction, provider composition, native component props and the styling engine retain their separate contracts.

| API                                                 | Parameters and behavior                                                                                                                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System `useThemeProps<ThemeInput, Props, Name>()`   | Required `props` and `name`; optional `defaultTheme` and `themeId`, including explicit undefined. Reads the current nonempty theme or its fallback, selects a truthy named scope when requested, and resolves that theme's component defaults. |
| Material `useThemeProps<ThemeInput, Props, Name>()` | Required `props` and `name`. Uses Material's stable fallback and `$$material` scope. Caller fallback/scope options are not exposed.                                                                                                            |
| `ThemeWithProps`                                    | The System deep module preserves the original permissive `components` declaration. Material's deep/styles exports use the native component map and accept an explicitly undefined `components` property.                                       |
| `ThemedProps<ThemeInput, Name>`                     | Extracts known defaults from a required `components` map containing the supplied name. A caller's generic describes its context; it does not create tokens or infer an unknown provider's defaults.                                            |

Both hooks preserve the original three generic parameters. `Props` is unconstrained, and `Name` accepts string, number or symbol keys. The result is `Props & ThemedProps<ThemeInput, Name>`. System can infer known defaults from a supplied fallback theme. With no component defaults, the original props value is returned by identity, including primitive values.

These hooks use the [direct v5-style default lookup](default-props-provider.md#direct-theme-lookup). They do not consume a standalone DefaultPropsProvider map or its class/style merge flag. Explicit caller values win over defaults; the existing native slot, style-array and callback adaptations remain documented in the default-prop contract. Inputs are not completed, validated or mutated by these wrappers. Native component-map declarations describe existing component contracts; declaring defaults cannot add an unimplemented component API.

## Imports

```tsx
import { useThemeProps } from '@mui/material/styles';
import materialUseThemeProps from '@mui/material/styles/useThemeProps';
import systemUseThemeProps, {
  type ThemeWithProps,
  type ThemedProps,
} from '@mui/system/useThemeProps';
```

The corresponding scoped native paths use `@altroo/mui-native` and `@altroo/mui-native-system`. Material root/styles/deep imports share the Material implementation; System root/deep imports share System's implementation. Original MUI continues serving web imports. Native deep modules also retain their existing additive named function aliases; the type exports match the pinned original deep module.

Call these functions only inside a React component or another hook. Provider updates propagate while retaining consumer state.

## Verification

The [pinned reference recorder](../scripts/reference/theme-providers.mjs) checks archive integrity, installed original source/declaration bytes and MIT license hashes before executing twenty original provider/scope/hook/default cases with React 19.3. Reproduce the check with `node scripts/reference/theme-providers.mjs --check`. Its [reference data](../tests/fixtures/mui-theme-providers-9.5.0.json) retains the declaration and implementation hashes.

The [focused hook tests](../tests/theme-props.test.tsx) cover canonical identities, custom fallback themes, all name-key types, immutable inputs, primitive pass-through, distinct scope selection, standalone-provider isolation and live updates with retained state. Existing provider/default tests retain the broader original-runtime comparisons and native default-resolution regressions.

The same [strict consumer](../fixtures/theme-props-consumer/consumer.tsx) passes original MUI and fresh native declarations with exact optional properties and unused-code checks. It covers both inferred and explicit generics, default-prop extraction, canonical paths, public helper types and expected rejections. `pnpm test:consumer` installs current local archives before compiling this fixture independently from other augmentations.

These hooks own no gesture, layout, accessibility node, event, slot or ref. Their closure does not promote consuming components, physical-device validation, broader providers, styling or calibrated performance.
