# Native structural style internals

This is development infrastructure for native structural styles. Public `CardContent` still uses its existing implementation and remains in progress in the compatibility table. These internals do not establish full CardContent or browser CSS compatibility.

## Rendering and ownership

A Fabric commit hook selects between prepared normal and last-child View props before Yoga layout. It validates the complete candidate before cloning changed paths, preserves native family identity, and keeps work within explicit node/depth budgets. Parent and target support are deliberately narrower than ordinary sibling recognition.

Activation belongs to an explicit owner and generation. Stale cleanup cannot disable another owner. Runtime errors retain the original candidate, record degraded status and schedule a bounded diagnostic notification. Returning the original candidate is an error policy, not a claim that the requested CSS was applied correctly.

Only the matching RN0.88.1 native build and style/profile inputs are admitted. Native source verification is also run against the physically installed package, including its codegen and autolinking registration.

## Generated text and ordinary siblings

System-generated literal text uses stock React Native Text with a reserved, versioned nativeID origin. The resolver ignores those generated runs only when choosing logical element siblings. Explicit Text still counts, including empty Text. This does not introduce a replacement RawText component or change the physical text tree. Do not author nativeIDs beginning with `altroo:generated-paragraph:`. The marker is an internal convention, not authentication; matching canonical System copies are required because older, unmarked generated runs cannot be distinguished from explicit Text.

Ordinary View-kind siblings count regardless of zero size or hidden presentation. Root, virtual and owned Portal boundaries are excluded; Portal projection remains unsupported. Native checks on both platforms cover Image, vertical/horizontal ScrollView, single/multiline TextInput, actual SvgIcon and ButtonBase, along with reorder, zero/hidden states, removal and cleanup. Physical presence can differ by platform; a missing native lookup does not prove global registry absence.

## Known styled and memo roots

Prepared native roots preserve adjacent styled-layer ordering, selected-root defaults and genuine React.memo boundaries. A comparator that retains old props also retains their prepared styles; the transport does not call user comparators or substitute the latest parent input. Genuine accepted native inline styles remain authoritative.

The internal transport uses generated className tokens beginning with `altroo-root-css-v1-` or `altroo-root-handoff-v1-`. Authored class text is preserved, but generated names do not promise Emotion hash equality. These prefixes are reserved interoperability conventions, not authentication. Instance-local weak tables and real emitted/returned element props retain pending and accepted style snapshots. This adds no public wrapper or native host and does not establish a measured speed or memory bound.

## Current boundaries

The source channel covers direct View, styled(View), Box ending in View/div and the finite known styled/memo forms above. Matching platform acceptance remains a separate gate for each form. Portal destination order, conditional text/ancestor facts and eligible opaque roots remain unfinished. No public prop contract is narrowed to hide those gaps.

The native observations use normal text size and LTR fixtures. They do not establish first-containing-candidate chronology, first paint, GPU output, physical-device assistive technology or release performance. Runtime chronology and paint flags remain false. Two RN deep-import deprecations remain in the version-pinned native encoder.

## Maintainer checks

Run the standard tests, strict type checks and package consumer checks. The native-host suites compile production adapter/state code where applicable; software doubles are explicitly separate from device evidence. Installed archives must retain the actual native sources, declarations, provider configuration and matching peer-input verifier. The pure System internal entries must share their context/registration identities without loading the native host.

The internal package subpaths and diagnostic methods are implementation surfaces for this work, not a completed public CardContent migration API. See [native structure observation](native-structure-observation.md) for the separate observation-only transport.
