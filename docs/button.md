# Native Button loading

`Button` supports `loading`, `loadingPosition` and `loadingIndicator` through the package root and `Button` subpath. Existing `@mui/material` imports use the same implementation when the native resolver is configured; see [installation](installation.md).

```tsx
import { Button } from '@altroo/mui-native';

<Button loading={saving} onClick={saveInvoice}>
  Save invoice
</Button>;
```

When `loading` is `true`, the button disables presses and exposes native disabled and busy accessibility states. The default centered indicator overlays the content. The label and icons keep their layout space while becoming visually transparent, so changing loading state does not remove the label's width. `false`, `null` and an omitted value render the normal enabled state unless `disabled` is also set.

Use `loadingPosition="start"` or `"end"` to keep the label visible and replace the matching icon with the indicator. A supplied icon retains its space behind the indicator. Without an icon, the loading state adds an indicator slot.

```tsx
import { Text } from 'react-native';

<Button
  loading={uploading}
  loadingPosition="end"
  loadingIndicator={
    <Text accessibilityRole="progressbar" accessibilityLabel="Uploading invoice">
      {progress}%
    </Text>
  }
>
  Upload invoice
</Button>;
```

Give a custom indicator an accessible name and progress role. The default native activity indicator uses the button's `aria-label`, `accessibilityLabel` or plain text/number content, in that order. Supply an explicit button label when using rich content.

Theme `MuiButton.defaultProps`, root overrides, variants and supported `&.Mui-loading`/`&.Mui-disabled` selectors apply. Root layout styles such as `gap` and `flexDirection` continue to control the label and icon slots.

Component tests and an installed-package TypeScript consumer cover these contracts. VoiceOver/TalkBack announcements, RTL, large fonts and native release performance still require device validation. This subset does not establish complete upstream Button, slot or styling parity.
