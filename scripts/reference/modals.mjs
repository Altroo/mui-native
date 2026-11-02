import { readFile, writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { loadReference } from './load.mjs';
const loaded = await loadReference('@mui/material', [
  'Modal/Modal.js',
  'Modal/Modal.d.ts',
  'Modal/useModal.js',
  'Modal/ModalManager.js',
  'Modal/ModalManager.d.ts',
  'Backdrop/Backdrop.js',
  'Backdrop/Backdrop.d.ts',
  'Dialog/Dialog.js',
  'Dialog/Dialog.d.ts',
  'Unstable_TrapFocus/FocusTrap.js',
  'Unstable_TrapFocus/FocusTrap.types.d.ts',
]);
const { require, directory, reference } = loaded;
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Modal = require(`${directory}/node_modules/@mui/material/Modal/Modal.js`).default;
const { createTheme, ThemeProvider } = require(
  `${directory}/node_modules/@mui/material/styles/index.js`,
);
const fixtures = [];
const cases = [
  { open: false },
  { open: false, keepMounted: true },
  { open: true },
  { open: true, hideBackdrop: true },
  { open: true, disableAutoFocus: true, disableEnforceFocus: true, disableRestoreFocus: true },
  { open: true, closeAfterTransition: true },
  { open: false, keepMounted: true, hideBackdrop: true },
  { open: true, hideBackdrop: false },
];
for (const [index, props] of cases.entries())
  for (const transition of [false, true]) {
    let root, backdrop, child;
    const trace = [];
    function Root(p) {
      root = p;
      return React.createElement('div', null, p.children);
    }
    function Backdrop(p) {
      backdrop = p;
      return React.createElement('div');
    }
    const Child = React.forwardRef((p, _ref) => {
      child = p;
      return React.createElement('div');
    });
    const defaults = index === 7 ? { hideBackdrop: true, keepMounted: true } : {};
    renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme: createTheme({ components: { MuiModal: { defaultProps: defaults } } }) },
        React.createElement(
          Modal,
          {
            ...props,
            disablePortal: true,
            slots: { root: Root, backdrop: Backdrop },
            slotProps: { backdrop: { onClick: () => trace.push('slot') } },
            onClose: (_event, reason) => trace.push(reason),
          },
          React.createElement(Child, transition ? { in: props.open } : {}),
        ),
      ),
    );
    if (backdrop && props.open) {
      backdrop.onClick({ target: 1, currentTarget: 2, defaultPrevented: false });
      backdrop.onClick({ target: 2, currentTarget: 2, defaultPrevented: true });
    }
    const keys = [
      'open',
      'exited',
      'closeAfterTransition',
      'disableAutoFocus',
      'disableEnforceFocus',
      'disablePortal',
      'disableRestoreFocus',
      'hideBackdrop',
      'keepMounted',
    ];
    fixtures.push({
      props,
      transition,
      defaults,
      output: {
        root: Boolean(root),
        backdrop: Boolean(backdrop),
        ownerState: root
          ? Object.fromEntries(keys.map((key) => [key, root.ownerState[key]]))
          : null,
        tabIndex: child?.tabIndex ?? null,
        transitionHooks: child ? Boolean(child.onEnter && child.onExited) : false,
        trace,
      },
    });
  }
const Dialog = require(`${directory}/node_modules/@mui/material/Dialog/Dialog.js`).default;
let dialogRoot, dialogPaper;
const CaptureRoot = React.forwardRef((props, _ref) => {
  dialogRoot = props;
  return props.children;
});
const CapturePaper = React.forwardRef((props, _ref) => {
  dialogPaper = props;
  return React.createElement('div');
});
const Transition = React.forwardRef((props, _ref) => props.children);
const routingCases = [
  {
    name: 'top-level routing',
    props: {
      open: true,
      id: 'dialog-root',
      style: { opacity: 0.7 },
      sx: { zIndex: 17 },
      slotProps: {
        paper: { id: 'dialog-paper', style: { margin: 4 }, sx: { borderRadius: '5px' } },
      },
    },
  },
  {
    name: 'top-level values replace conflicting root slots',
    props: {
      open: true,
      id: 'dialog-root',
      style: { opacity: 0.7 },
      sx: { zIndex: 17 },
      slotProps: {
        root: { id: 'slot-root', style: { opacity: 0.2, padding: 9 }, sx: { borderRadius: 11 } },
        paper: { id: 'dialog-paper', style: { margin: 4 } },
      },
    },
  },
  {
    name: 'root slot values without top-level values',
    props: {
      open: true,
      slotProps: {
        root: { id: 'slot-root', style: { opacity: 0.2, padding: 9 }, sx: { borderRadius: 11 } },
        paper: { id: 'dialog-paper', style: { margin: 4 } },
      },
    },
  },
  {
    name: 'explicit undefined top-level values replace root slots',
    explicitUndefined: true,
    props: {
      open: true,
      slotProps: {
        root: { id: 'slot-root', style: { opacity: 0.2, padding: 9 }, sx: { borderRadius: 11 } },
        paper: { id: 'dialog-paper', style: { margin: 4 } },
      },
    },
  },
];
const controlKeys = [
  'disableAutoFocus',
  'disableEnforceFocus',
  'disableRestoreFocus',
  'disablePortal',
  'hideBackdrop',
  'keepMounted',
];
const allControls = (value) => Object.fromEntries(controlKeys.map((key) => [key, value]));
routingCases.push(
  {
    name: 'top-level inherited controls replace root slots',
    props: {
      open: true,
      ...allControls(false),
      slotProps: { root: allControls(true), paper: { id: 'dialog-paper', style: { margin: 4 } } },
    },
  },
  {
    name: 'inherited root controls remain when top-level controls absent',
    props: {
      open: true,
      slotProps: { root: allControls(true), paper: { id: 'dialog-paper', style: { margin: 4 } } },
    },
  },
  {
    name: 'explicit undefined inherited controls replace root slots',
    explicitUndefinedControls: true,
    props: {
      open: true,
      slotProps: { root: allControls(true), paper: { id: 'dialog-paper', style: { margin: 4 } } },
    },
  },
  {
    name: 'own open control keeps its distinct root-slot precedence',
    props: {
      open: true,
      slotProps: { root: { open: false }, paper: { id: 'dialog-paper', style: { margin: 4 } } },
    },
  },
);
const dialogRouting = routingCases.map((input) => {
  let props = input.explicitUndefined
    ? { ...input.props, id: undefined, style: undefined, sx: undefined }
    : input.props;
  if (input.explicitUndefinedControls) props = { ...props, ...allControls(undefined) };
  renderToStaticMarkup(
    React.createElement(
      Dialog,
      { ...props, slots: { root: CaptureRoot, paper: CapturePaper, transition: Transition } },
      'Content',
    ),
  );
  return {
    ...input,
    output: {
      rootOpen: dialogRoot.open,
      controls: Object.fromEntries(controlKeys.map((key) => [key, dialogRoot[key] ?? null])),
      rootId: dialogRoot.id ?? null,
      paperId: dialogPaper.id ?? null,
      rootOpacity: dialogRoot.style?.opacity ?? null,
      rootPadding: dialogRoot.style?.padding ?? null,
      paperOpacity: dialogPaper.style?.opacity ?? null,
      paperMargin: dialogPaper.style?.margin ?? null,
      rootSx: dialogRoot.sx ?? null,
      paperSx: dialogPaper.sx ?? null,
    },
  };
});
const filename = 'tests/fixtures/mui-modals-9.5.0.json';
const output = await format(JSON.stringify({ reference, fixtures, dialogRouting }), {
  ...(await resolveConfig(filename)),
  filepath: filename,
});
if (process.argv.includes('--check')) {
  if ((await readFile(filename, 'utf8')) !== output) throw new Error('Modal reference drift');
} else await writeFile(filename, output);
console.log(
  `${fixtures.length} pinned modal defaults, inline mounting, transition wiring and backdrop-order cases plus ${dialogRouting.length} Dialog prop-routing cases passed.`,
);
