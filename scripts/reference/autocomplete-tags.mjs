// Copyright (c) 2026 Altroo and contributors.
// SPDX-License-Identifier: MIT
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';

const material = await loadReference('@mui/material', [
  'Autocomplete/Autocomplete.js',
  'useAutocomplete/useAutocomplete.js',
]);
const parent = JSON.parse(
  (await readFile('tests/fixtures/mui-portal-browser-9.5.0.json')).toString(),
);
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  scope:
    'Original multiple-value tag focus, caret/range guards, free-solo reset, popup closure and unavailable-item navigation under DOM key dispatch. Native transport and physical keyboards are separate.',
};
let expected;
try {
  expected = JSON.parse(
    (await readFile('tests/fixtures/mui-autocomplete-tags-browser-9.5.0.json')).toString(),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, provenance.material);
  assert.deepEqual(expected.renderer, provenance.renderer);
}
const base = material.directory;
const directory = resolve('.cache/autocomplete-tags-reference');
await mkdir(directory, { recursive: true });
const bundleName = 'bundle.js';
const source = `
import React from ${JSON.stringify(base + '/node_modules/react/index.js')};
import * as ReactDOMClient from ${JSON.stringify(base + '/node_modules/react-dom/client.js')};
import * as ReactDOM from ${JSON.stringify(base + '/node_modules/react-dom/index.js')};
const {createRoot}=ReactDOMClient,{flushSync}=ReactDOM;
import Autocomplete from ${JSON.stringify(base + '/node_modules/@mui/material/Autocomplete/index.js')};
const provenance=${JSON.stringify(provenance)},expected=${JSON.stringify(expected ?? null)};
const settle=async()=>{await Promise.resolve();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
window.runReference=async()=>{
 const observations=[];
 async function scenario(name,keys,{draft='',start=0,end=start,freeSolo=false,unavailable=false}={}){
  const mount=document.createElement('div');document.body.append(mount);const root=createRoot(mount);
  const options=['Rabat','Casablanca','Marrakesh'],calls=[];let setDraft;
  function Probe(){
   const [inputValue,update]=React.useState(''),[open,setOpen]=React.useState(true);setDraft=update;
   const renderValue=unavailable?(items,getItemProps)=>items.map((item,index)=>{
    const {onDelete,...props}=getItemProps({index});
    return React.createElement('span',{...props,key:index,'aria-disabled':index===1?'true':undefined},item);
   }):undefined;
   return React.createElement(Autocomplete,{options,multiple:true,value:options,freeSolo,open,inputValue,renderValue,disablePortal:true,
    onOpen:()=>setOpen(true),onClose:(event,reason)=>{calls.push(['close',reason]);setOpen(false);},
    onInputChange:(event,next,reason)=>{calls.push(['input',next,reason]);update(next);},
    renderInput:params=>{
     const {ref,className,onMouseDown,startAdornment}=params.slotProps.input;
     return React.createElement('div',{ref,className,onMouseDown},startAdornment,React.createElement('input',{...params.slotProps.htmlInput,'data-probe-input':'yes'}));
    }});
  }
  try{
   flushSync(()=>root.render(React.createElement(Probe)));await settle();
   /** @type {HTMLInputElement | null} */ const input=mount.querySelector('[data-probe-input]');
   if(!input)throw Error('Missing reference input');input.focus();await settle();
   flushSync(()=>setDraft(draft));input.setSelectionRange(start,end);await settle();calls.length=0;
   for(const key of keys){
    const target=document.activeElement,before=calls.length,event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});
    flushSync(()=>target.dispatchEvent(event));await settle();
    const active=document.activeElement;
    const item=active===input?null:active?.getAttribute('data-item-index');
    if(active!==input && (!mount.contains(active) || item===null || !/^[0-9]+$/.test(item) || Number(item)>=options.length))
      throw Error('Tag focus left the mounted input/item collection: '+name+' '+key);
    observations.push({scenario:name,key,item:active===input?-1:Number(item),
      inputFocused:active===input,inputValue:input.value,expanded:input.getAttribute('aria-expanded'),
      prevented:event.defaultPrevented,calls:calls.slice(before)});
   }
  }finally{flushSync(()=>root.unmount());mount.remove();await settle();}
 }
 await scenario('empty traversal',['ArrowLeft','ArrowLeft','ArrowLeft','ArrowLeft','ArrowRight','ArrowRight','ArrowRight']);
 await scenario('caret inside text',['ArrowLeft'],{draft:'Draft',start:2});
 await scenario('selected range',['ArrowLeft'],{draft:'Draft',start:0,end:2});
 await scenario('free solo draft at start',['ArrowLeft'],{draft:'Draft',freeSolo:true});
 await scenario('ordinary draft at start',['ArrowLeft'],{draft:'Draft'});
 await scenario('unavailable tag',['ArrowLeft','ArrowLeft','ArrowLeft','ArrowRight','ArrowRight'],{unavailable:true});
 return {...provenance,observations};
};
window.verifyReference=async()=>{
 if(!expected)throw Error('No recorded reference fixture');
 const actual=await window.runReference();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Autocomplete tag reference changed');
 return {passed:actual.observations.length,scope:provenance.scope};
};
document.body.innerHTML='<h1>Original Autocomplete tag reference</h1><p>Run window.runReference() or window.verifyReference().</p>';
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
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Autocomplete tag reference</title><link rel="icon" href="data:,"><script src="${bundleName}" defer></script></head><body></body></html>`,
);
console.log('Built original Autocomplete tag reference at ' + directory);
