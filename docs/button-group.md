# Native ButtonGroup

This implementation is development after `0.0.7-prealpha.0`; it is not part of the published preview. It composes the existing native Button/ButtonBase hosts and shares source-facing group defaults and position contexts. Scoped iPhone and Android emulator checks pass for layout, wrapped state, disabled touch, loading, dynamic children and native refs. Physical accessibility/performance and complete device matrices remain pending.

```tsx
import { Button, ButtonGroup } from '@mui/material';

<ButtonGroup variant="outlined" size="small" aria-label="Document actions">
  <Button onClick={save}>Save</Button>
  <Button onClick={duplicate}>Duplicate</Button>
  <Button color="error" onClick={remove}>
    Delete
  </Button>
</ButtonGroup>;
```

Original root/deep imports, class helpers and the two group contexts route to the same native instances. `@mui/material/ButtonGroup`, `ButtonGroup/buttonGroupClasses`, `ButtonGroup/ButtonGroupContext` and `ButtonGroup/ButtonGroupButtonContext` have direct-package counterparts under `@altroo/mui-native`. Web continues using original MUI.

## Defaults and composition

Explicit Button props win over group context, which wins over Button theme defaults. Missing and explicitly undefined child props inherit; explicit false values remain false. Group defaults include color, disabled state, elevation/ripple settings, full width, size and variant. A custom wrapper can render a Button normally; the implementation does not invoke custom components or clone props into them.

The group filters non-element children with React's valid-child semantics. Arrays flatten; a fragment remains one positioned group child. Buttons inside that fragment receive its shared first/middle/last context, matching the original source. A single valid child has no position class. Disabled/loading activation remains owned by each native ButtonBase host. When a disabled group supplies the original Mui-disabled class, native pointer targeting stays blocked even if a child explicitly sets disabled=false; the explicit property and keyboard eligibility retain their source semantics.

The default root is a native View. The source `div` alias selects that same View. Custom native roots retain required props and their actual ref type. DOM refs and other HTML roots require migration. Native IDs, test IDs, ARIA labels and role props map through the native root, without adding an extra host around it.

## Group styling

Horizontal/vertical layout, joined corners, outlined overlap, text/contained dividers, palette colors and contained elevation follow the group contract. Buttons retain native minimum touch height. Full-width groups use the available parent width; both native platform checks compare the group against its actual parent bounds.

Defaults, overrides, variants and sx resolve through the shared native style engine. Participating Button roots expose group/position tokens to their ancestor sheets, preserving selector specificity before native inline styles. Root declarations stay on the actual group root. Grouped/first/middle/last override keys apply only to matching children. Child inline native styles apply last; a simple child sx rule has lower specificity than a grouped selector.

The native cascade uses stable ancestry order for equal-specificity sheets. Original Emotion cache insertion history can alter equal-specificity cross-component results after dynamic style changes; that browser behavior remains an explicit styling gate. Arbitrary DOM selectors, external global stylesheets, pseudo-elements, CSS transition timing and custom browser layout roots are not established by this increment.

## Evidence and remaining work

The [source record](../upstream/button-group.json) pins MIT Material UI 9.5.0. Fifty-one original-browser cases cover context/default priority, filtered children and fragments, classes, variants, positions, disabled/loading state, authored overrides and scoped selectors, shorthand resets and actual hover input. Pointer-event observations preserve the inherited disabled class even when a child explicitly sets disabled=false. Every case mounts with a fresh Emotion cache, shared with the original MUI instance, so earlier cases cannot affect its insertion order. Shared-cache diagnostic observations are retained separately during development.

The [contract tests](../tests/button-group.test.tsx) compare native context, state, colors and grouped geometry against those observations. The [consumer fixture](../fixtures/native-consumer/button-group.tsx) checks root/deep imports, augmentation, required custom props and native ref boundaries. These source checks do not certify device behavior or full MUI compatibility.

Nested groups, screen readers, physical keyboards, RTL/font scaling, custom theme shadows/focus styles and calibrated release performance remain open. No package version, tag or release accompanies this development work.

## Reproducing the scoped native checks

The catalog's **Groups** scene exercises horizontal/vertical layouts, full width, a stateful wrapped action, loading, group disabling and dynamic child removal. The iPhone scenario checks actual native parent/group endpoints, touch heights, visible touch centers and the measured root ref. Its maintained test is [ButtonGroupCatalogUITests.swift](../tests/native/ios/ButtonGroupCatalogUITests.swift).

For an existing generated Android catalog project, prepare the maintained runner, build/install its app and test APKs, then select the existing device explicitly:

```sh
node scripts/native-catalog/android-popper.mjs prepare --project "$ANDROID_PROJECT"
node scripts/native-catalog/android-popper.mjs run --scenario button-group --serial "$ANDROID_SERIAL" --output .cache/button-group-device-run
```

The [Android scenario](../tests/native/android/ButtonGroupScenario.java) and [strict collector](../scripts/native-catalog/android-button-group-report.mjs) require seven milestones, fourteen actual bounds samples and three screenshots. Failed or incomplete evidence cannot pass acceptance. A fresh Android 37 debug app may request local-network access before reaching Metro; complete that platform prompt before starting instrumentation. The runner does not grant permissions or change device settings.

If Xcode stalls during verbose simulator diagnostic collection after a completed test, use its documented `-collect-test-diagnostics never` option. This keeps test result bundles and screenshot attachments enabled while avoiding that extra diagnostic collection. Incomplete result bundles do not count as passing evidence.
