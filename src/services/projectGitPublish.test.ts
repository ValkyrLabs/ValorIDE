import { githubRepositoryName, planProjectGitPublish, ProjectGitRepository, publishProjectWithBuiltinGit, resolveProjectGitTarget, readProjectGitChanges, stageProjectGitPaths } from "./projectGitPublish";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

describe("project publish through VS Code's existing Git API", () => {
  let repository: ProjectGitRepository;
  const uri = (fsPath: string) => ({ fsPath }) as any;
  beforeEach(() => {
    repository = {
      rootUri: uri("/repo"),
      state: { HEAD: { name: "customer-app", commit: "a".repeat(40) }, remotes: [{ name: "origin", pushUrl: "git@github.com:customer/application.git" }], indexChanges: [], mergeChanges: [], workingTreeChanges: ["/repo/application/src/app.ts", "/repo/application/runtime/adapter.py", "/repo/application/.env", "/repo/application/.valoride-blueprint.json", "/repo/other-project/user-edit.ts"].map((file) => ({ uri: uri(file) })) },
      status: jest.fn(async () => {}),
      add: jest.fn(async (paths) => { repository.state.indexChanges = paths.map((file) => ({ uri: uri(file) })); }),
      commit: jest.fn(async () => { repository.state.HEAD!.commit = "b".repeat(40); repository.state.indexChanges = []; }),
      push: jest.fn(async () => {}),
      addRemote: jest.fn(), fetch: jest.fn(), getRemoteRefs: jest.fn(async () => [{ name: "customer-app", commit: repository.state.HEAD!.commit }]),
    };
  });

  it("uses the explicitly chosen repo/branch and stages only project source, then returns an immutable commit without inventing a server snapshot", async () => {
    const plan = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    const result = await publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Customer source update", plan);
    expect(repository.add).toHaveBeenCalledWith(["/repo/application/runtime/adapter.py", "/repo/application/src/app.ts"]);
    expect(repository.commit).toHaveBeenCalledWith("Customer source update", {all: false});
    expect(repository.push).toHaveBeenCalledWith("origin", `${"b".repeat(40)}:refs/heads/customer-app`);
    expect(result).toEqual({ repository: "customer/application", branch: "customer-app", commitSha: "b".repeat(40), serverSnapshotRequested: false });
  });

  it("refuses unselected branches, pre-existing staged work, merge conflicts and credential-bearing remote URLs without mutations", async () => {
    await expect(planProjectGitPublish(repository, "/repo/application", "origin", "main")).rejects.toThrow(/checked-out/);
    repository.state.indexChanges = [{ uri: uri("/repo/other-project/user-edit.ts") }];
    await expect(planProjectGitPublish(repository, "/repo/application", "origin", "customer-app")).rejects.toThrow(/current index was preserved/);
    repository.state.indexChanges = []; repository.state.mergeChanges = [{ uri: uri("/repo/application/src/app.ts") }];
    await expect(planProjectGitPublish(repository, "/repo/application", "origin", "customer-app")).rejects.toThrow(/conflicts/);
    repository.state.mergeChanges = []; repository.state.remotes[0].pushUrl = "https://secret@github.com/customer/application.git";
    await expect(planProjectGitPublish(repository, "/repo/application", "origin", "customer-app")).rejects.toThrow(/without embedded credentials/);
    expect(repository.add).not.toHaveBeenCalled(); expect(repository.commit).not.toHaveBeenCalled();expect(repository.push).not.toHaveBeenCalled();
  });

  it("rechecks the reviewed branch and path plan before staging, and detects foreign staged work before commit", async () => {
    const plan = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    repository.state.HEAD!.commit = "c".repeat(40);
    await expect(publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Update", plan)).rejects.toThrow(/changed after review/);
    expect(repository.add).not.toHaveBeenCalled(); repository.state.HEAD!.commit = plan.head;
    (repository.add as jest.Mock).mockImplementation(async () => { repository.state.indexChanges = [{ uri: uri("/repo/foreign.txt") }]; });
    await expect(publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Update", plan)).rejects.toThrow(/staged files changed/);
    expect(repository.commit).not.toHaveBeenCalled();expect(repository.push).not.toHaveBeenCalled();
  });

  it("leaves a committed source revision visible when push fails and never force-pushes or merges", async () => {
    const plan = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    (repository.push as jest.Mock).mockRejectedValueOnce(new Error("push rejected"));
    await expect(publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Update", plan)).rejects.toThrow("push rejected");
    expect(repository.state.HEAD!.commit).toBe("b".repeat(40));expect(repository.commit).toHaveBeenCalledTimes(1);
    repository.state.workingTreeChanges = [];
    const retry = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    await publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Retry", retry);
    expect(repository.commit).toHaveBeenCalledTimes(1); expect(repository.push).toHaveBeenCalledTimes(2);
    expect(repository.push).toHaveBeenCalledWith("origin", `${"b".repeat(40)}:refs/heads/customer-app`);
  });

  it("accepts staged app files and separate untracked changes but never private staged data", async () => {
    repository.state.indexChanges = [{ uri: uri("/repo/application/src/new.ts") }];
    repository.state.untrackedChanges = [{ uri: uri("/repo/application/src/Widget.tsx") }, { uri: uri("/repo/application/.ssh/config") }];
    expect((await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app")).files).toEqual([
      "/repo/application/runtime/adapter.py", "/repo/application/src/Widget.tsx", "/repo/application/src/app.ts", "/repo/application/src/new.ts",
    ]);
    repository.state.indexChanges.push({ uri: uri("/repo/application/.valoride-source-selection.json") });
    await expect(planProjectGitPublish(repository, "/repo/application", "origin", "customer-app")).rejects.toThrow(/current index was preserved/);
  });

  it("refuses to hand off a SHA when the server did not advance the expected ref", async () => {
    (repository.getRemoteRefs as jest.Mock).mockResolvedValue([]);
    const plan = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    await expect(publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Update", plan)).rejects.toThrow(/exact pushed commit/);
  });

  it("requires fetch and push destinations to match an authorized Application binding", () => {
    const binding = [{ bindingId: "authorized", repository: "Customer/Application" }];
    const fetchUrl = "https://github.com/customer/application";
    expect(resolveProjectGitTarget([{name:"origin", fetchUrl, pushUrl:"git@github.com:customer/application.git"}], binding)).toEqual([
      {remote:"origin", bindingId:"authorized",repository:"Customer/Application"},
    ]);
    expect(resolveProjectGitTarget([{name:"origin", fetchUrl:"git@github.com:other/repo",pushUrl:fetchUrl}],binding)).toEqual([]);
  });

  it("stages approved dynamic route and wildcard filenames literally and does not stage adjacent glob matches",async ()=>{
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),"valoride-literal-stage-"));
    const run=(...args:string[])=>execFileSync("git",["-C",dir,...args],{stdio:"pipe",encoding:"utf8"});
    const approved=["app/[id]/page.tsx", ...(process.platform === "win32" ? [] : ["app/*-literal.ts"])];
    try {
      run("init","-q");
      for (const file of [...approved,"app/d/page.tsx","app/neighbor-literal.ts"]) {
        await fs.mkdir(path.dirname(path.join(dir,file)),{recursive:true});await fs.writeFile(path.join(dir,file),"source");
      }
      await stageProjectGitPaths("git",dir,dir,approved.map(f=>path.join(dir,f)));
      expect(run("ls-files","-z").split("\0").filter(Boolean).sort()).toEqual(approved.sort());
      await expect(stageProjectGitPaths("git",dir,dir,[path.join(dir,"app")])).rejects.toThrow(/directory/);
      expect(run("ls-files","-z").split("\0").filter(Boolean).sort()).toEqual(approved);
    } finally {await fs.rm(dir,{force:true,recursive:true});}
  });

  it("enumerates all real Git changes including ignored-by-SCM untracked files, deletes and renames", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-sync-"));
    const run = (...args: string[]) => execFileSync("git", ["-C", dir, ...args], {stdio:"pipe"});
    try {
      run("init", "-q");
      for (const file of ["before.txt", "delete.txt"]) await fs.writeFile(path.join(dir, file), file);
      run("add","."); run("-c","user.email=test@example.invalid","-c","user.name=Test","-c","commit.gpgsign=false","commit","-qm","fixture");
      run("mv","before.txt","after.txt");
      await fs.unlink(path.join(dir, "delete.txt"));
      await fs.mkdir(path.join(dir,"new folder"));
      await fs.writeFile(path.join(dir,"new folder","source.ts"),"source");
      run("config","status.showUntrackedFiles","no");
      const actual = await readProjectGitChanges("git", dir);
      expect(actual.indexChanges.map(c=>path.relative(dir,c.uri.fsPath)).sort()).toEqual(["after.txt","before.txt"]);
      expect(actual.workingTreeChanges.map(c=>path.relative(dir,c.uri.fsPath)).sort()).toEqual(["delete.txt",path.join("new folder","source.ts")]);
    } finally { await fs.rm(dir, {recursive:true,force:true}); }
  });

  it("recognizes existing GitHub HTTPS/SSH remotes and rejects other hosts or secret-bearing URLs", () => {
    expect(githubRepositoryName("https://github.com/customer/application.git")).toBe("customer/application");
    expect(githubRepositoryName("git@github.com:customer/application.git")).toBe("customer/application");
    for (const remote of ["https://user:token@github.com/customer/application", "https://github.com/customer/application?token=private", "https://another.example/customer/application", "file:///local/repository"]) expect(githubRepositoryName(remote)).toBeUndefined();
  });
});
