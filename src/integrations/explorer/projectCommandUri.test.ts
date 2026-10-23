import { resolveProjectCommandUri } from "./projectCommandUri";

const projectUri = {
  scheme: "file",
  fsPath: "/tmp/thorapi/v1.Generated-App",
};

describe("resolveProjectCommandUri", () => {
  it("keeps direct Uri command arguments working", () => {
    expect(resolveProjectCommandUri(projectUri)).toBe(projectUri);
  });

  it("resolves the project tree element passed by inline item buttons", () => {
    const project = {
      name: "v1.Generated-App",
      version: "1",
      uri: projectUri,
    };

    expect(resolveProjectCommandUri(project)).toBe(projectUri);
  });

  it("resolves a TreeItem resourceUri", () => {
    expect(resolveProjectCommandUri({ resourceUri: projectUri })).toBe(
      projectUri,
    );
  });

  it("falls back to the selected project when no command target is supplied", () => {
    const selectedProject = { uri: projectUri };

    expect(resolveProjectCommandUri(undefined, selectedProject)).toBe(
      projectUri,
    );
  });

  it("rejects malformed paths instead of passing them to VS Code APIs", () => {
    expect(resolveProjectCommandUri({ uri: "/tmp/not-a-uri" })).toBeUndefined();
  });
});
