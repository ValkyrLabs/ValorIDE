import fs from "fs/promises";
import path from "path";
import { ts } from "ts-morph";
import { assertNoProjectLinks } from "./generatedProjectInstall";

type ConfigPath = string[];
type ConfigValue = string | boolean | string[] | Record<string, unknown>;
const slash = (value: string) => value.split(path.sep).join("/");
const exists = async (file: string) => fs.access(file).then(() => true, () => false);

function jsonConfig(text: string, file: string): Record<string, any> {
  const parsed = ts.parseConfigFileTextToJson(file, text);
  if (parsed.error || !parsed.config || typeof parsed.config !== "object" || Array.isArray(parsed.config))
    throw new Error(`Cannot update ${file}: fix its JSON syntax, then reconnect the generated project.`);
  return parsed.config;
}

/** Insert only missing properties/array entries. Existing text, comments and user options stay intact. */
export function addJsonConfigValue(text: string, keys: ConfigPath, value: ConfigValue): string {
  const source = ts.parseJsonText("project-config.json", text);
  const object = source.statements[0] && (source.statements[0] as ts.ExpressionStatement).expression;
  if (!object || !ts.isObjectLiteralExpression(object)) throw new Error("Expected a JSON configuration object.");
  const insert = (node: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression, item: string) => {
    const members = ts.isObjectLiteralExpression(node) ? node.properties : node.elements;
    const comma = members.length && !members.hasTrailingComma ? "," : "";
    const end = node.end - 1;
    return text.slice(0, end) + `\n${comma}${item}\n` + text.slice(end);
  };
  let node: ts.ObjectLiteralExpression = object;
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const property = node.properties.find((candidate) => ts.isPropertyAssignment(candidate) && candidate.name.getText(source).replace(/^"|"$/g, "") === key) as ts.PropertyAssignment | undefined;
    if (!property) {
      let nested: unknown = value;
      for (const child of keys.slice(index + 1).reverse()) nested = { [child]: nested };
      return insert(node, `${JSON.stringify(key)}: ${JSON.stringify(nested, null, 2)}`);
    }
    if (index < keys.length - 1) {
      if (!ts.isObjectLiteralExpression(property.initializer)) return text;
      node = property.initializer;
    } else if (Array.isArray(value) && ts.isArrayLiteralExpression(property.initializer)) {
      const existing = jsonConfig(text, "project-config.json");
      const current = keys.reduce((result, part) => result?.[part], existing);
      const additions = value.filter((entry) => !current.includes(entry));
      return additions.length ? insert(property.initializer, additions.map((entry) => JSON.stringify(entry)).join(", ")) : text;
    }
  }
  return text;
}

async function addConfig(file: string, changes: Array<[ConfigPath, ConfigValue]>, warnings: string[]): Promise<void> {
  try {
    await assertNoProjectLinks(path.dirname(file), path.basename(file));
    let text = await fs.readFile(file, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "{}\n";
      throw error;
    });
    jsonConfig(text, file);
    const original = text;
    for (const [keys, value] of changes) {
      const current = keys.reduce((result, key) => result?.[key], jsonConfig(text, file));
      if (Array.isArray(value) && current !== undefined && !Array.isArray(current)) {
        warnings.push(`${file}: ${keys.join(".")} must be an array; kept the existing value. Fix it, then reconnect.`);
        continue;
      }
      text = addJsonConfigValue(text, keys, value);
    }
    jsonConfig(text, file);
    if (text !== original) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text, "utf8");
    }
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }
}

interface SourceInventory { javaRoots: string[]; poms: string[]; packages: Array<{ directory: string; name?: string; types?: string }>; tsFiles: string[] }

async function inventory(root: string): Promise<SourceInventory> {
  const result: SourceInventory = { javaRoots: [], poms: [], packages: [], tsFiles: [] };
  const visit = async (directory: string, relative = "") => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (["node_modules", "target", "dist", "build", ".git", ".valoride"].includes(entry.name)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Project source contains a symbolic link: ${entry.name}`);
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "target", "dist", "build", ".git", ".valoride"].includes(entry.name)) await visit(path.join(directory, entry.name), file);
      } else if (entry.name === "pom.xml") result.poms.push(relative || ".");
      else if (entry.name === "package.json") {
        try {
          const pkg = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
          result.packages.push({ directory: relative || ".", name: pkg.name, types: pkg.types || pkg.typings });
        } catch { /* An invalid existing package gets an actionable runtime error; do not rewrite it. */ }
      } else if (entry.name.endsWith(".java")) {
        const match = file.match(/^(.*?src\/(?:main|test)\/java)(?:\/|$)/);
        const source = match?.[1] || path.posix.dirname(file);
        if (!result.javaRoots.includes(source)) result.javaRoots.push(source);
      } else if (/\.[cm]?tsx?$/.test(entry.name)) result.tsFiles.push(file);
    }
  };
  await visit(root);
  return result;
}

const xml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]!));
const pomHeader = `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd"><modelVersion>4.0.0</modelVersion>`;
const javaPlugins = `<plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>3.13.0</version></plugin><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-jar-plugin</artifactId><version>3.4.2</version></plugin>`;

function directXmlBlocks(text: string, route: string[]): Array<{ start: number; end: number }> {
  const stack: Array<{ name: string; start: number }> = [];
  const blocks: Array<{ start: number; end: number }> = [];
  const matchesRoute = () => stack.map((entry) => entry.name).join("/") === route.join("/");
  // Keep byte offsets and comments intact; inspect only the requested element hierarchy.
  for (const token of text.matchAll(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<\/?([\w:.-]+)\b(?:"[^"]*"|'[^']*'|[^'">])*\/?\s*>/g)) {
    if (!token[1]) continue;
    const name = token[1].split(":").pop()!;
    if (token[0].startsWith("</")) {
      const last = stack[stack.length - 1];
      if (last?.name !== name) throw new Error("Invalid Maven XML nesting; kept its existing configuration.");
      if (matchesRoute()) blocks.push({ start: last.start, end: token.index! + token[0].length });
      stack.pop();
    } else {
      stack.push({ name, start: token.index! });
      if (/\/\s*>$/.test(token[0])) { if (matchesRoute()) blocks.push({ start: token.index!, end: token.index! + token[0].length }); stack.pop(); }
    }
  }
  if (stack.length) throw new Error("Incomplete Maven XML; kept its existing configuration.");
  return blocks;
}

/** Local build configuration keeps both a normal dependency JAR and a Boot executable; generated Java stays untouched. */
async function preserveBootLibraryJars(root: string, poms: string[], warnings: string[]): Promise<void> {
  for (const directory of poms) {
    const file = path.join(root, directory, "pom.xml");
    await assertNoProjectLinks(root, path.posix.join(directory === "." ? "" : directory, "pom.xml"));
    const text = await fs.readFile(file, "utf8");
    let updated = text;
    let plugins: Array<{ start: number; end: number }>;
    try { plugins = directXmlBlocks(text, ["project", "build", "plugins", "plugin"]); }
    catch (error) { warnings.push(`${file}: ${(error as Error).message}`); continue; }
    for (const block of plugins.reverse()) {
      const plugin = text.slice(block.start, block.end);
      const clean = plugin.replace(/<!--[\s\S]*?-->/g, (comment) => " ".repeat(comment.length));
      if (!/<artifactId>\s*spring-boot-maven-plugin\s*<\/artifactId>/.test(clean)) continue;
      if (/<classifier\b/.test(clean)) {
        if (!/<classifier>\s*[^<$]+\s*<\/classifier>/.test(clean)) warnings.push(`${file}: resolve the existing Spring Boot classifier before using this output as a library.`);
        continue; // A supplied classifier remains authoritative.
      }
      // Put configuration on the plugin, outside execution-specific configuration.
      const configs = directXmlBlocks(plugin, ["plugin", "configuration"]);
      const config = configs[0] ? plugin.slice(configs[0].start, configs[0].end) : undefined;
      const replacement = config
        ? plugin.replace(config, /\/\s*>$/.test(config) ? config.replace(/\/\s*>$/, "><classifier>exec</classifier></configuration>") : config.replace(/<\/configuration>$/, "<classifier>exec</classifier></configuration>"))
        : plugin.replace(/<\/plugin>$/, "<configuration><classifier>exec</classifier></configuration></plugin>");
      updated = updated.slice(0, block.start) + replacement + updated.slice(block.end);
      warnings.push(`${file}: executable Spring Boot output uses classifier exec; the normal JAR remains importable by local Maven consumers.`);
    }
    if (updated !== text) await fs.writeFile(file, updated, "utf8");
  }
}

/** Only scaffolds absent configuration. Generated business sources are never fabricated or rewritten. */
export async function initializeGeneratedProject(root: string, name: string, version: string): Promise<string[]> {
  const warnings: string[] = [];
  let sources = await inventory(root);
  if (!sources.tsFiles.length && !await exists(path.join(root, "tsconfig.json"))) {
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src/index.ts"), "// Local source entry point. Add application code here.\nexport {};\n");
  }
  if (!sources.javaRoots.length) {
    await fs.mkdir(path.join(root, "app/src/main/java/valoride/local"), { recursive: true });
    await fs.writeFile(path.join(root, "app/src/main/java/valoride/local/Main.java"), `package valoride.local;\npublic class Main { public static void main(String[] args) { System.out.println("ValorIDE project initialized. Open the generated UI or add your application entry point."); } }\n`);
    if (!await exists(path.join(root, "app/pom.xml"))) await fs.writeFile(path.join(root, "app/pom.xml"), `${pomHeader}<groupId>local.valoride</groupId><artifactId>app</artifactId><version>${xml(version)}</version><properties><maven.compiler.source>17</maven.compiler.source><maven.compiler.target>17</maven.compiler.target><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties><build><plugins>${javaPlugins}</plugins></build></project>\n`);
    await fs.writeFile(path.join(root, "app/.valoride-runtime.json"), JSON.stringify({ mainClass: "valoride.local.Main" }) + "\n");
    sources = await inventory(root);
  }
  if (!await exists(path.join(root, "pom.xml"))) {
    const modules = sources.poms.filter((module) => module !== "." && !sources.poms.some((parent) => parent !== "." && parent !== module && module.startsWith(`${parent}/`)));
    if (modules.length) {
      await fs.writeFile(path.join(root, "pom.xml"), `${pomHeader}<groupId>local.valoride</groupId><artifactId>generated-project</artifactId><version>${xml(version)}</version><packaging>pom</packaging><name>${xml(name)}</name><modules>${modules.map((module) => `<module>${xml(module)}</module>`).join("")}</modules></project>\n`);
    } else {
      const javaRoots = sources.javaRoots.filter((source) => !source.includes("/test/"));
      await fs.writeFile(path.join(root, "pom.xml"), `${pomHeader}<groupId>local.valoride</groupId><artifactId>generated-project</artifactId><version>${xml(version)}</version><properties><maven.compiler.source>17</maven.compiler.source><maven.compiler.target>17</maven.compiler.target><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties><build><sourceDirectory>${xml(javaRoots[0] || "src/main/java")}</sourceDirectory><plugins>${javaPlugins}${javaRoots.length > 1 ? `<plugin><groupId>org.codehaus.mojo</groupId><artifactId>build-helper-maven-plugin</artifactId><version>3.6.1</version><executions><execution><id>valoride-generated-sources</id><phase>generate-sources</phase><goals><goal>add-source</goal></goals><configuration><sources>${javaRoots.slice(1).map((source) => `<source>${xml(source)}</source>`).join("")}</sources></configuration></execution></executions></plugin>` : ""}</plugins></build></project>\n`);
    }
  }
  await preserveBootLibraryJars(root, sources.poms, warnings);
  await connectGeneratedSources(root, root, warnings);
  return warnings;
}

export async function connectGeneratedSources(root: string, workspaceRoot: string, warnings: string[] = []): Promise<string[]> {
  const sources = await inventory(root);
  const rootOffset = slash(path.relative(workspaceRoot, root));
  const projectPath = (relative: string) => path.posix.join(rootOffset, relative);
  const configs = new Set([workspaceRoot, root, ...sources.packages.map((pkg) => path.join(root, pkg.directory))]);
  const aliases: Record<string, string> = {};
  if (await exists(path.join(root, "typescript-redux-query"))) {
    Object.assign(aliases, { "@thorapi/model": "typescript-redux-query/model", "@thorapi/model/*": "typescript-redux-query/model/*", "@thorapi/redux": "typescript-redux-query/redux", "@thorapi/redux/*": "typescript-redux-query/redux/*", "@thorapi/*": "typescript-redux-query/*" });
  }
  if (await exists(path.join(root, "bundle-assets/component-library"))) {
    Object.assign(aliases, { "@valkyr/component-library": "bundle-assets/component-library/components/index.ts", "@valkyr/component-library/*": "bundle-assets/component-library/components/*", "@valkyr/redux/*": "bundle-assets/component-library/redux/*", "redux/bundles/*": "bundle-assets/component-library/redux/bundles/*", "redux/cache/*": "bundle-assets/component-library/redux/cache/*", "redux/features/*": "bundle-assets/component-library/redux/features/*", "redux/middleware/*": "bundle-assets/component-library/redux/middleware/*", "redux/services/*": "bundle-assets/component-library/redux/services/*", "redux/slices/*": "bundle-assets/component-library/redux/slices/*" });
  }
  for (const pkg of sources.packages) {
    if (typeof pkg.name === "string" && pkg.directory !== "." && !aliases[pkg.name]) {
      const entry = pkg.types || "src/index.ts";
      if (!path.isAbsolute(entry) && !entry.split(/[\\/]/).includes("..") && await exists(path.join(root, pkg.directory, entry))) {
        aliases[pkg.name] = path.posix.join(pkg.directory, entry);
        aliases[`${pkg.name}/*`] = path.posix.join(pkg.directory, "*");
      }
    }
  }
  for (const directory of configs) {
    const file = path.join(directory, "tsconfig.json");
    const present = await exists(file);
    let current: Record<string, any> = {};
    try { if (present) current = jsonConfig(await fs.readFile(file, "utf8"), file); } catch (error) { warnings.push(String(error.message || error)); continue; }
    const base = path.resolve(directory, typeof current.compilerOptions?.baseUrl === "string" ? current.compilerOptions.baseUrl : ".");
    const changes: Array<[ConfigPath, ConfigValue]> = [[["compilerOptions", "baseUrl"], "."]];
    if (!present) changes.push([["compilerOptions", "noEmit"], true], [["compilerOptions", "target"], "ES2022"], [["compilerOptions", "module"], "ESNext"], [["compilerOptions", "moduleResolution"], "Bundler"], [["compilerOptions", "jsx"], "react-jsx"], [["compilerOptions", "skipLibCheck"], true]);
    for (const [alias, relative] of Object.entries(aliases)) {
      if (current.compilerOptions?.paths?.[alias]) {
        const desired = slash(path.relative(base, path.join(root, relative)));
        if (!Array.isArray(current.compilerOptions.paths[alias]) || !current.compilerOptions.paths[alias].includes(desired)) warnings.push(`${file}: kept existing ${alias} mapping; add ${desired} if this is the intended version.`);
        continue;
      }
      changes.push([["compilerOptions", "paths", alias], [slash(path.relative(base, path.join(root, relative)))]]);
    }
    // Preserve TypeScript's implicit default include when adding explicit generated roots.
    const include = Array.isArray(current.include) ? current.include : current.include !== undefined || current.files ? [] : ["**/*"];
    changes.push([["include"], [...include, ...["typescript-redux-query", "bundle-assets"].filter((relative) => sources.tsFiles.some((file) => file.startsWith(relative + "/"))).map((relative) => slash(path.relative(directory, path.join(root, relative))) + "/**/*")]]);
    await addConfig(file, changes, warnings);
  }
  const settings = path.join(workspaceRoot, ".vscode/settings.json");
  let references: any;
  try { references = jsonConfig(await fs.readFile(settings, "utf8"), settings)["java.project.referencedLibraries"]; } catch { /* New config or invalid config is handled by addConfig. */ }
  const librariesKey = references && !Array.isArray(references) ? ["java.project.referencedLibraries", "include"] : ["java.project.referencedLibraries"];
  await addConfig(settings, [[ ["java.project.sourcePaths"], sources.javaRoots.map(projectPath) ], [librariesKey, [projectPath("**/*.jar")]]], warnings);
  await connectMavenLibraries(root, workspaceRoot, sources.poms, warnings);
  return warnings;
}

async function connectMavenLibraries(root: string, workspaceRoot: string, poms: string[], warnings: string[]): Promise<void> {
  const pom = path.join(workspaceRoot, "pom.xml");
  if (!await exists(pom)) return;
  // A consumer Maven project needs actual artifact dependencies; Java sourcePaths alone is ignored by Maven/JDT.
  // Keep its packaging, plugins and existing dependencies; never graft modules onto a jar project.
  await assertNoProjectLinks(workspaceRoot, "pom.xml");
  let text = await fs.readFile(pom, "utf8");
  if (/<packaging>\s*pom\s*<\/packaging>/.test(text.split(/<(?:dependencies|build|profiles)\b/)[0])) return;
  const dependencies: string[] = [];
  const modules: string[] = [];
  for (const directory of poms) {
    if (path.resolve(root, directory) === path.resolve(workspaceRoot)) continue;
    const generated = await fs.readFile(path.join(root, directory, "pom.xml"), "utf8");
    const clean = generated.replace(/<!--[\s\S]*?-->/g, "");
    const parent = clean.match(/<parent\b[^>]*>[\s\S]*?<\/parent>/)?.[0] || "";
    const head = clean.replace(parent, "").split(/<(?:dependencies|build|profiles)\b/)[0];
    const group = head.match(/<groupId>\s*([^<]+)\s*<\/groupId>/)?.[1]?.trim() || parent.match(/<groupId>\s*([^<]+)\s*<\/groupId>/)?.[1]?.trim();
    const artifact = head.match(/<artifactId>\s*([^<]+)\s*<\/artifactId>/)?.[1]?.trim();
    const version = head.match(/<version>\s*([^<]+)\s*<\/version>/)?.[1]?.trim() || parent.match(/<version>\s*([^<]+)\s*<\/version>/)?.[1]?.trim();
    if (/<packaging>\s*pom\s*<\/packaging>/.test(head)) continue;
    if (!group || !artifact || !version || [group, artifact, version].some((value) => value.includes("${"))) {
      warnings.push(`${path.join(root, directory, "pom.xml")}: resolve Maven groupId/artifactId/version before connecting this library to a consumer.`);
      continue;
    }
    const boot = clean.match(/<plugin\b[^>]*>(?:(?!<\/plugin>)[\s\S])*?<artifactId>\s*spring-boot-maven-plugin\s*<\/artifactId>(?:(?!<\/plugin>)[\s\S])*?<\/plugin>/)?.[0];
    if (boot && !/<classifier>\s*[^<$]+\s*<\/classifier>/.test(boot) && !/<skip>\s*true\s*<\/skip>/.test(boot)) {
      warnings.push(`${path.join(root, directory, "pom.xml")}: Spring Boot repackaging may hide library classes under BOOT-INF. Configure an executable classifier (for example exec), rebuild, then reconnect this consumer.`);
      continue;
    }
    modules.push(slash(path.relative(workspaceRoot, path.join(root, directory))));
    if (new RegExp(`<groupId>\\s*${group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</groupId>\\s*<artifactId>\\s*${artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</artifactId>`).test(text)) continue;
    dependencies.push(`<dependency><groupId>${xml(group)}</groupId><artifactId>${xml(artifact)}</artifactId><version>${xml(version)}</version></dependency>`);
  }
  if (modules.length) await addConfig(path.join(workspaceRoot, ".valoride-java-libraries.json"), [[["modules"], modules]], warnings);
  if (!dependencies.length) return;
  // Only direct project dependencies are eligible, never dependencyManagement or a profile's dependency list.
  const tokens = [...text.matchAll(/<!--[\s\S]*?-->|<\/?([\w:.-]+)\b[^>]*>/g)];
  const stack: string[] = [];
  let insertion = -1;
  for (const token of tokens) {
    if (token[0].startsWith("<!--")) continue;
    if (token[0].startsWith("</")) {
      if (token[1] === "dependencies" && stack.join("/") === "project/dependencies") insertion = token.index!;
      stack.pop();
    } else if (!token[0].endsWith("/>")) stack.push(token[1]);
  }
  if (insertion < 0) {
    insertion = text.lastIndexOf("</project>");
    if (insertion < 0) { warnings.push(`${pom}: no closing project element; add generated library dependencies after fixing the POM.`); return; }
    text = text.slice(0, insertion) + `<dependencies>${dependencies.join("")}</dependencies>\n` + text.slice(insertion);
  } else text = text.slice(0, insertion) + dependencies.join("") + "\n" + text.slice(insertion);
  await fs.writeFile(pom, text, "utf8");
  warnings.push(`Maven consumer dependencies added to ${pom}. Build/install the generated modules with mvn -f ${slash(path.relative(workspaceRoot, root))}/pom.xml install before building this consumer.`);
}
