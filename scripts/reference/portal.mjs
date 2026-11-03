import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Portal/Portal.js',
  'Portal/Portal.d.ts',
  'Portal/Portal.types.d.ts',
]);
execFileSync(process.execPath, ['scripts/reference/chip.mjs', '--check'], { stdio: 'pipe' });
const parent = JSON.parse(await readFile('tests/fixtures/mui-chip-browser-9.5.0.json', 'utf8'));
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  scope:
    'Original MUI Portal in Chromium: default/custom containers, layout-effect resolution, React context/event ancestry, state/ref cleanup and retargeting. This is DOM reference behavior, not native device evidence.',
};
let expected;
try {
  expected = JSON.parse(await readFile('tests/fixtures/mui-portal-browser-9.5.0.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, provenance.material);
  assert.deepEqual(expected.renderer, provenance.renderer);
}
const base = material.directory,
  directory = resolve('.cache/portal-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(base + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(base + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(base + '/node_modules/react-dom/index.js')};
import Portal from ${JSON.stringify(base + '/node_modules/@mui/material/Portal/index.js')};
const provenance=${JSON.stringify(provenance)},expected=${JSON.stringify(expected ?? null)};
window.runReference=()=>{
 const mount=document.createElement('div'),a=document.createElement('div'),b=document.createElement('div');
 a.dataset.target='a';b.dataset.target='b';document.body.append(mount,a,b);
 const root=createRoot(mount),context=React.createContext(null),identity={account:1};let count=0,seen,handle,own,calls=0;const trace=[],states=[];
 function Child({ref}){const[id]=React.useState(()=>++count);seen=React.useContext(context);return React.createElement('button',{ref:node=>{own=node;if(ref)ref(node);},'data-child':'yes',onClick:()=>trace.push('child')},String(id));}
 const forwarded=node=>{handle=node;};
 function render(props={}){flushSync(()=>root.render(React.createElement(context.Provider,{value:identity},React.createElement('section',{onClick:()=>trace.push('ancestor')},React.createElement(Portal,{...props,ref:forwarded},React.createElement(Child))))));}
 function snapshot(name){const child=document.querySelector('[data-child]');states.push({name,parent:child.parentElement===document.body?'body':child.parentElement===a?'a':child.parentElement===b?'b':'inline',ref:handle===document.body?'body':handle===a?'a':handle===b?'b':handle===child?'child':handle===null?'null':'other',context:seen===identity,id:Number(child.textContent),ownRef:own===child,trace:[...trace]});}
 try{
  render();snapshot('default body');
  flushSync(()=>document.querySelector('[data-child]').click());snapshot('logical event ancestry');
  render({container:a});snapshot('custom container');
  render({container:()=>{calls++;return a;}});snapshot('same container callback retains state');
  render({container:b});snapshot('retarget remounts');
  render({disablePortal:true,container:()=>{throw Error('inline container evaluated');}});snapshot('inline child ref');
  flushSync(()=>root.unmount());states.push({name:'cleanup',ref:handle===null?'null':'other',ownRef:own===null,children:document.querySelectorAll('[data-child]').length,callbackCalls:calls});
 }finally{mount.remove();a.remove();b.remove();}
 return {...provenance,states};
};
window.verifyReference=()=>{const value=window.runReference();if(JSON.stringify(value)!==JSON.stringify(expected))throw Error('Portal source contracts changed');return {passed:value.states.length};};
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
  `<!doctype html><meta charset="utf-8"><title>Original Portal reference</title><h1>Original MUI Portal checks</h1><p>This compares MUI containers, context, state, events and refs. This developer test is separate from the mobile catalog.</p><button onclick="document.querySelector('output').textContent=JSON.stringify(window.verifyReference())">Run checks</button><output>Ready</output><script defer src="bundle.js"></script>`,
);
console.log('Verified original Portal source and built ' + directory);
