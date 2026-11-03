import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Chip/Chip.js',
  'Chip/Chip.d.ts',
  'Chip/chipClasses.js',
  'Chip/chipClasses.d.ts',
  'ButtonBase/ButtonBase.js',
  'ButtonBase/useButtonBase.js',
  'utils/useSlot.js',
  'utils/mergeSlotProps.js',
]);
execFileSync(process.execPath, ['scripts/reference/check-controls.mjs', '--check'], {
  stdio: 'pipe',
});
const parent = JSON.parse(
  await readFile('tests/fixtures/mui-check-controls-browser-9.5.0.json', 'utf8'),
);
const cases = [
  { name: 'static default' },
  { name: 'static small', props: { size: 'small' } },
  { name: 'static outlined', props: { variant: 'outlined' } },
  {
    name: 'static small outlined primary',
    props: { size: 'small', variant: 'outlined', color: 'primary' },
  },
  { name: 'static primary', props: { color: 'primary' } },
  { name: 'static secondary dark', props: { color: 'secondary' }, dark: true },
  { name: 'click inferred', click: true },
  { name: 'click explicit true', props: { clickable: true }, click: true },
  { name: 'clickable without callback', props: { clickable: true } },
  { name: 'explicit false keeps pointer click', props: { clickable: false }, click: true },
  { name: 'delete only', deletable: true },
  { name: 'click and delete', click: true, deletable: true },
  { name: 'small delete', props: { size: 'small' }, deletable: true },
  { name: 'disabled clickable', props: { disabled: true }, click: true, deletable: true },
  { name: 'disabled delete only', props: { disabled: true }, deletable: true },
  {
    name: 'disabled skip focus',
    props: { disabled: true, skipFocusWhenDisabled: true },
    deletable: true,
  },
  { name: 'root sx replacement', props: { sx: { mt: 1 } }, root: { sx: { mt: 3 } } },
  { name: 'root sx clears disjoint', props: { sx: { mt: 1 } }, root: { sx: { mr: 2 } } },
  {
    name: 'root style last',
    props: { style: { marginTop: 17 } },
    root: { style: { marginTop: 19 } },
  },
  { name: 'root and label owner callbacks', click: true, deletable: true, callbacks: true },
  { name: 'theme defaults', defaults: { size: 'small', color: 'secondary', variant: 'outlined' } },
  { name: 'avatar takes precedence', avatar: true, icon: true },
  { name: 'icon content', icon: true },
  { name: 'custom delete handler replaced', click: true, deletable: true, customDelete: true },
  {
    name: 'named overrides',
    overrides: {
      root: { marginTop: 2 },
      sizeMedium: { marginTop: 3 },
      colorDefault: { marginTop: 4 },
      clickable: { marginTop: 5 },
      deletable: { marginTop: 6 },
      filled: { marginTop: 7 },
    },
    click: true,
    deletable: true,
  },
  {
    name: 'label override and sx',
    overrides: { label: { paddingLeft: 21, color: 'rgb(211,47,47)' } },
    label: { sx: { pl: 3 } },
  },
  {
    name: 'controlled root sx state',
    props: { disabled: true, sx: { opacity: 0.9 } },
    click: true,
  },
  { name: 'label relative font', label: { sx: { fontSize: '2em' } } },
  { name: 'root native font', props: { style: { fontSize: 26 } } },
  { name: 'label native font', label: { style: { fontSize: 26 } } },
];
const keyboardCases = [
  { name: 'clickable keys', click: true, keys: ['Enter', 'Space', 'Delete'] },
  { name: 'delete keys', deletable: true, keys: ['Backspace', 'Delete', 'Escape', 'Enter'] },
  {
    name: 'root callback key order',
    click: true,
    deletable: true,
    callbacks: true,
    keys: ['Backspace', 'Delete'],
  },
  { name: 'disabled delete keys', props: { disabled: true }, deletable: true, keys: ['Backspace'] },
  {
    name: 'disabled clickable keys',
    props: { disabled: true },
    click: true,
    deletable: true,
    keys: ['Backspace'],
  },
];
const keyboardFixture = JSON.parse(
  await readFile('tests/fixtures/mui-chip-keyboard-9.5.0.json', 'utf8'),
);
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  viewport: { width: 390, height: 844 },
  scope:
    'Original MUI Chip in Chromium: source defaults/slots/static computed styles and programmatic callback phases. Interactive native targets deliberately use 44dp; no physical native evidence.',
};
const helpers = material.require(
  `${material.directory}/node_modules/@mui/material/Chip/chipClasses.js`,
);
const utility = {
  classes: helpers.default,
  states: Object.fromEntries(
    ['active', 'disabled', 'focusVisible', 'selected', 'anything'].map((k) => [
      k,
      helpers.getChipUtilityClass(k),
    ]),
  ),
};
let fixture;
try {
  fixture = JSON.parse(await readFile('tests/fixtures/mui-chip-browser-9.5.0.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(fixture);
  assert.deepEqual(
    keyboardFixture.fixtures.map((x) => x.input),
    keyboardCases,
  );
  assert.deepEqual(keyboardFixture.material, material.reference);
  assert.deepEqual(keyboardFixture.renderer, parent.renderer);
  assert.deepEqual(
    fixture.fixtures.map((x) => x.input),
    cases,
  );
  assert.deepEqual(fixture.material, provenance.material);
  assert.deepEqual(fixture.renderer, provenance.renderer);
  assert.deepEqual(fixture.helpers, utility);
}
const path = material.directory,
  directory = resolve('.cache/chip-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(path + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(path + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(path + '/node_modules/react-dom/index.js')};
import {Chip,ThemeProvider,createTheme} from ${JSON.stringify(path + '/node_modules/@mui/material/index.js')};
const input=${JSON.stringify({ cases, provenance, helpers: utility })},expected=${JSON.stringify(fixture ?? null)},keyboardExpected=${JSON.stringify(keyboardFixture)};let live;
const owner=(value)=>Object.fromEntries(['disabled','clickable','onDelete','size','color','variant','iconColor'].map(k=>[k,value[k]??null]));
window.mountChipReference=(test)=>{window.clearChipReference();const container=document.createElement('div');document.body.append(container);const root=createRoot(container),trace=[],owners={};const theme=createTheme({palette:{mode:test.dark?'dark':'light'},components:{MuiChip:{defaultProps:test.defaults,styleOverrides:test.overrides}}});
const props={id:'chip',label:'Choice',...test.props,onClick:test.click?()=>trace.push('click'):undefined,onDelete:test.deletable?()=>trace.push('delete'):undefined,onKeyDown:event=>trace.push('down:'+event.key+':'+event.defaultPrevented),onKeyUp:event=>trace.push('up:'+event.key+':'+event.defaultPrevented),avatar:test.avatar?React.createElement('span',{'data-kind':'avatar'},'A'):undefined,icon:test.icon?React.createElement('span',{'data-kind':'icon'},'I'):undefined,deleteIcon:test.customDelete?React.createElement('span',{'data-kind':'delete',onClick:()=>trace.push('old-delete')},'X'):undefined,slotProps:{root:test.callbacks?(value)=>{owners.root=owner(value);return {onClick:()=>trace.push('root-click'),onKeyDown:event=>trace.push('root-down:'+event.key+':'+event.defaultPrevented),onKeyUp:event=>trace.push('root-up:'+event.key+':'+event.defaultPrevented)};}:test.root,label:test.callbacks?(value)=>{owners.label=owner(value);return {};}:test.label}};
flushSync(()=>root.render(React.createElement(ThemeProvider,{theme},React.createElement(Chip,props))));live={container,root,trace,owners};return window.readChipReference();};
window.readChipReference=()=>{const element=live.container.querySelector('#chip'),label=element.querySelector('.MuiChip-label'),style=getComputedStyle(element),labelStyle=getComputedStyle(label);return {root:{role:element.getAttribute('role'),tabIndex:element.tabIndex,ariaDisabled:element.getAttribute('aria-disabled'),classes:element.className.split(' ').filter(x=>x.startsWith('Mui')),style:Object.fromEntries(['height','marginTop','marginRight','backgroundColor','color','opacity','borderTopWidth'].map(k=>[k,style[k]]))},label:{paddingLeft:labelStyle.paddingLeft,paddingRight:labelStyle.paddingRight,color:labelStyle.color,fontSize:labelStyle.fontSize,lineHeight:labelStyle.lineHeight},decoration:element.querySelector('[data-kind="avatar"]')?'avatar':element.querySelector('[data-kind="icon"]')?'icon':null,owners:live.owners,trace:[...live.trace]};};
window.clearChipReference=()=>{if(live){flushSync(()=>live.root.unmount());live.container.remove();live=null;}};
window.runReference=()=>{if(innerWidth!==390||innerHeight!==844)throw new Error('Viewport mismatch');const fixtures=[];for(const test of input.cases){window.mountChipReference(test);const states=[window.readChipReference()];flushSync(()=>live.container.querySelector('#chip').click());states.push(window.readChipReference());if(test.deletable){flushSync(()=>live.container.querySelector('.MuiChip-deleteIcon').dispatchEvent(new MouseEvent('click',{bubbles:true})));states.push(window.readChipReference());}fixtures.push({input:test,states});window.clearChipReference();}return {...input.provenance,helpers:input.helpers,fixtures};};
window.verifyReference=()=>{const value=window.runReference();if(JSON.stringify(value)!==JSON.stringify(expected))throw new Error('Chip source contracts changed');return {passed:value.fixtures.length};};
window.chipKeyboardCases=${JSON.stringify(keyboardCases)};
window.verifyChipKeyboardReference=(observed)=>{if(JSON.stringify(observed)!==JSON.stringify(keyboardExpected.fixtures))throw new Error('Chip trusted keyboard contracts changed');return {passed:observed.length};};

const button=document.createElement('button');button.textContent='Verify original Chip';button.onclick=()=>button.textContent=JSON.stringify(window.verifyReference());document.body.append(button);
`;
await build({
  stdin: { contents: source, loader: 'js', resolveDir: process.cwd() },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: directory + '/bundle.js',
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  directory + '/index.html',
  '<!doctype html><meta charset="utf-8"><title>Original Chip reference</title><style>*,*::before,*::after{transition:none!important;animation:none!important}</style><script defer src="bundle.js"></script>',
);
console.log(`Verified source; Chip reference built at ${directory} (${cases.length} cases).`);
