# Divider native contract

This is unpublished development after `0.0.7-prealpha.0`. The existing Divider prototype now has a finite native implementation based on Material UI 9.5.0. It does not establish complete browser CSS, renderer, accessibility or performance compatibility.

Use the ordinary public component barrel:

```tsx
import Divider, {
  dividerClasses,
  getDividerUtilityClass,
  type DividerProps,
} from '@mui/material/Divider';

<Divider variant="middle" />;
<Divider orientation="vertical" flexItem />;
<Divider textAlign="left">Delivery notes</Divider>;
```

The Material root exports the same component, classes and helper. Direct native imports use `@altroo/mui-native/Divider`. The existing native named `Divider` alias and additive layout exports, including `Box`, `Typography` and `Stack`, remain available from the native component barrel. These additions are not original MUI canonical exports. The original package does not export `@mui/material/Divider/dividerClasses`; use the named exports from `@mui/material/Divider`.

`absolute`, `flexItem`, `orientation`, `textAlign` and `variant` keep their source defaults. Undefined values select configured defaults. Source `thin` borders map to one logical native point, with physical paint still requiring density checks. Horizontal roots use the bottom border; vertical roots use the right border and the source percentage-height/flex-item rules. `inset` contributes a physical 72-point left margin; `middle` uses theme spacing. An ordinary native View replaces the default DOM `hr` or `div`, and the `hr`/`div` aliases carry native View refs. Logical component defaults remain available to theme owner-state callbacks. Native hosts receive a separator role by default; an explicit role is preserved.

The twelve utility slots and the utility helper retain the pinned vocabulary and global-state lookup semantics. `DividerClasses` and `DividerPropsVariantOverrides` are augmentable. Augmenting classes extends accepted keys and types; it does not create new runtime slots. Generic native custom roots retain required props, discriminated unions, native attributes and their declared refs:

```tsx
import { createRef, forwardRef } from 'react';
import { View, type ViewInstance, type ViewProps } from 'react-native';
import Divider from '@mui/material/Divider';

const Root = forwardRef<
  ViewInstance,
  ViewProps & { tracking: string; className?: string | undefined }
>(({ tracking, className: _className, ...native }, ref) => (
  <View {...native} nativeID={tracking} ref={ref} />
));

<Divider
  component={Root}
  tracking="delivery"
  ref={createRef<ViewInstance>()}
  onLayout={(event) => event.nativeEvent.layout.width}
>
  Delivery notes
</Divider>;
```

A custom root must forward native View styles, children and its ref. A declared custom-root ref must be compatible with the native View host; DOM refs are rejected. TypeScript cannot inspect the rendered host of a ref-less or structurally native-compatible wrapper. It receives composed class identifiers; styling metadata such as `sx`, `classes` and the generated owner state stay inside the library. Native events remain caller-owned. Native refs point to the same actual root across supported custom-root style/orientation updates, and callback-ref cleanup follows React 19 semantics. Mapping DOM tags to View does not promise DOM node identity or HTML void-element behavior.

Root and wrapper styles use the existing prepared CSS cascade. Theme `styleOverrides`, variants, supported class selectors, external `styled` layers and `sx` resolve before genuine native `style`. Native arrays and registered styles retain native precedence, including shorthand resets. Callback props preserve the authored inline object and source owner-state defaults. The default-props type map uses the canonical public `DividerProps`. Declared DOM refs are rejected in JSX, props objects, component defaults and Material `createTheme` arguments, including later overrides. Native wrappers retain their required props in generic JSX calls; configuring a default root does not infer its required props at later call sites. Material and System still share the same runtime theme function and returned theme type. Explicit `components: undefined` clears earlier component defaults and overrides; native themes normalize that final value to an empty dictionary. This is a native representation choice: pinned MUI 9.5.0 production rendering keeps the raw unset value, while its development constructor rejects that input. The input-only Material options check Divider defaults without introducing a separate theme augmentation surface. Structurally compatible ref-less wrappers remain the author’s responsibility to render with native hosts.

```tsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiDivider: {
      defaultProps: { variant: 'middle' },
      styleOverrides: {
        root: ({ ownerState }) => ({ opacity: ownerState.absolute ? 0.7 : 1 }),
        wrapper: { paddingLeft: '12px' },
      },
    },
  },
});
```

Truthy children create the source wrapper and two owned native decorative line Views. Falsy scalar children, including zero, do not become labels. Empty arrays/fragments still follow the source truthy-wrapper selection. Literal labels keep one native text line; authored elements retain their native type, keys, refs, state and text policy. The wrapper uses theme spacing multiplied by 1.2. Left/right positions use the source before/after line proportions; native row direction determines their physical order. The root retains the source flex stretch default for its wrapper. Each decorative line centers itself independently of the root alignment. The decorative lines inherit the semantic root border style while retaining their own thin width and theme divider color. Root CSS `borderStyle: 'none'` suppresses those lines through the shared [native CSS border translation](../upstream/css-borders.json); the native solid/zero-width payload is not mistaken for authored solid paint. Native width-only layers retain CSS `none`. A final native `borderStyle` value or an explicit undefined/null reset restores the corresponding supported/default line paint. The decorative lines stay outside the accessibility tree. Font sizes and unitless line heights flow through the existing native text scope without JavaScript OS-scale multiplication.

The following remain explicit software limits:

- General authored `::before`/`::after` rules are diagnosed as unsupported. Owned default line Views do not introduce arbitrary pseudo-element CSS. Supported root/wrapper declarations and class selectors still apply.
- Adjacent-sibling rules, including MenuItem-to-Divider selectors, remain outside the shared selector grammar.
- Arbitrary inherited pseudo-element border policies remain outside the shared CSS grammar. The owned default lines support the root border style through the bounded shared solid/dotted/dashed/none translation; this does not implement general authored pseudo-elements or unsupported CSS border styles.
- General Emotion serialization and renderer-wide callback invocation counts remain separate boundaries. Shared override resolution now evaluates every enumerable slot before selecting native CSS. The retained root/wrapper trace and unused-slot throws match the original source; unused ordinary CSS and nested variant-array callback members are not prepared.
- The reviewed shared physical-inset correction is included in this integration source base. Mixed physical/logical native margins under locally RTL RN 0.88.1 still have a separately tracked Yoga width discrepancy; this candidate does not include the pending margin-policy correction. That software dependency and the native RTL matrix remain open.

Native direction comes from participating parent/native styles and actual host policy. A web DOM direction attribute, theme/RTL context and a web RTL stylesheet transform are separate source inputs; this component does not install a web transform or change native global RTL settings. Native `style` remains a native extension. The native separator role is the fallback; an authored `accessibilityRole` replaces it unless an explicit `role` takes precedence. Source owner-state role defaults remain available to style callbacks. Native separator-role output is implemented, but DOM `aria-orientation` is not certified as a native accessibility property.

The [pinned source record](../upstream/divider.json) retains source/declaration hashes, three MIT package references and the [actual original SSR observations](../tests/fixtures/mui-divider-9.5.0.json). Run `node scripts/reference/divider.mjs --check` to reproduce them. SSR establishes generated styles, public classes, callback data and forwarded-ref arguments; it does not attach DOM refs or measure painted geometry. [Runtime regressions](../tests/divider-contract.test.tsx) and the [native](../fixtures/divider-consumer/native.tsx)/[original](../fixtures/divider-consumer/original.tsx) strict consumers cover the implemented contract. `node scripts/reference/check-divider-consumer.mjs` checks emitted declarations through public imports with exact optional properties and System declaration isolation.

Actual native exits remain: horizontal/vertical/flex and percentage-parent geometry; thin-line paint at real densities; left/right/center labels under local and global RTL; absolute/inset/middle layouts; long authored and OS-scaled text; live theme/default/class changes with retained native roots and child state; native event delivery and measured viewport/rotation behavior. Physical assistive-technology checks and calibrated performance also remain open. No completion percentage is promoted by these source and compiler checks.
