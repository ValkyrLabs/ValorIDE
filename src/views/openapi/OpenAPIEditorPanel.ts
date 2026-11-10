import { randomUUID } from "node:crypto";
import { compareBlueprintOperations, readBlueprintConsumers, type Consumer } from "../../services/blueprintContractImpact";
import { openWorkflowStudioTarget } from "../../integrations/workflows/workflowStudioNavigation";
import * as vscode from "vscode";
import path from "path";
import * as yaml from "js-yaml";
import { getSecret } from "@core/storage/state";
import { downloadApplicationArtifact } from "@services/applicationArtifactDownload";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "@services/valkyrai/ValkyrLabsRtkApi";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { checkedDocument, parseProjectSpecification, PROJECT_UUID, ProjectBlueprintDocument, specificationHash } from "../../services/projectBlueprintSync";
import { hostedBlueprintHtml } from "./hostedBlueprintHtml";
import { blueprintGenerationTarget } from "../../services/blueprintGenerationTarget";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { canonicalProjectFolder } from "../../services/generatedProjectInstall";

export interface OpenAPIEditorOptions {
  applicationId?: string;
  applicationName?: string;
  deploymentUrl?: string; // older callers; never used as a browser destination
  selectedWorkspace?: vscode.Uri;
  selectedProject?: vscode.Uri;
  localSpec?: vscode.Uri;
}
const filters = { "OpenAPI documents": ["yaml", "yml", "json"] };
const limit = 4 * 1024 * 1024;
const blank = () => ({openapi:"3.0.3",info:{title:"Untitled API",version:"1.0.0"},paths:{}});
const asSpec = (value: unknown) => parseProjectSpecification(Buffer.from(JSON.stringify(value), "utf8"));

export class OpenAPIEditorPanel {
  static readonly viewType = "valoride.openapi.editor";
  private static readonly panels = new Map<string, vscode.WebviewPanel>();

  static open(context: vscode.ExtensionContext, options: OpenAPIEditorOptions = {}) {
    const { applicationId, selectedWorkspace } = options;
    if (applicationId !== undefined && !PROJECT_UUID.test(applicationId)) {
      void vscode.window.showErrorMessage("Select a valid ValkyrAI Application to edit its Blueprint.");
      return;
    }
    const backend = getValkyraiBasePath();
    const key = JSON.stringify([backend,applicationId,selectedWorkspace?.fsPath,options.selectedProject?.fsPath,options.localSpec?.fsPath]);
    const existing = this.panels.get(key);
    if (existing) { existing.reveal(vscode.ViewColumn.Active); return; }
    const panel = vscode.window.createWebviewPanel(this.viewType,
      options.applicationName ? `Blueprint · ${options.applicationName}` : "Blueprint",
      vscode.ViewColumn.Active, {enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[]});
    this.panels.set(key, panel);
    let active = true, busy = false, approvedHost = false, originalSession: string | undefined, canonical: ProjectBlueprintDocument | undefined;
    let filename = "openapi.yaml";
    let impactReview: {id:string; targets:Consumer[]} | undefined;
    const post = async (message: Record<string, unknown>) => { if (active) await panel.webview.postMessage(message); };
    const assertSession = async () => {
      if (!active || getValkyraiBasePath() !== backend) throw new Error("The backend changed or the editor closed. Reopen Blueprint from the original Application.");
      const token = await getSecret(context,"jwtToken");
      if (!active || getValkyraiBasePath() !== backend || !token || (originalSession && originalSession !== token))
        throw new Error("Your ValorIDE session changed. Reopen Blueprint after signing in to the original account.");
      originalSession = token;
      return token;
    };
    const openSession = applicationId ? assertSession().then(() => undefined, (e: unknown) => e) : Promise.resolve(undefined);
    const check = async () => {
      if (!active) throw new Error("Blueprint is closed.");
      if (applicationId) { const failure = await openSession; if (failure) throw failure; await assertSession(); }
    };
    const endpoint = `${backend}/thorapi/applications/${applicationId}/openapi`;
    const headers = () => ({Authorization:`Bearer ${originalSession}`});
    const watchers = [
      context.secrets?.onDidChange(e => { if (applicationId && e.key === "jwtToken") panel.dispose(); }),
      vscode.workspace.onDidChangeConfiguration?.(e => { if (e.affectsConfiguration("valoride.valkyrai.host")) panel.dispose(); }),
    ];
    panel.onDidDispose(() => {
      active = false; watchers.forEach(it => it?.dispose());
      this.panels.delete(key);
    });
    panel.webview.onDidReceiveMessage(async m => {
      if (!["blueprintLoad","blueprintImport","blueprintExport","blueprintSave","blueprintReview","blueprintInspectConsumer"].includes(m?.type) || busy || !active) return;
      busy = true;
      try {
        await check();
        if (m.type !== "blueprintInspectConsumer") impactReview = undefined;
        if (m.type === "blueprintReview") {
          if (!canonical || !applicationId) throw new Error("Open the Blueprint from its saved Application to inspect impact.");
          const draft = asSpec(m.specification);
          const params = new URLSearchParams({specId:canonical.specId, etag:canonical.etag});
          let consumers:Consumer[] = [], partial = true, lookupAvailable = false;
          try {
            const response = await getValkyrLabsRtkApiClient().request<unknown>({
              url:endpoint+"/consumers?"+params,headers:headers(),redirect:"error",responseType:"json",maxResponseBytes:512*1024,
            });
            const registry=readBlueprintConsumers(response.data, {applicationId,specId:canonical.specId,etag:canonical.etag});
            consumers=registry.bindings; partial=registry.truncated; lookupAvailable=true;
          } catch (error) {
            if (error instanceof ValkyrLabsApiError && typeof error.status === "number" && [401,403,409].includes(error.status)) throw error;
          }
          await check();
          const impact=compareBlueprintOperations(canonical.specification,draft,consumers);
          const review={id:randomUUID(),targets:[] as Consumer[]};
          const rows=impact.rows.map((row)=>({...row,consumers:row.consumers.map((target)=>{
            const index=review.targets.push(target)-1;
            return {index,workflowId:target.workflowId,workflowVersionId:target.workflowVersionId,executionId:target.executionId};
          })}));
          impactReview=review;
          await post({type:"blueprintImpact",reviewId:review.id,baseline:canonical.etag,draftHash:specificationHash(draft),
            total:impact.total,truncated:impact.truncated,unresolved:impact.unresolved,partial,lookupAvailable,rows});
        } else if (m.type === "blueprintInspectConsumer") {
          if (!applicationId || !impactReview || m.reviewId!==impactReview.id || !Number.isInteger(m.index) || m.index<0) return;
          const target=impactReview.targets[m.index];
          if (!target) return;
          await check();
          await openWorkflowStudioTarget({backend,workflowId:target.workflowId,...(target.workflowVersionId?{workflowVersionId:target.workflowVersionId}:{}),
            ...(target.executionId && m.versionOnly !== true ? {executionId:target.executionId} : {})});
          await post({type:"blueprintNotice",text:"Opened the registered workflow in Studio."});
        } else if (m.type === "blueprintLoad") {
          if (applicationId) {
            if (!approvedHost && new URL(backend).origin !== "https://api-0.valkyrlabs.com") {
              const choice = await vscode.window.showWarningMessage("Open this server's Blueprint in the hosted ValkyrLabs editor?",
                {modal:true,detail:`The selected document from ${new URL(backend).origin} will be displayed by valkyrlabs.com. Your session credentials remain in ValorIDE.`},"Open hosted editor");
              if (choice !== "Open hosted editor") { panel.dispose(); return; }
              await check(); approvedHost = true;
            }
            const result = await getValkyrLabsRtkApiClient().request<ProjectBlueprintDocument>({
              url:endpoint, headers:headers(), redirect:"error", responseType:"json", maxResponseBytes:8*1024*1024,
            });
            await check(); canonical = checkedDocument(result.data,applicationId); filename = path.basename(canonical.filename);
          }
          await post({type:"blueprintLoaded",document:{specification:canonical?.specification || blank()}});
        } else if (m.type === "blueprintImport") {
          const chosen = await vscode.window.showOpenDialog({title:"Load a local file in the ValkyrLabs hosted Blueprint editor",filters,canSelectMany:false,defaultUri:options.localSpec});
          if (!chosen?.length) { await post({type:"blueprintNotice",text:"Upload cancelled. Draft unchanged."}); return; }
          const file=chosen[0];
          if (file.scheme !== "file" || (await vscode.workspace.fs.stat(file)).size > limit) throw new Error("Choose a local OpenAPI YAML or JSON file no larger than 4 MiB.");
          const spec = parseProjectSpecification(Buffer.from(await vscode.workspace.fs.readFile(file)));
          await check(); filename = path.basename(file.fsPath); await post({type:"blueprintImported",document:{specification:spec}});
        } else if (m.type === "blueprintExport") {
          const spec = asSpec(m.specification);
          const base = selectedWorkspace || vscode.workspace.workspaceFolders?.[0]?.uri;
          const target = await vscode.window.showSaveDialog({title:"Download the current Blueprint draft",filters,
            ...(base ? {defaultUri:vscode.Uri.joinPath(base,path.basename(filename))} : {})});
          if (!target) { await post({type:"blueprintNotice",text:"Download cancelled."}); return; }
          if (target.scheme !== "file" || !/\.(?:json|ya?ml)$/i.test(target.fsPath)) throw new Error("Save the local file with a .yaml, .yml or .json extension.");
          await check();
          await vscode.workspace.fs.writeFile(target,Buffer.from(/\.json$/i.test(target.fsPath)?JSON.stringify(spec,null,2)+"\n":yaml.dump(spec,{noRefs:true,lineWidth:120})));
          await post({type:"blueprintNotice",text:`Downloaded ${path.basename(target.fsPath)}.`});
        } else {
          if (!applicationId || !canonical || !vscode.workspace.isTrusted) throw new Error("Load the selected Application in a trusted workspace before saving.");
          const spec=asSpec(m.specification);
          const regenerate=m.regenerate===true;
          let destination=selectedWorkspace;
          let projectRoot:string|undefined;
          let confirmedInstallRoot:string|undefined;
          if (regenerate) {
            if (!vscode.workspace.workspaceFolders?.length) throw new Error("Open a local workspace to receive the regenerated app.");
            if (!destination && vscode.workspace.workspaceFolders.length > 1) {
              destination=(await vscode.window.showWorkspaceFolderPick({placeHolder:"Choose the workspace for this regenerated application"}))?.uri;
              if (!destination) { await post({type:"blueprintNotice",text:"Regeneration cancelled; draft retained."}); return; }
            }
            destination ||= vscode.workspace.workspaceFolders[0].uri;
            if (destination.scheme !== "file") throw new Error("Choose a local workspace to receive the generated files.");
            const artifactParent=resolveThorapiFolderPath(destination.fsPath);
            const {title,version}=spec.info as {title:string;version:string};
            projectRoot=await blueprintGenerationTarget(destination.fsPath,options.selectedProject?.fsPath,applicationId,title,version,backend,artifactParent);
            confirmedInstallRoot=projectRoot || path.resolve(artifactParent,canonicalProjectFolder(title,version));
            const choice=await vscode.window.showWarningMessage(`Save and regenerate ${options.applicationName || applicationId}?`,
              {modal:true,detail:`Generate the project from this Blueprint revision in ${confirmedInstallRoot}. A successful generation may use credits.`},"Save and regenerate");
            if (choice!=="Save and regenerate") { await post({type:"blueprintNotice",text:"Regeneration cancelled; draft retained."}); return; }
            await check();
          }
          // Never take an ETag or application id from the frame. A stale save is a
          // conflict, not permission to overwrite the newer server document.
          if (specificationHash(spec) !== specificationHash(canonical.specification)) {
            const saved=await getValkyrLabsRtkApiClient().request<ProjectBlueprintDocument>({url:endpoint,method:"PUT",headers:headers(),
              json:{filename,expectedEtag:canonical.etag,specification:spec},responseType:"json",redirect:"error",maxResponseBytes:8*1024*1024});
            await check(); canonical=checkedDocument(saved.data,applicationId);
          }
          await post({type:"blueprintSaved",regenerating:regenerate});
          if (regenerate) {
            const artifact=await downloadApplicationArtifact({applicationId,applicationName:String((canonical.specification.info as any).title),
              expectedSpecId:canonical.specId, selectedWorkspace:destination, selectedProjectRoot:projectRoot,confirmedInstallRoot,
              applicationVersion:String((canonical.specification.info as any).version),
              jwtToken:await assertSession(), assertCurrent:check,
              recoveryDirectory:context.globalStorageUri && path.join(context.globalStorageUri.fsPath,"generation-recovery"),
              onProgress:async status=>post({type:"blueprintProgress",status})});
            await check(); await post({type:"blueprintGenerated",artifact:{extractedPath:artifact.extractedPath}});
          }
        }
      } catch(error) {
        await post({type:"blueprintError",error:error instanceof ValkyrLabsApiError && error.status===409
          ? "The Blueprint changed elsewhere. Download your draft, reload, and reconcile before saving."
          : error instanceof Error ? error.message : "Blueprint operation failed."});
      } finally { busy=false; }
    });
    panel.webview.html=hostedBlueprintHtml(Boolean(applicationId));
  }
}
