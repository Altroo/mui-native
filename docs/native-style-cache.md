# Native style caches

**Source after `0.0.8-prealpha.0`:** the cache API described here has not been published yet. The `0.0.8-prealpha.0` npm packages do not export these new APIs.

Native styling retains committed CSS insertion order for participating library roots. This matters when two equally specific rules compete, such as a disabled Button inside a ButtonGroup. Mounting another component first can change which rule wins, as it does with a shared original Emotion cache.

The default native cache is shared and survives component unmounts and theme replacement. Applications that need a separate lifetime can provide an explicit native cache. These are native extensions; keep the ordinary MUI theme setup in your web entry point.

```tsx
// App.native.tsx
import {
  Button,
  ButtonGroup,
  NativeStyleCacheProvider,
  ThemeProvider,
  createNativeStyleCache,
  createTheme,
} from '@altroo/mui-native';

const cache = createNativeStyleCache({ key: 'app' });
const theme = createTheme();

export default function App() {
  return (
    <NativeStyleCacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <ButtonGroup variant="outlined">
          <Button>Save</Button>
          <Button>Cancel</Button>
        </ButtonGroup>
      </ThemeProvider>
    </NativeStyleCacheProvider>
  );
}
```

Create the cache once outside render or with a lazy state initializer. Changing the provider value selects another cache; it does not erase the previous cache's history. Creating a new theme also preserves that history.

## Lifetime and ordering

- `createNativeStyleCache({ key, prepend? })` creates an independent cache. Keys contain lowercase letters and hyphens. The same keys intentionally share generated selector identities, so duplicate rules from another cache with that key can affect their relative order.
- A cache receives a stylesheet position when its first nonempty CSS programme commits. `prepend: true` places that cache before existing stylesheet blocks. Further programmes retain the cache's block position.
- `cache.reset()` clears its registered classes, retained programmes and stylesheet position. Unmount every styled root using that cache first; resetting a cache with mounted roots throws.
- `cache.dispose()` clears the cache and prevents further use. Unmount its styled roots first. Repeated disposal is safe.
- Providers alone do not insert styles. Uncommitted, interrupted and suspended renders do not reserve stylesheet positions. A committed fallback retains only CSS owned by the components that actually committed.

Class registration and stylesheet insertion have separate lifetimes, matching the pinned original Emotion behavior. A nonterminal styled root registers its complete class body during its source render. Another cache recognizes that incoming class only if it has the same key and already registered the same body. A suspended render can leave this cache-local registration behind while reserving no stylesheet position. Genuine later source renders perform that lookup again; host-only feedback and cache-order updates reuse their prepared CSS.

Native `style` values and state callbacks remain the final authored native layer. A host press or hover selects retained CSS conditions without injecting host state into the enclosing component's genuine `ownerState`. Source callbacks still refresh when their genuine inputs, theme or applicable source defaults change.

## Validation and limits

The maintained [original reference](../tests/fixtures/mui-button-group-cache-9.5.0.json) records fifteen original-browser cache sequences and seventeen class-registration/forwarding cases. These cover standalone warm-up, reset, separate caches, theme replacement, StrictMode, suspended registration, multiple foreign classes, a later focus render, and the original `as` forwarding rules. The [reference runner](../scripts/reference/button-group-cache.mjs) checks the pinned MIT source archives and supporting dependencies before recording results. Native renderer regressions cover cache lifetime, source callback retention, discarded renders, authored styles and competing cache blocks.

Current source integration covers System styled roots, Box, ButtonGroup, Button, ButtonBase, IconButton, MenuItem, AccordionSummary and their participating slots. Original constructor programmes are pinned for ButtonGroup, Button and ButtonBase; the other constructors retain their existing native recipes. Shared-cache contracts for other component families remain unverified. The class-bridge regressions compare complete emitted Button/ButtonBase CSS bodies with the verified original observations. Box regressions also cover cache leases, idle foreign-style resets, custom-root specificity and native inline priority. These source checks do not certify every component family.

Native `styled` accepts native component targets through `as`, such as `View` or `Text`; DOM tag strings are rejected. A consumed `as` selects that native target, while an authored forwarding predicate can keep it on the original component. Replacing a pending cooperating physical-root target through `as` is unsupported and throws before preparing descendants; use that component's supported root contract. This does not change the separately documented Box `div` alias.

This mechanism preserves emitted CSS identity before applying the supported native property and selector rules. It does not provide arbitrary browser CSS, global stylesheet APIs, pseudo-elements or CSS transition timing. Cache regression tests do not establish complete native device, accessibility or performance parity. See [ButtonGroup](button-group.md) for the wider component gates.
