import { randomBytes } from "node:crypto";

/** The ACP UI is deliberately presentation-only. All actions are checked by the host. */
export function acpPanelHtml(): string {
  const nonce = randomBytes(24).toString("base64");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ACP Agents</title>
<style nonce="${nonce}">
:root{color-scheme:light dark}body{--surface:var(--vscode-sideBar-background,var(--vscode-editor-background));--line:var(--vscode-contrastBorder,var(--vscode-panel-border,transparent));--muted:var(--vscode-descriptionForeground);--radius:6px}body.vscode-light,body.vscode-high-contrast-light{color-scheme:light}body.vscode-dark,body.vscode-high-contrast{color-scheme:dark}
*{box-sizing:border-box}body{margin:0;height:100vh;display:flex;flex-direction:column;background:var(--surface);color:var(--vscode-foreground);font:var(--vscode-font-size,13px)/1.5 var(--vscode-font-family,system-ui,sans-serif)}
header{flex:none;padding:14px 16px 10px;border-bottom:1px solid var(--line)}.heading{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}h1{font-size:1.1em;line-height:1.4;margin:0;font-weight:600}.status{font-size:.92em;color:var(--muted)}#session{display:block;font-size:.85em;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}#session:empty{display:none}
nav{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}button,textarea{font:inherit}button{border:1px solid var(--line);border-radius:var(--radius);padding:4px 9px;background:var(--vscode-button-secondaryBackground,var(--surface));color:var(--vscode-button-secondaryForeground,var(--vscode-foreground));cursor:pointer;max-width:100%;overflow-wrap:anywhere}button:hover:enabled{background:var(--vscode-button-secondaryHoverBackground,var(--vscode-toolbar-hoverBackground))}button:disabled{opacity:.5;cursor:default}.primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-color:transparent}.primary:hover:enabled{background:var(--vscode-button-hoverBackground)}button:focus-visible,summary:focus-visible,textarea:focus-visible{outline:2px solid var(--vscode-focusBorder);outline-offset:2px}
#error{padding:8px 16px;margin:0;color:var(--vscode-errorForeground);border-bottom:1px solid var(--line);overflow-wrap:anywhere}#retention{padding:5px 16px;margin:0;color:var(--muted);font-size:.88em}main{flex:1;min-height:0;overflow:auto;padding:18px 16px;scrollbar-gutter:stable}#empty{max-width:520px;margin:20px auto;color:var(--muted)}#empty h2{font-size:1.2em;font-weight:600;color:var(--vscode-foreground);margin:0 0 8px}#empty p{margin:6px 0}.entry{max-width:920px;margin:0 auto 18px;overflow-wrap:anywhere}.label{font-size:.86em;font-weight:600;color:var(--muted);margin:0 0 5px}.text{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.user{padding:10px 12px;border-radius:var(--radius);background:var(--vscode-textCodeBlock-background,var(--vscode-editor-background))}.thought{color:var(--muted);padding-left:10px;border-left:2px solid var(--line)}.thought summary{cursor:pointer;margin-bottom:6px;font-size:.9em}.tool{padding:9px 11px;border:1px solid var(--line);border-radius:var(--radius)}.tool summary{cursor:pointer;display:flex;gap:8px;justify-content:space-between;align-items:baseline}.tool-title{min-width:0;overflow-wrap:anywhere;font-weight:500}.tool-status{flex:none;font-size:.85em;color:var(--muted)}.tool[data-status=failed] .tool-status{color:var(--vscode-errorForeground)}.tool pre{white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--vscode-editor-font-family,monospace);font-size:.9em;margin:8px 0 0}.notice{color:var(--muted);font-size:.92em}.plan ol{margin:6px 0;padding-left:22px}.plan li{padding:2px 0}.plan .completed{color:var(--muted)}.plan .in_progress{font-weight:600}
footer{flex:none;padding:10px 16px 14px;border-top:1px solid var(--line)}footer label{display:block;font-size:.88em;color:var(--muted);margin-bottom:5px}textarea{display:block;width:100%;min-height:76px;max-height:180px;resize:vertical;border:1px solid var(--vscode-input-border,var(--line));border-radius:var(--radius);padding:9px 10px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);line-height:1.45}textarea::placeholder{color:var(--vscode-input-placeholderForeground)}.composer-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px}.hint{font-size:.83em;color:var(--muted)}.actions{display:flex;gap:6px;margin-left:auto}#latest{font-size:.88em;align-self:center;margin:0 0 6px}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}@media(max-width:380px){header,main,footer{padding-left:11px;padding-right:11px}nav{gap:4px}button{padding:4px 7px}.hint{display:none}}
</style></head><body>
<header><div class="heading"><h1 id="agent-name">ACP Agents</h1><span class="status" id="status" role="status" aria-live="polite">Disconnected</span></div><span id="session"></span>
<nav aria-label="Agent session controls"><button id="connect" class="primary">Connect</button><button id="disconnect" disabled>Disconnect</button><button id="newSession" disabled>New session</button><button id="resume" disabled>Resume</button><button id="authenticate" disabled>Authenticate</button><button id="setMode" disabled>Mode</button></nav></header>
<p id="error" role="alert" hidden></p><p id="retention" hidden>Earlier output was omitted from this view to keep it responsive. The agent session is unchanged.</p>
<main id="transcript" role="log" aria-label="ACP conversation" aria-live="off" tabindex="0"><div id="empty"><h2>Work with an ACP agent</h2><p>Connect an agent to start a conversation in this workspace.</p><p>Tool activity and permission requests are reported by the agent. A local agent runs with its own process permissions; ACP is not an operating-system sandbox.</p></div></main>
<button id="latest" hidden>Jump to latest</button>
<footer><form id="composer"><label for="prompt">Message the agent</label><textarea id="prompt" placeholder="Connect an agent to begin…" spellcheck="true" disabled></textarea><div class="composer-actions"><span class="hint">Enter to send · Shift+Enter for a new line</span><div class="actions"><button type="button" id="cancel" hidden>Stop</button><button type="submit" id="send" class="primary" disabled>Send</button></div></div></form></footer>
<script nonce="${nonce}">${ACP_PANEL_SCRIPT}</script></body></html>`;
}

// Static script: all received strings are placed in text nodes, never parsed as HTML or links.
const ACP_PANEL_SCRIPT = String.raw`(() => {
  const vscode = acquireVsCodeApi();
  const byId = id => document.getElementById(id);
  const transcript = byId("transcript"), input = byId("prompt");
  const MAX_ROWS = 250, MAX_ROW_CHARS = 120000, MAX_TOTAL_CHARS = 1000000;
  const rows = [], tools = new Map(), messageIds = new Map();
  let state = {status:"disconnected"}, chunkRow, planRow, sticky = true, scrollFrame, submitted=false;
  const display = value => String(value == null ? "" : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
    char => "[U+" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4,"0") + "]");
  const node = (tag, className, text) => { const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=display(text);return el; };
  const send = (type, extra={}) => vscode.postMessage({type,...extra});
  const snapshotScroll = () => { if(!scrollFrame) scrollFrame=requestAnimationFrame(() => {scrollFrame=undefined;if(sticky)transcript.scrollTop=transcript.scrollHeight;byId("latest").hidden=sticky;}); };
  const markTruncated = () => { byId("retention").hidden=false; };
  const bounded = (text,limit=MAX_ROW_CHARS) => { const str=display(text);if(str.length<=limit)return str;markTruncated();return "[Earlier text omitted from this view]\n"+str.slice(-limit); };
  const prune = () => {
    let total=rows.reduce((sum,row)=>sum+(row.el.textContent||"").length,0);
    while(rows.length>MAX_ROWS || total>MAX_TOTAL_CHARS && rows.length>1){
      const old=rows.shift();total-=(old.el.textContent||"").length;old.el.remove();
      if(old.toolId!==undefined)tools.delete(old.toolId);if(old.messageKey)messageIds.delete(old.messageKey);
      if(chunkRow===old)chunkRow=undefined;if(planRow===old)planRow=undefined;markTruncated();
    }
  };
  const addRow = (kind,label) => {
    byId("empty").hidden=true;chunkRow=undefined;
    const el=node("section","entry "+kind);if(label)el.append(node("div","label",label));
    const row={el,kind,text:""};rows.push(row);transcript.append(el);prune();snapshotScroll();return row;
  };
  const appendText = (row,text) => {row.text=bounded(row.text+display(text));row.body.textContent=row.text;prune();snapshotScroll();};
  const contentText = content => {
    if(!content || typeof content!=="object")return "";
    if(content.type==="text")return typeof content.text==="string"?content.text:"";
    if(content.type==="resource")return "Resource: "+display(content.resource?.uri||"embedded")+"\n"+(typeof content.resource?.text==="string"?content.resource.text:"[Non-text resource]");
    if(content.type==="resource_link")return "Resource: "+display(content.name||content.title||"")+"\n"+display(content.uri||"");
    return "["+display(content.type||"Unsupported")+" content supplied; not rendered in this view]";
  };
  const message = (kind,text,messageId) => {
    if(!text)return;
    const key=typeof messageId==="string"?kind+":"+messageId:undefined;
    let row=key?messageIds.get(key):chunkRow?.kind===kind?chunkRow:undefined;
    if(!row || !row.el.isConnected){
      row=addRow(kind,kind==="user"?"You":kind==="assistant"?"Agent":undefined);
      if(kind==="thought"){
        const details=node("details");details.open=true;details.append(node("summary",undefined,"Agent thinking"));row.body=node("div","text");details.append(row.body);row.el.append(details);
      } else {row.body=node("div","text");row.el.append(row.body);}
      if(key){row.messageKey=key;messageIds.set(key,row);}
    }
    chunkRow=row;appendText(row,text);
  };
  const notice = text => {const row=addRow("notice");row.body=node("p","text",bounded(text));row.el.append(row.body);prune();snapshotScroll();};
  const json = value => {try{return JSON.stringify(value,null,2);}catch{return "[Unserializable value]";}};
  const toolContent = value => {
    if(!Array.isArray(value))return "";
    return value.slice(0,100).map(part=>{
      if(part.type==="content")return contentText(part.content);
      if(part.type==="diff")return "Diff: "+display(part.path)+"\nBefore:\n"+(part.oldText==null?"[New file]":display(part.oldText))+"\nAfter:\n"+display(part.newText);
      if(part.type==="terminal")return "Terminal: "+display(part.terminalId);
      return "[Unsupported tool content]";
    }).join("\n\n");
  };
  const tool = update => {
    if(typeof update.toolCallId!=="string")return;
    let row=tools.get(update.toolCallId);
    if(!row){
      row=addRow("tool");row.toolId=update.toolCallId;row.data={};
      const details=node("details"), summary=node("summary");row.title=node("span","tool-title");row.status=node("span","tool-status");summary.append(row.title,row.status);details.append(summary);row.body=node("pre");details.append(row.body);row.el.append(details);tools.set(update.toolCallId,row);
    }
    chunkRow=undefined;
    for(const key of ["title","name","kind","status"])if(update[key]!=null)row.data[key]=bounded(update[key],2000);
    if(update.content!=null)row.data.content=bounded(toolContent(update.content));
    if(Array.isArray(update.locations))row.data.locations=bounded(update.locations.slice(0,100).map(x=>display(x.path)+(x.line?":"+x.line:"")).join("\n"));
    if(update.rawInput!=null)row.data.input=bounded(json(update.rawInput));
    if(update.rawOutput!=null)row.data.output=bounded(json(update.rawOutput));
    row.title.textContent=row.data.title||row.data.name||"Tool activity";
    const allowed=["pending","in_progress","completed","failed"],status=allowed.includes(row.data.status)?row.data.status:"pending";
    row.status.textContent=status.replaceAll("_"," ");row.el.dataset.status=status;
    const details=[];
    if(row.data.kind)details.push("Kind: "+display(row.data.kind));
    if(row.data.locations)details.push(row.data.locations);
    if(row.data.input)details.push("Input:\n"+row.data.input);
    if(row.data.content)details.push(row.data.content);
    if(row.data.output)details.push("Output:\n"+row.data.output);
    row.body.textContent=bounded(details.join("\n\n"));prune();snapshotScroll();
  };
  const plan = update => {
    if(!planRow || !planRow.el.isConnected)planRow=addRow("plan","Agent plan");
    chunkRow=undefined;
    if(planRow.body)planRow.body.remove();const list=node("ol");
    for(const item of (Array.isArray(update.entries)?update.entries:[]).slice(0,100)){
      const status=["pending","in_progress","completed"].includes(item.status)?item.status:"pending";
      list.append(node("li",status,bounded(item.content,1000)+" · "+status.replaceAll("_"," ")));
    }
    planRow.body=list;planRow.el.append(list);prune();snapshotScroll();
  };
  const update = value => {
    if(!value || typeof value!=="object")return;
    switch(value.sessionUpdate){
      case "agent_message_chunk":message("assistant",contentText(value.content),value.messageId);break;
      case "agent_thought_chunk":message("thought",contentText(value.content),value.messageId);break;
      case "user_message_chunk":message("user",contentText(value.content),value.messageId);break;
      case "tool_call":case "tool_call_update":tool(value);break;
      case "plan":plan(value);break;
      case "current_mode_update":if(state.modes){state.modes.currentModeId=value.currentModeId;renderState();}break;
      case "available_commands_update":if(Array.isArray(value.availableCommands) && value.availableCommands.length)notice("Agent commands\n"+value.availableCommands.slice(0,60).map(command=>"/"+display(command.name)+" — "+display(command.description||"")).join("\n"));break;
      case "session_info_update":break;
      case "usage_update":break;
      case "config_option_update":break;
      case "notice":notice(contentText(value.content)||value.message||"Agent notice");break;
    }
  };
  const renderState = () => {
    const status=state.status,ready=status==="ready",busy=submitted||status==="prompting"||status==="cancelling",connected=ready||busy;
    byId("agent-name").textContent=display(state.agentName||"ACP Agents");
    byId("status").textContent=submitted?"Sending…":({disconnected:"Disconnected",connecting:"Connecting…",ready:state.sessionId?"Ready":"Connected",prompting:"Working…",cancelling:"Stopping…",error:"Needs attention"})[status]||"Disconnected";
    byId("session").textContent=state.sessionId?"Session · "+display(state.sessionId):"";byId("session").title=state.sessionId?display(state.sessionId):"";
    byId("connect").disabled=connected||status==="connecting";byId("disconnect").disabled=status==="disconnected";
    byId("newSession").disabled=!ready||busy;byId("resume").disabled=!ready||busy||!state.loadSession;
    byId("resume").title=state.loadSession?"Load a session using its ID":"This agent does not advertise session loading";
    byId("authenticate").disabled=busy||status==="connecting"||status==="disconnected"||!state.authMethods?.length;
    byId("setMode").disabled=!ready||busy||!state.sessionId||!state.modes?.availableModes?.length;
    const mode=state.modes?.availableModes?.find(item=>item.id===state.modes.currentModeId);byId("setMode").textContent=mode?"Mode: "+display(mode.name):"Mode";
    const canPrompt=ready && !busy && Boolean(state.sessionId);input.disabled=!canPrompt;input.placeholder=connected?"Describe what you want to do…":"Connect an agent to begin…";byId("send").disabled=!canPrompt||!input.value.trim();
    byId("cancel").hidden=!busy;byId("cancel").disabled=status==="cancelling";byId("cancel").textContent=status==="cancelling"?"Stopping…":"Stop";
    byId("error").hidden=!state.error;byId("error").textContent=state.error?bounded(state.error):"";
  };
  for(const type of ["connect","disconnect","newSession","resume","authenticate","setMode","cancel"])byId(type).addEventListener("click",()=>send(type));
  input.addEventListener("input",renderState);
  byId("composer").addEventListener("submit",event=>{event.preventDefault();if(byId("send").disabled)return;const text=input.value;submitted=true;send("prompt",{text});input.value="";renderState();});
  input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();byId("composer").requestSubmit();}});
  const pauseFollowing=()=>{sticky=false;byId("latest").hidden=false;};
  transcript.addEventListener("wheel",event=>{if(event.deltaY<0)pauseFollowing();},{passive:true});
  transcript.addEventListener("touchmove",pauseFollowing,{passive:true});
  transcript.addEventListener("pointerdown",pauseFollowing);
  transcript.addEventListener("keydown",event=>{if(["ArrowUp","PageUp","Home"].includes(event.key))pauseFollowing();});
  transcript.addEventListener("scroll",()=>{sticky=transcript.scrollHeight-transcript.clientHeight-transcript.scrollTop<40;byId("latest").hidden=sticky;});
  byId("latest").addEventListener("click",()=>{sticky=true;snapshotScroll();});
  window.addEventListener("message",event=>{
    const incoming=event.data;if(!incoming||typeof incoming!=="object")return;
    switch(incoming.type){
      case "state":{const wasBusy=state.status==="prompting"||state.status==="cancelling";submitted=false;state=incoming.state||{status:"disconnected"};if(wasBusy&&state.status!=="prompting"&&state.status!=="cancelling")chunkRow=undefined;renderState();break;}
      case "update":update(incoming.update);break;
      case "user":chunkRow=undefined;message("user",incoming.text);chunkRow=undefined;break;
      case "notice":notice(incoming.text);break;
      case "reset":for(const row of rows)row.el.remove();rows.length=0;tools.clear();messageIds.clear();chunkRow=undefined;planRow=undefined;sticky=true;byId("retention").hidden=true;byId("empty").hidden=false;byId("latest").hidden=true;break;
    }
  });
  renderState();send("ready");
})();`;
