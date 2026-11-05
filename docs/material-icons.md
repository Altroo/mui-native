# Material icon catalog

This is **unpublished development after `0.0.7-prealpha.0`**. The npm preview still contains the earlier four glyphs; installing its current prealpha tag does not install this catalog.

The catalog implements every **10,750 glyph export** supplied by the pinned MIT `@mui/icons-material` 9.5.0 archive. Filled, Outlined, Rounded, Sharp and TwoTone names, legacy aliases and single-style icons are retained exactly. The source is not a uniform set of five variants for every base name, so absent siblings are not invented. Material's font-based `Icon` component is a separate unimplemented module.

```tsx
import Add from '@mui/icons-material/Add';
import AccessAlarmTwoTone from '@mui/icons-material/AccessAlarmTwoTone';
import MedicationLiquidTwoTone from '@altroo/mui-native-icons/MedicationLiquidTwoTone';

<Add titleAccess="Add item" color="primary" />;
<AccessAlarmTwoTone fontSize="small" />;
<MedicationLiquidTwoTone titleAccess="Medication" />;
```

Original imports use the existing native Metro/TypeScript resolver. Web keeps original MUI. Direct native imports, named root imports and the original `/index` alias share icon identity. Native root/deep declarations preserve SvgIcon custom-root requirements, refs, inherited props and supported augmentation. The original factory path uses Material's React-node factory; the early native root path-string factory remains an additive extension.

## Complete catalog scope

| Contract                 | Evidence                                                                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names and artwork        | Every pinned public glyph executes through an independent original CommonJS capture and matches its generated SVG tree, including children/keys, fragments, paths, groups, circles, ellipses, definitions, references and attributes.               |
| Generation               | Offline archive integrity, package identity, declaration snapshot and license checks precede translation. Unsupported source expressions/primitives fail; generated modules and provenance hashes are checked for freshness.                        |
| Imports and distribution | All 10,752 typed public paths map on native: 10,750 glyphs, index and the shared factory. CommonJS, ESM, declarations and native source retain the same names. Fresh archive installation checks types, all glyph root/deep identities and notices. |
| Attribution              | Original MIT wrapper notices and Google Material Icons Apache-2.0 artwork license are retained in the package. Native adaptation has separate provenance in the source record.                                                                      |

See [the source record](../upstream/material-icons.json), [generator](../scripts/icons/generate.mjs), [source-backed checks](../scripts/icons/catalog.test.mjs) and [package guide](../packages/icons/README.md). Generated modules are maintained through the generator.

## Import costs

Prefer deep imports for predictable application startup. A deep glyph depends on React and the shared factory and never imports the full catalog. The catalog app uses deep imports. Its ESM build allows a tree-shaking bundler to retain only a used glyph; the regression checks one retained glyph for a named Add import. Root imports are supported, but bundler configuration can initialize the complete barrel. Mocked Node loader measurements are diagnostic evidence, not Metro startup or device memory measurements.

## Native rendering boundary

All glyphs share the [SvgIcon renderer](svg-icon.md). Representative tests cover its required primitive shapes, fixed artwork, live props/refs and custom roots. Complete source/catalog coverage does not establish every physical-device rasterization, screen-reader interaction, inherited DOM adaptation or CSS fill transition. The broader renderer, font/RTL/accessibility/device and calibrated-performance gates remain open. No version, npm publication, release tag or verified-alpha claim accompanies this catalog.

## Reproduce

Place the pinned archive in `.cache/upstream/icons-material-9.5.0.tgz` and run:

```sh
node scripts/icons/generate.mjs --check
node --test scripts/icons/catalog.test.mjs
pnpm check
pnpm test:consumer
```

Without that local archive, ordinary checks still verify tracked artwork/source/generator/license hashes and routing. Comparisons that execute original modules require that archive, and the regeneration-only test reports a skip when it is absent; a present archive with missing or invalid tracked inputs fails. Installed consumer checks require a successful package build first.
