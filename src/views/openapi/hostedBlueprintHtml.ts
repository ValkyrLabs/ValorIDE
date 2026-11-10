import { randomBytes } from "crypto";

export const hostedBlueprintUrl = "https://valkyrlabs.com/openapi-designer/valoride";
export function hostedBlueprintHtml(bound: boolean) {
  const nonce = randomBytes(16).toString("hex");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https://valkyrlabs.com; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Blueprint</title>
<style nonce="${nonce}">
html,body{height:100%;margin:0}body{display:flex;flex-direction:column;color:var(--vscode-foreground);background:var(--vscode-editor-background);font:var(--vscode-font-size) var(--vscode-font-family)}
nav{display:flex;gap:.4rem;flex-wrap:wrap;padding:.55rem}button{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border:1px solid var(--vscode-button-border,transparent);border-radius:3px;padding:.35rem .65rem;cursor:pointer;font:inherit}button:focus-visible{outline:1px solid var(--vscode-focusBorder)}button:disabled{opacity:.55;cursor:default}#impact{padding:.5rem .7rem;max-height:42vh;overflow:auto;border-bottom:1px solid var(--vscode-panel-border)}#impact h2{font-size:1.05rem;margin:.25rem 0}#impact li{margin:.4rem 0;overflow-wrap:anywhere}#impact p{margin:.3rem 0}#impact ul{padding-left:1.3rem}#generate{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}p{margin:0 .6rem .5rem;color:var(--vscode-descriptionForeground)}iframe{border:0;flex:1;width:100%;min-height:0}
</style></head><body>
<nav aria-label="Blueprint actions"><button id="import">Upload local file</button><button id="export">Download file</button>${bound ? '<button id="review">Review contract impact</button><button id="save">Save Blueprint</button><button id="generate">Save &amp; regenerate</button>' : ''}
<button id="retry" hidden>Reload editor</button></nav>
<p role="status" aria-live="polite" id="status">Opening the ValkyrLabs Blueprint editor…</p>
<section id="impact" aria-label="Contract impact review" hidden></section>
<iframe id="editor" title="ValkyrLabs Blueprint designer" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"></iframe>
<script nonce="${nonce}">(() => {
const api=acquireVsCodeApi(), frame=document.getElementById("editor"), status=document.getElementById("status"), retry=document.getElementById("retry");
const channel="valkyr.blueprint.v1", origin="https://valkyrlabs.com";
const buttons=["import","export","save","generate","review"].map(id=>document.getElementById(id)).filter(Boolean);
let port, pending, ready=false, busy=false, timer;
const sync=()=>buttons.forEach(button=>{button.disabled=!ready||busy;});
const ended=text=>{pending=undefined;busy=false;status.textContent=text;sync();};
const fail=text=>{clearTimeout(timer);retry.hidden=false;ended(text);};
const start=()=>{clearTimeout(timer);if(port)port.close();port=undefined;ready=false;busy=false;pending=undefined;retry.hidden=true;sync();
status.textContent="Opening the ValkyrLabs Blueprint editor…";frame.src="${hostedBlueprintUrl}";
timer=setTimeout(()=>fail("Blueprint did not connect. Check your connection and that the matching ValkyrLabs web editor is available."),20000);};
window.addEventListener("message",event=>{
 const m=event.data;if(!m)return;
 if(event.source===frame.contentWindow){
  if(event.origin!==origin || m.channel!==channel || m.type!=="ready" || port)return;
  const pair=new MessageChannel();port=pair.port1;
  port.onmessage=({data})=>{
   if(data?.type==="connected"){clearTimeout(timer);api.postMessage({type:"blueprintLoad"});return;}
   if(!pending || data?.id!==pending.id)return;
   const op=pending.action;pending=undefined;clearTimeout(timer);
   if(data.type!=="snapshot")return ended(typeof data.error==="string"?data.error:"The Blueprint could not be read.");
   api.postMessage({type:op==="review"?"blueprintReview":op==="export"?"blueprintExport":"blueprintSave",specification:data.specification,regenerate:op==="generate"});
  };
  frame.contentWindow.postMessage({type:"connect",channel},origin,[pair.port2]);return;
 }
 // VS Code dispatches host messages in the outer webview; never trust a child redirect.
 if(event.source && event.source!==window)return;
 if(m.type==="blueprintImpact"){
  const box=document.getElementById("impact");box.replaceChildren();box.hidden=false;
  const line=(parent,tag,text)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
  const heading=line(box,"h2","Contract impact");heading.tabIndex=-1;
  line(box,"p","Saved revision "+m.baseline.slice(0,12)+" → reviewed draft "+m.draftHash.slice(0,12)+".");
  line(box,"p",m.total+" operation definitions changed."+ (m.truncated?" Showing the first "+m.rows.length+".":""));
  line(box,"p",!m.lookupAvailable?"Workflow bindings are unavailable; consumer coverage is unknown.":m.partial?"Only part of the registered binding inventory was inspected. Other consumers may exist.":"Coverage includes readable saved workflows and versions with recorded source revisions. Older versions may lack source evidence.");
  if(m.unresolved)line(box,"p","Unresolved references, referenced path items, or ambiguous operation IDs limit coverage.");
  const list=document.createElement("ul");box.append(list);
  for(const row of m.rows){
   const item=line(list,"li",row.kind+" · "+row.route+" · "+[row.before,row.after].filter((x,i,a)=>x && a.indexOf(x)===i).join(" → "));
   if(!row.consumers.length){line(item,"small"," — No verified consumer link in the inspected scope.");}
   for(const c of row.consumers){
    const inspect=(label,versionOnly)=>{const b=line(item,"button",label);b.type="button";b.onclick=()=>api.postMessage({type:"blueprintInspectConsumer",reviewId:m.reviewId,index:c.index,versionOnly});};
    if(c.workflowVersionId)inspect("Review version and fixtures "+c.workflowVersionId,true);
    if(c.executionId)inspect("Review recorded fixture run "+c.executionId,false);
    else if(!c.workflowVersionId)inspect("Open workflow "+c.workflowId,false);
   }
  }
  const close=line(box,"button","Close impact review");close.onclick=()=>{box.hidden=true;document.getElementById("review").focus();};
  ended("Impact review ready.");heading.focus();
 }
 else if(m.type==="blueprintLoaded" || m.type==="blueprintImported"){if(!port)return;port.postMessage({type:"document",specification:m.document.specification});ready=true;retry.hidden=true;ended(m.type==="blueprintImported"?"Local file loaded as a draft; it has not been published.":${JSON.stringify(bound ? "Editing this application’s Blueprint." : "Local draft — open Blueprint from an app to save or regenerate it.")});}
 else if(m.type==="blueprintSaved"){status.textContent=m.regenerating?"Blueprint saved. Regenerating the saved revision…":"Blueprint saved.";if(!m.regenerating)ended(status.textContent);}
 else if(m.type==="blueprintProgress"){status.textContent=m.status;}
 else if(m.type==="blueprintGenerated"){ended("Regenerated project: "+m.artifact.extractedPath);}
 else if(m.type==="blueprintNotice"){ended(m.text);}
 else if(m.type==="blueprintError"){fail(m.error);}
});
for(const b of buttons)b.addEventListener("click",()=>{
 if(!ready||busy)return;document.getElementById("impact").hidden=true;busy=true;sync();status.textContent="Preparing Blueprint…";
 if(b.id==="import"){api.postMessage({type:"blueprintImport"});return;}
 pending={id:crypto.randomUUID(),action:b.id};port.postMessage({type:"read",id:pending.id});
 timer=setTimeout(()=>fail("The editor did not return a draft. Your changes have not been published."),10000);
});
retry.onclick=()=>{if(!busy && (!ready || confirm("Reload the canonical Blueprint and discard unsaved editor changes?"))) start();};start();
})();</script></body></html>`;
}
