import { mkdtemp, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import {
  commandWithJavaHome,
  detectProjectTool,
  discoverProjectRuntime,
  localProjectUrl,
  parseJavaMajorVersion,
} from "./projectRuntime";

describe("generated project runtime discovery", () => {
  it("uses the ThorAPI artifact layout to find the split backend and UI", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-project-"));
    await mkdir(path.join(root, "spring-server"));
    await mkdir(path.join(root, "ui"));
    await writeFile(path.join(root, "spring-server", "pom.xml"), "<project />");
    await writeFile(path.join(root, "ui", "package.json"), "{}");
    await writeFile(
      path.join(root, "thorapi-artifact-layout.json"),
      JSON.stringify({
        sourceRoots: [
          { path: "spring-server", kind: "backend-source" },
          { path: "ui", kind: "frontend-host-source" },
        ],
      }),
    );

    const layout = await discoverProjectRuntime(root);

    expect(layout.backend).toEqual({
      directory: path.join(root, "spring-server"),
      tool: "maven",
    });
    expect(layout.frontend).toEqual({
      directory: path.join(root, "ui"),
      tool: "node",
    });
  });

  it("falls back to conventional generated source directories", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-project-"));
    await mkdir(path.join(root, "backend"));
    await mkdir(path.join(root, "frontend"));
    await writeFile(path.join(root, "backend", "build.gradle.kts"), "");
    await writeFile(path.join(root, "frontend", "package.json"), "{}");

    const layout = await discoverProjectRuntime(root);

    expect(layout.backend?.tool).toBe("gradle");
    expect(layout.frontend?.tool).toBe("node");
  });

  it("detects supported build tools", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "valoride-project-"));
    await writeFile(path.join(root, "package.json"), "{}");
    expect(await detectProjectTool(root)).toBe("node");
  });

  it("opens generated UIs on the legacy-compatible loopback hostname", () => {
    expect(localProjectUrl(5173)).toBe("http://localhost:5173");
  });
});

describe("Java runtime compatibility", () => {
  it("parses legacy and modern Java version output", () => {
    const cases: [string, number][] = [
      ['openjdk version "21.0.11" 2026-04-21 LTS', 21],
      ['java version "17.0.12"', 17],
      ['java version "1.8.0_412"', 8],
      ['openjdk version "26" 2026-03-17', 26],
    ];
    for (const [output, expected] of cases) {
      expect(parseJavaMajorVersion(output)).toBe(expected);
    }
  });

  it("pins JAVA_HOME and PATH on the actual build command", () => {
    expect(
      commandWithJavaHome(
        "mvn spring-boot:run",
        "/Applications/Java's JDK 21/Contents/Home",
      ),
    ).toBe(
      `env JAVA_HOME='/Applications/Java'"'"'s JDK 21/Contents/Home' PATH='/Applications/Java'"'"'s JDK 21/Contents/Home/bin':"$PATH" mvn spring-boot:run`,
    );
  });
});
