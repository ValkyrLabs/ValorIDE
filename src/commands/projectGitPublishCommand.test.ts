import * as vscode from "vscode";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { registerProjectGitPublishCommand } from "./projectGitPublishCommand";
import { registerProjectGitPullCommand } from "./projectGitPullCommand";
import { authorizedGitSourceConnections, applicationSourceSelection, fetchAndSelectPushedRevision } from "../services/projectSourceRevision";
import { getSecret } from "../core/storage/state";

jest.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({scheme:"file",fsPath,toString:()=>`file:${fsPath}`}) },
  commands: { registerCommand: jest.fn() }, ProgressLocation: { Notification: 15 },
  extensions: { getExtension: jest.fn() }, workspace: { isTrusted: true, textDocuments: [] },
  window: { showWarningMessage: jest.fn(), showErrorMessage: jest.fn(), showInformationMessage: jest.fn(), withProgress: jest.fn(), showQuickPick: jest.fn() },
}));
jest.mock("../core/storage/state", () => ({getSecret: jest.fn()}));
jest.mock("../utils/serverValkyraiHost", () => ({getValkyraiBasePath: () => "https://api.example/v1"}));
jest.mock("../services/projectSourceRevision", () => ({
  authorizedGitSourceConnections: jest.fn(), applicationSourceSelection: jest.fn(), fetchAndSelectPushedRevision: jest.fn(),
}));

const applicationId = "11111111-1111-4111-8111-111111111111", projectId = "22222222-2222-4222-8222-222222222222";
const run = (cwd: string, ...args: string[]) => execFileSync("git", ["-C", cwd, ...args], {stdio:["ignore","pipe","pipe"], encoding:"utf8"}).trim();
const uri = (fsPath: string) => ({ scheme:"file", fsPath, toString:()=>`file:${fsPath}` } as vscode.Uri);

describe("one-click generated Application GitHub sync", () => {
  let dir: string, app: string, generated: string, bare: string, push: () => Promise<any>, api: any, repo: any, hosted: jest.Mock;
  let state: Map<string, unknown>;
  beforeEach(async () => {
    jest.resetAllMocks();
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-publish-command-")));
    app = path.join(dir,"app"); generated=app; bare = path.join(dir,"remote.git");
    await fs.mkdir(app); run(dir,"init","-q"); run(dir,"init","-q","--bare",bare);
    await fs.writeFile(path.join(app,".valoride-generation.json"), JSON.stringify({applicationId, applicationName:"Demo", applicationVersion:"1",files:{}, schemaVersion:2}));
    await fs.writeFile(path.join(app,"source.ts"),"initial"); await fs.writeFile(path.join(app,".env"),"private fixture");
    await fs.writeFile(path.join(dir,"outside.txt"),"private parent work");
    state = new Map(); hosted=jest.fn();
    repo = {
      rootUri:uri(app), state:{ HEAD:{name:"main"}, remotes:[] },
      status:async () => {
        let head: string | undefined;
        try { head=run(app,"rev-parse","--verify","HEAD"); } catch { /* unborn */ }
        repo.state.HEAD={name:run(app,"symbolic-ref","--short","HEAD"),commit:head};
      },
      add:jest.fn(async (files:string[])=>{ run(app,"add","-A","--",...files); }),
      commit:jest.fn(async (message:string)=>{run(app,"-c","user.name=Test","-c","user.email=test@example.invalid","-c","commit.gpgsign=false","commit","-qm",message);}),
      // Test transport stays in the temporary local bare repository; never contact GitHub.
      push:jest.fn(async (_remote:string,refspec:string)=>{run(app,"push","-q",bare,refspec);}),
      fetch:jest.fn(async ({ref}:{ref:string})=>{run(app,"fetch","--no-tags",bare,ref);}),
      getRemoteRefs:async ()=>run(bare,"for-each-ref","--format=%(refname:short) %(objectname)","refs/heads").split("\n").filter(Boolean).map(line=>{
        const [name,commit]=line.split(" ");return {name,commit};
      }),
      addRemote:async (name:string,url:string)=>{run(app,"remote","add",name,url);repo.state.remotes.push({name,fetchUrl:url,pushUrl:url});},
    };
    api={git:{path:"git"},repositories:[{rootUri:uri(dir)}],openRepository:jest.fn(),init:jest.fn(async ()=>{
      run(app,"init","-q","-b","main");api.repositories.push(repo);return repo;
    })};
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue({isActive:true,exports:{getAPI:()=>api}});
    (vscode.window.withProgress as jest.Mock).mockImplementation((_opts,callback)=>callback({report:jest.fn()}));
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue("Enable and sync");
    (getSecret as jest.Mock).mockResolvedValue("test-session");
    (authorizedGitSourceConnections as jest.Mock).mockResolvedValue({bindings:[{repository:"example/demo",bindingId:"binding"}],projects:[{projectId,name:"Test"}]});
    (applicationSourceSelection as jest.Mock).mockResolvedValue({applicationId});
    (fetchAndSelectPushedRevision as jest.Mock).mockImplementation(async options => ({applicationId,projectId,commitSha:options.commitSha,revisionRef:"test-revision"}));
    (vscode.workspace as any).textDocuments=[];
    (vscode.workspace as any).workspaceFolders=[];
    registerProjectGitPublishCommand({workspaceState:{get:(k:string)=>state.get(k),update:async (k:string,v:unknown)=>{state.set(k,v);} }} as any,
      {appendLine:jest.fn()} as any,()=>uri(generated),hosted);
    push=(vscode.commands.registerCommand as jest.Mock).mock.calls[0][1];
  });
  afterEach(async ()=>{await fs.rm(dir,{recursive:true,force:true});});

  it("pulls a collaborator's next commit through the same app toolbar without publishing or requesting a second refresh",async ()=>{
    const first = await push();
    const other = path.join(dir,"collaborator");
    run(dir,"clone","-qb","main",bare,other);
    await fs.writeFile(path.join(other,"source.ts"),"collaborator change");
    run(other,"add","source.ts");
    run(other,"-c","user.name=Test","-c","user.email=test@example.invalid","-c","commit.gpgsign=false","commit","-qm","edit");
    run(other,"push","-q",bare,"main");
    registerProjectGitPullCommand({workspaceState:{get:(k:string)=>state.get(k),update:async(k:string,v:unknown)=>{state.set(k,v);}}} as any,()=>uri(generated));
    const pull = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(([id]) => id === "valoride.projects.pullSource")[1];
    expect(await pull(uri(app),projectId)).toBeUndefined(); // stale webview card: wrong app, no mutation
    expect(run(app,"rev-parse","HEAD")).toBe(first.commitSha);
    const next = await pull(uri(app),applicationId);
    expect(next).toMatchObject({commit:run(other,"rev-parse","HEAD"),changed:true});
    expect(await fs.readFile(path.join(app,"source.ts"),"utf8")).toBe("collaborator change");
    expect(hosted).toHaveBeenCalledTimes(1);
  });

  it("initializes a dedicated nested checkout, saves only app buffers, then repeatedly pushes verified commits with no further prompts",async ()=>{
    const save=jest.fn(async ()=>{await fs.writeFile(path.join(app,"source.ts"),"saved editor");return true;});
    const otherSave=jest.fn();
    (vscode.workspace as any).textDocuments=[{uri:uri(path.join(app,"source.ts")),isDirty:true,save},{uri:uri(path.join(dir,"outside.txt")),isDirty:true,save:otherSave}];
    const first=await push();
    expect(first?.commitSha).toEqual(run(bare,"rev-parse","main"));
    expect(run(bare,"show","main:source.ts")).toBe("saved editor");
    expect(run(bare,"ls-tree","-r","--name-only","main")).toBe("source.ts");
    expect(save).toHaveBeenCalled();expect(otherSave).not.toHaveBeenCalled();
    expect(run(dir,"status","--short")).toContain("?? outside.txt");
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({detail:expect.stringMatching(/consume credits/)}),expect.any(String));
    (vscode.workspace as any).textDocuments=[];
    await fs.writeFile(path.join(app,"extra.ts"),"next");await fs.unlink(path.join(app,"source.ts"));
    const second=await push();
    expect(second?.commitSha).toEqual(run(bare,"rev-parse","main"));expect(second.commitSha).not.toBe(first.commitSha);
    expect(run(bare,"ls-tree","-r","--name-only","main")).toBe("extra.ts");
    expect(api.init).toHaveBeenCalledTimes(1);expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    expect(hosted).toHaveBeenLastCalledWith(expect.objectContaining({branch:"main",repository:"example/demo",revision:expect.objectContaining({commitSha:second.commitSha})}));
  });

  it("never adopts the parent repo or pushes when the user cancels setup",async ()=>{
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
    expect(await push()).toBeUndefined();expect(api.init).not.toHaveBeenCalled();expect(hosted).not.toHaveBeenCalled();
  });

  it("syncs authored host code and generated code together only in a matching bound workspace repo",async ()=>{
    generated=path.join(app,"thorapi","Demo-v1");
    await fs.mkdir(generated,{recursive:true});
    await fs.rename(path.join(app,".valoride-generation.json"),path.join(generated,".valoride-generation.json"));
    await fs.writeFile(path.join(generated,"generated.ts"),"generated code");
    await fs.writeFile(path.join(app,".valoride-blueprint.json"),JSON.stringify({applicationId,schemaVersion:1,backend:"https://api.example/v1",specificationPath:"openapi.yaml",baselineHash:"a".repeat(64)}));
    run(app,"init","-q","-b","main");await repo.addRemote("origin","https://github.com/example/demo.git");
    api.repositories.push(repo);(vscode.workspace as any).workspaceFolders=[{uri:uri(app)}];
    const result=await push();
    expect(result?.commitSha).toBe(run(bare,"rev-parse","main"));expect(api.init).not.toHaveBeenCalled();
    expect(run(bare,"ls-tree","-r","--name-only","main").split("\n")).toEqual(["source.ts","thorapi/Demo-v1/generated.ts"]);
    expect(fetchAndSelectPushedRevision).toHaveBeenCalledWith(expect.objectContaining({sourceDirectory:"",commitSha:result.commitSha}));
  });

  it("pairs a fresh clone using committed lineage and the authorized remote, then syncs all authored app files without repeat prompts",async ()=>{
    generated=path.join(app,"thorapi","Demo-v1"); await fs.mkdir(path.join(generated,"spring-server"),{recursive:true});
    await fs.unlink(path.join(app,".valoride-generation.json"));
    const lineage=path.join(generated,"generation-lineage.json");
    await fs.writeFile(lineage,JSON.stringify({applicationId,schemaVersion:1,packageSha256:"b".repeat(64)}));
    await fs.writeFile(path.join(generated,"spring-server","pom.xml"),"<project/>");
    run(app,"init","-q","-b","main");await repo.addRemote("origin","https://github.com/example/demo.git");
    api.repositories.push(repo);(vscode.workspace as any).workspaceFolders=[{uri:uri(app)}];
    // A locally copied receipt, even alongside the correct remote, cannot pair a clone.
    expect(await push()).toBeUndefined(); expect(api.init).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    run(app,"add","thorapi");await repo.commit("canonical seed");
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce(undefined);
    expect(await push()).toBeUndefined();expect(repo.push).not.toHaveBeenCalled();expect(state.size).toBe(0);
    (vscode.window.showWarningMessage as jest.Mock).mockImplementation(async (_title,_opts,choice)=>choice);
    const first=await push();expect(first?.commitSha).toBe(run(bare,"rev-parse","main"));
    expect(run(bare,"show","main:source.ts")).toBe("initial");
    expect(run(bare,"show","main:thorapi/Demo-v1/spring-server/pom.xml")).toBe("<project/>");
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringMatching(/Demo.*example\/demo/),
      expect.objectContaining({detail:expect.stringContaining(app)}),"Pair authored workspace");
    (vscode.window.showWarningMessage as jest.Mock).mockClear();
    await fs.writeFile(path.join(app,"new.ts"),"authored");
    const second=await push(); expect(second?.commitSha).toBe(run(bare,"rev-parse","main"));expect(run(bare,"show","main:new.ts")).toBe("authored");
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();expect(api.init).not.toHaveBeenCalled();
    await fs.writeFile(lineage,JSON.stringify({applicationId,schemaVersion:1,packageSha256:"c".repeat(64)}));
    expect(await push()).toBeUndefined();expect(run(bare,"rev-parse","main")).toBe(second.commitSha);
  });

  it("fast-forwards an empty index to a noncolliding remote seed without losing its commit",async ()=>{
    run(dir,"add","outside.txt");run(dir,"-c","user.name=Test","-c","user.email=test@example.invalid","-c","commit.gpgsign=false","commit","-qm","fixture");
    run(dir,"push","-q",bare,"HEAD:refs/heads/main");
    const original=run(bare,"rev-parse","main");
    const result=await push();
    expect(result?.commitSha).toBe(run(bare,"rev-parse","main"));
    expect(run(bare,"rev-parse","main^")).toBe(original);
    expect(run(bare,"show","main:outside.txt")).toBe("private parent work");
    expect(run(bare,"show","main:source.ts")).toBe("initial");
  });

  it("never overwrites a colliding seed file, even one ignored by Git",async ()=>{
    await fs.writeFile(path.join(dir,"source.ts"),"remote");
    await fs.writeFile(path.join(app,".gitignore"),"source.ts\n");
    run(dir,"add","source.ts");run(dir,"-c","user.name=Test","-c","user.email=test@example.invalid","-c","commit.gpgsign=false","commit","-qm","seed");
    run(dir,"push","-q",bare,"HEAD:refs/heads/main");
    const before=run(bare,"rev-parse","main");
    expect(await push()).toBeUndefined();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringMatching(/already has history.*Clone its branch/));
    expect(await fs.readFile(path.join(app,"source.ts"),"utf8")).toBe("initial");
    expect(run(bare,"rev-parse","main")).toBe(before);expect(repo.commit).not.toHaveBeenCalled();expect(hosted).not.toHaveBeenCalled();
  });

  it("does not reuse hosted sync consent across signed-in sessions",async ()=>{
    await push();
    (getSecret as jest.Mock).mockResolvedValue("different-session");
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce(undefined);
    expect(await push()).toBeUndefined();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2);
    expect(repo.push).toHaveBeenCalledTimes(1);
    expect([...state.keys()].join(" ")).not.toMatch(/test-session|different-session/);
  });

  it("does not attempt a hosted reload after failed push or failed source selection",async ()=>{
    repo.push.mockRejectedValueOnce(new Error("rejected"));
    expect(await push()).toBeUndefined();expect(fetchAndSelectPushedRevision).not.toHaveBeenCalled();
    expect(hosted).not.toHaveBeenCalled();
    (fetchAndSelectPushedRevision as jest.Mock).mockRejectedValueOnce(new Error("source service unavailable"));
    expect(await push()).toBeUndefined();expect(repo.commit).toHaveBeenCalledTimes(1);
    expect(hosted).not.toHaveBeenCalled();expect(vscode.window.showErrorMessage).toHaveBeenLastCalledWith(expect.stringMatching(/GitHub already has.*Source handoff incomplete/));
  });
});
