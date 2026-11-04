# Native Modal, Backdrop and Dialog

Modal and Backdrop are reusable native library components through the original @mui/material imports. Modal uses a React Native window by default; disablePortal renders an inline native overlay in its existing parent. No WebView or browser DOM renderer is involved.

```tsx
import React from 'react';
import { View, TextInput, type ViewInstance, type TextInputInstance } from 'react-native';
import { ButtonBase, Modal } from '@mui/material';

export function EditModal() {
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<ViewInstance>(null);
  const field = React.useRef<TextInputInstance>(null);
  return (
    <>
      <ButtonBase ref={trigger} onClick={() => setOpen(true)}>
        Edit
      </ButtonBase>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        initialFocusRef={field}
        returnFocusRef={trigger}
      >
        <View style={{ margin: 24, padding: 20, backgroundColor: 'white' }}>
          <TextInput ref={field} accessibilityLabel="Name" />
        </View>
      </Modal>
    </>
  );
}
```

Use a single content element that forwards a native ref. A wrapper without focus/containment methods falls back safely to the native modal root. initialFocusRef and returnFocusRef are native extensions for explicit targets. Without a return ref, the opening modal captures the observed native interaction-host target or current TextInput fallback. Host-rendered button triggers can be restored automatically. Arbitrary unobserved custom controls still need explicit refs. Default Modal/Popover roots now use the explicit [interaction host](native-host.md) and require a native development build. Generic Modal/Dialog autofocus prefers that root over a stock child View whose focus method can be gated off; initialFocusRef still takes precedence.

## Dismissal and focus ownership

Modal is controlled: onClose requests closure and does not change open. Backdrop presses report backdropClick. Native back/menu requests, accessibility escape and accepted bubbling hardware Escape report escapeKeyDown. Native back/accessibility requests use a null event; touch/key callbacks use native events. The retained native disableEscapeKeyDown guard suppresses those requests while preserving backdrop dismissal. It is a native compatibility extension, rather than a claim about every upstream version.

Only the top layer dismisses. A native parent window routes a back request to an inline child that owns that window. Child-first React layout effects still register descendants above ancestors. Reopened inline siblings receive the corresponding default z order. Covered independent modal roots disable hit testing and native accessibility exposure; ancestor roots retain their descendants. This does not implement arbitrary application-wide sibling hiding for inline overlays.

External native handlers run before internal close behavior. Backdrop onPress takes precedence over its onClick alias; presses originating from a different target do not close. preventDefault alone does not cancel the pinned close behavior. Inactive and stale deliveries cannot close a hidden modal. For Android window-hosted descendant commands, a native sequence token pairs an eligible bubbling Escape-down with its release. Claimed releases are consumed before the native Dialog listener, so a child's stopped down/up, stale hold or canceled/composing release cannot bypass JavaScript propagation to close the parent. Independent native request-close remains available, and older hosts without sequence metadata retain that platform route. Those separate requests carry no child propagation, composition or cancellation metadata. Inline/iOS descendant Escape uses the declared [native host bridge](native-host.md#keys-from-native-descendants), retaining the actual child target and callback path. UIKit command metadata does not include physical key-up or repetition. Updating the host requires a native rebuild.

Autofocus waits for native presentation or inline layout. Native content refs are capability-checked. iOS ordinary focus restoration waits for onDismiss; inline/Android cleanup uses guarded deferred work, and unmount attempts cleanup restoration. Disconnected targets are skipped. Android resets child focus readiness when retention fully ends because its native Modal does not deliver onDismiss; interrupted exits retain presentation readiness. A new top focus owner cancels stale restoration, while removal of an unrelated background layer does not. Restoring behind another open modal falls back inside that layer.

Focus capture records native handles when available. Private-host and standard TextInput focus observations update ownership. On blur, guarded work can recover outside observed native targets or TextInput focus through public containment, with an explicit native root fallback. disableAutoFocus, disableRestoreFocus and disableEnforceFocus control those paths. Declared foreign-control Escape routing has source, event-path and native compile/link checks. Actual hardware delivery/IME behavior, complete hardware Tab cycling and a proven VoiceOver/TalkBack trap remain open. Physical window stacking, dismissal timing, screen-reader isolation and keyboard behavior still require device validation.

## Rendering and transitions

keepMounted preserves child state with disablePortal inline mode. Hidden inline roots stop hit testing and accessibility exposure. React Native's window Modal removes its subtree after dismissal, so window keepMounted cannot preserve it; requesting that combination emits the modal-keep-mounted diagnostic. Inline overlays fill their containing native layout and do not implement DOM container portals or automatic parent ScrollView locking.

A custom transition child with an in prop receives chained onEnter/onExited callbacks. closeAfterTransition retains stack ownership until the current exit completes. Transition metadata is published at commit before child layout callbacks; stale exits from an earlier close cannot finish a later close cycle. Modal callbacks run before the child's matching callback. Native [Fade](transitions.md) now supplies opacity transitions; [Grow](grow.md) supplies measured opacity/scale transitions. Slide and the complete CSS transition API remain open. Native window animationType can be supplied through nativeModalProps; Dialog defaults to none because content/backdrop use Fade.

Backdrop supports open, invisible, native presses/refs, component replacement, native styles and sx. Exited backdrops stop hit testing while retaining layout. MuiModal/MuiBackdrop defaults and implemented named overrides use their component contexts. Backdrop implements root/transition slots and transitionDuration through native Fade; full CSS animation parity remains unfinished.

## Dialog slots and migration

Dialog uses Modal and implements root, container, paper, backdrop and transition slots with object/callback slotProps. Refs reach native views. Its default keyboard container forwards the underlying native view and uses pointerEvents=box-none so outside-paper taps can reach the backdrop; an explicit container slot override wins. Root/container/paper overrides remain scoped to their corresponding views.

```tsx
import { Dialog, Typography } from '@mui/material';

<Dialog
  open={open}
  onClose={() => setOpen(false)}
  slotProps={{
    root: { testID: 'dialog-root' },
    paper: { testID: 'dialog-paper', sx: { borderRadius: 3 } },
  }}
>
  <Typography>Content</Typography>
</Dialog>;
```

Top-level native props, testID, sx and style now target the modal root, matching MUI routing. Earlier native prototypes sent them to Paper; move those surface customizations into slotProps.paper. When ordinary root props or inherited Modal controls conflict, top-level values replace root-slot values, including an explicit undefined; they are not merged. Dialog's own open/onClose values are applied before the root slot, so root-slot values can override those two. Forwarded refs still compose. Paper retains the existing mobile margins, responsive width caps, fullWidth and fullScreen handling. These native dimensions do not claim identical browser geometry. Dialog's complete transition/scroll/ARIA/CSS contracts remain unfinished.

Native window roots reset text inheritance; inline disablePortal roots retain the enclosing text scope. Participating Modal/Backdrop and Dialog containers normalize literal content through [native text scopes](text-containers.md).

## Evidence and limits

Run node scripts/reference/modals.mjs --check after the isolated [reference setup](theming.md). It checks immutable artifact/source/license identity before comparing 16 original Modal mounting/default/transition-wiring/backdrop-order cases and eight Dialog routing cases. Native tests add stack nesting, cleanup, retained state, focus timing, native-handle forwarding, transition races and scoped styles. A fresh installed consumer compiles original root/deep imports, native refs/slots and unsupported browser-container/ref rejection. These checks use mocked native hosts/events and establish no device geometry, smoothness or calibrated release-performance result.

DOM Portal/ModalManager exports, arbitrary containers, body scroll locking, classes/className/CSS, complete focus trapping, full Backdrop/Dialog transitions and device accessibility remain open. Unsupported browser props are not part of the native TypeScript contract; JavaScript migration diagnostics are not exhaustive. Historical app crashes and the alpha device/performance gates remain open. No paid source, npm publication or verified-support promotion is included.

[Native Popover](popover.md) composes this Modal with anchored positioning, an invisible backdrop and the default Grow transition. Its scope and native geometry gates are documented separately.
