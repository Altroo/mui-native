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

Run the standard tests, strict type checks and package consumer checks. The native-host suites compile production adapter/state code where applicable; software doubles are explicitly separate from device evidence. Installed archives must retain the actual native sources, declarations, provider configuration and matching peer-input verifier. The renderless DefaultPropsProvider, RtlProvider and createBreakpoints entries must preserve their shared identities without loading a native host. The prepared-style rendering entry also exposes the native peer backend; passive peer Views never activate the resolver.

The internal package subpaths and diagnostic methods are implementation surfaces for this work, not a completed public CardContent migration API. See [native structure observation](native-structure-observation.md) for the separate observation-only transport.

## CSS peer identity in source development

Terminal styled Views, Box and Paper use an immutable backend choice. With the matching peer-capable native binary, ordinary roots carry exact accepted stylesheet-prefix/CSS identities on a stable View host. A foreign retained class does not depend on the receiving root's constructor name. CSS source ownership is metadata and does not alter emitted CSS. Actual selector consumers own the resolver lease; passive peers use one ordinary generated-props leaf and do not activate native tree scanning.

Renderer regressions require changes to class carriers or an opaque root's marker forwarding to preserve the native ref and descendant state. Peer snapshots are memoized in JavaScript; unchanged native peer envelopes share their immutable class data across style updates. An unavailable identity is distinct from a known empty class set. More than 64 classes or 1 MiB of UTF-8 identity data produces explicit unknown identity on the same host, preserving ordinary rendering. Direct malformed native payloads remain rejected. Unknown peer identity uses only a JavaScript observation bound to the exact surface, source host, parent and previous logical sibling. A missing or mismatched binding uses the ordinary adjacency branch while retaining native positional facts. An unknown peer replacement or same-host CSS change still does not establish native first-paint parity.

System declares the native-host dependency and matching React Native 0.88.1 peer. Keep the host as a direct app dependency for autolinking and rebuild when native source changes. Renderless utility/provider entries remain host-free. Older binaries retain their supported positional/ordinary path. The v2 binary selects sixteen ornament cases from positional facts and expanded CSS-peer matching before layout. The [recorded iOS adjacency scenario](../compatibility/evidence/native-accordion-peer-adjacency-ios-2026-11-14.json) passes; this scoped result leaves the component completion table unchanged.
