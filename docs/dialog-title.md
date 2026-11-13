# Native DialogTitle

This contract is available in source builds. Published previews retain the earlier wrapper until the next release. Scoped iOS and Android development-build verification passes at normal and enlarged OS text sizes.

DialogTitle composes a native Text through Typography with 16-point vertical padding, 24-point horizontal padding and a nonshrinking automatic-basis default. The default `h6` appearance uses the native header role corresponding to the original `h2` root. Native heading levels and screen-reader announcements are separate from HTML semantics.

```tsx
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';

<Dialog open={open} onClose={close}>
  <DialogTitle>Workspace settings</DialogTitle>
  {/* Content and actions */}
</Dialog>;
```

## Typography and native roots

Typography props, variant augmentation, native Text attributes/events, compatible custom Text roots and native refs remain available. `DialogTitleOwnProps`, `DialogTitleProps` and `DialogTitleTypeMap` retain the native type relationships. Custom roots must forward their style, text, native attributes and ref; they own the semantics of the native host they render. Browser hosts, DOM refs and browser-only attributes are outside the native contract.

The wrapper supplies `variant="h6"` and `component="h2"` before spreading authored inputs. A present `variant: undefined` therefore reaches Typography's own default resolution, while an omitted variant keeps the title default. A present undefined component reaches Typography's variant mapping. These distinctions follow the original source.

The zero-flex native default allows a later native `flex` value to replace it. Native style arrays remain React Native inputs. General browser inline formatting and arbitrary CSS remain separate work.

## Styling and classes

`MuiDialogTitle-root`, caller classes, theme defaults, root overrides, variants, supported class selectors and `sx` use their own outer styled layer. Typography retains its separate inner layer and classes. Title's `classes` object is consumed by the title; it is not passed to Typography as its class configuration.

Named style callbacks observe genuine authored props and owner state. Internal prepared CSS is carried separately, including through `styled(DialogTitle)` and merged default styles. Original theme attachment is retained for complete, scoped, inherited and empty root-local themes, and for adjacent styled constructors. A root-local theme styles that layer without replacing the provider context used by Typography or descendants.

The canonical class-name generator applies to both Title and its inherited Typography classes. Class-interface augmentation extends declarations; it does not create new rendered slots.

Use the Material root, `@mui/material/DialogTitle`, or the scoped native equivalent. `DialogTitle/dialogTitleClasses` provides the default class map, named map, utility function and class types. The deep component entry now exports only Title, its types and class helpers. Earlier native previews re-exported unrelated layout components there; import those from the Material root or their own paths.

## Dialog title IDs

Each mounted Dialog generates a stable title ID unless its top-level `aria-labelledby` supplies one. That relationship is passed to the dialog paper, and its context is provided inside the paper. A nested Dialog gets its own context. Standalone titles keep their authored ID.

An explicit Title ID takes precedence over the context; empty strings are retained. Paper slot props can override the paper relationship without changing the title context. Explicitly mismatched caller IDs are preserved rather than reconciled by scanning children. Native `id` follows React Native's native-ID mapping. React Native implements the paper's labelled-by relation on Android. On iOS, use an explicit paper accessibility label when a named accessible container is needed; the title itself retains native heading semantics. Physical screen-reader usability remains unverified.

## Verification and remaining gates

The maintained reference producer checks 27 original Title observations plus seven adjacent styled-layer traces against integrity-verified MIT Material/System/Utils 9.5.0 sources. Explicit-theme observations use the original production renderer because its development styled implementation attempts to mutate frozen JSX props. These cases cover defaults, undefined values, class filtering, callback-visible style presence, merged defaults, scoped/inherited themes and source evaluation order.

Source/runtime regressions, lint, strict source/catalog/benchmark types, unused-code checks, all eight package builds, both native code generators and nine freshly installed package consumers pass. The local test run includes 4,449 Jest checks and 1,334 Node checks with one existing platform skip. A new consumer-fixture augmentation import and error-directive placement were corrected after the initial full preflight; all nine archive consumers and freshness/format checks then passed again.

The catalog's Layout & surfaces > Dialog title scene retains one native Text and its ref through seven root states. Normal, enlarged and restored-normal development runs pass on iPhone 18 Pro / iOS 27 and Android API 37. Both platforms verify measured spacing, typography, RTL, explicit IDs, two real confirmation dialogs and Cancel/Save behavior. Android also verifies the actual title node as the active paper's native label target and checks span-aware glyph paint against the pinned React Native font conversion. Native frames and current action bounds settle before touch injection; React receipts alone cannot satisfy geometry checks.

Screenshots were compared with the original 9.5.0 renderer using the same catalog theme. The normal title uses 16/24 padding and the roomy style adds 16 points to its height; reading typography and RTL remain distinct. Native font metrics, rounding and minimum touch targets are adaptations, not pixel-parity claims. At the largest iOS text category, the modal title and action labels remain visible, but the surrounding catalog navigation clips. This is a remaining catalog accessibility/design gap. These development runs do not certify complete large-text presentation or physical screen-reader usability.

Complete viewport/custom-root matrices, physical VoiceOver/TalkBack usability, inherited Typography gaps and optimized release performance remain open. This work does not complete Dialog or Modal lifecycle behavior. No full compatibility or 100% component claim is made.
