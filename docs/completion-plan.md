# Completion plan for existing modules

The current priority is to finish the easiest existing unfinished component or API to its full agreed native contract before moving to another family. The partial-row inventory retains the 7 November 2026 audit, including the merged Divider contract and finite native validation at `6e223c98`; completion priorities and theme-reading evidence were updated on 10 November 2026.

There are **61 rows at 50% or 75%**: 54 Material entries, six System/styling entries and the native rendering foundation. The renderless RtlProvider and both DefaultPropsProvider entries are complete within their [RTL](rtl-provider.md) and [default-prop context](default-props-provider.md) contracts. There are also **20 rows at 25%**: 10 Material entries, nine Community X entries and the cross-cutting native validation matrix. The full pinned icon artwork/import catalog is complete separately from its shared SvgIcon rendering gates. Those prototypes remain in this plan. The percentages below are the existing evidence stages, not measured fractions of code written.

## Completion rules

For each family, make the agreed native contract finite: list every eligible prop, event, slot, import, public type/augmentation and styling/default interaction against the pinned upstream declarations. Record each as implemented, missing, adapted with a documented native equivalent, or outside the agreed native contract. An unresolved inherited type or generic is still work, even when the export name matches.

Keep three independent checklists: implementation gaps, locally executable verification, and external device/release verification. Missing software behavior must be implemented now. Native emulator tests, accessibility-tree assertions, RTL/large-font checks and release-build benchmarks are local work when the available tools support them. Physical keyboard, IME and screen-reader usability evidence stays explicitly unverified until exercised; it must not conceal an implementation gap or be silently marked complete.

Finish each selected family's implementation and local checks within its workstream before moving that workstream to another family. Select one family at a time. A required dependency must be necessary for that family and have explicit exit conditions; supporting infrastructure and CI work must not displace its closure. Do not promote a row merely because it was rendered indirectly by a later component. Do not add a new zero-percent component to avoid completing an existing dependency.

## Current wrapper closure: FormGroup

The finite source, utility/type, import, defaults/style and installed-consumer contract is documented in [FormGroup](form-group.md). Normal/enlarged native geometry and live state/ref checks pass on both simulators. Root callback dispatch and Android owned-child keyboard capture/cancellation have dedicated native evidence. Owned-child focus/blur now passes on iOS and Android with retained roots and duplicate suppression.

iOS Space/A keyboard interactions now have 30 scoped cases across all five roots and three policies. Its independent UIKit prerequisite cannot deliver raw Return/keypad Enter; that remainder stays explicitly unverified. Android editable NativeTextInput/TextField command and ordinary-event forwarding now has 54 cases in each of the default-disabled and enabled profiles, 108 total, with an independent original RN baseline; actual phase capabilities remain explicit. The current optimized iOS FormGroup workload passed both the Native View comparison and MUI variant with 100 retained roots, sixteen acknowledged updates and three measured cohorts per mode. The iOS and Android accessibility checks each passed twelve group observations across initial, updated and restored states, with separately addressable controls and retained state. These checks cover native tree exposure and touch activation in the stated simulator profiles. Root-self hardware keys when the framework flag is disabled remain a separate runtime capability. Physical keyboard/IME, screen-reader usability and representative physical performance remain external evidence. The row stays at its existing 75% evidence stage until its remaining gates are satisfied.

## Retained closure gates: ButtonGroup and required existing styling

| Contract                        | Concrete work                                                                                                                                                                                                       | Current state                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Global utility states           | Match all original global state identifiers, not only disabled.                                                                                                                                                     | Implemented; original utility-state regressions pass.                                                                                                  |
| Public types                    | Preserve explicit undefined under exactOptionalPropertyTypes; verify native custom-root requirements and ref cleanup.                                                                                               | Implemented; strict emitted and freshly installed packed-consumer checks pass.                                                                         |
| Custom roots                    | Match source prop filtering, including ownerState/sx, and correct native ref forwarding.                                                                                                                            | Original browser spy and native model regressions pass.                                                                                                |
| Nested and portaled composition | Apply outer styles to nested roots; preserve public defaults/position contexts while limiting descendant styles to actual native containment. Cover inside/outside/default/nested Portal targets and stale cleanup. | Physical ownership/state/nesting regressions and both expanded native scenarios pass.                                                                  |
| Theme shadows and focus         | Implement source shadow tokens/custom shadows, focus theme options, grouped focus order and native focus drawing. Platform fallback must be explicit.                                                               | Implemented and source-tested; actual native focus and scoped theme/paint scenes pass.                                                                 |
| Embedded variants               | Resolve override-local variants/arrays/callbacks in source order while retaining existing component-level variants.                                                                                                 | Implemented; named-slot, nested callback and shared slot-adapter regressions pass.                                                                     |
| Local closure proof             | Live prop/theme changes, augmented values, keyboard/focus, native RTL/font scaling, accessibility tree and representative release workloads.                                                                        | Scoped theme/prop, focus, nested/Portal and normal-size LTR/RTL reading scenes pass; enlarged-text matrices and optimized-build workloads remain open. |

## Ordered completion queue

The full pinned icon catalog and the finite RtlProvider/DefaultPropsProvider contracts are complete. The existing [Material and System theme-reading hooks](theme-reading.md) are also complete within their finite native context contracts. The [theme-prop hooks](theme-props.md) complete their separate finite context/default/type contracts; the already completed direct default-resolution helpers are not counted again. Prioritize the smallest remaining existing API whose full contract can be closed now, then small existing wrappers with executable closure gates. The table below records the larger dependency order; it does not require exhausting a large styling subsystem before closing an independent small API. ButtonGroup enlarged-text, shared styling-cache and optimized-build gates remain open; they are not discarded by completing an independent renderless provider or icon catalog.

| Order | Existing family                                                                                              | Concrete exit work                                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | ButtonGroup; shared shadow/focus/variant support                                                             | Close every active contract above, reconcile native/root/Portal behavior, then run strict packed consumers and both native scenarios.                                                                                   |
| 2     | Defaults/providers, spacing/breakpoints, typography; Box/Paper dependencies                                  | Audit all exported/inherited types and defaults, define native styling boundaries, finish missing utilities and text reset/font policy, then verify responsive/direction/text geometry.                                 |
| 3     | ButtonBase, Button, IconButton                                                                               | Finish inherited/native root contracts, action/focus refs, opt-in focus drawing, feedback/ripple policy, links and disabled/loading/keyboard combinations with direct family scenarios.                                 |
| 4     | SvgIcon and the complete pinned icon catalog                                                                 | Retain the completed catalog’s generation, artwork, license and import/type regressions. Finish SvgIcon renderer/type/child contracts, fill-transition policy and the remaining native rendering and performance gates. |
| 5     | Checkbox, Radio, RadioGroup, FormGroup, FormControlLabel, Switch and Chip                                    | Finish event/label/group/slot contracts, explicit form/native adaptations, Switch motion/drag policy and direct Chip state combinations; verify native interaction and geometry.                                        |
| 6     | Fade, Grow, Collapse and Accordion family                                                                    | Finish transition interoperability, interruptions/custom children and geometry; then sibling grouping, panel rounding/margins and expand-icon motion with the existing Paper dependency.                                |
| 7     | Inputs, form labels/helpers and TextField                                                                    | Complete inherited/slot/label/adornment contracts and native geometry; diagnose intermittent input omissions and retained activation/deletion failures rather than accepting retries as fixes.                          |
| 8     | Portal, Popper, Modal, Backdrop, Dialog, Popover, Menu, Lists/MenuList, Select/NativeSelect and Autocomplete | Finish physical ownership, focus/scroll/stack restoration, inherited/custom-slot contracts, direct list/picker/combobox matrices and local release benchmark tooling/repeatability.                                     |
| 9     | Remaining existing Material prototypes                                                                       | Complete the existing card/layout, dialog-content/action and feedback APIs with reference, consumer and native coverage.                                                                                                |
| 10    | Existing Community X prototypes                                                                              | Complete the eligible existing Tree View, picker, chart and grid contracts in that dependency order, including accessibility, data/identity and release workloads. No Pro/Premium source or paid-only parity.           |

## All existing partial rows

The entries below enumerate the 81 current partial status rows and the separately completed RtlProvider, two DefaultPropsProvider entries, five theme context APIs and icon-catalog scopes. Material and System DefaultPropsProvider are separate package entries; foundation rows are cross-cutting work rather than extra components. Each linked guide is evidence and a starting point for the finite contract audit, not proof that every inherited API is complete.

### Foundations

| Existing entry                | Current evidence stage | Guide                                              |
| ----------------------------- | ---------------------: | -------------------------------------------------- |
| Native rendering foundation   |                    75% | [Scope and remaining work](../docs/native-host.md) |
| Full native validation matrix |                    25% | [Scope and remaining work](../docs/validation.md)  |

### Material UI: 135 component/helper modules

| Existing entry          | Current evidence stage | Guide                                                                    |
| ----------------------- | ---------------------: | ------------------------------------------------------------------------ |
| Accordion               |                    75% | [Scope and remaining work](../docs/accordion.md)                         |
| AccordionActions        |                    75% | [Scope and remaining work](../docs/accordion.md)                         |
| AccordionDetails        |                    75% | [Scope and remaining work](../docs/accordion-details.md)                 |
| AccordionSummary        |                    75% | [Scope and remaining work](../docs/accordion.md)                         |
| Alert                   |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Autocomplete            |                    75% | [Scope and remaining work](../docs/autocomplete.md)                      |
| Backdrop                |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| Box                     |                    75% | [Scope and remaining work](../docs/box.md)                               |
| Button                  |                    50% | [Scope and remaining work](../docs/button.md)                            |
| ButtonBase              |                    50% | [Scope and remaining work](../docs/button-base.md)                       |
| ButtonGroup             |                    75% | [Scope and remaining work](../docs/button-group.md)                      |
| Card                    |                    75% | [Scope and remaining work](../docs/card.md)                              |
| CardActions             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| CardContent             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Checkbox                |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| Chip                    |                    50% | [Scope and remaining work](../docs/chip.md)                              |
| CircularProgress        |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Collapse                |                    75% | [Scope and remaining work](../docs/collapse.md)                          |
| DefaultPropsProvider    |                   100% | [Scope and remaining work](../docs/default-props-provider.md)            |
| Dialog                  |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| DialogActions           |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DialogContent           |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DialogTitle             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Divider                 |                    75% | [Scope and remaining work](../docs/divider.md)                           |
| Fade                    |                    50% | [Scope and remaining work](../docs/transitions.md)                       |
| FilledInput             |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| FormControl             |                    50% | [Scope and remaining work](../docs/form-labels.md)                       |
| FormControlLabel        |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| FormGroup               |                    75% | [Scope and remaining work](../docs/form-group.md)                        |
| FormHelperText          |                    50% | [Scope and remaining work](../docs/form-labels.md)                       |
| FormLabel               |                    50% | [Scope and remaining work](../docs/form-labels.md)                       |
| Grow                    |                    50% | [Scope and remaining work](../docs/grow.md)                              |
| IconButton              |                    50% | [Scope and remaining work](../docs/button.md)                            |
| Input                   |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| InputAdornment          |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| InputBase               |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| InputLabel              |                    50% | [Scope and remaining work](../docs/form-labels.md)                       |
| LinearProgress          |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| List                    |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItem                |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemAvatar          |                    75% | [Scope and remaining work](../docs/list-item-avatar.md)                  |
| ListItemButton          |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemIcon            |                    50% | [Scope and remaining work](../docs/list-item-icon.md)                    |
| ListItemSecondaryAction |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemText            |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListSubheader           |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| Menu                    |                    50% | [Scope and remaining work](../docs/menu.md)                              |
| MenuItem                |                    50% | [Scope and remaining work](../docs/menu-list.md)                         |
| MenuList                |                    50% | [Scope and remaining work](../docs/menu-list.md)                         |
| Modal                   |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| NativeSelect            |                    50% | [Scope and remaining work](../docs/native-select.md)                     |
| OutlinedInput           |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| Paper                   |                    75% | [Scope and remaining work](../docs/paper.md)                             |
| Popover                 |                    50% | [Scope and remaining work](../docs/popover.md)                           |
| Popper                  |                    75% | [Scope and remaining work](../docs/popper.md)                            |
| Portal                  |                    75% | [Scope and remaining work](../docs/portal.md)                            |
| Radio                   |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| RadioGroup              |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| Select                  |                    50% | [Scope and remaining work](../docs/select.md)                            |
| Snackbar                |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Stack                   |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| SvgIcon                 |                    75% | [Scope and remaining work](../docs/svg-icon.md)                          |
| Switch                  |                    50% | [Scope and remaining work](../docs/switch.md)                            |
| TextField               |                    50% | [Scope and remaining work](../docs/textfield-slots.md)                   |
| Typography              |                    50% | [Scope and remaining work](../docs/typography.md)                        |

### System and styling: 9 component/provider entries plus core helpers

| Existing entry            | Current evidence stage | Guide                                                         |
| ------------------------- | ---------------------: | ------------------------------------------------------------- |
| DefaultPropsProvider      |                   100% | [Scope and remaining work](../docs/default-props-provider.md) |
| RtlProvider               |                   100% | [Complete native context contract](../docs/rtl-provider.md)   |
| ThemeProvider             |                    50% | [Scope and remaining work](../docs/theme-providers.md)        |
| createTheme / palette     |                    50% | [Scope and remaining work](../docs/theming.md)                |
| Typography theming        |                    50% | [Scope and remaining work](../docs/typography.md)             |
| Spacing / breakpoints     |                    50% | [Scope and remaining work](../docs/layout-system.md)          |
| sx evaluation             |                    50% | [Scope and remaining work](../docs/compatibility.md)          |
| styled / defaults / slots |                    50% | [Scope and remaining work](../docs/default-props.md)          |

### Community Data Grid: 1 top-level public module

| Existing entry | Current evidence stage | Guide                                                |
| -------------- | ---------------------: | ---------------------------------------------------- |
| DataGrid       |                    25% | [Scope and remaining work](../docs/adaptive-grid.md) |

### Community Tree View: 8 top-level public modules

| Existing entry | Current evidence stage | Guide                                                                    |
| -------------- | ---------------------: | ------------------------------------------------------------------------ |
| RichTreeView   |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |

### Community Charts: 34 top-level public modules

| Existing entry | Current evidence stage | Guide                                                                    |
| -------------- | ---------------------: | ------------------------------------------------------------------------ |
| BarChart       |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| LineChart      |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |

### Community Date/Time Pickers: 41 top-level public modules

| Existing entry       | Current evidence stage | Guide                                                                    |
| -------------------- | ---------------------: | ------------------------------------------------------------------------ |
| AdapterDayjs         |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DateCalendar         |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DateField            |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DatePicker           |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| LocalizationProvider |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |

### Icons: all 10,750 pinned glyphs

The [complete catalog](material-icons.md) retains every supplied artwork/name and native import route, including all supplied Filled, Outlined, Rounded, Sharp and TwoTone modules. Artwork and import-surface work is complete. Native renderer gaps remain under the existing [SvgIcon row](svg-icon.md), rather than four prototype glyphs or thousands of duplicate status rows. Source completion does not certify every glyph on every device.

## Concrete gaps that must not be treated as hardware-only

- Shared styling still needs finite inherited/default/variant/augmentation and selector contracts. The current work specifically closes missing shadows, focus styling and embedded variants.
- Typography still has utility/font/reset and opaque native-content boundaries to audit. Browser inline formatting requires an explicit native adaptation policy.
- Accordion still needs sibling grouping/rounding, margin and expand-icon motion policies; these are software work.
- Portal/container policies, direct picker presentation/dismissal, List/MenuList geometry/navigation and Popper benchmark repeatability/iOS tooling can be exercised locally.
- Autocomplete's default ScrollView mounts all filtered options. Large-list/listbox contracts and unresolved input failures remain implementation or local verification work.
- Existing layout types omit contracts such as Stack responsive direction/useFlexGap and CardActions disableSpacing. Divider now has source-backed variants/text alignment, strict consumers and scoped normal/enlarged iOS/Android evidence; its wider native RTL, physical accessibility and performance gates remain explicit in the guide. Dialog content/action wrappers and feedback controls also need dedicated type/API coverage.
- Community X entries retain substantial software gaps: grid editing/sizing/virtualization/apiRef/keyboard/operators; tree APIs/loading/roles; chart axes/composition/scales/tooltips/interactions; picker sections/adapter/lifecycle/locales/timezones.

No percentage changes to 100% are made by this planning document. Completed contract items need source, consumer and runtime evidence; remaining external gates keep their own truthful status.
