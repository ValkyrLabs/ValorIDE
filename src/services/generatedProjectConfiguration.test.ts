import fs from "fs/promises";
import os from "os";
import path from "path";
import { ts } from "ts-morph";
import { addJsonConfigValue, connectGeneratedSources, initializeGeneratedProject } from "./generatedProjectConfiguration";
import { discoverProjectRuntime, projectCommand } from "../integrations/explorer/projectRuntime";

describe("generated project source integration", () => {
  let root: string;
  const write = async (relative: string, data: string) => { const file = path.join(root, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); };
  beforeEach(async () => { root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-config-"))); });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));
  const parse = async (relative: string) => ts.parseConfigFileTextToJson(relative, await fs.readFile(path.join(root, relative), "utf8")).config;

  it("adds JSONC options without losing comments, values or trailing commas and is repeatable", () => {
    const original = '{\n// preserve my compiler choices\n"compilerOptions": {"strict": true,},\n"include": ["custom/**/*", /* keep this comment */],\n}\n';
    let updated = addJsonConfigValue(original, ["compilerOptions", "paths", "@generated/*"], ["generated/*"]);
    updated = addJsonConfigValue(updated, ["include"], ["generated/**/*"]);
    expect(updated).toContain("// preserve my compiler choices"); expect(updated).toContain("/* keep this comment */");
    expect(ts.parseConfigFileTextToJson("tsconfig.json", updated).config).toMatchObject({ compilerOptions: { strict: true, paths: { "@generated/*": ["generated/*"] } }, include: ["custom/**/*", "generated/**/*"] });
    expect(addJsonConfigValue(updated, ["include"], ["generated/**/*"])).toBe(updated);
  });

  it("initializes an absent canonical TS/Java project and selects the actual runnable module rather than its reactor", async () => {
    await initializeGeneratedProject(root, "Example", "1.2.0");
    expect(await parse("tsconfig.json")).toMatchObject({ compilerOptions: { noEmit: true, moduleResolution: "Bundler" }, include: ["**/*"] });
    expect(await fs.readFile(path.join(root, "pom.xml"), "utf8")).toContain("<module>app</module>");
    const runtime = await discoverProjectRuntime(root);
    expect(runtime.build?.directory).toBe(root); expect(runtime.backend?.directory).toBe(path.join(root, "app"));
    expect(await projectCommand(runtime.backend!, "run")).toBe("mvn compile && java -cp target/classes valoride.local.Main");
    expect(await projectCommand(runtime.build!, "build")).toBe("mvn -DskipTests install");
    await initializeGeneratedProject(root, "Example", "1.2.0");
    expect((await fs.readFile(path.join(root, "app/src/main/java/valoride/local/Main.java"), "utf8")).match(/class Main/g)).toHaveLength(1);
  });

  it("preserves existing tsconfig, Java source and POM while exposing generated libraries across folders", async () => {
    const project = path.join(root, "projects/Example-v1.0.0");
    await write("projects/Example-v1.0.0/typescript-redux-query/model/Thing.ts", "export interface Thing { name: string }\n");
    await write("projects/Example-v1.0.0/bundle-assets/component-library/components/index.ts", "export const Widget = 1;\n");
    await write("projects/Example-v1.0.0/library/src/main/java/example/Thing.java", "package example; public class Thing {}\n");
    await write("projects/Example-v1.0.0/library/pom.xml", "<project><modelVersion>4.0.0</modelVersion><groupId>example</groupId><artifactId>generated-library</artifactId><version>1.0.0</version></project>");
    const custom = '{\n// custom settings\n"compilerOptions":{"strict":true,"baseUrl":"src","paths":{"@custom/*":["custom/*"]}},"include":["src/**/*"]\n}\n';
    await write("tsconfig.json", custom);
    await write(".vscode/settings.json", '{"java.project.sourcePaths":["src/main/java"],"java.project.referencedLibraries":{"include":["lib/custom.jar"],"exclude":["lib/private.jar"]}}');
    const pom = "<project><modelVersion>4.0.0</modelVersion><groupId>local</groupId><artifactId>consumer</artifactId><version>1.0</version><build><plugins><!-- custom plugin --></plugins></build></project>";
    await write("pom.xml", pom);
    const warnings = await connectGeneratedSources(project, root);
    const config = await parse("tsconfig.json");
    expect(config.compilerOptions.strict).toBe(true); expect(config.compilerOptions.baseUrl).toBe("src");
    expect(config.compilerOptions.paths["@custom/*"]).toEqual(["custom/*"]);
    expect(config.compilerOptions.paths["@thorapi/model/*"]).toEqual(["../projects/Example-v1.0.0/typescript-redux-query/model/*"]);
    expect(await fs.readFile(path.join(root, "tsconfig.json"), "utf8")).toContain("// custom settings");
    const settings = await parse(".vscode/settings.json");
    expect(settings["java.project.sourcePaths"]).toContain("projects/Example-v1.0.0/library/src/main/java");
    expect(settings["java.project.referencedLibraries"].exclude).toEqual(["lib/private.jar"]);
    expect(settings["java.project.referencedLibraries"].include).toContain("lib/custom.jar");
    const connectedPom = await fs.readFile(path.join(root, "pom.xml"), "utf8");
    expect(connectedPom).toContain("<!-- custom plugin -->"); expect(connectedPom).toContain("<artifactId>generated-library</artifactId>");
    expect(warnings.join(" ")).toMatch(/install/i);
    const command = await projectCommand({ directory: root, tool: "maven" }, "build");
    expect(command).toContain("mvn -f 'projects/Example-v1.0.0/library/pom.xml' -DskipTests install && mvn -DskipTests install");
    await connectGeneratedSources(project, root);
    expect(await fs.readFile(path.join(root, "pom.xml"), "utf8")).toBe(connectedPom);
  });

  it("keeps invalid/conflicting user configuration and reports a repair instead of replacing it", async () => {
    await write("typescript-redux-query/model/Thing.ts", "export type Thing = string;");
    await write("tsconfig.json", '{"compilerOptions":{"paths":{"@thorapi/model":["mine"]}}}');
    await write(".vscode/settings.json", "invalid config");
    const warnings = await connectGeneratedSources(root, root);
    expect((await parse("tsconfig.json")).compilerOptions.paths["@thorapi/model"]).toEqual(["mine"]);
    expect(await fs.readFile(path.join(root, ".vscode/settings.json"), "utf8")).toBe("invalid config");
    expect(warnings.join(" ")).toMatch(/kept existing.*mapping/); expect(warnings.join(" ")).toMatch(/fix.*JSON/i);
  });

  it("runs a Vite dev script, avoids reinstalling dependencies on reconnect, and errors for a library-only package", async () => {
    await write("package.json", '{"scripts":{"dev":"vite","build":"vite build"}}');
    await fs.mkdir(path.join(root, "node_modules"));
    expect(await projectCommand({ directory: root, tool: "node" }, "run")).toBe("npm run dev");
    expect(await projectCommand({ directory: root, tool: "node" }, "build")).toBe("npm run build");
    await write("package.json", "{}");
    await expect(projectCommand({ directory: root, tool: "node" }, "run")).rejects.toThrow(/client library cannot run/i);
  });

  it("keeps Spring Boot library JARs alongside executables and preserves existing plugin configuration", async () => {
    const plugin = '<plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId><configuration><!-- keep boot options --><mainClass>example.App</mainClass></configuration><executions><execution><goals><goal>repackage</goal></goals></execution></executions></plugin>';
    await write("spring-server/pom.xml", `<project><modelVersion>4.0.0</modelVersion><groupId>example</groupId><artifactId>boot-library</artifactId><version>1.2.0</version><build><plugins>${plugin}</plugins></build></project>`);
    await write("spring-server/src/main/java/example/Thing.java", "package example; public class Thing {}\n");
    await initializeGeneratedProject(root, "Boot App", "1.2.0");
    const pom = await fs.readFile(path.join(root, "spring-server/pom.xml"), "utf8");
    expect(pom).toContain("<!-- keep boot options -->"); expect(pom).toContain("<mainClass>example.App</mainClass>");
    expect(pom).toContain("<classifier>exec</classifier>"); expect(pom).toContain("<goal>repackage</goal>");
    await initializeGeneratedProject(root, "Boot App", "1.2.0");
    expect(await fs.readFile(path.join(root, "spring-server/pom.xml"), "utf8")).toBe(pom);
    await fs.writeFile(path.join(root, "spring-server/pom.xml"), pom.replace("<classifier>exec</classifier>", "<classifier>custom-app</classifier>"));
    await initializeGeneratedProject(root, "Boot App", "1.2.0");
    expect(await fs.readFile(path.join(root, "spring-server/pom.xml"), "utf8")).toContain("<classifier>custom-app</classifier>");
  });

  it("reports unresolved coordinates and an unclassified Boot artifact instead of creating a broken dependency", async () => {
    await write("pom.xml", '<project><modelVersion>4.0.0</modelVersion><groupId>consumer</groupId><artifactId>consumer</artifactId><version>1</version></project>');
    await write("generated/boot/pom.xml", '<project><modelVersion>4.0.0</modelVersion><groupId>example</groupId><artifactId>boot-library</artifactId><version>1</version><build><plugins><plugin><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build></project>');
    await write("generated/unresolved/pom.xml", '<project><modelVersion>4.0.0</modelVersion><groupId>${group}</groupId><artifactId>unresolved</artifactId><version>1</version></project>');
    const warnings = await connectGeneratedSources(path.join(root, "generated"), root);
    expect(warnings.join(" ")).toMatch(/BOOT-INF/); expect(warnings.join(" ")).toMatch(/resolve Maven/);
    expect(await fs.readFile(path.join(root, "pom.xml"), "utf8")).not.toContain("<dependencies>");
  });

  it("handles empty Boot configuration while leaving comments, profiles and plugin management intact", async () => {
    const inactive = '<plugin><artifactId>spring-boot-maven-plugin</artifactId><configuration/></plugin>';
    const profile = `<profiles><profile><id>optional</id><build><plugins>${inactive}</plugins></build></profile></profiles>`;
    const management = `<pluginManagement><plugins>${inactive}</plugins></pluginManagement>`;
    const active = '<plugin><artifactId>spring-boot-maven-plugin</artifactId><!-- <classifier>comment-only</classifier> --><configuration/></plugin>';
    await write("boot/src/main/java/example/Thing.java", "package example; public class Thing {}\n");
    await write("boot/pom.xml", `<project><modelVersion>4.0.0</modelVersion><groupId>example</groupId><artifactId>boot</artifactId><version>1</version>${profile}<build>${management}<plugins>${active}</plugins></build></project>`);
    await initializeGeneratedProject(root, "Boot", "1");
    const pom = await fs.readFile(path.join(root, "boot/pom.xml"), "utf8");
    expect(pom).toContain(profile); expect(pom).toContain(management);
    expect(pom).toContain('<!-- <classifier>comment-only</classifier> -->');
    expect(pom.match(/<classifier>exec<\/classifier>/g)).toHaveLength(1);
    expect(pom).toContain('<configuration><classifier>exec</classifier></configuration>');
    await initializeGeneratedProject(root, "Boot", "1");
    expect(await fs.readFile(path.join(root, "boot/pom.xml"), "utf8")).toBe(pom);
  });
});
