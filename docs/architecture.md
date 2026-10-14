# Architecture

One repository, independently consumable packages. Core, icons, X families, examples, tests, provenance, and update automation share one review and CI workflow. Separate repositories would add synchronization costs without improving the native compatibility contract.

Dependencies flow from the styling system to Material UI primitives and then to independent X families. The Material UI package does not import charts, date libraries, or grids. The icon package is separate. The grid uses FlashList; charts and icons use react-native-svg. The picker currently uses Day.js. No WebView or React DOM enters the native implementation.

Metro maps only allowlisted public imports on iOS and Android. It delegates web imports unchanged and preserves the application's existing resolver. Missing native imports fail explicitly. Native and web require separate TypeScript configurations because DOM events and element refs cannot truthfully be the native types.

Styling precedence: component base style, theme style overrides, matching theme variants, `sx`, then explicit native `style` where supported. Numeric `sx` spacing and radius values are theme-scaled. Numeric CSS-style overrides use literal native units. Unsupported selectors and units issue diagnostics; diagnostics can be promoted to errors in migration tests.

The default theme is immutable by convention and providers do not change global native appearance settings. Native font metrics, shadows, and selection visuals are adapted rather than pixel-identical. RTL, inherited text semantics, nested overlay management, advanced slots, and full theme augmentation parity remain release gates.

Independent native versions will use SemVer. Upstream version references identify audited contracts, not automatically supported versions. No package has declared full upstream support yet.
