import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Checkbox/Checkbox.js',
  'Radio/Radio.js',
  'internal/SwitchBase.js',
  'utils/useSlot.js',
  'utils/mergeSlotProps.js',
]);
const system = await loadReference('@mui/system', ['styleFunctionSx/styleFunctionSx.d.ts']);
execFileSync(process.execPath, ['scripts/reference/check-controls.mjs', '--check'], {
  stdio: 'pipe',
});
const parent = JSON.parse(
  await readFile('tests/fixtures/mui-check-controls-browser-9.5.0.json', 'utf8'),
);
const cases = ['Checkbox', 'Radio'].flatMap((kind) => [
  { name: kind + ' top sx', kind, props: { sx: { mt: 1 } } },
  { name: kind + ' slot sx replaces top', kind, props: { sx: { mt: 1 } }, root: { sx: { mt: 3 } } },
  {
    name: kind + ' slot sx replaces disjoint top',
    kind,
    props: { sx: { mt: 1 } },
    root: { sx: { mr: 2 } },
  },
  { name: kind + ' null slot sx clears top', kind, props: { sx: { mt: 1 } }, root: { sx: null } },
  {
    name: kind + ' undefined slot sx clears top',
    kind,
    props: { sx: { mt: 1 } },
    rootUndefined: true,
  },
  {
    name: kind + ' owner callback sx',
    kind,
    rootCallback: true,
    actions: [{ props: { color: 'secondary' } }],
  },
  { name: kind + ' theme callback sx', kind, rootThemeFunction: true },
  { name: kind + ' array sx', kind, root: { sx: [{ mt: 1 }, { mt: 2 }] } },
  {
    name: kind + ' native style beats slot sx',
    kind,
    props: { style: { marginTop: 17 } },
    root: { sx: { mt: 3 } },
  },
  {
    name: kind + ' root style beats outer style',
    kind,
    props: { style: { marginTop: 17 } },
    root: { style: { marginTop: 19 } },
  },
  {
    name: kind + ' checked base sx loses to state rule',
    kind,
    props: { checked: true, sx: { color: 'error.main' } },
  },
  {
    name: kind + ' checked slot state sx wins',
    kind,
    props: { checked: true },
    root: { sx: { '&.Mui-checked': { color: 'error.main' } } },
  },
  {
    name: kind + ' disabled checked state wins base sx',
    kind,
    props: { checked: true, disabled: true, sx: { color: 'error.main' } },
  },
  {
    name: kind + ' default disabled',
    kind,
    props: { checked: true, disabled: true, color: 'default' },
  },
  {
    name: kind + ' inline color beats checked rule',
    kind,
    props: { checked: true, style: { color: 'rgb(123,45,67)' } },
  },
  {
    name: kind + ' theme base color loses to checked rule',
    kind,
    props: { checked: true },
    overrides: { root: { color: 'rgb(211,47,47)' } },
  },
  {
    name: kind + ' theme checked color wins',
    kind,
    props: { checked: true },
    overrides: { root: { '&.Mui-checked': { color: 'rgb(211,47,47)' } } },
  },
  {
    name: kind + ' slot sx controls unchecked and changed state',
    kind,
    root: { sx: { color: 'error.main', mt: 2 } },
    actions: [{ click: true }],
  },
  { name: kind + ' responsive slot sx', kind, root: { sx: { mt: { xs: 1, sm: 3 } } } },
  {
    name: kind + ' theme defaults slot sx',
    kind,
    defaults: { sx: { mt: 1 }, slotProps: { root: { sx: { mt: 2 } } } },
  },
]);
cases.push(
  {
    name: 'Checkbox indeterminate state beats base sx',
    kind: 'Checkbox',
    props: { indeterminate: true, sx: { color: 'error.main' } },
  },
  {
    name: 'Checkbox named override order',
    kind: 'Checkbox',
    props: { indeterminate: true },
    overrides: {
      indeterminate: { marginTop: 11 },
      sizeMedium: { marginTop: 13 },
      colorPrimary: { marginTop: 17 },
    },
  },
  {
    name: 'Radio default color override',
    kind: 'Radio',
    props: { color: 'default' },
    overrides: { colorDefault: { marginTop: 23 } },
  },
);
cases.push(
  ...['Checkbox', 'Radio'].flatMap((kind) => [
    {
      name: kind + ' root disabled uses wrapper variant ownership',
      kind,
      props: { checked: true },
      root: { disabled: true },
    },
    {
      name: kind + ' input disabled does not add a root state class',
      kind,
      props: { checked: true },
      input: { disabled: true },
    },
  ]),
);
const provenance = {
  material: material.reference,
  system: system.reference,
  renderer: parent.renderer,
  viewport: { width: 390, height: 844 },
  scope:
    'Actual original MUI in Chromium: Checkbox/Radio root-slot sx, native inline style and state CSS precedence; transitions disabled, no physical native evidence.',
};
let fixture;
try {
  fixture = JSON.parse(
    await readFile('tests/fixtures/mui-checked-styles-browser-9.5.0.json', 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(fixture);
  assert.deepEqual(
    fixture.fixtures.map((test) => test.input),
    cases,
  );
  assert.deepEqual(fixture.material, material.reference);
  assert.deepEqual(fixture.system, system.reference);
  assert.deepEqual(fixture.renderer, provenance.renderer);
  assert.deepEqual(fixture.viewport, provenance.viewport);
}
const path = material.directory,
  directory = resolve('.cache/checked-styles-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(path + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(path + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(path + '/node_modules/react-dom/index.js')};
import {Checkbox,Radio,ThemeProvider,createTheme} from ${JSON.stringify(path + '/node_modules/@mui/material/index.js')};
const input=${JSON.stringify({ cases, provenance })},expected=${JSON.stringify(fixture ?? null)};
window.runReference=()=>{if(innerWidth!==input.provenance.viewport.width||innerHeight!==input.provenance.viewport.height)throw new Error('Reference viewport mismatch');const fixtures=[];for(const test of input.cases){const container=document.createElement('div');document.body.append(container);const root=createRoot(container);let props={...test.props};const theme=createTheme({components:{['Mui'+test.kind]:{defaultProps:test.defaults,styleOverrides:test.overrides}}});
const rootProps=()=>test.rootCallback?owner=>({sx:{mt:owner.color==='primary'?2:3}}):test.rootThemeFunction?{sx:theme=>({mt:theme.spacing(2)})}:test.rootUndefined?{sx:undefined}:test.root;
const paint=()=>flushSync(()=>root.render(React.createElement(ThemeProvider,{theme},React.createElement(test.kind==='Radio'?Radio:Checkbox,{id:'a',...props,slotProps:{root:rootProps(),input:test.input}}))));paint();const snapshot=()=>{const element=container.querySelector('input').parentElement,style=getComputedStyle(element);return {checked:element.classList.contains('Mui-checked'),styles:Object.fromEntries(['marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','color'].map(key=>[key,style[key]]))};};const states=[snapshot()];for(const action of test.actions??[]){if(action.props){props={...props,...action.props};paint();}if(action.click)flushSync(()=>container.querySelector('input').click());states.push(snapshot());}fixtures.push({input:test,states});flushSync(()=>root.unmount());container.remove();}return {...input.provenance,fixtures};};
window.verifyReference=()=>{const value=window.runReference();if(JSON.stringify(value)!==JSON.stringify(expected))throw new Error('Original root style contracts differ');return {passed:value.fixtures.length};};
const button=document.createElement('button');button.textContent='Verify original checked-control styles';const status=document.createElement('pre');button.onclick=()=>status.textContent=JSON.stringify(window.verifyReference(),null,2);document.body.append(button,status);
`;
await build({
  stdin: { contents: source, loader: 'js', resolveDir: process.cwd() },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: `${directory}/bundle.js`,
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  `${directory}/index.html`,
  '<!doctype html><meta charset="utf-8"><title>Original checked-control styles</title><style>*,*::before,*::after{transition:none!important;animation:none!important}</style><script defer src="bundle.js"></script>',
);
console.log(
  `Verified original inputs; browser reference built at ${directory} (${cases.length} cases).`,
);
