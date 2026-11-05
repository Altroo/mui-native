# Default-prop context providers

This guide covers the finite native React context contract of Material and System `DefaultPropsProvider`, `useDefaultProps` and their default-resolution helpers, based on MUI 9.5.0. These corrections are **unpublished development after `0.0.7-prealpha.0`**. This guide does not promote either module to 100% support; delivery gates remain tracked in [validation](validation.md) and the [completion plan](completion-plan.md).

## Imports and types

Both public barrels export a default provider and named `useDefaultProps` hook:

| Original import routed to native     | Direct native import                             |
| ------------------------------------ | ------------------------------------------------ |
| `@mui/system/DefaultPropsProvider`   | `@altroo/mui-native-system/DefaultPropsProvider` |
| `@mui/material/DefaultPropsProvider` | `@altroo/mui-native/DefaultPropsProvider`        |

System's deep provider and hook are identical to its native root aliases. Material's deep exports are distinct forwarding functions using the same System context. Native Material root named `DefaultPropsProvider` and `useDefaultProps` remain System aliases. These root aliases and native barrels' named provider aliases are additive native APIs; they are not upstream 9.5.0 root exports. Original web imports continue using original MUI.

`value` is required on both providers. System accepts an arbitrary configuration map or explicit `undefined`; Material requires a map and excludes `undefined` in its declared type. Both accept optional `ReactNode` children, with no host ref or View styling props. System's hook has an unconstrained props generic; Material's hook retains the original record-bounded generic.

```tsx
import SystemDefaults from '@mui/system/DefaultPropsProvider';

export const reset = <SystemDefaults value={undefined} />;
```

## Selection and updates

The nearest provider supplies the entire map. Nesting replaces it rather than merging with an outer map. A System provider with `value={undefined}` clears defaults inside its boundary; it does not fall through to outer defaults. Replacing a map updates consumers while preserving mounted child state. Replace maps instead of mutating them: context subscriptions use value identity.

`ThemeProvider` supplies its selected theme's component map. A standalone default provider changes defaults without changing theme tokens or applying style overrides.

For each named configuration, a truthy `defaultProps` selects wrapped defaults. Otherwise the raw configuration is used only when both `styleOverrides` and `variants` are falsy. Empty override objects and variant arrays are truthy and block raw fallback. A missing configuration preserves the original supplied props reference.

Ordinary props receive defaults when their value is `undefined`; explicit `null`, `false`, zero and empty strings remain supplied values. Ordinary nested objects, `sx` and event handlers replace defaults rather than deep-merging or composing handlers. Inputs are not mutated.

## Slots, classes and styles

`slots` and legacy `components` create a fresh shallow-merged object of named entries. `slotProps` and legacy `componentsProps` merge defaults within each slot. Callback merging stays deferred: both callbacks receive the original arguments, with the default callback invoked first. Their results follow the same default-resolution rules. Unopposed `slotProps` or `componentsProps` containers retain their reference identity.

By default, caller `className` and `style` replace their defaults. A top-level `mergeClassNameAndStyle: true` enables class-token concatenation and shallow merging of plain style objects, with caller fields last. Native style arrays, registered style IDs and callbacks retain ordered React Native composition as an adapter extension. Class concatenation does not introduce a CSS class engine.

See [theme defaults and slot props](default-props.md) for component examples and the separate `mergeSlotProps` utility, whose callback and event-composition rules differ.

## Typed component defaults

`ComponentsPropsList` describes 60 existing native component exports and supports augmentation through `@mui/material/styles`. Generic entries use their declared defaults, including upstream's explicit `any` option type for Autocomplete defaults. Known component entries remain typed; custom native names can be added to the map for typed defaults.

```tsx
import MaterialDefaults from '@mui/material/DefaultPropsProvider';
import type { ComponentsProps } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface ComponentsPropsList {
    MuiContractProbe: { marker: 'consumer'; count?: number | undefined };
  }
}

const defaults: ComponentsProps = {
  MuiButton: { size: 'small' },
  MuiContractProbe: { marker: 'consumer', count: undefined },
};

export const content = <MaterialDefaults value={defaults} />;
```

Material also retains native wrapped configurations such as `{ MuiButton: { defaultProps: { size: 'small' } } }` and arbitrary custom names. Declaring a name does not create a component. The map uses existing native prop contracts; defaults cannot enable an unimplemented API.

## Direct theme lookup

`getThemeProps` from `@mui/system/useThemeProps` is a separate v5-style helper: it reads wrapped `defaultProps` from an explicit theme, without consuming the standalone provider or its style-merge flag. It infers known default keys and accepts string, number or symbol names (`PropertyKey`), plus an explicitly undefined theme.

```tsx
import { getThemeProps } from '@mui/system/useThemeProps';

const name = Symbol('component');
const resolved = getThemeProps({
  theme: { components: { [name]: { defaultProps: { fallback: 'source' as const } } } },
  name,
  props: { own: 4 },
});
export const inferredDefault: 'source' = resolved.fallback;
```

## Evidence and boundaries

The [retained reference](../tests/fixtures/mui-default-props-contract-9.5.0.json) records 12 source/declaration files across three MIT packages: Material, System and Utils. After the [isolated reference setup](theming.md), `node scripts/reference/default-props-contract.mjs --check` verifies archive integrity, installed source bytes and license hashes before comparing observations. Normal [provider tests](../tests/default-props-contract.test.tsx) consume committed data. The [strict emitted-consumer fixture](../fixtures/native-consumer/default-props-contract.tsx) checks exact optional properties, generics, augmentation, aliases and rejected inputs.

Optional `propTypes: any` typing preserves metadata-access compatibility. No runtime validators are attached; original development-only attachment and web/RSC metadata are excluded from this native scope.

These providers add no native host or platform binary and do not change global device settings. Broader ThemeProvider/styling contracts, consuming renderers, physical-device/accessibility validation and calibrated performance gates remain open. Context and consumer checks do not establish those results.
