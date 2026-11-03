// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';

const material = await loadReference('@mui/material', [
  'Autocomplete/Autocomplete.js',
  'Autocomplete/Autocomplete.d.ts',
  'useAutocomplete/useAutocomplete.js',
  'useAutocomplete/useAutocomplete.d.ts',
]);
const parent = JSON.parse(
  await readFile('tests/fixtures/mui-portal-browser-9.5.0.json', { encoding: 'utf8' }),
);
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  scope:
    'Original Autocomplete navigation default prevention, actual input target/focus, highlight, selection and IME-229 guard in Chromium. Native transport and physical keyboards are separate.',
};
const fixture = 'tests/fixtures/mui-autocomplete-keyboard-browser-9.5.0.json';
let expected;
try {
  expected = JSON.parse(await readFile(fixture, { encoding: 'utf8' }));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, provenance.material);
  assert.deepEqual(expected.renderer, provenance.renderer);
}
const base = material.directory;
const directory = resolve('.cache/autocomplete-keyboard-reference');
const bundleName = 'bundle.js';
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(base + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(base + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(base + '/node_modules/react-dom/index.js')};
import Autocomplete from ${JSON.stringify(base + '/node_modules/@mui/material/Autocomplete/index.js')};
const provenance=${JSON.stringify(provenance)},expected=${JSON.stringify(expected ?? null)};
const settle=async()=>{await Promise.resolve();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
window.runReference=async()=>{
 const observations=[];
 async function scenario(name,keys,props={}){
  const mount=document.createElement('div');document.body.append(mount);const root=createRoot(mount);
  const options=Array.from({length:12},(_,i)=>'Option '+String(i).padStart(2,'0'));
  const calls=[];/** @type {HTMLInputElement | null} */ let current=null;
  function Probe(){
   const [open,setOpen]=React.useState(props.initialOpen??true),[value,setValue]=React.useState(null);
   const {initialOpen,preventMui,...other}=props;
   return React.createElement(Autocomplete,{options,disablePortal:true,open,value,...other,
    onOpen:e=>{calls.push(['open',e.type]);setOpen(true);},
    onClose:(e,reason)=>{calls.push(['close',reason]);setOpen(false);},
    onChange:(e,next,reason)=>{calls.push(['change',next,reason]);setValue(next);},
    onKeyDown:e=>{calls.push(['caller',e.key,e.target===current]);if(preventMui)e.defaultMuiPrevented=true;},
    renderInput:params=>{
     const {ref,className,onMouseDown}=params.slotProps.input;
     return React.createElement('div',{ref,className,onMouseDown},React.createElement('input',{...params.slotProps.htmlInput,'data-probe-input':'yes'}));
    }});
  }
  try{
   flushSync(()=>root.render(React.createElement(Probe)));await settle();
   current=mount.querySelector('[data-probe-input]');current.focus();await settle();
   for(const input of keys){
    const spec=typeof input==='string'?{key:input}:input;
    const before=calls.length;
    const event=new KeyboardEvent('keydown',{bubbles:true,cancelable:true,...spec});
    flushSync(()=>current.dispatchEvent(event));await settle();
    const active=current.getAttribute('aria-activedescendant');
    // The pinned upstream hook explicitly uses the legacy 229 IME sentinel.
    observations.push({scenario:name,key:spec.key,which:event.which,prevented:event.defaultPrevented,
      inputFocused:document.activeElement===current,expanded:current.getAttribute('aria-expanded'),
      highlighted:active?document.getElementById(active)?.textContent??null:null,
      inputValue:current.value,calls:calls.slice(before)});
   }
  }finally{flushSync(()=>root.unmount());mount.remove();await settle();}
 }
 await scenario('navigation',['ArrowDown','ArrowDown','ArrowUp','End','PageUp','PageDown','Home','Enter']);
 await scenario('open from closed',['ArrowDown','ArrowDown','Escape'],{initialOpen:false});
 await scenario('free solo native home end',['Home','End'],{freeSolo:true});
 await scenario('explicit native home end',['Home','End'],{handleHomeEndKeys:false});
 await scenario('skip disabled option',['ArrowDown','ArrowDown'],{getOptionDisabled:option=>option==='Option 01'});
 await scenario('IME settling',[{key:'ArrowDown',which:229,keyCode:229,isComposing:true}]);
 await scenario('external cancellation',['ArrowDown'],{preventMui:true});
 await scenario('unowned editing',['a','Backspace','Delete','ArrowLeft','ArrowRight']);
 await scenario('modified navigation',[{key:'End',ctrlKey:true},{key:'Home',shiftKey:true}]);
 return {...provenance,observations};
};
window.verifyReference=async()=>{
 if(!expected)throw Error('No recorded reference fixture');
 const actual=await window.runReference();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Autocomplete keyboard reference changed');
 return {passed:actual.observations.length,scope:provenance.scope};
};
document.body.innerHTML='<h1>Original Autocomplete keyboard reference</h1><p>Run window.runReference() or window.verifyReference().</p>';
`;
await build({
  stdin: { contents: source, resolveDir: base, loader: 'js' },
  outfile: resolve(directory, bundleName),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  directory + '/index.html',
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Autocomplete keyboard reference</title><link rel="icon" href="data:,"><script src="${bundleName}" defer></script></head><body></body></html>`,
);
console.log('Built original Autocomplete keyboard reference at ' + directory);
