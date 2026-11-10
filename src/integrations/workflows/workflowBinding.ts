import path from "path";
import { ts } from "ts-morph";
import {
  assertWorkflowStudioBackend,
  isWorkflowStudioId,
} from "../../shared/WorkflowStudioTarget";

export type Deployment = {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  environment: string;
  status: string;
};
export type Version = {
  id: string;
  workflowId: string;
  launchInputSchema?: unknown;
  launchUiSchema?: unknown;
};
type Obj = Record<string, any>;
const record = (v: unknown): v is Obj =>
  Boolean(v && typeof v === "object" && !Array.isArray(v));
function json(v: unknown) {
  if (typeof v !== "string") return v;
  if (v.length > 400_000)
    throw new Error("Workflow launch definition exceeds the supported size.");
  return JSON.parse(v);
}
export function bindingFor(
  backend: string,
  name: string,
  d: Deployment,
  version: Version,
) {
  const safeBackend = assertWorkflowStudioBackend(backend, backend),
    url = new URL(safeBackend);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error(
      "A workflow binding requires an HTTPS backend or localhost.",
    );
  if (
    ![d.id, d.workflowId, d.workflowVersionId].every(isWorkflowStudioId) ||
    d.status.toUpperCase() !== "ACTIVE" ||
    d.workflowId !== version.workflowId ||
    d.workflowVersionId !== version.id
  )
    throw new Error(
      "The active workflow deployment and immutable launch schema do not match. Refresh Workflows and retry.",
    );
  const schema = json(version.launchInputSchema);
  if (
    !record(schema) ||
    schema.type !== "object" ||
    !record(schema.properties) ||
    schema.additionalProperties !== false ||
    Object.keys(schema.properties).length > 200
  )
    throw new Error(
      "This active version has no complete launch schema. Save and activate a version with an explicit input contract in Workflow Studio.",
    );
  const required: unknown = schema.required ?? [];
  if (
    !Array.isArray(required) ||
    required.some(
      (k) =>
        typeof k !== "string" ||
        !Object.prototype.hasOwnProperty.call(schema.properties, k),
    )
  )
    throw new Error("Invalid required fields on the workflow version.");
  const ui = json(version.launchUiSchema || "{}");
  const order = Array.isArray(ui?.order) ? ui.order : [];
  const rank = (s: string) => (order.includes(s) ? order.indexOf(s) : Infinity);
  const fields = Object.entries(schema.properties)
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([key, p]) => {
      if (
        !key ||
        key.startsWith("_") ||
        key.startsWith("workflowExecution") ||
        ["constructor", "prototype"].includes(key) ||
        !record(p)
      )
        throw new Error(
          "Unsupported or reserved launch field: " +
            key +
            ". Inspect the version in Workflow Studio.",
        );
      const simpleType = [
        "string",
        "integer",
        "number",
        "boolean",
        "array",
        "object",
      ].includes(p.type);
      const simpleChoices =
        Array.isArray(p.enum) &&
        p.enum.every((o: unknown) =>
          ["number", "boolean", "string"].includes(typeof o),
        );
      const type =
        simpleType && (!p.enum || simpleChoices) ? String(p.type) : "json";
      return {
        name: key,
        type,
        title: typeof p.title === "string" ? p.title : key,
        required: required.includes(key),
        ...(typeof p.description === "string"
          ? { description: p.description }
          : {}),
        ...(typeof p.format === "string" ? { format: p.format } : {}),
        ...(simpleChoices && type !== "json" ? { choices: p.enum } : {}),
        ...("default" in p &&
        !/passw|credential|token|secret|api.?key/i.test(key + " " + p.format)
          ? { initial: p.default }
          : {}),
        ...(Number.isFinite(p.minimum) ? { min: p.minimum } : {}),
        ...(Number.isFinite(p.maximum) ? { max: p.maximum } : {}),
        ...(Number.isInteger(p.minLength) && p.minLength >= 0
          ? { minLength: p.minLength }
          : {}),
        ...(Number.isInteger(p.maxLength) && p.maxLength >= 0
          ? { maxLength: p.maxLength }
          : {}),
      };
    });
  return {
    backend: safeBackend,
    name,
    workflowId: d.workflowId,
    deploymentId: d.id,
    workflowVersionId: version.id,
    fields,
  };
}
export type WorkflowBinding = ReturnType<typeof bindingFor>;
type Patch = { start: number; end: number; text: string };
export const bindingSymbol = (b: WorkflowBinding) =>
  "workflow_" + b.deploymentId.replace(/-/g, "");
export const sourceImport = (from: string, to: string) => {
  const rel = path.relative(path.dirname(from), to).split(path.sep).join("/");
  return rel.startsWith(".") ? rel : "./" + rel;
};
export function bindingFiles(
  b: WorkflowBinding,
  runtime: string,
  thorapiTransport?: string,
  react = true,
) {
  const folder = b.deploymentId;
  const defs = `// Workflow Studio: active version at binding time. Rebind after activating a new version.
import { fields, launch, handle, createForm, type Binding, type Receipt } from "../runtime";
${thorapiTransport ? 'import "../thorapiTransport";' : ""}
export const binding: Binding = ${JSON.stringify(b, null, 2)};
export const run = (inputs: unknown = {}) => launch(binding,inputs);
export const onEvent = (event:unknown, previous?:()=>unknown) => handle(binding,event,previous);
export const form = (values:Record<string,unknown> = {}, onStarted?:(receipt:Receipt)=>void) => createForm(binding,values,onStarted);
export const formFields = (values:Record<string,unknown> = {}, omit:readonly string[] = []) => fields(binding,values,omit);
export {afterAction, reportWorkflowError as reportError, setWorkflowTransport} from "../runtime";
`;
  const files: Record<string, string> = {
    "runtime.ts": runtime,
    [folder + "/action.ts"]: defs,
  };
  if (thorapiTransport) files["thorapiTransport.ts"] = thorapiTransport;
  if (react)
    files[folder + "/Form.tsx"] =
      `// Reusable form for this deployed version; required fields and accessible names come from its launch schema.
import * as React from "react";
import {binding,form,formFields} from "./action";
import type {Receipt} from "../runtime";
export function WorkflowForm({onStarted}:{onStarted?:(receipt:Receipt)=>void}={}) {
  const host=React.useRef<HTMLDivElement>(null);
  const callback=React.useRef(onStarted);
  callback.current=onStarted;
  React.useEffect(()=>{const el=form({},receipt=>callback.current?.(receipt));host.current?.append(el);return ()=>el.remove();},[]);
  return <div ref={host} />;
}
export function WorkflowFields() {
  const host=React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{const el=host.current;if(!el)return;
    const existing=el.closest("form")?.elements;
    el.append(formFields({},binding.fields.filter(f=>existing?.namedItem(f.name)).map(f=>f.name)));
    return ()=>el.replaceChildren();},[]);
  return <div ref={host}/>;
}
export default WorkflowForm;
`;
  return files;
}

/** Edit only the selected handler/body and imports; never attach a launch to React render. */
export function bindingEdits(
  file: string,
  source: string,
  cursor: number,
  b: WorkflowBinding,
  modulePath: string,
): Patch[] {
  const jsx = /\.tsx$/i.test(file);
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const nodes: ts.Node[] = [];
  const visit = (n: ts.Node) => {
    if (n.getStart(sf) <= cursor && cursor <= n.end) {
      nodes.push(n);
      ts.forEachChild(n, visit);
    }
  };
  visit(sf);
  const symbol = bindingSymbol(b),
    fsym = symbol + "_fields",
    patches: Patch[] = [];
  let needFields = false;
  const opening = [...nodes]
    .reverse()
    .find((n) => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) as
    | ts.JsxOpeningLikeElement
    | undefined;
  if (opening) {
    const form = opening.tagName.getText(sf) === "form";
    const selected = nodes.find(ts.isJsxAttribute);
    const eventName =
      selected && /^on[A-Z]/.test(selected.name.getText(sf))
        ? selected.name.getText(sf)
        : form
          ? "onSubmit"
          : "onClick";
    const attr = opening.attributes.properties.find(
      (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === eventName,
    ) as ts.JsxAttribute | undefined;
    const before = attr?.initializer;
    if (before?.getText(sf).includes(symbol + ".onEvent")) return [];
    if (before?.getText(sf).match(/workflow_[a-f0-9]{32}\.onEvent/))
      throw new Error(
        "This event already has a different workflow. Remove its binding before assigning another.",
      );
    if (attr && (!before || !ts.isJsxExpression(before) || !before.expression))
      throw new Error(
        "The existing event is not a TypeScript expression. Select a different event.",
      );
    if (
      opening.attributes.properties.some(
        (p) => ts.isJsxSpreadAttribute(p) && (!attr || p.end > attr.end),
      )
    )
      throw new Error(
        "An attribute spread can supply this handler. Add an explicit handler after the spread before binding.",
      );
    // Supply contextual typing to existing inline arrow parameters by composing at the prop boundary.
    const previous =
      before && ts.isJsxExpression(before)
        ? before.expression!.getText(sf)
        : undefined;
    const handler = previous
      ? `{(...args) => { const original: ((...input: typeof args) => unknown) | null | undefined = ${previous}; void ${symbol}.onEvent((args as unknown[])[0], () => original?.(...args)); }}`
      : `{(...args) => { void ${symbol}.onEvent((args as unknown[])[0]); }}`;
    if (before)
      patches.push({
        start: before.getStart(sf),
        end: before.end,
        text: handler,
      });
    else
      patches.push({
        start: opening.attributes.end,
        end: opening.attributes.end,
        text: ` ${eventName}=${handler}`,
      });
    if (form && eventName === "onSubmit" && b.fields.length) {
      needFields = true;
      if (ts.isJsxSelfClosingElement(opening))
        patches.push({
          start: opening.end - 2,
          end: opening.end,
          text: `><${fsym}.WorkflowFields /></form>`,
        });
      else
        patches.push({
          start: opening.end,
          end: opening.end,
          text: `<${fsym}.WorkflowFields />`,
        });
    }
  } else {
    const enclosing = [...nodes]
      .reverse()
      .find(
        (n) =>
          ts.isFunctionDeclaration(n) ||
          ts.isMethodDeclaration(n) ||
          ts.isArrowFunction(n) ||
          ts.isFunctionExpression(n) ||
          ts.isVariableDeclaration(n),
      );
    const candidate =
      enclosing && ts.isVariableDeclaration(enclosing)
        ? enclosing.initializer
        : enclosing;
    const fn =
      candidate &&
      (ts.isArrowFunction(candidate) ||
        ts.isFunctionExpression(candidate) ||
        ts.isMethodDeclaration(candidate) ||
        ts.isFunctionDeclaration(candidate))
        ? candidate
        : undefined;
    const named =
      fn &&
      (fn.name?.getText(sf) ||
        (ts.isVariableDeclaration(fn.parent)
          ? fn.parent.name.getText(sf)
          : undefined));
    if (!fn?.body || !named || /^[A-Z]|^use[A-Z]/.test(named))
      throw new Error(
        "Place the cursor on a named TypeScript action, or on a JSX opening tag or event.",
      );
    const params = fn.parameters.map((p) =>
      ts.isIdentifier(p.name) ? p.name.text : undefined,
    );
    if (params.some((p) => !p))
      throw new Error(
        "Select an action with named parameters; destructured parameters require an explicit input mapping.",
      );
    if (
      !params.length &&
      b.fields.some((f) => f.required && f.initial === undefined)
    )
      throw new Error(
        "This workflow requires inputs. Select an action with an input argument, or bind a component to show its generated form.",
      );
    const input =
      params.length === 1 && !b.fields.some((f) => f.name === params[0])
        ? params[0]
        : `{${params.filter((p) => b.fields.some((f) => f.name === p)).join(", ")}}`;
    if (
      params.length > 1 &&
      b.fields.some(
        (f) =>
          f.required && f.initial === undefined && !params.includes(f.name),
      )
    )
      throw new Error(
        "The action parameters do not supply every required workflow field.",
      );
    if (fn.body.getText(sf).includes(symbol + ".run(")) return [];
    const call = `${symbol}.run(${input})`;
    if (ts.isBlock(fn.body)) {
      const last = fn.body.statements[fn.body.statements.length - 1];
      const returned = last && ts.isReturnStatement(last) ? last : undefined;
      if (returned?.expression) {
        const value = returned.expression;
        patches.push({
          start: value.getStart(sf),
          end: value.end,
          text: `${symbol}.afterAction((${value.getText(sf)}), () => ${call})`,
        });
      } else {
        // Respect the action's validation/early returns and any awaited work before running a workflow.
        const at = returned?.getStart(sf) ?? fn.body.end - 1;
        const statement =
          fn.body.statements.length === 0 && !fn.type
            ? `return ${call};`
            : `void ${call}.catch(${symbol}.reportError);`;
        patches.push({ start: at, end: at, text: `\n  ${statement}\n  ` });
      }
    } else {
      patches.push({
        start: fn.body.getStart(sf),
        end: fn.body.end,
        text: `${symbol}.afterAction((${fn.body.getText(sf)}), () => ${call})`,
      });
    }
  }
  const directive = sf.statements.find(
    (s) => !ts.isExpressionStatement(s) || !ts.isStringLiteral(s.expression),
  );
  const insert = directive?.getStart(sf) ?? sf.end;
  const imports = (alias: string, spec: string) => {
    const existing = sf.statements.find(
      (s) =>
        ts.isImportDeclaration(s) &&
        s.importClause?.namedBindings &&
        ts.isNamespaceImport(s.importClause.namedBindings) &&
        s.importClause.namedBindings.name.text === alias,
    ) as ts.ImportDeclaration | undefined;
    if (
      existing &&
      ts.isStringLiteral(existing.moduleSpecifier) &&
      existing.moduleSpecifier.text === spec
    )
      return "";
    if (existing || new RegExp("\\b" + alias + "\\b").test(source))
      throw new Error(
        "A workflow import would conflict with an existing name; no edits were applied.",
      );
    return `import * as ${alias} from ${JSON.stringify(spec)};\n`;
  };
  const added =
    imports(symbol, modulePath + "/action") +
    (needFields ? imports(fsym, modulePath + "/Form") : "");
  if (added) patches.push({ start: insert, end: insert, text: added });
  return patches;
}
