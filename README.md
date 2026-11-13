# MUI Native

[![Validate](https://github.com/Altroo/mui-native/actions/workflows/ci.yml/badge.svg)](https://github.com/Altroo/mui-native/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MUI Native (`@altroo/mui-native`) is an independent React Native compatibility library for Material UI and MUI X Community, maintained in **one monorepo** by Altroo.

[View on npm](https://www.npmjs.com/package/@altroo/mui-native) · [Installation guide](docs/installation.md) · [Preview releases](https://github.com/Altroo/mui-native/releases) · [Compatibility](docs/compatibility.md)

**Status: public pre-alpha. Use npm `latest` or an explicit preview version. The `prealpha` alias is not consistently aligned across packages. This is a partial implementation, not a drop-in replacement for MUI.** The native package versions and upstream compatibility versions are separate.

The runtime uses native views on iOS and Android. The optional Metro resolver retains familiar `@mui/...` application imports. Web applications continue using the original MUI packages. This project is not affiliated with, endorsed by, or an official product of MUI.

[ROADMAP.md](ROADMAP.md) records project scope, progress, and next steps.

## Why I started this project

At work, I was tasked with migrating existing web applications to React Native. Those applications were built with Material UI (`@mui/material`), and I could not find a React Native solution that provided the API compatibility they needed.

I started MUI Native to address that gap: preserve familiar MUI component APIs and theming while rendering native iOS and Android interfaces. The aim is to make similar migrations more practical and provide a reusable library for other developers facing the same challenge.

## Status

Updated: **13 November 2026**. These are **staged implementation estimates**, not percentages of supported props, time remaining or verified MUI compatibility. ✅ Completed scope · 🔧 In progress · 🗺️ Planned.

These tables describe development on `main`. Check the [release changelog](CHANGELOG.md) for version-specific package contents; development on `main` can precede npm publication.

The [completion plan](docs/completion-plan.md) lists every existing partial entry and prioritizes closing its concrete implementation and validation gaps before adding new components.

For component/module rows: **0%** = not implemented, **25%** = prototype/subset, **50%** = an implemented subset with source-backed contract and installed-consumer coverage, **75%** = that coverage plus scoped iOS and Android interaction evidence, **100%** = the agreed full contract and release gates are complete. Foundation rows describe their explicitly bounded work. No component family is certified as fully compatible.

The expandable tables list **135 Material component/helper modules** and **84 modules across the four stable X Community families**, plus System, styling and icons. Native subsets currently exist for **65 of the Material entries** and **9 of the stable X entries**. These are top-level public modules from the pinned inventory, not a count of every nested component, prop or export. The [full declaration inventory](docs/coverage.md) tracks the deeper contracts. Pro/Premium behavior remains excluded, including paid-only behavior behind shared Community helpers.

### Foundations and release gates

| State | Part                                 |                                                  Progress | What it means                                                                                                                                                                |
| ----- | ------------------------------------ | --------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅    | **Repository and package structure** | [100%](ROADMAP.md#0-repository-provenance-and-automation) | One public monorepo with separate development packages and contribution/release guidance.                                                                                    |
| ✅    | **Declared import routing**          |                              [100%](docs/installation.md) | Metro and TypeScript routing for registered native imports, with unsupported-path guards and installed-package checks. Full MUI import coverage remains in the tables below. |
| ✅    | **Declaration inventory tooling**    |                                  [100%](docs/coverage.md) | Pinned source/API/license records and repeatable inventory generation/freshness checks exist; unresolved contracts stay visible.                                             |
| ✅    | **Contract/consumer check pipeline** |                                [100%](docs/validation.md) | Automated contract/type checks and fresh tarball installation checks are in place. This is tooling completion, not complete API test coverage.                               |
| 🔧    | **Native rendering foundation**      |                                [75%](docs/native-host.md) | Native iOS/Android hosts and scoped emulator interactions are exercised. Complete physical-device and accessibility matrices remain.                                         |
| ✅    | **Upstream release detection**       |                                  [100%](docs/upstream.md) | Twice-daily detection and deduplicated review issues work. Each detected update still needs a separate compatibility review.                                                 |
| 🔧    | **Full native validation matrix**    |                                 [25%](docs/validation.md) | Scoped emulator scenarios exist. Broad keyboard/IME, screen-reader, RTL, font-scaling and physical-device matrices remain.                                                   |
| 🗺️    | **Calibrated release performance**   |                                 [0%](docs/performance.md) | Accepted input/scrolling/memory baselines and physical-device calibration remain outstanding.                                                                                |
| 🗺️    | **Verified alpha publication**       |                         [0%](ROADMAP.md#3-verified-alpha) | The verified-alpha checklist is open. Publishing a pre-alpha preview does not complete these gates.                                                                          |

### Component and module progress

Expand a family to see individual entries. Percentages link to the implementation guide or remaining-work plan.

<details>
<summary>Material UI: 135 component/helper modules</summary>

| State | Part                        |                                         Progress | What it means                                                                                                                                                                                                                                               |
| ----- | --------------------------- | -----------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔧    | **Accordion**               |                         [75%](docs/accordion.md) | Controlled/uncontrolled expansion, four slots and retained Collapse have source, consumer and scoped iOS/Android evidence. Development after 0.0.7; full native matrices remain.                                                                            |
| 🔧    | **AccordionActions**        |                         [75%](docs/accordion.md) | Native end-aligned actions, spacing, theme styles and refs have source/consumer and scoped iOS/Android checks. Development after 0.0.7; full native matrices remain.                                                                                        |
| 🔧    | **AccordionDetails**        |                 [75%](docs/accordion-details.md) | Dedicated root/classes/defaults/types and strict installed consumers pass; retained body edits pass native integration. Direct standalone matrices remain.                                                                                                  |
| 🔧    | **AccordionSummary**        |                         [75%](docs/accordion.md) | Native ButtonBase activation, expanded/disabled state, slots and refs have source/consumer and scoped iOS/Android checks. Development after 0.0.7; full native matrices remain.                                                                             |
| 🔧    | **Alert**                   | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **AlertTitle**              |          [0%](ROADMAP.md#4-complete-material-ui) | Dedicated composition, styling and slot contracts are not implemented.                                                                                                                                                                                      |
| 🗺️    | **AppBar**                  |          [0%](ROADMAP.md#4-complete-material-ui) | Native app-bar layout, slots and responsive behavior are not implemented.                                                                                                                                                                                   |
| 🔧    | **Autocomplete**            |                      [75%](docs/autocomplete.md) | Native input, mapped/multiple values, renderers, headless hook and slots have contract/consumer and scoped iOS/Android checks. Physical, accessibility and release-performance gates remain.                                                                |
| 🗺️    | **Avatar**                  |          [0%](ROADMAP.md#4-complete-material-ui) | Native image/fallback, sizing and group contracts are not implemented.                                                                                                                                                                                      |
| 🗺️    | **AvatarGroup**             |          [0%](ROADMAP.md#4-complete-material-ui) | Native image/fallback, sizing and group contracts are not implemented.                                                                                                                                                                                      |
| 🔧    | **Backdrop**                |                            [50%](docs/modals.md) | Native overlay coordination, dismissal, slots, refs and transitions have contract/consumer coverage; wider native matrices remain.                                                                                                                          |
| 🗺️    | **Badge**                   |          [0%](ROADMAP.md#4-complete-material-ui) | Native badge content, overlap and anchor contracts are not implemented.                                                                                                                                                                                     |
| 🗺️    | **BottomNavigation**        |          [0%](ROADMAP.md#4-complete-material-ui) | Native selection, actions and navigation semantics are not implemented.                                                                                                                                                                                     |
| 🗺️    | **BottomNavigationAction**  |          [0%](ROADMAP.md#4-complete-material-ui) | Native selection, actions and navigation semantics are not implemented.                                                                                                                                                                                     |
| 🔧    | **Box**                     |                               [75%](docs/box.md) | Pinned props/classes, custom roots, themes and styles pass source/archive checks and eleven-state native scenes at both text profiles on iOS/Android. Development after 0.0.7; wider matrices and optimized performance remain.                             |
| 🗺️    | **Breadcrumbs**             |          [0%](ROADMAP.md#4-complete-material-ui) | Native link composition, overflow/collapse and navigation behavior are not implemented.                                                                                                                                                                     |
| 🔧    | **Button**                  |                            [50%](docs/button.md) | Native activation, state, refs, slots and loading contracts are covered in the implemented subset; inherited APIs and device gates remain.                                                                                                                  |
| 🔧    | **ButtonBase**              |                       [50%](docs/button-base.md) | Native activation/focus host, refs and key adapters have contract/consumer coverage; full physical accessibility/performance gates remain.                                                                                                                  |
| 🔧    | **ButtonGroup**             |                      [75%](docs/button-group.md) | Shared defaults, positions, classes, scoped styles and native roots have source/consumer and scoped iOS/Android interaction evidence. Development after 0.0.7; full native matrices remain.                                                                 |
| 🔧    | **Card**                    |                              [75%](docs/card.md) | Pinned Paper-backed props/classes, raised/default ordering, native roots and reserved styled inputs pass source/archive checks and thirteen-state normal/enlarged iOS/Android scenes. Development after 0.0.7; broader native and performance gates remain. |
| 🗺️    | **CardActionArea**          |          [0%](ROADMAP.md#4-complete-material-ui) | Specialized card interaction, header/media and slot contracts are not implemented.                                                                                                                                                                          |
| 🔧    | **CardActions**             |                      [75%](docs/card-actions.md) | Dedicated defaults, classes, native roots, scoped imports and strict consumers pass; five-stage iOS/Android checks pass at normal/enlarged text. Unreleased; complete matrices and release gates remain.                                                    |
| 🔧    | **CardContent**             | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **CardHeader**              |          [0%](ROADMAP.md#4-complete-material-ui) | Specialized card interaction, header/media and slot contracts are not implemented.                                                                                                                                                                          |
| 🗺️    | **CardMedia**               |          [0%](ROADMAP.md#4-complete-material-ui) | Specialized card interaction, header/media and slot contracts are not implemented.                                                                                                                                                                          |
| 🔧    | **Checkbox**                |                    [50%](docs/check-controls.md) | Native checked/value events, groups, labels, slots and refs are covered in the implemented subset; broader validation remains.                                                                                                                              |
| 🔧    | **Chip**                    |                              [50%](docs/chip.md) | Native display, activation, deletion and slots have contract/consumer coverage; Removable values are exercised through Autocomplete; independent Chip native gates remain.                                                                                  |
| 🔧    | **CircularProgress**        | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **ClickAwayListener**       |          [0%](ROADMAP.md#4-complete-material-ui) | A native outside-touch/ownership contract is not implemented.                                                                                                                                                                                               |
| 🔧    | **Collapse**                |                          [75%](docs/collapse.md) | Native height/width transitions, retained content, lifecycle, slots and installed-consumer contracts; scoped iOS/Android checks. Physical/accessibility/performance matrices remain.                                                                        |
| 🗺️    | **Container**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native container/grid breakpoint and layout APIs are not implemented.                                                                                                                                                                                       |
| 🗺️    | **CssBaseline**             |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| ✅    | **DefaultPropsProvider**    |           [100%](docs/default-props-provider.md) | Complete finite native context, defaults, public types and canonical imports; independent source and fresh installed-consumer checks pass. Broader theming and consuming components are separate.                                                           |
| 🔧    | **Dialog**                  |                            [50%](docs/modals.md) | Native overlay coordination, dismissal, slots, refs and transitions have contract/consumer coverage; wider native matrices remain.                                                                                                                          |
| 🔧    | **DialogActions**           |                    [75%](docs/dialog-actions.md) | Dedicated defaults, classes, native roots and strict consumers pass; eight-stage iOS/Android checks cover retained actions, RTL, spacing and sizing. Unreleased; large-text presentation and release gates remain.                                          |
| 🔧    | **DialogContent**           | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **DialogContentText**       |          [0%](ROADMAP.md#4-complete-material-ui) | Dedicated composition, styling and slot contracts are not implemented.                                                                                                                                                                                      |
| 🔧    | **DialogTitle**             |                      [75%](docs/dialog-title.md) | Dedicated Typography composition, classes, native roots/refs and stable Dialog IDs. Normal/enlarged iOS/Android geometry and real dialog actions pass; complete inherited, accessibility and release gates remain.                                          |
| 🔧    | **Divider**                 |                           [75%](docs/divider.md) | Source-backed variants, labels, classes, native roots and styling have contract/consumer and normal/enlarged iOS/Android evidence. Wider native RTL, physical accessibility and performance gates remain.                                                   |
| 🗺️    | **Drawer**                  |          [0%](ROADMAP.md#4-complete-material-ui) | Native drawer, gestures, focus and keyboard interactions are not implemented.                                                                                                                                                                               |
| 🗺️    | **Fab**                     |          [0%](ROADMAP.md#4-complete-material-ui) | Native floating-action composition and interaction contracts are not implemented.                                                                                                                                                                           |
| 🔧    | **Fade**                    |                       [50%](docs/transitions.md) | Native opacity/lifecycle and reduced-motion subset is covered; complete transition interoperability remains.                                                                                                                                                |
| 🔧    | **FilledInput**             |                            [50%](docs/inputs.md) | Native input state, adornments, refs and form coordination have contract/consumer coverage; complete upstream contracts remain.                                                                                                                             |
| 🔧    | **FormControl**             |                       [50%](docs/form-labels.md) | Scoped native label/helper/form-state behavior is covered; browser form semantics and wider device cases remain.                                                                                                                                            |
| 🔧    | **FormControlLabel**        |                    [50%](docs/check-controls.md) | Native checked/value events, groups, labels, slots and refs are covered in the implemented subset; broader validation remains.                                                                                                                              |
| 🔧    | **FormGroup**               |                        [75%](docs/form-group.md) | Source-backed wrapper and strict installed consumers pass, with scoped iOS/Android geometry and interaction evidence; broader native and physical gates remain.                                                                                             |
| 🔧    | **FormHelperText**          |                       [50%](docs/form-labels.md) | Scoped native label/helper/form-state behavior is covered; browser form semantics and wider device cases remain.                                                                                                                                            |
| 🔧    | **FormLabel**               |                       [50%](docs/form-labels.md) | Scoped native label/helper/form-state behavior is covered; browser form semantics and wider device cases remain.                                                                                                                                            |
| 🗺️    | **GlobalStyles**            |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🗺️    | **Grid**                    |          [0%](ROADMAP.md#4-complete-material-ui) | Native container/grid breakpoint and layout APIs are not implemented.                                                                                                                                                                                       |
| 🔧    | **Grow**                    |                              [50%](docs/grow.md) | Native opacity/scale and measured-height timing have contract/consumer coverage; full native matrices remain.                                                                                                                                               |
| 🗺️    | **Icon**                    |          [0%](ROADMAP.md#4-complete-material-ui) | These Material public imports are not implemented; the separate native SVG icon package is tracked below.                                                                                                                                                   |
| 🔧    | **IconButton**              |                            [50%](docs/button.md) | Native activation, state, refs, slots and loading contracts are covered in the implemented subset; inherited APIs and device gates remain.                                                                                                                  |
| 🗺️    | **ImageList**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native image-list layout, item and caption contracts are not implemented.                                                                                                                                                                                   |
| 🗺️    | **ImageListItem**           |          [0%](ROADMAP.md#4-complete-material-ui) | Native image-list layout, item and caption contracts are not implemented.                                                                                                                                                                                   |
| 🗺️    | **ImageListItemBar**        |          [0%](ROADMAP.md#4-complete-material-ui) | Native image-list layout, item and caption contracts are not implemented.                                                                                                                                                                                   |
| 🗺️    | **InitColorSchemeScript**   |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🔧    | **Input**                   |                            [50%](docs/inputs.md) | Native input state, adornments, refs and form coordination have contract/consumer coverage; complete upstream contracts remain.                                                                                                                             |
| 🔧    | **InputAdornment**          |                            [50%](docs/inputs.md) | Native input state, adornments, refs and form coordination have contract/consumer coverage; complete upstream contracts remain.                                                                                                                             |
| 🔧    | **InputBase**               |                            [50%](docs/inputs.md) | Native input state, adornments, refs and form coordination have contract/consumer coverage; complete upstream contracts remain.                                                                                                                             |
| 🔧    | **InputLabel**              |                       [50%](docs/form-labels.md) | Scoped native label/helper/form-state behavior is covered; browser form semantics and wider device cases remain.                                                                                                                                            |
| 🔧    | **LinearProgress**          | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **Link**                    |          [0%](ROADMAP.md#4-complete-material-ui) | The standalone native text/link component contract is not implemented.                                                                                                                                                                                      |
| 🔧    | **List**                    |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **ListItem**                |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **ListItemAvatar**          |                  [75%](docs/list-item-avatar.md) | Source-backed wrapper and strict installed consumers pass, with scoped iOS/Android geometry and interaction evidence; broader native and physical gates remain.                                                                                             |
| 🔧    | **ListItemButton**          |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **ListItemIcon**            |                    [50%](docs/list-item-icon.md) | Source-backed wrapper, parent menu CSS cascade, strict installed types and scoped iOS checks pass; direct Android and wider renderer gates remain.                                                                                                          |
| 🔧    | **ListItemSecondaryAction** |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **ListItemText**            |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **ListSubheader**           |                             [50%](docs/lists.md) | Native list composition, density, slots and text/action layout have contract/consumer coverage; complete device/API gates remain.                                                                                                                           |
| 🔧    | **Menu**                    |                              [50%](docs/menu.md) | Native anchored menu slots, dismissal and focus ownership have contract/consumer coverage; wider native validation remains.                                                                                                                                 |
| 🔧    | **MenuItem**                |                         [50%](docs/menu-list.md) | Native registration, focus, keyboard/typeahead and roles have contract/consumer coverage; broader keyboard/device contracts remain.                                                                                                                         |
| 🔧    | **MenuList**                |                         [50%](docs/menu-list.md) | Native registration, focus, keyboard/typeahead and roles have contract/consumer coverage; broader keyboard/device contracts remain.                                                                                                                         |
| 🗺️    | **MobileStepper**           |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🔧    | **Modal**                   |                            [50%](docs/modals.md) | Native overlay coordination, dismissal, slots, refs and transitions have contract/consumer coverage; wider native matrices remain.                                                                                                                          |
| 🔧    | **NativeSelect**            |                     [50%](docs/native-select.md) | Native platform-picker composition and selectedOptions/value/ref contracts are covered; physical picker validation remains.                                                                                                                                 |
| 🗺️    | **NoSsr**                   |          [0%](ROADMAP.md#4-complete-material-ui) | Native applicability and migration policy for this browser/SSR helper are unresolved.                                                                                                                                                                       |
| 🔧    | **OutlinedInput**           |                            [50%](docs/inputs.md) | Native input state, adornments, refs and form coordination have contract/consumer coverage; complete upstream contracts remain.                                                                                                                             |
| 🗺️    | **OverridableComponent**    |          [0%](ROADMAP.md#4-complete-material-ui) | This public polymorphic type-helper module is not implemented; it is not a visual component.                                                                                                                                                                |
| 🗺️    | **Pagination**              |          [0%](ROADMAP.md#4-complete-material-ui) | Native page models, items and interaction contracts are not implemented.                                                                                                                                                                                    |
| 🗺️    | **PaginationItem**          |          [0%](ROADMAP.md#4-complete-material-ui) | Native page models, items and interaction contracts are not implemented.                                                                                                                                                                                    |
| 🔧    | **Paper**                   |                             [75%](docs/paper.md) | Source-backed surface props, all 25 dark elevations, classes, native roots and styling have strict consumer and normal/enlarged iOS/Android checks. Wider native, physical accessibility and performance gates remain.                                      |
| 🗺️    | **PigmentContainer**        |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🗺️    | **PigmentGrid**             |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🗺️    | **PigmentStack**            |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🔧    | **Popover**                 |                           [50%](docs/popover.md) | Anchored native origins, margins, slots and actions have contract/consumer coverage; broader device gates remain.                                                                                                                                           |
| 🔧    | **Popper**                  |                            [75%](docs/popper.md) | Public native API, contract/consumer checks and scoped iOS/Android interaction evidence exist; remaining native scenarios and release performance prevent completion.                                                                                       |
| 🔧    | **Portal**                  |                            [75%](docs/portal.md) | Public native API, contract/consumer checks and scoped iOS/Android interaction evidence exist; remaining native scenarios and release performance prevent completion.                                                                                       |
| 🔧    | **Radio**                   |                    [50%](docs/check-controls.md) | Native checked/value events, groups, labels, slots and refs are covered in the implemented subset; broader validation remains.                                                                                                                              |
| 🔧    | **RadioGroup**              |                    [50%](docs/check-controls.md) | Native checked/value events, groups, labels, slots and refs are covered in the implemented subset; broader validation remains.                                                                                                                              |
| 🗺️    | **Rating**                  |          [0%](ROADMAP.md#4-complete-material-ui) | Native gestures, controlled values, keyboard and accessibility contracts are not implemented.                                                                                                                                                               |
| 🗺️    | **ScopedCssBaseline**       |          [0%](ROADMAP.md#4-complete-material-ui) | DOM/CSS-specific API: native policy or migration behavior is unresolved; browser CSS parity is not implied.                                                                                                                                                 |
| 🔧    | **Select**                  |                            [50%](docs/select.md) | Native single/multiple values, events, Menu composition and refs have contract/consumer coverage; full inherited/device gates remain.                                                                                                                       |
| 🗺️    | **Skeleton**                |          [0%](ROADMAP.md#4-complete-material-ui) | Native shapes, animation and reduced-motion contracts are not implemented.                                                                                                                                                                                  |
| 🗺️    | **Slide**                   |          [0%](ROADMAP.md#4-complete-material-ui) | Native transition, ref and lifecycle contracts are not implemented.                                                                                                                                                                                         |
| 🗺️    | **Slider**                  |          [0%](ROADMAP.md#4-complete-material-ui) | Native gestures, controlled values, keyboard and accessibility contracts are not implemented.                                                                                                                                                               |
| 🔧    | **Snackbar**                | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **SnackbarContent**         |          [0%](ROADMAP.md#4-complete-material-ui) | Dedicated composition, styling and slot contracts are not implemented.                                                                                                                                                                                      |
| 🗺️    | **SpeedDial**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native floating-action composition and interaction contracts are not implemented.                                                                                                                                                                           |
| 🗺️    | **SpeedDialAction**         |          [0%](ROADMAP.md#4-complete-material-ui) | Native floating-action composition and interaction contracts are not implemented.                                                                                                                                                                           |
| 🗺️    | **SpeedDialIcon**           |          [0%](ROADMAP.md#4-complete-material-ui) | Native floating-action composition and interaction contracts are not implemented.                                                                                                                                                                           |
| 🔧    | **Stack**                   | [25%](docs/compatibility.md#currently-exercised) | Native prototype/subset exists; full props, slots, events and validation remain.                                                                                                                                                                            |
| 🗺️    | **Step**                    |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **StepButton**              |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **StepConnector**           |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **StepContent**             |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **StepIcon**                |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **StepLabel**               |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **Stepper**                 |          [0%](ROADMAP.md#4-complete-material-ui) | Step state, connectors, actions and native accessibility contracts are not implemented.                                                                                                                                                                     |
| 🔧    | **SvgIcon**                 |                          [75%](docs/svg-icon.md) | Shared native SVG renderer, factories, paint/theme priority, refs and original root/deep imports have source/consumer and scoped iOS/Android evidence. Development after 0.0.7; complete inherited renderer contracts and native matrices remain.           |
| 🗺️    | **SwipeableDrawer**         |          [0%](ROADMAP.md#4-complete-material-ui) | Native drawer, gestures, focus and keyboard interactions are not implemented.                                                                                                                                                                               |
| 🔧    | **Switch**                  |                            [50%](docs/switch.md) | Five native slots, checked events and thumb motion have contract/consumer coverage; browser and full device behavior remain.                                                                                                                                |
| 🗺️    | **Tab**                     |          [0%](ROADMAP.md#4-complete-material-ui) | Native tab selection, indicators, scrolling and keyboard contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **TabScrollButton**         |          [0%](ROADMAP.md#4-complete-material-ui) | Native tab selection, indicators, scrolling and keyboard contracts are not implemented.                                                                                                                                                                     |
| 🗺️    | **Table**                   |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableBody**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableCell**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableContainer**          |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableFooter**             |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableHead**               |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TablePagination**         |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TablePaginationActions**  |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableRow**                |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **TableSortLabel**          |          [0%](ROADMAP.md#4-complete-material-ui) | Native table composition, cells, headers, sorting/pagination contracts are not implemented; Data Grid is a separate track.                                                                                                                                  |
| 🗺️    | **Tabs**                    |          [0%](ROADMAP.md#4-complete-material-ui) | Native tab selection, indicators, scrolling and keyboard contracts are not implemented.                                                                                                                                                                     |
| 🔧    | **TextField**               |                   [50%](docs/textfield-slots.md) | Native input/select composition, slots, refs and value events have contract/consumer checks; complete inherited APIs remain.                                                                                                                                |
| 🗺️    | **TextareaAutosize**        |          [0%](ROADMAP.md#4-complete-material-ui) | Standalone native multiline measurement and ref contracts are not implemented.                                                                                                                                                                              |
| 🗺️    | **ToggleButton**            |          [0%](ROADMAP.md#4-complete-material-ui) | Native selection, grouping and interaction contracts are not implemented.                                                                                                                                                                                   |
| 🗺️    | **ToggleButtonGroup**       |          [0%](ROADMAP.md#4-complete-material-ui) | Native selection, grouping and interaction contracts are not implemented.                                                                                                                                                                                   |
| 🗺️    | **Toolbar**                 |          [0%](ROADMAP.md#4-complete-material-ui) | Native app-bar layout, slots and responsive behavior are not implemented.                                                                                                                                                                                   |
| 🗺️    | **Tooltip**                 |          [0%](ROADMAP.md#4-complete-material-ui) | Native anchoring, hover/long-press, dismissal and accessibility contracts are not implemented.                                                                                                                                                              |
| 🔧    | **Typography**              |                        [50%](docs/typography.md) | Unreleased classes/defaults, strict installed contracts and normal/largest-text iOS geometry, RTL, ellipsis, events and ref checks pass; Android and broader native gates remain.                                                                           |
| 🗺️    | **Unstable_TrapFocus**      |          [0%](ROADMAP.md#4-complete-material-ui) | The public focus-boundary helper contract is not implemented; existing modal coordination is a narrower subset.                                                                                                                                             |
| 🗺️    | **Zoom**                    |          [0%](ROADMAP.md#4-complete-material-ui) | Native transition, ref and lifecycle contracts are not implemented.                                                                                                                                                                                         |

</details>

<details>
<summary>System and styling: 9 component/provider entries plus core helpers</summary>

| State | Part                                       |                                                    Progress | What it means                                                                                                                                                                                     |
| ----- | ------------------------------------------ | ----------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🗺️    | **Box**                                    | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| 🗺️    | **Container**                              | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| ✅    | **DefaultPropsProvider**                   |                      [100%](docs/default-props-provider.md) | Complete finite native context, defaults, public types and canonical imports; independent source and fresh installed-consumer checks pass. Broader theming and consuming components are separate. |
| 🗺️    | **GlobalStyles**                           | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| 🗺️    | **Grid**                                   | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| 🗺️    | **InitColorSchemeScript**                  | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| ✅    | **RtlProvider**                            |                                [100%](docs/rtl-provider.md) | Complete renderless context contract, strict public types, nesting/lifecycle and installed root/deep identity. Broader native RTL remains open.                                                   |
| 🗺️    | **Stack**                                  | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | This System module import is not implemented. A same-named Material component does not imply System import support.                                                                               |
| 🔧    | **ThemeProvider**                          |                              [50%](docs/theme-providers.md) | Native provider/context subset has contract and consumer coverage; complete upstream and device gates remain.                                                                                     |
| 🔧    | **createTheme / palette**                  |                                      [50%](docs/theming.md) | Native palette/theme derivation and augmentation subset is covered; full upstream theme contracts remain.                                                                                         |
| 🔧    | **Typography theming**                     |                                   [50%](docs/typography.md) | Native tokens, variants, units and inherited text are covered in the implemented subset; wider contracts remain.                                                                                  |
| 🔧    | **Spacing / breakpoints**                  |                                [50%](docs/layout-system.md) | Native spacing, breakpoint methods and width-responsive subsets have source/consumer coverage.                                                                                                    |
| 🔧    | **sx evaluation**                          |                                [50%](docs/compatibility.md) | Native supported styles, tokens and state selectors exist; arbitrary CSS and descendant selectors remain unsupported.                                                                             |
| 🔧    | **styled / defaults / slots**              |                                [50%](docs/default-props.md) | Native styled/default/slot composition subsets have contract/consumer coverage; complete upstream semantics remain.                                                                               |
| 🗺️    | **CSS variables / color-scheme providers** | [0%](docs/compatibility.md#unsupported-or-not-yet-verified) | Full CSS-variable and color-scheme provider APIs are not implemented.                                                                                                                             |

The following existing theme context helpers have completed their finite native contracts. They are separate from the partial ThemeProvider, theme construction and styling contracts above. These changes are included in `0.0.8-prealpha.0`.

| Status | Existing API                      |                      Progress | Verified scope                                                                                                                     |
| ------ | --------------------------------- | ----------------------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| ✅     | **Material useTheme**             | [100%](docs/theme-reading.md) | Scoped context, distinct stable fallback, development debug value, canonical imports and installed generic/augmentation contracts. |
| ✅     | **System useTheme**               | [100%](docs/theme-reading.md) | Nonempty context selection, stable default and explicit fallback identity, canonical imports and installed declarations.           |
| ✅     | **System useThemeWithoutDefault** | [100%](docs/theme-reading.md) | Nullable default, explicit fallback identity, context updates, canonical imports and installed declarations.                       |
| ✅     | **Material useThemeProps**        |   [100%](docs/theme-props.md) | Complete finite scoped default lookup, generic/helper types, canonical imports and strict original/native consumers.               |
| ✅     | **System useThemeProps**          |   [100%](docs/theme-props.md) | Complete finite context/fallback lookup, inferred defaults, all name-key types and strict installed declarations.                  |

</details>

<details>
<summary>Community Data Grid: 1 top-level public module</summary>

| State | Part         |                     Progress | What it means                                                                                                                                    |
| ----- | ------------ | ---------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔧    | **DataGrid** | [25%](docs/adaptive-grid.md) | Adaptive cards/tables, recycled rows, sorting/filtering, pagination and selection exist; editing, column virtualization and broader APIs remain. |

</details>

<details>
<summary>Community Tree View: 8 top-level public modules</summary>

| State | Part                           |                                                         Progress | What it means                                                                                                  |
| ----- | ------------------------------ | ---------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------------- |
| 🔧    | **RichTreeView**               |                 [25%](docs/compatibility.md#currently-exercised) | Native expansion and selection prototype exists; complete composition, hook and API contracts remain.          |
| 🗺️    | **SimpleTreeView**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.                  |
| 🗺️    | **TreeItem**                   | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.                  |
| 🗺️    | **TreeItemDragAndDropOverlay** | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | Shared helper is not implemented. Community eligibility must be reviewed separately from Pro/Premium behavior. |
| 🗺️    | **TreeItemIcon**               | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.                  |
| 🗺️    | **TreeItemLabelInput**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | Shared helper is not implemented. Community eligibility must be reviewed separately from Pro/Premium behavior. |
| 🗺️    | **TreeItemLoader**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.                  |
| 🗺️    | **TreeItemProvider**           | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.                  |

</details>

<details>
<summary>Community Charts: 34 top-level public modules</summary>

| State | Part                           |                                                         Progress | What it means                                                                                             |
| ----- | ------------------------------ | ---------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------- |
| 🔧    | **BarChart**                   |                 [25%](docs/compatibility.md#currently-exercised) | Native SVG bars, labels and item callbacks exist; full axes/composition/tooltips and validation remain.   |
| 🗺️    | **ChartsAxis**                 | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsAxisHighlight**        | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsAxisHighlightValue**   | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsBrushOverlay**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsClipPath**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsContainer**            | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsDataProvider**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsGrid**                 | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsLabel**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsLayerContainer**       | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsLegend**               | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsLocalizationProvider** | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsOverlay**              | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsRadialAxisHighlight**  | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsRadialDataProvider**   | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsRadialGrid**           | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsRadiusAxis**           | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsReferenceLine**        | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsRotationAxis**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsSurface**              | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsSvgLayer**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsText**                 | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsTooltip**              | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsWrapper**              | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsXAxis**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ChartsYAxis**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **Gauge**                      | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🔧    | **LineChart**                  |                 [25%](docs/compatibility.md#currently-exercised) | Native SVG lines, null gaps, labels and item callbacks exist; full chart contracts and validation remain. |
| 🗺️    | **PieChart**                   | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **RadarChart**                 | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **ScatterChart**               | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **SparkLineChart**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |
| 🗺️    | **Toolbar**                    | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.             |

</details>

<details>
<summary>Community Date/Time Pickers: 41 top-level public modules</summary>

| State | Part                         |                                                         Progress | What it means                                                                                            |
| ----- | ---------------------------- | ---------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------- |
| 🗺️    | **AdapterDateFns**           | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterDateFnsBase**       | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterDateFnsJalali**     | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterDateFnsJalaliV2**   | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterDateFnsV2**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🔧    | **AdapterDayjs**             |                 [25%](docs/compatibility.md#currently-exercised) | Day.js adapter subset exists; complete locale, calendar, timezone and upstream adapter contracts remain. |
| 🗺️    | **AdapterDayjsBuddhist**     | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterLuxon**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterMoment**            | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterMomentHijri**       | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **AdapterMomentJalaali**     | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🔧    | **DateCalendar**             |                 [25%](docs/compatibility.md#currently-exercised) | Native calendar/date-bound subset exists; full view, slot, event and accessibility contracts remain.     |
| 🔧    | **DateField**                |                 [25%](docs/compatibility.md#currently-exercised) | Strict native date-field parsing subset exists; section editing and full field contracts remain.         |
| 🔧    | **DatePicker**               |                 [25%](docs/compatibility.md#currently-exercised) | Native dialog/date-selection prototype exists; complete lifecycle and live-selection timing remain.      |
| 🗺️    | **DateTimeField**            | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DateTimePicker**           | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DayCalendarSkeleton**      | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DesktopDatePicker**        | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DesktopDateTimePicker**    | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DesktopTimePicker**        | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **DigitalClock**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🔧    | **LocalizationProvider**     |                 [25%](docs/compatibility.md#currently-exercised) | Native Day.js localization context subset exists; complete locale/adapter contracts remain.              |
| 🗺️    | **MobileDatePicker**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **MobileDateTimePicker**     | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **MobileTimePicker**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **MonthCalendar**            | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **MultiSectionDigitalClock** | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickerDay**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersActionBar**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersCalendarHeader**    | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersLayout**            | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersSectionList**       | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersShortcuts**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **PickersTextField**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **StaticDatePicker**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **StaticDateTimePicker**     | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **StaticTimePicker**         | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **TimeClock**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **TimeField**                | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **TimePicker**               | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |
| 🗺️    | **YearCalendar**             | [0%](ROADMAP.md#5-complete-the-four-stable-x-community-families) | This native public module is not implemented; only eligible Community contracts are in scope.            |

</details>

<details>
<summary>Icons: all 10,750 pinned glyphs</summary>

The complete catalog is included in `0.0.8-prealpha.0`. Artwork/import completion below is separate from the [shared native SvgIcon renderer (75%)](docs/svg-icon.md) and its remaining compatibility gates.

| State | Part                          |                       Progress | What it means                                                                                                                              |
| ----- | ----------------------------- | -----------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅    | **Catalog artwork and names** | [100%](docs/material-icons.md) | All 10,750 supplied names, variants and aliases match original SVG trees; deterministic generation and required notices are retained.      |
| ✅    | **Catalog import surface**    | [100%](docs/material-icons.md) | Named/root/deep imports and original native routing have source/type and fresh-archive checks; deep modules avoid loading the full barrel. |

</details>

<details>
<summary>Experimental families (separate scope)</summary>

| State | Part          |                                 Progress | What it means                                                                            |
| ----- | ------------- | ---------------------------------------: | ---------------------------------------------------------------------------------------- |
| 🗺️    | **Scheduler** | [0%](ROADMAP.md#7-experimental-families) | Preview baseline is monitored; no native implementation is present.                      |
| 🗺️    | **Chat**      | [0%](ROADMAP.md#7-experimental-families) | Source reuse is blocked pending license provenance; no native implementation is present. |

</details>

### Native mobile extensions (planned)

These are proposed MUI-style additions, separate from upstream MUI compatibility. They are **not included in the first pre-alpha**. React Native already supplies many underlying primitives; the work here is their theme, composition and interaction integration.

| State | Part                            |                        Progress | What it means                                                                                                                                  |
| ----- | ------------------------------- | ------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🗺️    | **Screen layout**               | [0%](docs/mobile-extensions.md) | Compose safe-area insets and `KeyboardAvoidingView` into a themed screen without duplicating native layout engines.                            |
| 🗺️    | **Themed ScrollView**           | [0%](docs/mobile-extensions.md) | Preserve native scrolling/ref/events while adding useful theme, `sx` and slot composition.                                                     |
| 🗺️    | **FlatList**                    | [0%](docs/mobile-extensions.md) | Keep React Native virtualization; add MUI-style item/empty/footer/refresh composition where it adds value.                                     |
| 🗺️    | **SectionList**                 | [0%](docs/mobile-extensions.md) | Preserve native sections, sticky headers and virtualization with consistent theming and slots.                                                 |
| 🗺️    | **Refresh/loading composition** | [0%](docs/mobile-extensions.md) | Integrate `RefreshControl`, refreshing and load-more feedback into scrolling/list examples. Application data fetching stays application-owned. |
| 🗺️    | **BottomSheet**                 | [0%](docs/mobile-extensions.md) | Native snap points, gestures, keyboard handling and focus ownership with MUI-style props and theme integration.                                |
| 🗺️    | **Swipeable list actions**      | [0%](docs/mobile-extensions.md) | Theme-aware leading/trailing actions, native gestures and explicit accessibility alternatives.                                                 |

`BackHandler`, `PermissionsAndroid`, `ToastAndroid`, `ActionSheetIOS` and `StatusBar` are APIs or system integrations, not all new UI components. Prefer focused recipes/helpers and existing MUI behavior where appropriate. `DrawerLayoutAndroid` is evaluated within the native Drawer track. The [extension plan](docs/mobile-extensions.md) records these decisions, platform limits and proposed examples; APIs will not be wrapped solely to duplicate React Native exports.

The [roadmap](ROADMAP.md) defines the full target and release gates. This table does not promote any package to verified or released support.

## What you can explore

- Native Material components with shared theme tokens, supported `sx` styles and familiar root/deep imports.
- Community Grid, Tree View, Charts and Date Picker prototypes in separate packages.
- Contract tests, installed-package validation and an upstream release monitor that keeps detected versions separate from verified support.

This is active library development. APIs and behavior can change. Start with the catalog or a disposable consumer; review the [implemented subset and gaps](docs/compatibility.md) before migrating an application.

## Run the catalog

Use Node 26.11.1 and pnpm 12.16.1. Xcode and an iOS simulator, or Android Studio and an emulator, are required for native development.

```sh
git clone https://github.com/Altroo/mui-native.git
cd mui-native
npm install --global pnpm@12.16.1
pnpm install --frozen-lockfile
pnpm check
pnpm catalog
```

Start in **Explore** to search by component name or browse grouped examples. The index keeps your search when you return from a collection; Android Back returns to the index. Use the appearance switch to compare light and dark themes. Layout inspectors keep their behavior controls separate from the normal browsing index.

The catalog uses Expo SDK 58. Rendering interactive rows or Modal/Dialog/Popover/Menu/Select requires a native development build because Expo Go does not include the library's interaction host. See [installation](docs/installation.md) and [native host](docs/native-host.md). Press `i` or `a` from Expo's terminal interface to launch the corresponding simulator. `pnpm --filter native-catalog ios` and `pnpm --filter native-catalog android` create development builds when native build prerequisites are installed.

## Install the pre-alpha preview

Use the `latest` tag in a disposable or development application. It currently selects a pre-alpha preview, not a stable release:

```sh
npm install @altroo/mui-native@latest @altroo/mui-native-host@latest
```

The native host must be a direct app dependency and requires a native rebuild. Add `@altroo/mui-native-compat@latest` to retain supported original MUI imports. Optional icons/X packages use the same tag. Follow [installation](docs/installation.md) for peers, Metro/TypeScript setup and optional native dependencies. This preview is intended for testing the documented subset; alpha/stable verification remains open.

## Packages

| Package                             | Implemented development subset                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@altroo/mui-native`                | Layout, typography, buttons, inputs, Select/NativeSelect/TextField select, lists, checked controls, dialog, popover, menu, Portal, Popper, alert, progress, snackbar |
| `@altroo/mui-native-system`         | Theme provider, tokens, responsive `sx`, supported state selectors, component defaults/overrides/variants, `styled`                                                  |
| `@altroo/mui-native-icons`          | All 10,750 pinned glyphs and native import routes in 0.0.8; [shared SVG limits](docs/svg-icon.md) remain                                                             |
| `@altroo/mui-native-host`           | Fabric keyboard/focus, in-window Portal and platform picker hosts; native rebuild required                                                                           |
| `@altroo/mui-native-compat`         | Opt-in Metro import resolver and native TypeScript configuration generator                                                                                           |
| `@altroo/mui-native-x-data-grid`    | Recycled rows, fixed columns, single sorting/filtering, pagination, selection, basic server modes                                                                    |
| `@altroo/mui-native-x-tree-view`    | Rich tree expansion, single/multiple selection, custom item accessors                                                                                                |
| `@altroo/mui-native-x-charts`       | Native SVG bar and line charts, labels, item callbacks                                                                                                               |
| `@altroo/mui-native-x-date-pickers` | Day.js adapter, strict date field, calendar, dialog picker                                                                                                           |

These are prototypes with limited contracts. See [compatibility](docs/compatibility.md) before migrating application code. Scheduler and Chat are monitored but not implemented. Pro/Premium source and paid-only feature parity are excluded.

## Example

```tsx
import { useState } from 'react';
import { Button, TextField, ThemeProvider, createTheme } from '@altroo/mui-native';

const theme = createTheme({ palette: { primary: { main: '#1976d2' } } });

export function Example() {
  const [name, setName] = useState('');
  return (
    <ThemeProvider theme={theme}>
      <TextField label="Your name" value={name} onChange={(event) => setName(event.target.value)} />
      <Button variant="contained" onClick={() => console.log(name)}>
        Save
      </Button>
    </ThemeProvider>
  );
}
```

`onClick` receives a native gesture event. Text-field `onChange` receives a documented value/name adapter, not a browser `ChangeEvent`. Native `onPress` takes precedence when both handlers are supplied.

## Staying current

GitHub Actions checks upstream at 07:17 and 19:17 UTC and on manual dispatch. It creates deduplicated release issues and updates an Upstream Updates dashboard. Candidate PRs are created manually; automatic PR creation, approval, merging and publishing are disabled. Run the local checks and `pnpm upstream:simulate` before hosted runs; see [upstream operations](docs/upstream.md).

[Update operations](docs/upstream.md) explains licensing gates, outage recovery, permissions, and the distinction between detected, candidate, verified, and released support.

## Development and release

See [native structural style internals](docs/native-structural-style.md) for the current native backend scope and remaining compatibility boundaries.

This project uses AI-assisted tools to accelerate development, review, and documentation, with testing and compatibility checks required before release.

- [Roadmap and milestone gates](ROADMAP.md)
- [Architecture](docs/architecture.md)
- [Planned native mobile extensions](docs/mobile-extensions.md)
- [Installation and native import mapping](docs/installation.md)
- [Compatibility boundaries](docs/compatibility.md)
- [Generated declaration inventory and remaining gaps](docs/coverage.md)
- [Native palette and color helpers](docs/theming.md)
- [Typography themes, native units and inheritance](docs/typography.md)
- [Theme defaults and slot prop composition](docs/default-props.md)
- [Native TextField slots and refs](docs/textfield-slots.md)
- [Native input variants and adornments](docs/inputs.md)
- [Native labels, helper text and floating fields](docs/form-labels.md)
- [Nested and scoped theme providers](docs/theme-providers.md)
- [Native style cache ownership and lifetime](docs/native-style-cache.md)
- [Native Modal, Backdrop and Dialog coordination](docs/modals.md)
- [Native Fade, transition timing and reduced motion](docs/transitions.md)
- [Native Grow and automatic height timing](docs/grow.md)
- [Native Collapse and retained layout transitions](docs/collapse.md)
- [Native anchored Popover](docs/popover.md)
- [Native ButtonBase activation and focus](docs/button-base.md)
- [Native List composition, slots and scrolling](docs/lists.md)
- [Native MenuItem/MenuList registration and keyboard](docs/menu-list.md)
- [Native anchored Menu and overlay focus](docs/menu.md)
- [Native Select and TextField selection](docs/select.md)
- [NativeSelect and platform-picker composition](docs/native-select.md)
- [Native interaction host and custom roots](docs/native-host.md)
- [Platform-native picker host](docs/native-picker.md)
- [Text rendering and inheritance in native containers](docs/text-containers.md)
- [Spacing, breakpoints and responsive styles](docs/layout-system.md)
- [Native Button and IconButton](docs/button.md)
- [Native Checkbox, Radio, groups and labels](docs/check-controls.md)
- [Native Switch slots, events and motion](docs/switch.md)
- [Native Chip display, activation and deletion](docs/chip.md)
- [Native in-window Portal](docs/portal.md)
- [Native Popper](docs/popper.md)
- [Native Autocomplete and headless hook](docs/autocomplete.md)
- [Native form controls and calendar behavior](docs/native-controls.md)
- [Adaptive grid cards and table mode](docs/adaptive-grid.md)
- [Performance measurement gates](docs/performance.md)
- [Validation evidence](docs/validation.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Upstream collaboration proposal, not submitted](docs/upstream-proposal.md)

## License

Original MUI Native code is licensed under the [MIT License](LICENSE). Copyright (c) 2026 Altroo and contributors.

Adapted upstream code and retained declaration snapshots preserve their original copyright and license notices. See [NOTICE](NOTICE) and the [upstream license texts](upstream/licenses). Source attribution and adaptation records are maintained for [Material UI/MUI X references](upstream/state.json), [MUI adaptations](upstream/reuse.json) and [Popper positioning](upstream/native-positioning.json).
