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
- Base variants, root and applicable named overrides, component variants, prepared styled definitions and `sx` participate in the existing CSS specificity and declaration order. Genuine native `style` applies last. Native inline margin and padding shorthands replace earlier computed edges, including `style={{ margin: 0 }}` clearing a gutter.

Earlier pre-alpha themes stored absolute numeric line heights in `theme.typography`. Change those to explicit pixel strings. Directly spreading theme variants into React Native `style` is no longer valid; use `Typography`, `sx={{ typography: 'body1' }}` or `resolveSx(theme.typography.body1, theme, { mode: 'css' })`. The catalog theme has been migrated.

## Components and inheritance

Typography supports standard and augmented variants, `inherit`, alignment, palette color names, `gutterBottom`, no-wrap truncation, native text props/refs and custom native text roots. Heading tags selected by the default mapping, `variantMapping` or `component` become native heading roles. String roots render Text, not HTML; unsupported tags emit a diagnostic. A mapping to `a` supplies link semantics only, not browser navigation. Native screen-reader announcements still require device verification.

`MuiTypography.styleOverrides` can target root, variant names, alignment names, `noWrap` and `gutterBottom`; defaults and component variants also apply. Class composition follows the original root, variant, alignment, gutter and no-wrap order, including custom `classes` entries. The composed classes drive supported selectors at the actual Text root. Participating ancestors such as MenuItem and Typography publish supported descendant rules through the existing physical style scope; Portal placement changes ownership without adding a native Typography wrapper. Arbitrary selector grammar and opaque custom-host discovery are outside that mechanism.

Prepared `styled(Typography)` CSS stays separate from authored `style`. An absent style still selects `defaultProps.style`, explicit `undefined` selects the default, and explicit `null` suppresses it. Theme merge options preserve their existing class/style behavior. Owner-state and root callbacks see genuine public props and the original resolved defaults; prepared CSS does not become an inline prop. Native text event callbacks receive the original event and return value, and React 19 callback-ref cleanup follows the actual custom Text host lease.

The older `paragraph` prop remains a native compatibility extension with a 16-dp bottom margin; it is absent from the pinned MUI 9.5 declaration. Literal `color` strings such as `#ff0000` are also an existing native extension: the original 9.5 runtime accepts the prop but has no matching color style for that literal. Standard palette colors, custom palette entries with `main`, and `textPrimary`, `textSecondary` and `textDisabled` retain their source behavior. Native `start`, `end` and `auto` alignment values extend the original public alignment union.

Nested Typography preserves the difference between inherited unitless ratios and absolute line heights. A parent with 40-dp text and lineHeight 1.5 gives a 20-dp inheriting child a 30-dp line height. A parent's 60-pixel or computed percentage height stays 60. With an ordinary React Native Text parent, `variant="inherit"` leaves unspecified font metrics and color untouched. Relative `sx` values cannot discover an untracked native parent's measured font size. They use the nearest tracked text scope, or the configured root/default basis if none exists. Participating library containers and direct native Text/View children now establish scopes; opaque custom component internals still need explicit dimensions or a [native text scope](text-containers.md). Resetting an inherited native height with CSS `normal` is unsupported and emits a diagnostic; supply an explicit ratio or pixel length.

Button labels, textual loading indicators and TextField input text use the same conversion. Authored relative metrics and unitless inheritance metadata are held weakly alongside generated style objects. Styled wrappers preserve those expressions until Typography knows its variant and final font size. Literal native overrides keep absolute semantics. This metadata is never sent to native views and does not retain discarded render styles.

Authored `Text` and `Typography` children inside a Button retain independent native text roots. Their `allowFontScaling` and `maxFontSizeMultiplier` policies survive live changes and clearing, without JavaScript multiplying font sizes by the system scale. Mixed authored and literal labels wrap as native row content. This preserves native scaling policies; it does not establish identical browser paragraph wrapping.

Participating native containers preserve known layout direction separately from text metrics. Logical CSS `start`/`end` alignment resolves in that physical direction and can resolve again when a descendant changes direction. The final Text boundary encodes CSS left/right for React Native 0.88.1's RTL mirroring. Virtual Text uses the owning paragraph's direction; an actual View or physical Portal canvas starts another paragraph. Without a tracked direction, the native global direction supplies the basis rather than a theme-only hint. Native inline text alignment retains React Native semantics.

`noWrap` selects `numberOfLines={1}`, defaults `ellipsizeMode` to `tail`, and keeps an authored native ellipsize mode. It requires a bounded native layout to truncate. Browser block/inline formatting and exact browser line breaking are not reproduced by changing semantic string tags.

## Imports and custom roots

The original root and component entry export `Typography`, `typographyClasses`, `getTypographyUtilityClass`, `TypographyClasses`, `TypographyClassKey`, `TypographyOwnProps`, `TypographyProps` and `TypographyTypeMap`. Native routing supports both `@mui/material/Typography` and `@altroo/mui-native/Typography`; original web imports remain original MUI. The 21 declared class slots and all 12 global state utility names follow the pinned helper. The source-shaped `Typography/typographyClasses` path is not an original public package export and has no added native route.

An explicit custom native root retains its required extra props and declared native ref type:

```tsx
import { forwardRef } from 'react';
import { Text, type TextInstance, type TextProps } from 'react-native';
import Typography from '@mui/material/Typography';

type LabelProps = TextProps & { tone: 'quiet' | 'loud'; className?: string | undefined };
const Label = forwardRef<TextInstance, LabelProps>(
  ({ tone, className: _className, ...props }, ref) => (
    <Text {...props} accessibilityHint={tone} ref={ref} />
  ),
);

<Typography component={Label} tone="quiet" selectable />;
```

The root must render a Text-compatible native host and forward its text props, style and ref. A custom root may consume the composed `className` metadata; raw native Text does not receive CSS class props. Browser attributes and DOM refs are rejected. React Native declares TextInstance and ViewInstance as the same structural HostInstance type, so declarations cannot prove what host an arbitrary custom component renders. Custom root internals remain the author's responsibility.

## Custom variants

Extend `TypographyVariants` and `TypographyVariantsOptions` through `@mui/material/styles`, and `TypographyPropsVariantOverrides` through `@mui/material/Typography`. `TypographyClasses` can be augmented through that component entry. The strict source and emitted-declaration consumers verify custom variants, disabled default variants, explicit undefined options, native custom roots and rejection of browser refs. A separate strict consumer checks the original published declarations without native aliases. Theme interfaces and component variant overrides are separate, matching MUI's augmentation pattern.

## Evidence and remaining limits

The theme reference fixture covers nine configurations, palette callbacks, custom conversion and five `sx` cases. The component reference adds 44 actual original renders, eight prepared styled/default cases and 37 utility inputs from integrity-checked Material UI/System/Utils 9.5.0 archives. These ReactDOM server observations verify declarations, callback props and class ordering; they do not measure native layout or attached DOM refs. Source, license and fixture hashes are recorded in `upstream/typography-contract.json`.

Reproduce with the isolated reference setup in [theming](theming.md), then run:

```sh
node scripts/reference/typography.mjs --check
node scripts/reference/typography-contract.mjs --check
node scripts/reference/check-typography-consumer.mjs
```

The last command checks source, normally emitted native declarations under strict exact-optional settings, and the original public declarations. It needs the isolated original reference dependencies. Normal component tests use the committed JSON fixtures without loading browser MUI. Portal tests use the maintained native model and establish routing/lifetime behavior, not native paint.

Locally executable software checks cover source props/defaults/classes/imports, style and callback precedence, relative metric provenance, supported ancestor selectors, native event forwarding, custom-root ref cleanup, child state and physical Portal ownership. The normal workspace check compiles an isolated strict exact-optional consumer against emitted declarations; fresh package checks repeat it against installed archives and verify root/deep component, classes and helper identity.

### Observed iOS coverage

The direct [catalog scene](../apps/native-catalog/TypographyContractExample.tsx) and [iOS collector](../tests/native/ios/TypographyCatalogUITests.swift) pass two scenarios at normal OS text and the same two at the largest accessibility text profile on iPhone 18 Pro / iOS 27. This is unreleased source evidence from [3eae4405](https://github.com/Altroo/mui-native/commit/3eae4405fc666912c61f5e351625a2469cb63d7d).

At normal fontScale 1, the collector checks all thirteen standard variants plus `inherit`, native system-font cap/line geometry, authored gutter spacing and a bounded 180-dp Text root with actual tail-ellipsis pixels. At actual OS fontScale 3.571, it checks `body1`, `caption`, `h6` and `inherit`, along with the same source-sized native ellipsis and default uncapped scaling. The profile runner restores the original OS text size afterward. Rendering keeps authored JavaScript font units unscaled.

Both profiles check genuine inline resets, supported MenuItem ancestor colors, rendered RTL paragraph and opposing virtual-span alignment, a real nested counter press, public Text press events and measurements through five stable forwarded refs. Actual screenshots establish glyph placement independently of cached `onTextLayout` x positions. The scenario retains the counter and host/ref identities through theme, inline and direction changes. Independent review covers all sixteen normal captures and six largest-profile captures with their paired native receipts.

### Remaining native gates

- Android component geometry, truncation, mixed virtual text and RTL paint; custom fonts and broader multiline/mixed-script layouts on both platforms.
- Disabled and capped `allowFontScaling` / `maxFontSizeMultiplier` policies, live policy changes and physical Portal placement. The direct scenario above covers default uncapped scaling.
- Native selection, the full text/responder event surface and physical assistive-technology heading/link announcements.
- Optimized native startup, update, frame and memory evidence for representative text workloads.

Browser font loading and fallback discovery, arbitrary CSS calculations/variables, DOM nodes/refs and the separate `responsiveFontSizes` helper are outside this native component contract. Unsupported text values are diagnosed and omitted instead of being sent as invalid native lengths. These scoped checks do not establish full CSS parity or complete cross-platform native validation.
