# Native typography

`createTheme` retains MUI-shaped typography: rem font sizes, unitless line heights, em letter spacing, numeric weights, `pxToRem`, global font options and all thirteen standard variants. Native components convert these values after applying theme overrides, component variants and `sx`. The theme itself remains useful to shared MUI application code.

```tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

const theme = createTheme({
  typography: (palette) => ({
    fontFamily: 'Inter, sans-serif',
    fontSize: 16,
    allVariants: { color: palette.text.primary },
    h4: { fontSize: '2rem', lineHeight: 1.25 },
  }),
});

<ThemeProvider theme={theme}>
  <Typography variant="h4" gutterBottom color="primary">
    Account details
  </Typography>
</ThemeProvider>;
```

Applications must load custom fonts with their native font-loading mechanism. The default MUI font-stack string remains in the theme; native rendering uses the platform system font. Custom stacks select the first named family, removing quotes. This does not check font availability or implement browser fallback-font discovery. Generic serif and monospace families map to platform equivalents. Native weights round to the nearest supported hundred from 100 through 900, while the public theme retains the requested value.

## Units and overrides

- `typography.fontSize` scales generated variant sizes relative to MUI's 14-pixel base. `htmlFontSize` calibrates `pxToRem`; it does not change the CSS root font. Native `rem` lengths default to a 16-dp root, matching a browser's default. Set the native `cssRootFontSize` theme extension when the shared web application explicitly changes its document root font size. Keep that setting separate from the conversion hint. `allVariants` applies before individual variant overrides. Typography callbacks receive the derived palette, and a custom `pxToRem` converter is preserved.
- Theme variants, `sx`, styled definitions and component overrides use CSS conventions. Numeric line heights are multipliers, including values greater than four. Use `lineHeight: '24px'` for an absolute height. `rem`, `em`, percentages and simple multiplication `calc()` lengths are normalized where supported.
- Native `style` and input-slot styles keep React Native units. Their numeric line heights are absolute. A native font-size override participates in relative CSS line-height, letter-spacing and gutter calculations.
- `sx` typography token names include `fontWeight: 'medium'`, `fontFamily: 'default'`, `fontSize: 'body1.fontSize'` and `typography: 'body1'`. Typography shorthand preserves CSS spacing units and responsive rules from the variant. It does not apply spacing multipliers to the variant again.
- The cascade is base variant, root and applicable named overrides, matching component variants, `sx`, then native `style`. Existing supported selector specificity and breakpoint ordering still apply.

Earlier pre-alpha themes stored absolute numeric line heights in `theme.typography`. Change those to explicit pixel strings. Directly spreading theme variants into React Native `style` is no longer valid; use `Typography`, `sx={{ typography: 'body1' }}` or `resolveSx(theme.typography.body1, theme, { mode: 'css' })`. The catalog theme has been migrated.

## Components and inheritance

Typography supports standard and augmented variants, `inherit`, alignment, palette color names, `gutterBottom`, no-wrap truncation, native text props/refs and custom native text roots. Heading tags selected by the default mapping, `variantMapping` or `component` become native heading roles. String roots render Text, not HTML; unsupported tags emit a diagnostic. A mapping to `a` supplies link semantics only, not browser navigation. Native screen-reader announcements still require device verification.

`MuiTypography.styleOverrides` can target root, variant names, alignment names, `noWrap` and `gutterBottom`; defaults and component variants also apply. The older `paragraph` prop remains a native compatibility extension with a 16-dp bottom margin; it is absent from the pinned MUI 9.5 declaration.

Nested Typography preserves the difference between inherited unitless ratios and absolute line heights. A parent with 40-dp text and lineHeight 1.5 gives a 20-dp inheriting child a 30-dp line height. A parent's 60-pixel or computed percentage height stays 60. With an ordinary React Native Text parent, `variant="inherit"` leaves unspecified font metrics and color untouched. Relative `sx` values cannot discover an untracked native parent's measured font size. They use the nearest tracked text scope, or the configured root/default basis if none exists. Participating library containers and direct native Text/View children now establish scopes; opaque custom component internals still need explicit dimensions or a [native text scope](text-containers.md). Resetting an inherited native height with CSS `normal` is unsupported and emits a diagnostic; supply an explicit ratio or pixel length.

Button labels, textual loading indicators and TextField input text use the same conversion. Authored relative metrics and unitless inheritance metadata are held weakly alongside generated style objects. Styled wrappers preserve those expressions until Typography knows its variant and final font size. Literal native overrides keep absolute semantics. This metadata is never sent to native views and does not retain discarded render styles.

Authored `Text` and `Typography` children inside a Button retain independent native text roots. Their `allowFontScaling` and `maxFontSizeMultiplier` policies survive live changes and clearing, without JavaScript multiplying font sizes by the system scale. Mixed authored and literal labels wrap as native row content. This preserves native scaling policies; it does not establish identical browser paragraph wrapping.

Participating native containers preserve known layout direction separately from text metrics. Logical CSS `start`/`end` alignment resolves in that physical direction and can resolve again when a descendant changes direction. Native inline text values retain their absolute React Native semantics.

## Custom variants

Extend `TypographyVariants` and `TypographyVariantsOptions` through `@mui/material/styles`, and `TypographyPropsVariantOverrides` through `@mui/material/Typography`. The clean installed-consumer fixture verifies custom variants through both original root and deep imports, disabled default variants, native custom roots and rejection of browser refs. Theme interfaces and component variant overrides are separate, matching MUI's augmentation pattern.

## Evidence and remaining limits

The reference fixture covers nine configurations, palette callbacks, custom conversion and five `sx` cases from the integrity-checked Material UI/System 9.5.0 packages. Reproduce with the isolated reference setup in [theming](theming.md), then run `node scripts/reference/typography.mjs --check`. Normal tests use the committed fixture without a browser MUI dependency.

This is a finite typography contract, not full CSS or MUI parity. Browser font loading, arbitrary CSS calculations/variables, native font-availability discovery, DOM nodes/refs/classes, responsiveFontSizes and all typography utility exports remain unfinished. Unsupported text values are diagnosed and omitted instead of being sent as invalid native lengths. Native text layout, font scaling, RTL, screen readers, screenshots and release performance remain device-validation gates. Original MUI continues to serve web imports.
