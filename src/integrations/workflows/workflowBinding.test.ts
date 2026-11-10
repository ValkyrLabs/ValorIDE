/** @jest-environment jsdom */
import fs from "fs/promises";
import path from "path";
import os from "os";
import ts from "typescript";
import {
  bindingFor,
  bindingEdits,
  bindingFiles,
  sourceImport,
  bindingSymbol,
} from "./workflowBinding";

const workflowId = "12345678-1111-4111-8111-111111111111",
  deploymentId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  workflowVersionId = "22222222-3333-4444-8555-666666666666";
const deployment = {
  id: deploymentId,
  workflowId,
  workflowVersionId,
  status: "ACTIVE",
  environment: "SANDBOX",
};
const version = {
  id: workflowVersionId,
  workflowId,
  launchInputSchema: JSON.stringify({
    type: "object",
    additionalProperties: false,
    required: ["recipient", "count", "approved"],
    properties: {
      recipient: { type: "string", title: "Recipient", format: "email" },
      count: { type: "integer", minimum: 1 },
      approved: { type: "boolean", default: false },
      mode: { type: "string", enum: ["fast", "slow"] },
      meta: { type: "object" },
      password: {
        type: "string",
        format: "password",
        default: "never-copy-this",
      },
    },
  }),
  launchUiSchema: JSON.stringify({ order: ["approved", "recipient"] }),
};
const b = bindingFor(
  "https://api.example.test/v1",
  "Invite",
  deployment,
  version,
);
const renderEdits = (s: string, edits: ReturnType<typeof bindingEdits>) =>
  [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((t, e) => t.slice(0, e.start) + e.text + t.slice(e.end), s);
const templates = path.resolve(__dirname, "../../../assets/workflow-binding");
const source = `import * as React from "react";
export const action = (inputs: Record<string,unknown>) => ({kept: inputs});
export const submit = (inputs: Record<string,unknown>) => {};
export async function guarded(inputs: Record<string,unknown>) { if (!inputs.approved) return; await Promise.resolve(); }
export const fail = (inputs: Record<string,unknown>) => Promise.reject(new Error("action failed"));
export function Page() { return <form onSubmit={e => {e.preventDefault(); e.currentTarget.dataset.original="yes";}}><input name="recipient"/><button>Send</button></form> }
export function Button(){return <button type="button">Invite</button>}
`;
describe("bind a workflow action and its immutable launch form", () => {
  let dir: string, code: string, configured: any;
  beforeAll(async () => {
    dir = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "workflow-components-")),
    );
    const app = path.join(dir, "App.tsx"),
      folder = path.join(dir, "valkyr-workflows"),
      module = sourceImport(app, path.join(folder, deploymentId));
    await fs.symlink(
      path.resolve(__dirname, "../../../node_modules"),
      path.join(dir, "node_modules"),
      "dir",
    );
    const runtime = await fs.readFile(
      path.join(templates, "runtime.ts.tpl"),
      "utf8",
    );
    const transport = await fs.readFile(
      path.join(templates, "thorapiTransport.ts.tpl"),
      "utf8",
    );
    const files = bindingFiles(b, runtime, transport);
    for (const [name, body] of Object.entries(files)) {
      const f = path.join(folder, name);
      await fs.mkdir(path.dirname(f), { recursive: true });
      await fs.writeFile(f, body);
    }
    code = source;
    for (const cursor of [
      "action =",
      "submit =",
      "guarded(",
      "fail =",
      "<form onSubmit",
      "<button type=",
    ]) {
      code = renderEdits(
        code,
        bindingEdits(app, code, code.indexOf(cursor) + 2, b, module),
      );
    }
    expect(
      bindingEdits(app, code, code.indexOf("<form onSubmit") + 2, b, module),
    ).toEqual([]);
    expect(
      code.match(/import \* as workflow_aaaaaaaa[^\n]+\/action"/g),
    ).toHaveLength(1);
    await fs.writeFile(app, code);
    const stub = path.join(dir, "node_modules"); // do not write through the symlink; aliases point to fixtures below.
    const base = path.join(dir, "base.ts"),
      resolve = path.join(dir, "resolve.ts");
    await fs.writeFile(
      base,
      `export default async (args:any,_api:any,_extra:any) => { (globalThis as any).__workflowRequest=args;return {data:{executionId:"${workflowId}",deploymentId:"${deploymentId}",workflowVersionId:"${workflowVersionId}"}};}`,
    );
    await fs.writeFile(
      resolve,
      "export const resolveApiBaseUrl=()=>(globalThis as any).__workflowBase",
    );
    const compilation = ts.createProgram(
      [app, ...Object.keys(files).map((n) => path.join(folder, n))],
      {
        target: ts.ScriptTarget.ES2021,
        lib: ["lib.es2021.d.ts", "lib.dom.d.ts"],
        jsx: ts.JsxEmit.ReactJSX,
        skipLibCheck: true,
        strict: true,
        types: ["react"],
        typeRoots: [path.join(stub, "@types")],
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        paths: {
          "@thorapi/redux/customBaseQuery": [base],
          "@thorapi/utils/resolveApiBaseUrl": [resolve],
        },
        outDir: path.join(dir, "js"),
      },
    );
    expect(
      ts
        .getPreEmitDiagnostics(compilation)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")),
    ).toEqual([]);
    compilation.emit();
    // Node does not understand the app's TS aliases; map only those import specifiers to
    // the emitted, type-checked fixture modules. Redux's real command dispatcher still runs.
    const transportFile = path.join(
      dir,
      "js",
      "valkyr-workflows",
      "thorapiTransport.js",
    );
    await fs.writeFile(
      transportFile,
      (await fs.readFile(transportFile, "utf8"))
        .replace("@thorapi/redux/customBaseQuery", "../base")
        .replace("@thorapi/utils/resolveApiBaseUrl", "../resolve"),
    );
    // The disposable project now uses the standalone transport to exercise portable browser output.
    const portable = bindingFiles(b, runtime);
    for (const [name, text] of Object.entries(portable)) {
      const dest = path.join(
        dir,
        "js",
        "valkyr-workflows",
        name.replace(/\.tsx?$/, ".js"),
      );
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(
        dest,
        ts.transpileModule(text, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2021,
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
      );
    }
    configured = jest.requireActual(
      path.join(dir, "js", "valkyr-workflows", deploymentId, "action"),
    );
    if (!crypto.randomUUID)
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: () => workflowId,
      });
  }, 30000);
  afterAll(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });
  it("preserves existing declarations, distinguishes action/component targets and refuses unsafe launch schemas", () => {
    expect(code).toContain("({kept: inputs})");
    expect(code).toContain("return " + bindingSymbol(b) + ".run(inputs);");
    expect(code).toContain("e.currentTarget.dataset.original");
    expect(code).not.toContain("never-copy-this");
    expect(JSON.stringify(b)).not.toContain("never-copy-this");
    expect(() =>
      bindingFor(b.backend, "x", { ...deployment, status: "DRAFT" }, version),
    ).toThrow(/active/);
    expect(() =>
      bindingFor(b.backend, "x", deployment, { ...version, id: workflowId }),
    ).toThrow(/match/);
    expect(() =>
      bindingFor(b.backend, "x", deployment, {
        ...version,
        launchInputSchema: null,
      }),
    ).toThrow(/contract/);
    expect(() =>
      bindingEdits("App.tsx", source, source.indexOf("Page()"), b, "./out"),
    ).toThrow(/named TypeScript action/);
  });
  it("renders required fields and submits selected types to the pinned deployment using the app user's session", async () => {
    const calls: any[] = [];
    const receipt = {
      executionId: workflowId,
      deploymentId,
      workflowVersionId,
      status: "started",
    };
    global.fetch = jest.fn(async (url: string, opts: any) => {
      calls.push({ url, opts });
      return {
        ok: true,
        headers: { get: () => null },
        json: async () =>
          opts.method === "POST" ? receipt : { token: "fixture-csrf" },
      };
    }) as any;
    const started = jest.fn(),
      form = configured.form({}, started) as HTMLFormElement;
    document.body.append(form);
    const el = (name: string) =>
      form.elements.namedItem(name) as HTMLInputElement;
    expect(
      Array.from(form.querySelectorAll("label"))
        .map((l) => l.firstChild?.textContent)
        .slice(0, 2),
    ).toEqual(["approved (required)", "Recipient (required)"]);
    expect(el("recipient").required).toBe(true);
    expect(el("password").value).toBe("");
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(calls).toHaveLength(0);
    el("recipient").value = "dev@example.test";
    el("count").value = "4";
    el("mode").value = "slow";
    el("meta").value = '{"important":true}';
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(started).toHaveBeenCalledWith(receipt);
    expect(form.querySelector('[role="status"]')?.textContent).toMatch(
      /Started:/,
    );
    expect(calls.map((c) => c.url)).toEqual([
      b.backend + "/auth/csrf",
      b.backend + "/vaiworkflow/deployments/" + deploymentId + "/executions",
    ]);
    expect(JSON.parse(calls[1].opts.body)).toEqual({
      recipient: "dev@example.test",
      count: 4,
      approved: false,
      mode: "slow",
      meta: { important: true },
      _workflowExecutionIdempotencyKey: expect.any(String),
    });
    expect(calls[1].opts).toMatchObject({
      credentials: "include",
      redirect: "error",
      headers: { "X-XSRF-TOKEN": "fixture-csrf" },
    });
    expect(calls[1].opts.headers.Authorization).toBeUndefined();
    form.remove();
  });
  it("keeps existing React submit behavior, inserts missing controls only, and does not run on render", async () => {
    const React = jest.requireActual("react");
    const { createRoot } = jest.requireActual("react-dom/client");
    const { act } = React;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const send = jest.fn(async () => ({
      executionId: workflowId,
      deploymentId,
      workflowVersionId,
    }));
    configured.setWorkflowTransport(send);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const App = jest.requireActual(path.join(dir, "js", "App"));
    try {
      await act(async () => root.render(React.createElement(App.Page)));
      expect(send).not.toHaveBeenCalled();
      expect(container.querySelectorAll('[name="recipient"]')).toHaveLength(1);
      const form = container.querySelector("form")!;
      (form.elements.namedItem("recipient") as HTMLInputElement).value =
        "editor@example.test";
      (form.elements.namedItem("count") as HTMLInputElement).value = "3";
      const ev = new Event("submit", { bubbles: true, cancelable: true });
      await act(async () => {
        form.dispatchEvent(ev);
      });
      expect(ev.defaultPrevented).toBe(true);
      expect(form.dataset.original).toBe("yes");
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ deploymentId }),
        expect.stringContaining(deploymentId),
        expect.objectContaining({ recipient: "editor@example.test", count: 3 }),
      );
      await App.submit({
        recipient: "test@example.test",
        count: 5,
        approved: true,
      });
      expect(send).toHaveBeenCalledTimes(2);
      await act(async () => root.render(React.createElement(App.Button)));
      await act(async () => container.querySelector("button")!.click());
      expect(send).toHaveBeenCalledTimes(2);
      const dialog = document.body.querySelector("dialog")!;
      const eventForm = dialog.querySelector("form")!;
      (eventForm.elements.namedItem("recipient") as HTMLInputElement).value =
        "click@example.test";
      (eventForm.elements.namedItem("count") as HTMLInputElement).value = "4";
      await act(async () =>
        eventForm.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
      );
      expect(send).toHaveBeenCalledTimes(3);
      expect(send).toHaveBeenLastCalledWith(
        expect.objectContaining({ deploymentId }),
        expect.any(String),
        expect.objectContaining({ recipient: "click@example.test", count: 4 }),
      );
      expect(dialog.querySelector('[role="status"]')!.textContent).toContain(
        "Started:",
      );
      dialog.remove();
      const data = {
        recipient: "guard@example.test",
        count: 4,
        approved: false,
      };
      await App.guarded(data);
      await expect(App.fail(data)).rejects.toThrow("action failed");
      expect(send).toHaveBeenCalledTimes(3);
      await App.guarded({ ...data, approved: true });
      const original = App.action(data);
      expect(original.kept).toBe(data);
      expect(send).toHaveBeenCalledTimes(5);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    }
  });
  it("uses the app's authenticated RTK client only for its own configured backend", async () => {
    let action: any;
    jest.isolateModules(() => {
      jest.requireActual(
        path.join(dir, "js", "valkyr-workflows", "thorapiTransport"),
      );
      action = jest.requireActual(
        path.join(dir, "js", "valkyr-workflows", deploymentId, "action"),
      );
    });
    const globals = globalThis as any;
    try {
      globals.__workflowBase = b.backend;
      global.fetch = jest.fn() as any;
      await expect(
        action.run({
          recipient: "app@example.test",
          count: 2,
          approved: false,
        }),
      ).resolves.toMatchObject({ deploymentId, workflowVersionId });
      expect(globals.__workflowRequest).toMatchObject({
        method: "POST",
        url: "vaiworkflow/deployments/" + deploymentId + "/executions",
        body: { recipient: "app@example.test", count: 2, approved: false },
      });
      expect(global.fetch).not.toHaveBeenCalled();
      delete globals.__workflowRequest;
      globals.__workflowBase = "https://other.example.test/v1";
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 });
      await expect(
        action.run({
          recipient: "app@example.test",
          count: 2,
          approved: false,
        }),
      ).rejects.toThrow(/sign-in|access/);
      expect(globals.__workflowRequest).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        b.backend + "/auth/csrf",
        expect.objectContaining({ credentials: "include", redirect: "error" }),
      );
    } finally {
      delete globals.__workflowBase;
      delete globals.__workflowRequest;
    }
  });
});
