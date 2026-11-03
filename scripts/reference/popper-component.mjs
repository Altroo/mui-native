import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { loadReference } from './load.mjs';
const material = await loadReference('@mui/material', [
  'Popper/Popper.js',
  'Popper/Popper.d.ts',
  'Popper/BasePopper.js',
  'Popper/BasePopper.types.d.ts',
  'Popper/popperClasses.js',
]);
const parent = JSON.parse(await readFile('tests/fixtures/mui-portal-browser-9.5.0.json', 'utf8'));
const provenance = {
  material: material.reference,
  renderer: parent.renderer,
  scope:
    'Original Material Popper wrapper composition, root/instance refs, slots, defaults, RTL, visibility and transition callbacks in Chromium. Native device behavior is separate.',
};
let expected;
try {
  expected = JSON.parse(
    await readFile('tests/fixtures/mui-popper-component-browser-9.5.0.json', 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (process.argv.includes('--check')) {
  assert(expected);
  assert.deepEqual(expected.material, provenance.material);
  assert.deepEqual(expected.renderer, provenance.renderer);
}
const base = material.directory,
  directory = resolve('.cache/popper-component-reference');
await mkdir(directory, { recursive: true });
const source = `
import React from ${JSON.stringify(base + '/node_modules/react/index.js')};
import {createRoot} from ${JSON.stringify(base + '/node_modules/react-dom/client.js')};
import {flushSync} from ${JSON.stringify(base + '/node_modules/react-dom/index.js')};
import Popper from ${JSON.stringify(base + '/node_modules/@mui/material/Popper/index.js')};
import {ThemeProvider,createTheme} from ${JSON.stringify(base + '/node_modules/@mui/material/styles/index.js')};
const provenance=${JSON.stringify(provenance)},expected=${JSON.stringify(expected ?? null)};
const settle=async()=>{await Promise.resolve();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
window.runReference=async()=>{
 const mount=document.createElement('div'),anchor=document.createElement('button'),container=document.createElement('div');
 anchor.style.cssText='position:fixed;left:120px;top:200px;width:100px;height:40px';
 container.dataset.container='yes';container.style.cssText='position:relative;width:350px;height:600px';
 document.body.append(mount,anchor,container);const root=createRoot(mount), context=React.createContext(null),identity={key:1};
 const states=[];let handle=null,instance=null,slotState=null,componentProps=null,transitionProps=null,childState=null,contextSeen=false,counter=0;
 function Content(){const[id]=React.useState(()=>++counter);contextSeen=React.useContext(context)===identity;return React.createElement('span',{'data-content':'yes'},String(id));}
 const Slot=React.forwardRef(function Slot(props,ref){slotState=props.ownerState;const{ownerState,...other}=props;return React.createElement('aside',{...other,ref,'data-slot':'yes'});});
 const Component=React.forwardRef(function Component(props,ref){componentProps=props;return React.createElement('article',{ref,'data-component':'yes'},'Custom');});
 const nodeRef=node=>{handle=node;};const instanceRef=value=>{instance=value;};
 async function render(name,props={},theme){
  slotState=null;componentProps=null;childState=null;contextSeen=false;
  const child=props.children??(value=>{childState=value;return React.createElement(Content);});
  const element=React.createElement(context.Provider,{value:identity},React.createElement(Popper,{anchorEl:anchor,open:true,style:{width:80,height:30},ref:nodeRef,popperRef:instanceRef,...props},child));
  flushSync(()=>root.render(theme?React.createElement(ThemeProvider,{theme},element):element));await settle();
  const node=handle, content=document.querySelector('[data-content]');
  states.push({name,exists:!!node,parent:node?.parentElement===document.body?'body':node?.parentElement===container?'container':node?.parentElement===mount?'inline':node?'other':null,
   tag:node?.tagName??null,role:node?.getAttribute('role')??null,className:node?.className??null,
   instance:!!instance,instancePlacement:instance?.state.placement??null,childPlacement:childState?.placement??null,
   transitionKeys:childState?.TransitionProps?Object.keys(childState.TransitionProps).sort():[],transitionIn:childState?.TransitionProps?.in??null,
   display:node?.style.display??null,position:node?.style.position??null,color:node?.style.color??null,
   title:node?.getAttribute('title')??null,context:contextSeen,contentId:content?Number(content.textContent):null,
   slotOpen:slotState?.open??null,slotPlacement:slotState?.placement??null,
   componentKeys:componentProps?Object.keys(componentProps).filter(k=>!['children','ref'].includes(k)).sort():[],componentOpen:componentProps?.open??null});
 }
 try{
 await render('default');
 await render('placement left',{placement:'left'});
 await render('RTL bottom start',{placement:'bottom-start'},createTheme({direction:'rtl'}));
 await render('options override RTL',{placement:'bottom-start',popperOptions:{placement:'right-end'}},createTheme({direction:'rtl'}));
 await render('RTL auto start unchanged',{placement:'auto-start'},createTheme({direction:'rtl'}));
 await render('custom container',{container});
 await render('inline ignores container',{disablePortal:true,container});
 await render('root slot',{slots:{root:Slot},slotProps:{root:ownerState=>({title:ownerState.open?'slot-open':'slot-closed',style:{color:'rgb(1, 2, 3)'}})}});
 await render('root slot overrides forwarded title',{title:'forwarded',slots:{root:Slot},slotProps:{root:{title:'slot'}}});
 await render('theme defaults',{},createTheme({components:{MuiPopper:{defaultProps:{placement:'top-end',slotProps:{root:{title:'theme'}}}}}}));
 await render('component bypass',{component:Component,placement:'left'});
 await render('closed unmounted',{open:false});
 await render('closed kept mounted',{open:false,keepMounted:true});
 await render('kept reopened',{open:true,keepMounted:true});
 await render('transition initially exited',{open:true,transition:true,children:value=>{transitionProps=value.TransitionProps;childState=value;return React.createElement(Content);}});
 flushSync(()=>transitionProps.onEnter());await settle();
 states.push({name:'transition entered',instance:!!instance,placement:instance?.state.placement??null});
 await render('transition closing retains instance',{open:false,transition:true,children:value=>{transitionProps=value.TransitionProps;childState=value;return React.createElement(Content);}});
 flushSync(()=>transitionProps.onExited());await settle();
 states.push({name:'transition exited',instance:!!instance,rootPresent:!!handle,contentPresent:!!document.querySelector('[data-content]')});
 flushSync(()=>root.unmount());states.push({name:'cleanup',instance:!!instance,rootPresent:!!handle,contentPresent:!!document.querySelector('[data-content]')});
 }finally{try{flushSync(()=>root.unmount());}catch{}mount.remove();anchor.remove();container.remove();}
 return {...provenance,states};
};
window.verifyReference=async()=>{const value=await window.runReference();if(JSON.stringify(value)!==JSON.stringify(expected))throw Error('Popper component source contracts changed');return {passed:value.states.length};};
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
  '<!doctype html><meta charset="utf-8"><title>Original MUI Popper checks</title><h1>Original MUI Popper composition checks</h1><p>Developer reference for slots, refs, transitions and native compatibility. Separate from the mobile catalog.</p><output>Ready for checks</output><script defer src="bundle.js"></script>',
);
console.log('Verified original Popper wrapper source and built ' + directory);
