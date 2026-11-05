# Native ButtonGroup

This implementation is development after `0.0.7-prealpha.0`; it is not part of the published preview. It composes the existing native Button/ButtonBase hosts and shares source-facing group defaults and position contexts. The initial scoped iPhone and Android emulator checks cover layout, wrapped state, disabled touch, loading, dynamic children and native refs. The expanded checks also cover actual focus callbacks, live custom themes, nested geometry, physical Portal destinations and retained text/counter state on both native platforms. Physical accessibility/performance and complete device matrices remain pending.

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

The default root is a native View. The source `div` alias selects that same View. Custom native roots retain required props, discriminated-union branches and their actual ref type. Optional own props accept explicit undefined with exactOptionalPropertyTypes enabled. The classes interface remains open to declaration merging; runtime utility names retain the original fifteen slots and twelve global state identifiers. DOM refs and other HTML roots require migration. Native IDs, test IDs, ARIA labels and role props map through the native root, without adding an extra host around it.

## Group styling

Horizontal/vertical layout, joined corners, outlined overlap, text/contained dividers, palette colors and contained elevation follow the group contract. Buttons retain native minimum touch height. Full-width groups use the available parent width; both native platform checks compare the group against its actual parent bounds.

Defaults, overrides, variants and sx resolve through the shared native style engine. Participating Button roots expose group/position tokens to their ancestor sheets, preserving selector specificity before native inline styles. Root declarations stay on the actual group root. Grouped/first/middle/last override keys apply only to matching children, including override-local variants and callback/array layers. Variant callbacks receive the original merged owner-state arguments; root variants retain their existing order. Child inline native styles apply last; a simple child sx rule has lower specificity than a grouped selector.

Nested roots consume the outer group sheets. A Portal retains the logical group's public defaults and position, while descendant styles and inherited text follow the actual physical destination. Window placement clears source-ancestor styles; ordinary custom containers acquire their destination group sheets, including a different sibling group. Container text scopes preserve color, relative font metrics and native inline text values. Circular/self-container destinations remain inactive. Inline disablePortal keeps ordinary ancestry.

The shared theme includes all twenty-five original elevation tokens, custom concrete shadow layers and opt-in focus-visible outlines. Contained buttons resolve focus/hover/pressed/disabled shadows through the same cascade, with native inline style precedence. Concrete number, px, rem and percentage shape radii resolve through the shared style engine. Android before API 28 uses a diagnosed numeric elevation fallback; unsupported shadow/radius expressions are diagnosed rather than presented as verified CSS support. These are source contracts; platform paint and interaction still require the native checks below.

The native cascade uses stable ancestry order for equal-specificity sheets. Original Emotion cache insertion history can alter equal-specificity cross-component results after dynamic style changes; that browser behavior remains an explicit styling gate. Arbitrary DOM selectors, external global stylesheets, pseudo-elements, CSS transition timing and custom browser layout roots are not established by this increment.

## Evidence and remaining work

The [source record](../upstream/button-group.json) pins MIT Material UI 9.5.0. Fifty-one original-browser baseline cases cover context/default priority, filtered children and fragments, classes, variants, positions, disabled/loading state, authored overrides and scoped selectors, shorthand resets and actual hover input. Pointer-event observations preserve the inherited disabled class even when a child explicitly sets disabled=false. Every case mounts with a fresh Emotion cache, shared with the original MUI instance, so earlier cases cannot affect its insertion order. Additional retained observations cover all global utility states, custom-root filtering, nested and live composition, callback arguments, two named-slot variant cases, seven focus configurations, three ordinary Portal placements, two cross-group destinations and four physical text inheritance cases. Shared-cache diagnostic observations are retained separately during development.

The [baseline contract tests](../tests/button-group.test.tsx), [closure regressions](../tests/button-group-closure.test.tsx) and [physical Portal composition tests](../tests/group-portal-style-ownership.test.tsx) compare native context, state, colors, grouping and text against those observations. The Portal regressions include mounted state preservation, nested update stability, live destination changes, lease cleanup and self-container recovery. The [consumer fixture](../fixtures/native-consumer/button-group.tsx) checks root/deep imports, augmentation, required custom props and native ref boundaries. The [strict optional fixture](../fixtures/native-consumer/button-group-exact-optional.tsx) additionally checks explicit undefined, union roots, mergeable classes, callable return types and public contexts. These source checks do not certify device behavior or full MUI compatibility.

The remaining work is separated by evidence type:

| Gate                  | Remaining verification                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local native behavior | Both expanded emulator scenarios pass custom themes, actual focus, nested geometry and Portal text/style/state assertions. Full RTL and large-font geometry matrices remain open.    |
| Styling boundary      | Repeatable cross-component updates against a shared original Emotion cache, plus the documented finite native selector/unit policy. Arbitrary CSS/global styles are not established. |
| Performance           | Representative optimized-build interaction, scrolling and memory workloads on both native platforms.                                                                                 |
| Physical validation   | Screen-reader usability and physical keyboard/IME behavior on supported devices.                                                                                                     |
| Delivery              | Local packed consumers and full IDE/source checks pass. Reviewed PR and exact-head/main CI remain pending for this closure. No release gate is inferred from unit tests.             |

The exhaustive queue for existing partial families is in the [completion plan](completion-plan.md). No package version, tag or release accompanies this development work.

## Reproducing the scoped native checks

The catalog's **Groups** scene exercises horizontal/vertical layouts, full width, a stateful wrapped action, loading, group disabling and dynamic child removal. The iPhone scenario checks actual native parent/group endpoints, touch heights, visible touch centers and the measured root ref. Its maintained test is [ButtonGroupCatalogUITests.swift](../tests/native/ios/ButtonGroupCatalogUITests.swift).

For an existing generated Android catalog project, prepare the maintained runner, build/install its app and test APKs, then select the existing device explicitly:

```sh
node scripts/native-catalog/android-popper.mjs prepare --project "$ANDROID_PROJECT"
node scripts/native-catalog/android-popper.mjs run --scenario button-group --serial "$ANDROID_SERIAL" --output .cache/button-group-device-run
```

The [Android scenario](../tests/native/android/ButtonGroupScenario.java) and [strict collector](../scripts/native-catalog/android-button-group-report.mjs) require fourteen stages, fourteen baseline bounds samples, five physical Portal measurements and eight screenshots. Native focus ownership, destination glyph colors/fonts and same-container state retention are asserted before a run passes. Failed or incomplete evidence cannot pass acceptance. A fresh Android 37 debug app may request local-network access before reaching Metro; complete that platform prompt before starting instrumentation. The runner does not grant permissions or change device settings.

If Xcode stalls during verbose simulator diagnostic collection after a completed test, use its documented `-collect-test-diagnostics never` option. This keeps test result bundles and screenshot attachments enabled while avoiding that extra diagnostic collection. Incomplete result bundles do not count as passing evidence.
