import { githubRepositoryName, planProjectGitPublish, ProjectGitRepository, publishProjectWithBuiltinGit } from "./projectGitPublish";

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
    };
  });

  it("uses the explicitly chosen repo/branch and stages only project source, then returns an immutable commit without inventing a server snapshot", async () => {
    const plan = await planProjectGitPublish(repository, "/repo/application", "origin", "customer-app");
    const result = await publishProjectWithBuiltinGit(repository, "/repo/application", "origin", "customer-app", "Customer source update", plan);
    expect(repository.add).toHaveBeenCalledWith(["/repo/application/runtime/adapter.py", "/repo/application/src/app.ts"]);
    expect(repository.commit).toHaveBeenCalledWith("Customer source update");
    expect(repository.push).toHaveBeenCalledWith("origin", "customer-app");
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
    expect(repository.state.HEAD!.commit).toBe("b".repeat(40));expect(repository.commit).toHaveBeenCalledTimes(1);expect(repository.push).toHaveBeenCalledWith("origin", "customer-app");
  });

  it("recognizes existing GitHub HTTPS/SSH remotes and rejects other hosts or secret-bearing URLs", () => {
    expect(githubRepositoryName("https://github.com/customer/application.git")).toBe("customer/application");
    expect(githubRepositoryName("git@github.com:customer/application.git")).toBe("customer/application");
    for (const remote of ["https://user:token@github.com/customer/application", "https://github.com/customer/application?token=private", "https://another.example/customer/application", "file:///local/repository"]) expect(githubRepositoryName(remote)).toBeUndefined();
  });
});
