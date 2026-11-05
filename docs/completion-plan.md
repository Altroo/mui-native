# Completion plan for existing modules

The current priority is to finish existing implementations before starting another component. This audit is based on the source, type fixtures and guides available on 5 November 2026, including the merged direction/text work at `dfe9130`.

There are **59 rows at 50% or 75%**: 51 Material entries, seven System/styling entries and the native rendering foundation. The renderless RtlProvider module is complete within its [finite native context contract](rtl-provider.md). There are also **28 rows at 25%**: 14 Material entries, nine Community X entries, four existing glyphs and the cross-cutting native validation matrix. Those prototypes remain in this plan. The percentages below are the existing evidence stages, not measured fractions of code written.

## Completion rules

For each family, make the agreed native contract finite: list every eligible prop, event, slot, import, public type/augmentation and styling/default interaction against the pinned upstream declarations. Record each as implemented, missing, adapted with a documented native equivalent, or outside the agreed native contract. An unresolved inherited type or generic is still work, even when the export name matches.

Keep three independent checklists: implementation gaps, locally executable verification, and external device/release verification. Missing software behavior must be implemented now. Native emulator tests, accessibility-tree assertions, RTL/large-font checks and release-build benchmarks are local work when the available tools support them. Physical keyboard, IME and screen-reader usability evidence stays explicitly unverified until exercised; it must not conceal an implementation gap or be silently marked complete.

Finish each selected family's implementation and local checks within its workstream before moving that workstream to another family. Independent modules may proceed in parallel with isolated source changes and independent review; a required dependency must have explicit exit conditions. Do not promote a row merely because it was rendered indirectly by a later component. Do not add a new zero-percent component to avoid completing an existing dependency.

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

The immediate parallel priorities are the full pinned icon catalog and small existing provider modules, completing each finite contract before its workstream advances. The queue below retains the larger dependency order. ButtonGroup enlarged-text, shared styling-cache and optimized-build gates remain open; they are not discarded by completing an independent renderless provider or icon catalog.

| Order | Existing family                                                                                              | Concrete exit work                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | ButtonGroup; shared shadow/focus/variant support                                                             | Close every active contract above, reconcile native/root/Portal behavior, then run strict packed consumers and both native scenarios.                                                                                                                        |
| 2     | Defaults/providers, spacing/breakpoints, typography; Box/Paper dependencies                                  | Audit all exported/inherited types and defaults, define native styling boundaries, finish missing utilities and text reset/font policy, then verify responsive/direction/text geometry.                                                                      |
| 3     | ButtonBase, Button, IconButton                                                                               | Finish inherited/native root contracts, action/focus refs, opt-in focus drawing, feedback/ripple policy, links and disabled/loading/keyboard combinations with direct family scenarios.                                                                      |
| 4     | SvgIcon and the complete pinned icon catalog                                                                 | Deliver every pinned icon name and artwork with reproducible generation, licenses, import/type coverage and bounded import costs. Complete renderer/type/child contracts and fill-transition/native rendering policy, then validate actual native rendering. |
| 5     | Checkbox, Radio, RadioGroup, FormGroup, FormControlLabel, Switch and Chip                                    | Finish event/label/group/slot contracts, explicit form/native adaptations, Switch motion/drag policy and direct Chip state combinations; verify native interaction and geometry.                                                                             |
| 6     | Fade, Grow, Collapse and Accordion family                                                                    | Finish transition interoperability, interruptions/custom children and geometry; then sibling grouping, panel rounding/margins and expand-icon motion with the existing Paper dependency.                                                                     |
| 7     | Inputs, form labels/helpers and TextField                                                                    | Complete inherited/slot/label/adornment contracts and native geometry; diagnose intermittent input omissions and retained activation/deletion failures rather than accepting retries as fixes.                                                               |
| 8     | Portal, Popper, Modal, Backdrop, Dialog, Popover, Menu, Lists/MenuList, Select/NativeSelect and Autocomplete | Finish physical ownership, focus/scroll/stack restoration, inherited/custom-slot contracts, direct list/picker/combobox matrices and local release benchmark tooling/repeatability.                                                                          |
| 9     | Remaining existing Material prototypes                                                                       | Complete the existing card/layout, dialog-content/action and feedback APIs with reference, consumer and native coverage.                                                                                                                                     |
| 10    | Existing Community X prototypes                                                                              | Complete the eligible existing Tree View, picker, chart and grid contracts in that dependency order, including accessibility, data/identity and release workloads. No Pro/Premium source or paid-only parity.                                                |

## All existing partial rows

The entries below enumerate the 87 current partial status rows and the separately completed RtlProvider entry. Material and System DefaultPropsProvider are separate package entries; foundation rows are cross-cutting work rather than extra components. Each linked guide is evidence and a starting point for the finite contract audit, not proof that every inherited API is complete.

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
| AccordionDetails        |                    75% | [Scope and remaining work](../docs/accordion.md)                         |
| AccordionSummary        |                    75% | [Scope and remaining work](../docs/accordion.md)                         |
| Alert                   |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Autocomplete            |                    75% | [Scope and remaining work](../docs/autocomplete.md)                      |
| Backdrop                |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| Box                     |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Button                  |                    50% | [Scope and remaining work](../docs/button.md)                            |
| ButtonBase              |                    50% | [Scope and remaining work](../docs/button-base.md)                       |
| ButtonGroup             |                    75% | [Scope and remaining work](../docs/button-group.md)                      |
| Card                    |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| CardActions             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| CardContent             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Checkbox                |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| Chip                    |                    50% | [Scope and remaining work](../docs/chip.md)                              |
| CircularProgress        |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Collapse                |                    75% | [Scope and remaining work](../docs/collapse.md)                          |
| DefaultPropsProvider    |                    50% | [Scope and remaining work](../docs/default-props.md)                     |
| Dialog                  |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| DialogActions           |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DialogContent           |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| DialogTitle             |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Divider                 |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
| Fade                    |                    50% | [Scope and remaining work](../docs/transitions.md)                       |
| FilledInput             |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| FormControl             |                    50% | [Scope and remaining work](../docs/form-labels.md)                       |
| FormControlLabel        |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
| FormGroup               |                    50% | [Scope and remaining work](../docs/check-controls.md)                    |
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
| ListItemAvatar          |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemButton          |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemIcon            |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemSecondaryAction |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListItemText            |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| ListSubheader           |                    50% | [Scope and remaining work](../docs/lists.md)                             |
| Menu                    |                    50% | [Scope and remaining work](../docs/menu.md)                              |
| MenuItem                |                    50% | [Scope and remaining work](../docs/menu-list.md)                         |
| MenuList                |                    50% | [Scope and remaining work](../docs/menu-list.md)                         |
| Modal                   |                    50% | [Scope and remaining work](../docs/modals.md)                            |
| NativeSelect            |                    50% | [Scope and remaining work](../docs/native-select.md)                     |
| OutlinedInput           |                    50% | [Scope and remaining work](../docs/inputs.md)                            |
| Paper                   |                    25% | [Scope and remaining work](../docs/compatibility.md#currently-exercised) |
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

### System and styling: 9 top-level modules plus core styling work

| Existing entry            | Current evidence stage | Guide                                                       |
| ------------------------- | ---------------------: | ----------------------------------------------------------- |
| DefaultPropsProvider      |                    50% | [Scope and remaining work](../docs/theme-providers.md)      |
| RtlProvider               |                   100% | [Complete native context contract](../docs/rtl-provider.md) |
| ThemeProvider             |                    50% | [Scope and remaining work](../docs/theme-providers.md)      |
| createTheme / palette     |                    50% | [Scope and remaining work](../docs/theming.md)              |
| Typography theming        |                    50% | [Scope and remaining work](../docs/typography.md)           |
| Spacing / breakpoints     |                    50% | [Scope and remaining work](../docs/layout-system.md)        |
| sx evaluation             |                    50% | [Scope and remaining work](../docs/compatibility.md)        |
| styled / defaults / slots |                    50% | [Scope and remaining work](../docs/default-props.md)        |

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

### Icons: 4 native glyphs; 10,750 tracked upstream names

| Existing entry | Current evidence stage | Guide                                                             |
| -------------- | ---------------------: | ----------------------------------------------------------------- |
| Add            |                    25% | [Scope and remaining work](../packages/icons/src/Add/index.ts)    |
| Check          |                    25% | [Scope and remaining work](../packages/icons/src/Check/index.ts)  |
| Close          |                    25% | [Scope and remaining work](../packages/icons/src/Close/index.ts)  |
| Remove         |                    25% | [Scope and remaining work](../packages/icons/src/Remove/index.ts) |

## Concrete gaps that must not be treated as hardware-only

- Shared styling still needs finite inherited/default/variant/augmentation and selector contracts. The current work specifically closes missing shadows, focus styling and embedded variants.
- Typography still has utility/font/reset and opaque native-content boundaries to audit. Browser inline formatting requires an explicit native adaptation policy.
- Accordion still needs sibling grouping/rounding, margin and expand-icon motion policies; these are software work.
- Portal/container policies, direct picker presentation/dismissal, List/MenuList geometry/navigation and Popper benchmark repeatability/iOS tooling can be exercised locally.
- Autocomplete's default ScrollView mounts all filtered options. Large-list/listbox contracts and unresolved input failures remain implementation or local verification work.
- Existing layout types omit contracts such as Stack responsive direction/useFlexGap, Card raised, CardActions disableSpacing and Divider variants/text alignment. Dialog content/action wrappers and feedback controls also need dedicated type/API coverage.
- Community X entries retain substantial software gaps: grid editing/sizing/virtualization/apiRef/keyboard/operators; tree APIs/loading/roles; chart axes/composition/scales/tooltips/interactions; picker sections/adapter/lifecycle/locales/timezones.

No percentage changes to 100% are made by this planning document. Completed contract items need source, consumer and runtime evidence; remaining external gates keep their own truthful status.
