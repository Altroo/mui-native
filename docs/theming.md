# Native palette and color helpers

The native `createTheme` now derives `light`, `dark` and `contrastText` when a standard palette color supplies only `main`. Explicit shades and contrast text take precedence. The six standard colors, common/grey colors, text, backgrounds and action tokens have light/dark defaults checked against the pinned Material UI 9.5.0 package.

```tsx
import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#123456' },
    tonalOffset: { light: 0.1, dark: 0.4 },
    contrastThreshold: 4.5,
  },
});
const label = theme.palette.getContrastText(theme.palette.primary.main);
const overlay = alpha(theme.palette.primary.main, 0.15);
```

`tonalOffset` accepts a number or separate light/dark amounts. Numeric values use the upstream dark multiplier of 1.5. `primary` can use numeric shades; `secondary` uses A400/A200/A700. `theme.palette.augmentColor` supports explicit shade keys and preserves additional color fields. For a custom palette entry, call `augmentColor` yourself and extend `Palette` and `PaletteOptions` through `@mui/material/styles`; the installed-consumer fixture checks this pattern.

Color helpers are available from `@mui/material/styles`, `@mui/system`, and `@mui/system/colorManipulator` through the native resolver. They include `alpha`, `lighten`, `darken`, `emphasize`, `getLuminance`, `getContrastRatio`, conversions, channels and `blend`. Theme calculations run at theme creation; components consume the resulting tokens.

## Boundaries

- These are JavaScript color calculations. Tested `color()` outputs do not establish that React Native accepts those CSS strings in a view. Use native-supported hex, RGB/RGBA or HSL/HSLA colors for rendered styles.
- Browser CSS variables, CSS `color-mix`, nativeColor/colorSpace theme modes, scheme switching and full upstream styling parity remain unfinished. RGB percentage channels and named CSS colors are not supported by these upstream-compatible calculation helpers.
- Contrast calculation follows MUI's rounded luminance behavior and does not composite translucent colors over a background. It is not an accessibility audit of an actual screen.
- Zero-valued object tonal offsets remain valid as a deliberate palette adaptation. Color helper declarations retain MUI's string-only inputs, while the implementation preserves its internal parsed-object reuse path. Errors identify MUI Native and stay readable in production; throw/fallback conditions and development diagnostic channels match the reference.
- Additional arguments to `createTheme` merge after palette derivation, matching upstream merge behavior. Put a new `main` color in the first options argument if its shades should be recalculated. Custom `getContrastText` overrides the returned method after standard augmentation, as upstream does.
- Typography theme values, native conversion and custom variants are documented in [typography](typography.md). Complete Button color/variant augmentation, remaining typography/breakpoint utilities and slot styling remain open work. Non-CSS-variable nested/scoped composition is covered in [theme providers](theme-providers.md).

## Recomposition and migration

`recomposeColor` follows the original MUI behavior: RGB conversion maps channels into a new array, while HSL/HSLA recomposition writes percentage strings into the supplied channel array. Frozen HSL arrays therefore throw. Repeated recomposition of the same HSL object appends another percentage sign, as upstream does. The public declaration still describes parsed numeric channels.

Earlier native previews left HSL input channels unchanged. Copy the array when retaining numeric channels or recomposing the same input more than once:

```ts
const parsed = decomposeColor('hsl(220, 70%, 40%)');
const result = recomposeColor({ ...parsed, values: [...parsed.values] });
```

`ColorObject.colorSpace` accepts explicit `undefined` in strict optional-property consumers. Malformed input parsing, safe-helper fallback/warnings, clamping diagnostics and public getter order are compared with the pinned implementation in development and production. These calculation checks need no native renderer; native paint and palette mode gates remain separate.

## Reproduce the reference checks

Ordinary `pnpm test` uses the checked-in JSON fixture and requires no original MUI runtime dependency. `scripts/reference/palette.mjs` regenerates expected values using original packages in an isolated ignored directory, with no native aliases. It verifies cached tarball integrity, installed source bytes and license hashes before loading the reference implementations.

Download the pinned artifacts and install the reference packages separately from the workspace:

```sh
mkdir -p .cache/upstream .cache/palette-reference
npm pack @mui/material@9.5.0 @mui/system@9.5.0 @mui/utils@9.5.0 --ignore-scripts --pack-destination .cache/upstream
mv .cache/upstream/mui-material-9.5.0.tgz .cache/upstream/material-9.5.0.tgz
mv .cache/upstream/mui-system-9.5.0.tgz .cache/upstream/system-9.5.0.tgz
mv .cache/upstream/mui-utils-9.5.0.tgz .cache/upstream/utils-9.5.0.tgz
cd .cache/palette-reference
npm init -y
npm install --ignore-scripts --no-audit --no-fund ../upstream/material-9.5.0.tgz ../upstream/system-9.5.0.tgz ../upstream/utils-9.5.0.tgz react@19.3.0 react-dom@19.3.0 @emotion/react@11.14.0 @emotion/styled@11.14.1
cd ../..
node scripts/reference/palette.mjs --check
```

Omit `--check` only when intentionally refreshing the fixture after reviewing its pinned sources. There are 10 palette cases, 3 custom augmentation cases and 166 ordinary color helper cases, plus 96 boundary observations in each of development and production. The complete eighteen-function export set and root/deep identity are checked separately. These finite comparisons are evidence for those inputs, not complete upstream support. Original browser packages remain confined to the ignored reference directory; clean native-consumer checks enforce isolation.

MIT permission and copyright notices for adapted algorithms ship in each package's `NOTICE`. `upstream/reuse.json` records original source hashes and local adaptations separately from immutable baselines. The update checker compares those implementation files in new npm artifacts and includes changed/removed files in review issues. This never promotes verified support automatically.
