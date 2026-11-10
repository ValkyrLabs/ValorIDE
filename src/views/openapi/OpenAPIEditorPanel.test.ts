import * as vscode from "vscode";
import { JSDOM } from "jsdom";
import { OpenAPIEditorPanel } from "./OpenAPIEditorPanel";
import { hostedBlueprintUrl } from "./hostedBlueprintHtml";
import { getSecret } from "@core/storage/state";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getValkyrLabsRtkApiClient } from "@services/valkyrai/ValkyrLabsRtkApi";
import { downloadApplicationArtifact } from "@services/applicationArtifactDownload";
import { openWorkflowStudioTarget as navigate } from "../../integrations/workflows/workflowStudioNavigation";

jest.mock("../../integrations/workflows/workflowStudioNavigation",()=>({openWorkflowStudioTarget:jest.fn()}));
jest.mock("vscode",()=>({
  workspace:{isTrusted:true,workspaceFolders:[{uri:{fsPath:"/workspace",scheme:"file"}}],fs:{writeFile:jest.fn(),readFile:jest.fn(),stat:jest.fn()}},
  window:{createWebviewPanel:jest.fn(),showOpenDialog:jest.fn(),showSaveDialog:jest.fn(),showWarningMessage:jest.fn(),showErrorMessage:jest.fn(),showWorkspaceFolderPick:jest.fn()},
  ViewColumn:{Active:-1}, Uri:{joinPath:(_u:any,p:string)=>p}
}));
jest.mock("@core/storage/state",()=>({getSecret:jest.fn()}));
jest.mock("@utils/serverValkyraiHost",()=>({getValkyraiBasePath:jest.fn()}));
jest.mock("@utils/thorapi",()=>({resolveThorapiFolderPath:(p:string)=>p+"/thorapi"}));
jest.mock("@services/applicationArtifactDownload",()=>({downloadApplicationArtifact:jest.fn()}));
jest.mock("@services/valkyrai/ValkyrLabsRtkApi",()=>({getValkyrLabsRtkApiClient:jest.fn(),ValkyrLabsApiError:class extends Error{}}));
const id="11111111-1111-4111-8111-111111111111", rev="22222222-2222-4222-8222-222222222222", next="33333333-3333-4333-8333-333333333333";
const backend="https://api-0.valkyrlabs.com/v1";
const spec={openapi:"3.0.3",info:{title:"Demo",version:"1"},paths:{}};
const edit={...spec,info:{...spec.info,title:"Edited"}};
const doc={applicationId:id,specId:rev,etag:"a".repeat(64),filename:"api.yaml",specification:spec};
const native={extensionUri:{}} as vscode.ExtensionContext;
let panel:any, close:()=>void, receive:(m:any)=>Promise<void>, post:jest.Mock, transport:jest.Mock;
function open(applicationId:string|undefined=id){OpenAPIEditorPanel.open(native,{applicationId,applicationName:"Demo"});}
beforeEach(()=>{
  jest.resetAllMocks();
  (vscode.workspace as any).workspaceFolders=[{uri:{fsPath:"/workspace",scheme:"file"}}];
  (getValkyraiBasePath as jest.Mock).mockReturnValue(backend);
  (getSecret as jest.Mock).mockResolvedValue("test-session");
  (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue("Save and regenerate");
  post=jest.fn(async()=>true);
  panel={webview:{postMessage:post,onDidReceiveMessage:(h:typeof receive)=>{receive=h;}},onDidDispose:(h:()=>void)=>{close=h;},dispose:()=>close(),reveal:jest.fn()};
  (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(panel);
  transport=jest.fn(async({method})=>({data:method==="PUT"?{...doc,specification:edit,specId:next,etag:"b".repeat(64)}:doc}));
  (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({request:transport});
  (downloadApplicationArtifact as jest.Mock).mockResolvedValue({extractedPath:"/workspace/Demo-v1"});
});
afterEach(()=>panel.dispose());
it("loads the hosted editor and reveals no credential or document in iframe URL/HTML",async()=>{
  open();expect(panel.webview.html).toContain(hostedBlueprintUrl);
  expect(panel.webview.html).not.toMatch(/test-session|localhost|__valorideBlueprint|unsafe-eval/);
  await receive({type:"blueprintLoad"});expect(transport.mock.calls[0][0]).toMatchObject({url:`${backend}/thorapi/applications/${id}/openapi`,redirect:"error"});
  expect(post).toHaveBeenCalledWith({type:"blueprintLoaded",document:{specification:spec}});
});
it("pins save and subsequent generation to the selected app, native ETag, and newly saved revision",async()=>{
  open();await receive({type:"blueprintLoad"});
  await receive({type:"blueprintSave",applicationId:next,expectedEtag:"spoof",filename:"evil",specification:edit,regenerate:true});
  expect(transport.mock.calls[1][0]).toMatchObject({url:`${backend}/thorapi/applications/${id}/openapi`,method:"PUT",json:{expectedEtag:doc.etag,filename:"api.yaml",specification:edit}});
  expect(downloadApplicationArtifact).toHaveBeenCalledWith(expect.objectContaining({applicationId:id,expectedSpecId:next,jwtToken:"test-session"}));
});
it("does not overwrite or regenerate after session rollover, cancellation, or failed save",async()=>{
  open();await receive({type:"blueprintLoad"});
  (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce(undefined);
  await receive({type:"blueprintSave",specification:edit,regenerate:true});expect(transport).toHaveBeenCalledTimes(1);
  transport.mockRejectedValueOnce(new Error("Conflict"));await receive({type:"blueprintSave",specification:edit,regenerate:true});
  (getSecret as jest.Mock).mockResolvedValue("someone-else");await receive({type:"blueprintSave",specification:edit,regenerate:true});
  expect(transport).toHaveBeenCalledTimes(2);expect(downloadApplicationArtifact).not.toHaveBeenCalled();
});
it("asks for a download workspace when an Apps editor has no selected project in a multi-root window",async()=>{
  open(); await receive({type:"blueprintLoad"});
  const extra={uri:{scheme:"file",fsPath:"/other"}};
  (vscode.workspace as any).workspaceFolders.push(extra);
  await receive({type:"blueprintSave",regenerate:true,specification:edit});
  expect(transport).toHaveBeenCalledTimes(1); expect(downloadApplicationArtifact).not.toHaveBeenCalled();
  (vscode.window.showWorkspaceFolderPick as jest.Mock).mockResolvedValue(extra);
  await receive({type:"blueprintSave",regenerate:true,specification:edit});
  expect(downloadApplicationArtifact).toHaveBeenCalledWith(expect.objectContaining({selectedWorkspace:extra.uri}));
});
it("loads local YAML as an unpublished draft and exports current edits only to the user's chosen path",async()=>{
  OpenAPIEditorPanel.open(native);await receive({type:"blueprintLoad"});
  (vscode.window.showOpenDialog as jest.Mock).mockResolvedValue([{scheme:"file",fsPath:"/examples/test.yaml"}]);
  (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({size:80});
  (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from("openapi: 3.0.3\ninfo: {title: Demo, version: '1'}\npaths: {}\n"));
  await receive({type:"blueprintImport"});expect(post).toHaveBeenCalledWith({type:"blueprintImported",document:{specification:spec}});
  const target={scheme:"file",fsPath:"/chosen/api.json"};(vscode.window.showSaveDialog as jest.Mock).mockResolvedValue(target);
  await receive({type:"blueprintExport",path:"/untrusted/secret.txt",specification:edit});
  expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(target,Buffer.from(JSON.stringify(edit,null,2)+"\n"));
  expect(transport).not.toHaveBeenCalled();expect(getSecret).not.toHaveBeenCalled();expect(downloadApplicationArtifact).not.toHaveBeenCalled();
});
it("rejects a wrong-app canonical response and a changed backend before showing a document",async()=>{
  open();transport.mockResolvedValueOnce({data:{...doc,applicationId:next}});await receive({type:"blueprintLoad"});
  (getValkyraiBasePath as jest.Mock).mockReturnValue("https://other.example/v1");await receive({type:"blueprintLoad"});
  expect(transport).toHaveBeenCalledTimes(1);expect(post).not.toHaveBeenCalledWith(expect.objectContaining({type:"blueprintLoaded"}));
});
it("accepts an iframe handshake only from its exact site and never forwards unsolicited snapshots or privileged requests",()=>{
  open();const send=jest.fn(), connect=jest.fn(), response={onmessage:null as any,postMessage:jest.fn(),close:jest.fn()};
  const dom=new JSDOM(panel.webview.html,{url:"https://test.vscode-webview.net",runScripts:"dangerously",beforeParse(w){
    (w as any).acquireVsCodeApi=()=>({postMessage:send});
    (w as any).MessageChannel=class{port1=response;port2={}};
  }});
  try {
    const w=dom.window, frame=(w.document.querySelector("iframe") as any).contentWindow;
    frame.postMessage=connect;
    const ready=(origin:string)=>w.dispatchEvent(new w.MessageEvent("message",{source:frame,origin,data:{channel:"valkyr.blueprint.v1",type:"ready"}}));
    ready("https://evil.example");expect(connect).not.toHaveBeenCalled();
    ready("https://valkyrlabs.com");expect(connect).toHaveBeenCalledWith(expect.objectContaining({type:"connect"}),"https://valkyrlabs.com",[{}]);
    response.onmessage({data:{type:"connected"}});expect(send).toHaveBeenCalledWith({type:"blueprintLoad"});
    response.onmessage({data:{type:"snapshot",id:"unrequested",specification:edit}});
    w.dispatchEvent(new w.MessageEvent("message",{source:frame,origin:"https://valkyrlabs.com",data:{type:"blueprintSave",specification:edit}}));
    expect(send).toHaveBeenCalledTimes(1);
  }finally{dom.window.close();}
});
it("reviews only the host-pinned Application and resolves a Studio target from canonical bindings",async()=>{
  const operation = {get:{operationId:"listInvoices",responses:{"200":{description:"ok"}}}};
  const source={...spec,paths:{"/invoices":operation}};
  const draft={...source,paths:{}};
  open(); transport.mockResolvedValueOnce({data:{...doc,specification:source}});
  await receive({type:"blueprintLoad"});
  transport.mockResolvedValueOnce({data:{applicationId:id,specId:rev,etag:doc.etag,truncated:false,bindings:[{operationId:"listInvoices",workflowId:next,workflowVersionId:id,executionId:rev}]}});
  await receive({type:"blueprintReview",applicationId:next,bindings:[],specification:draft});
  expect(transport.mock.calls[1][0].url).toBe(backend+"/thorapi/applications/"+id+"/openapi/consumers?specId="+rev+"&etag="+doc.etag);
  const review=post.mock.calls.map(([m])=>m).find(m=>m.type==="blueprintImpact");
  expect(review.rows[0]).toMatchObject({route:"GET /invoices",kind:"Removed",consumers:[{workflowId:next,workflowVersionId:id,executionId:rev,index:0}]});
  await receive({type:"blueprintInspectConsumer",reviewId:"wrong",index:0,workflowId:id});
  expect(navigate).not.toHaveBeenCalled();
  await receive({type:"blueprintInspectConsumer",reviewId:review.reviewId,index:0,workflowId:id});
  expect(navigate).toHaveBeenCalledWith({backend,workflowId:next,workflowVersionId:id,executionId:rev});
  await receive({type:"blueprintInspectConsumer",reviewId:review.reviewId,index:0,versionOnly:true});
  expect(navigate).toHaveBeenLastCalledWith({backend,workflowId:next,workflowVersionId:id});
});
