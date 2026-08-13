import {
  adoptiumAssetUrl,
  nodeArchiveName,
  selectNodeLtsRelease,
} from "./ManagedProjectRuntimes";

describe("managed project runtime metadata", () => {
  it("requests the Eclipse Temurin JDK 21 package for Apple Silicon", () => {
    expect(adoptiumAssetUrl("mac", "aarch64")).toContain(
      "assets/latest/21/hotspot?architecture=aarch64",
    );
    expect(adoptiumAssetUrl("mac", "aarch64")).toContain("vendor=eclipse");
  });

  it("selects an official compatible LTS Node release", () => {
    const release = selectNodeLtsRelease(
      [
        { version: "v26.0.0", lts: false, files: ["osx-arm64-tar"] },
        { version: "v24.1.0", lts: "Krypton", files: ["osx-arm64-tar"] },
      ],
      "darwin",
      "arm64",
    );
    expect(release?.version).toBe("v24.1.0");
    expect(nodeArchiveName(release!.version, "darwin", "arm64")).toBe(
      "node-v24.1.0-darwin-arm64.tar.gz",
    );
  });
});
