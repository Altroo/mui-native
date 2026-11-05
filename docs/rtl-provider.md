# RTL context provider

`RtlProvider` and `useRtl` implement the complete native React context contract of the pinned MUI System 9.5.0 module. This is development after `0.0.7-prealpha.0`. The provider renders its children without adding a native host; directional layout, paint and accessibility remain responsibilities of consuming components.

```tsx
import RtlProvider, { useRtl } from '@mui/system/RtlProvider';

<RtlProvider value={false}>{children}</RtlProvider>;
```

The equivalent root imports are available from `@mui/system`; direct native imports use `@altroo/mui-native-system` and `@altroo/mui-native-system/RtlProvider`. Root and deep entries share the same provider and hook identity in fresh installed archives.

| Input or export                | Complete native behavior                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children?: React.ReactNode`   | React owns child rendering. The provider adds no View/Text wrapper and preserves child state across value updates.                                      |
| `value?: boolean \| undefined` | An omitted or explicitly undefined value means `true`; explicit `false` wins. Strict optional-property consumers accept explicit undefined.             |
| `useRtl(): boolean`            | Reads the nearest provider; returns `false` when no provider is present. Nested providers do not change outer or sibling values.                        |
| Default component              | Exposes the pinned React function-component declaration, including optional `displayName` metadata. It has no host ref, styling props, slots or events. |

`ThemeProvider` publishes its selected theme direction through this context. The provider and hook do not change React Native's global RTL settings or a device locale. Library rendering components decide how to apply the context to native layout. Original MUI continues to serve web imports. Original development-only `propTypes` attachment and web/RSC build metadata are outside this native module's contract.

## Verification

The [pinned provider reference](../tests/fixtures/mui-theme-providers-9.5.0.json) records the original source/declaration and license hashes. Reproduce its source check with `node scripts/reference/theme-providers.mjs --check`. Direct [RTL context regressions](../tests/rtl-provider.test.tsx) cover root/deep identity, all valid values, absence/nesting/unmount defaults, native host shape, retained child state and absence of global-direction commands. Existing provider/theme comparisons exercise the surrounding provider boundaries.

The [strict consumer fixture](../fixtures/native-consumer/rtl-provider-exact-optional.tsx) checks original/direct imports, explicit undefined, the callable component type and metadata, and rejection of invalid values, refs and styles. `pnpm test:consumer` compiles it from fresh installed archives with `exactOptionalPropertyTypes`, separately from incomplete preview APIs.

This module has no native geometry, gesture, font policy or platform binary of its own. Its completed context contract does not promote ThemeProvider, styling, rendering components, physical-device validation or calibrated performance to complete support.
