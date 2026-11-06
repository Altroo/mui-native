# Text in native containers

Box, Paper and their composed containers now accept literal text without requiring a Typography wrapper. Stack, Card/CardContent/CardActions, FormControl, Dialog content, Modal/Backdrop and styled native View/Text hosts participate in the shared text scope. Existing native view refs remain on their roots.

```tsx
import { Box, Paper, Typography } from '@mui/material';

<Box sx={{ fontSize: 24, lineHeight: 1.5, color: 'primary.main' }}>
  Hello {0}
  <Box sx={{ fontSize: '50%' }}>
    Smaller text
    <Typography variant="inherit">Inherited text</Typography>
  </Box>
  <Paper>Paper uses the theme text color</Paper>
</Box>;
```

Contiguous strings, numbers and bigints share a minimal native Text host. Arrays and fragments are supported; booleans/null do not create text. A wrapper does not add a native View or apply MuiTypography defaults, variants or overrides. Typography continues to use its own component configuration. Explicit direct native Text and View elements keep their native element types and refs while receiving the appropriate context inside their content; stable reconciliation keys retain state as siblings change. Single-element content remains a single React element for custom roots that inspect it.

## Inheritance and precedence

A container carries font, color, text alignment/transform, decorations, font variants/variation settings, text shadows and writing direction to descendant text scopes. Inheritable text fields are removed from its native View style. Box style accepts native ViewStyle and TextStyle fields. Native-only text layout/selection fields, such as includeFontPadding and textAlignVertical, apply to literal runs owned by that container and do not become inherited attributes of nested containers.

The root native fallback uses the configured authored CSS root size (theme.cssRootFontSize, default 16), the configured font family and palette.text.primary. typography.htmlFontSize calibrates pxToRem and does not change that document-root equivalent. It does not apply the body1 variant or MuiTypography component configuration. The default family maps to the system font; custom font availability remains application-owned. This is a defined native fallback, not an automatic CssBaseline port.

CSS theme/sx metrics keep their authored semantics. A unitless lineHeight ratio follows a descendant's font size. Percentage or length line heights inherit as computed lengths, and computed em letter spacing stays an absolute inherited length. Literal native style.lineHeight is an absolute React Native length. Native style overrides win over sx within their layer. Explicit Text children establish their own native font/height/color before a tracked descendant resolves relative metrics. Unknown custom component internals cannot be measured automatically.

Paper resets color to palette.text.primary, following pinned MUI; paper sx/style overrides win. Paper component replacement now receives the normalized native root style and retains its forwarded ref. A native Modal window starts a fresh text scope; disablePortal inline mode inherits its surrounding scope. Dialog Paper still establishes its own text color. Button labels establish their own text context, and color="inherit" uses the enclosing scope when present.

## CSS alignment and native paragraphs

CSS theme/sx left/right/start/end keep their semantic values through the text scope. At a Text host, the adapter accounts for React Native's RTL mirroring once. Genuine native style.textAlign values and resets keep React Native semantics. Nested virtual Text uses its owning paragraph's actual direction; a View starts a fresh paragraph boundary while retaining supported CSS inheritance. This does not change the device's global direction or native input adapters.

The source-pinned backend and paragraph contracts are recorded in [native rendering provenance](../upstream/native-rendering.json). The [alignment regressions](../tests/native-text-alignment.test.tsx) cover native inline precedence, resets, nested Text and opposite-direction View boundaries. Direct Details tests verify actual glyph paint at baseline and the largest iOS OS text profile. Layout events retain useful font/line metrics, but a separate or cached measurement can differ from the final drawing position; native horizontal-placement assertions inspect rendered ink.

## Custom native containers

NativeTextScope is a native extension from @altroo/mui-native-system. It provides a React-only scope with a render callback and leaves the native host to the caller:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { NativeTextScope } from '@altroo/mui-native-system';
import { useTheme } from '@mui/material/styles';

function Message({ children }: { children?: ReactNode }) {
  const theme = useTheme();
  return (
    <NativeTextScope theme={theme} style={{ color: 'red', fontSize: 20 }} content={children}>
      {(nativeStyle, content) => <View style={nativeStyle}>{content}</View>}
    </NativeTextScope>
  );
}
```

The callback receives (nativeStyle, content, scope). kind='text' targets an existing native Text root; reset starts a new root scope. NativeTextStyleContext, useNativeTextContext, nativeTextStyleContext and renderNativeTextChildren are also native extension helpers. They are not original MUI browser exports; keep their use in native implementation modules.

## Evidence and limits

Twenty-eight focused cases cover literal values, keys/state/refs, custom root inspection, CSS/native metric distinctions, theme defaults, explicit Text/View hosts, Button isolation, Modal window boundaries and ten browser-observed upstream comparisons. The browser fixture was captured from original Material UI/System 9.5.0 rendered in Chromium, with immutable source/license/tarball checks. It compares computed font sizes, line heights, letter spacing and static colors. Native tests use mocked hosts and do not prove physical font shaping, baseline alignment, accessibility grouping or large-text geometry.

Run node scripts/reference/text-containers.mjs --check after the [reference setup](theming.md) to verify the source, test inputs and original HTML fingerprint. To refresh browser observations deliberately, run the script without --check, render .cache/text-reference.html in a browser, and capture getComputedStyle for each ordered [data-probe] element. The JSON fixture records the renderer and expected values. Ordinary tests use that checked-in fixture and install no browser MUI into native packages.

Full browser inline formatting is unfinished: literal runs and sibling components follow the native container's layout. Arbitrary portals, raw text returned from opaque custom components, custom component internals that bypass the scope, and independent native Views outside a participating boundary still require explicit Text or a scope. Do not insert native Views into text where a platform forbids that composition. CSS normal resets of inherited line height, arbitrary CSS and complete typography inheritance remain open. Native screen readers, RTL/font scaling, real layout/animation, historical crashes and release-performance measurements remain validation gates. No full package support or npm release is implied.
