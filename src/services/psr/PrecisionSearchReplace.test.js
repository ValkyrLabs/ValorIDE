import * as fsp from "fs/promises";
import * as os from "os";
import * as path from "path";
import { precisionSearchAndReplace } from "./PrecisionSearchReplace";
import { PathAccess } from "@services/access/PathAccess";
describe("precisionSearchAndReplace", () => {
    let tmpDir;
    let access;
    beforeEach(async () => {
        tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "valor-psr-"));
        access = new PathAccess({ workspaceRoot: tmpDir });
    });
    afterEach(async () => {
        if (tmpDir) {
            await fsp.rm(tmpDir, { recursive: true, force: true });
        }
    });
    it("applies contextual edits globally by default", async () => {
        const relPath = "sample.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "const a = 1;\nconst a = 2;\n", "utf8");
        const edits = [
            { kind: "contextual", find: "const a", replace: "const b" },
        ];
        const result = await precisionSearchAndReplace(tmpDir, relPath, edits, access, {
            makeBackup: false,
        });
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toContain("const b = 1;");
        expect(updated).toContain("const b = 2;");
        expect(result.skipped).toHaveLength(0);
        expect(result.editsApplied).toBe(1);
        expect(result.appliedIndices).toEqual([0]);
    });
    it("reports occurrence overflow for contextual edits", async () => {
        const relPath = "occurrence.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "const token = 1;\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "token",
                replace: "value",
                occurrence: 3,
            },
        ], access, { makeBackup: false });
        expect(result.editsApplied).toBe(0);
        expect(result.skipped).toEqual([
            { index: 0, reason: "occurrence_out_of_range" },
        ]);
        expect(result.appliedIndices).toEqual([]);
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toBe("const token = 1;\n");
    });
    it("marks AST edits as skipped when nothing matches", async () => {
        const relPath = "ast.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "const obj = { foo: 1 };\nconsole.log(obj.foo);\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "ts-ast",
                intent: "renameProperty",
                from: "bar",
                to: "baz",
            },
        ], access, { makeBackup: false });
        expect(result.editsApplied).toBe(0);
        expect(result.skipped).toEqual([
            { index: 0, reason: "ast_no_property_match" },
        ]);
        expect(result.appliedIndices).toEqual([]);
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toContain("obj.foo");
    });
    it("skips contextual edits that are already applied", async () => {
        const relPath = "noop.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "const value = 1;\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "value",
                replace: "value",
            },
        ], access, { makeBackup: false });
        expect(result.editsApplied).toBe(0);
        expect(result.appliedIndices).toEqual([]);
        expect(result.skipped).toEqual([
            { index: 0, reason: "already_applied" },
        ]);
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toBe("const value = 1;\n");
    });
    it("applies byte edits and records applied indices", async () => {
        const relPath = "buffer.bin";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, Buffer.from("0011223344", "hex"));
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "byte",
                findHex: "1122",
                replaceHex: "aabb",
            },
        ], access, { makeBackup: false });
        expect(result.editsApplied).toBe(1);
        expect(result.appliedIndices).toEqual([0]);
        const updated = await fsp.readFile(abs);
        expect(updated.equals(Buffer.from("00aabb3344", "hex"))).toBe(true);
    });
    it("creates backups inside a centralized undo directory", async () => {
        const relPath = "nested/example.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        const original = "console.log('hello');\n";
        await fsp.writeFile(abs, original, "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "hello",
                replace: "world",
            },
        ], access, { makeBackup: true });
        const undoDir = path.join(tmpDir, ".valor/undo", "nested");
        const backupName = `example.ts.${result.baseHash.slice(0, 8)}.bak`;
        const backupPath = path.join(undoDir, backupName);
        const backupContents = await fsp.readFile(backupPath, "utf8");
        expect(backupContents).toBe(original);
        expect(result.editsApplied).toBe(1);
        expect(result.appliedIndices).toEqual([0]);
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toContain("world");
    });
    it("supports dryRun without modifying the underlying file", async () => {
        const relPath = "preview.ts";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "export const value = 1;\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "value = 1",
                replace: "value = 2",
            },
        ], access, { makeBackup: false, dryRun: true });
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toBe("export const value = 1;\n");
        expect(result.editsApplied).toBe(1);
        expect(result.baseHash).not.toBe(result.postHash);
    });
    it("keeps HTML tag pairs balanced when only the opening tag is renamed", async () => {
        const relPath = "Component.tsx";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "<Foo>\n  <span>hi</span>\n</Foo>\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "<Foo>",
                replace: "<Bar>",
            },
        ], access, { makeBackup: false });
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toContain("<Bar>");
        expect(updated).toContain("</Bar>");
        expect(updated).not.toContain("</Foo>");
        expect(result.editsApplied).toBe(1);
        expect(result.warnings).toHaveLength(0);
    });
    it("keeps mustache section tags balanced when only the opening tag is renamed", async () => {
        const relPath = "template.mustache";
        const abs = path.join(tmpDir, relPath);
        await fsp.writeFile(abs, "{{#section}}\n  content\n{{/section}}\n", "utf8");
        const result = await precisionSearchAndReplace(tmpDir, relPath, [
            {
                kind: "contextual",
                find: "{{#section}}",
                replace: "{{#catalog}}",
            },
        ], access, { makeBackup: false });
        const updated = await fsp.readFile(abs, "utf8");
        expect(updated).toContain("{{#catalog}}");
        expect(updated).toContain("{{/catalog}}");
        expect(updated).not.toContain("{{/section}}");
        expect(result.editsApplied).toBe(1);
        expect(result.warnings).toHaveLength(0);
    });
});
//# sourceMappingURL=PrecisionSearchReplace.test.js.map