/// <reference lib="dom" />
// ValorIDE workflow binding runtime. Runtime access belongs to the app user, never the IDE.
export interface Field {
  name: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  format?: string;
  choices?: Array<string | number | boolean>;
  initial?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}
export interface Binding {
  name: string;
  backend: string;
  workflowId: string;
  deploymentId: string;
  workflowVersionId: string;
  fields: readonly Field[];
}
export interface Receipt {
  executionId: string;
  deploymentId: string;
  workflowVersionId: string;
  status?: string;
}
export type Transport = (
  binding: Binding,
  path: string,
  body: Record<string, unknown>,
) => Promise<unknown>;
type Values = Record<string, unknown>;
const object = (value: unknown): value is Values =>
  !!value && typeof value === "object" && !Array.isArray(value);
const missing = (value: unknown) =>
  value === undefined || value === null || value === "";
let appTransport: Transport | undefined;
let generatedTransport: Transport | undefined;
export function installGeneratedTransport(transport: Transport): void {
  generatedTransport = transport;
}
/** Optional for a backend-for-frontend or app with a custom authenticated client. No implicit retries. */
export function setWorkflowTransport(transport: Transport): void {
  appTransport = transport;
}
/** For a different origin use only that origin's own signed-in session & CSRF. Never forward app/IDE bearer tokens. */
export const sessionTransport: Transport = async (binding, path, body) => {
  const policy = {
    credentials: "include",
    redirect: "error",
    cache: "no-store",
  } as const;
  const csrf = await fetch(binding.backend + "/auth/csrf", policy);
  if (!csrf.ok)
    throw new Error(
      "Workflow sign-in or credentialed app-origin access is unavailable (" +
        csrf.status +
        ").",
    );
  const token = csrf.headers.get("X-XSRF-TOKEN") || (await csrf.json()).token;
  if (typeof token !== "string" || !token)
    throw new Error("Workflow backend did not issue a CSRF token.");
  const response = await fetch(binding.backend + "/" + path, {
    ...policy,
    method: "POST",
    headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      "Workflow launch rejected (" +
        response.status +
        "). Check the active deployment and your access.",
    );
  return response.json();
};
function coerce(f: Field, raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  if (!raw.trim() && f.type !== "string") return undefined;
  if (f.type === "boolean" && ["true", "false"].includes(raw))
    return raw === "true";
  if (f.type === "number" || f.type === "integer") return Number(raw);
  if (f.type === "object" || f.type === "array" || f.type === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(f.title + " requires valid JSON.");
    }
  }
  return raw;
}
function fieldValue(f: Field, value: unknown) {
  const type = f.type;
  const valid =
    type === "json"
      ? true
      : type === "array"
        ? Array.isArray(value)
        : type === "object"
          ? object(value)
          : type === "integer"
            ? Number.isInteger(value)
            : type === "number"
              ? typeof value === "number" && Number.isFinite(value)
              : typeof value === type;
  if (!valid || (f.choices && !f.choices.some((c) => c === value)))
    throw new Error("Invalid value for " + f.title + ".");
  if (
    (typeof value === "number" &&
      ((f.min !== undefined && value < f.min) ||
        (f.max !== undefined && value > f.max))) ||
    (typeof value === "string" &&
      ((f.minLength !== undefined && value.length < f.minLength) ||
        (f.maxLength !== undefined && value.length > f.maxLength)))
  )
    throw new Error(f.title + " is outside the allowed range.");
  return value;
}
export function launchValues(binding: Binding, values: unknown) {
  if (!object(values)) throw new Error("Supply an object of workflow inputs.");
  const pairs: Array<[string, unknown]> = [];
  for (const f of binding.fields) {
    const raw = Object.prototype.hasOwnProperty.call(values, f.name)
      ? values[f.name]
      : f.initial;
    const value = coerce(f, raw);
    if (
      missing(value) &&
      !(f.type === "json" && value === null && raw !== undefined)
    ) {
      if (f.required) throw new Error(f.title + " is required.");
      continue;
    }
    pairs.push([f.name, fieldValue(f, value)]);
  }
  return Object.fromEntries(pairs);
}
function newAttempt(): string {
  // randomUUID is unavailable on non-HTTPS LAN dev servers; getRandomValues remains available.
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
}
export async function launch(
  binding: Binding,
  values: unknown,
  attempt = newAttempt(),
): Promise<Receipt> {
  const body = {
    ...launchValues(binding, values),
    _workflowExecutionIdempotencyKey: attempt,
  };
  const data = await (appTransport || generatedTransport || sessionTransport)(
    binding,
    "vaiworkflow/deployments/" + binding.deploymentId + "/executions",
    body,
  );
  if (
    !object(data) ||
    typeof data.executionId !== "string" ||
    !data.executionId ||
    data.deploymentId !== binding.deploymentId ||
    data.workflowVersionId !== binding.workflowVersionId
  )
    throw new Error(
      "Workflow execution could not be confirmed. Review execution history before retrying.",
    );
  return data as unknown as Receipt;
}
export function reportWorkflowError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Workflow launch failed.";
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("valkyr:workflow-error", { detail: { message } }),
    );
  console.error(message);
}
/** Preserve the action's original value/promise; never launch after an exception, rejection, or explicit cancellation. */
export function afterAction<T>(result: T, next: () => Promise<Receipt>): T {
  const start = (value: unknown) => {
    if (value !== false) void next().catch(reportWorkflowError);
  };
  if (
    result != null &&
    typeof (result as { then?: unknown }).then === "function"
  )
    void Promise.resolve(result).then(start, () => {});
  else start(result);
  return result;
}
/** Returns controls for the immutable launch schema, not unrelated page fields. All labels use DOM text, never HTML. */
export function fields(
  binding: Binding,
  initial: Values = {},
  omit: readonly string[] = [],
): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const f of binding.fields.filter((f) => !omit.includes(f.name))) {
    const label = document.createElement("label");
    label.style.display = "block";
    label.append(
      document.createTextNode(f.title + (f.required ? " (required)" : "")),
    );
    let input: HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement;
    if (f.choices || f.type === "boolean") {
      const select = document.createElement("select");
      for (const v of ["", ...(f.choices || [true, false])]) {
        const o = document.createElement("option");
        o.value = String(v);
        o.textContent = v === "" ? "Select…" : String(v);
        select.append(o);
      }
      input = select;
    } else if (["object", "array", "json"].includes(f.type)) {
      input = document.createElement("textarea");
      input.placeholder =
        f.type === "object" ? "{}" : f.type === "array" ? "[]" : "JSON value";
    } else {
      input = document.createElement("input");
      const formats: Record<string, string> = {
        email: "email",
        uri: "url",
        date: "date",
        password: "password",
      };
      input.type =
        f.type === "integer" || f.type === "number"
          ? "number"
          : formats[f.format || ""] || "text";
      if (input.type === "number")
        input.step = f.type === "integer" ? "1" : "any";
      if (f.min !== undefined) input.min = String(f.min);
      if (f.max !== undefined) input.max = String(f.max);
      if (f.minLength !== undefined) input.minLength = f.minLength;
      if (f.maxLength !== undefined) input.maxLength = f.maxLength;
    }
    input.name = f.name;
    input.required = f.required;
    input.style.display = "block";
    const va = initial[f.name] ?? f.initial;
    if (va != null)
      input.value =
        f.type === "json" || typeof va === "object"
          ? JSON.stringify(va)
          : String(va);
    label.append(input);
    if (f.description) {
      const desc = document.createElement("small");
      desc.textContent = f.description;
      label.append(desc);
    }
    frag.append(label);
  }
  return frag;
}
function readForm(binding: Binding, form: HTMLFormElement): Values {
  const data = new FormData(form);
  const entries: Array<[string, unknown]> = [];
  for (const f of binding.fields) {
    const values = data.getAll(f.name);
    if (!values.length) {
      const item = form.elements.namedItem(f.name);
      if (
        item instanceof HTMLInputElement &&
        item.type === "checkbox" &&
        f.type === "boolean"
      )
        entries.push([f.name, false]);
      continue;
    }
    if (values.some((v) => typeof v !== "string"))
      throw new Error(
        "Select an authorized resource reference instead of uploading a file for " +
          f.title,
      );
    if (f.type === "boolean" && values[0] === "on")
      entries.push([f.name, true]);
    else
      entries.push([
        f.name,
        f.type === "array" && values.length > 1 ? values : values[0],
      ]);
  }
  return Object.fromEntries(entries);
}
export function createForm(
  binding: Binding,
  initial: Values = {},
  onStarted?: (receipt: Receipt) => void,
) {
  const form = document.createElement("form"),
    submit = document.createElement("button"),
    status = document.createElement("p");
  form.setAttribute("aria-label", binding.name);
  submit.type = "submit";
  submit.textContent = "Run " + binding.name;
  status.setAttribute("role", "status");
  form.append(fields(binding, initial), submit, status);
  let attempt = newAttempt();
  form.addEventListener("input", () => {
    attempt = newAttempt();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    submit.disabled = true;
    status.textContent = "Starting…";
    try {
      const receipt = await launch(binding, readForm(binding, form), attempt);
      status.textContent = "Started: " + receipt.executionId;
      attempt = newAttempt();
      onStarted?.(receipt);
    } catch (err) {
      status.textContent =
        err instanceof Error ? err.message : "Workflow launch failed.";
    } finally {
      submit.disabled = false;
    }
  });
  return form;
}
function showForm(binding: Binding, initial: Values) {
  const dialog = document.createElement("dialog"),
    cancel = document.createElement("button");
  dialog.setAttribute("aria-label", binding.name);
  cancel.type = "button";
  cancel.textContent = "Close";
  cancel.onclick = () =>
    typeof dialog.close === "function" ? dialog.close() : dialog.remove();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.append(createForm(binding, initial), cancel);
  document.body.append(dialog);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}
const busy = new WeakSet<object>();
const notices = new WeakMap<Element, HTMLElement>();
function announce(target: unknown, message: string) {
  if (
    typeof Element === "undefined" ||
    !(target instanceof Element) ||
    !target.isConnected
  )
    return;
  let notice = notices.get(target);
  if (!notice?.isConnected) {
    notice = document.createElement("span");
    notice.setAttribute("role", "status");
    target.insertAdjacentElement("afterend", notice);
    notices.set(target, notice);
  }
  notice.textContent = message;
}
/** Capture form data synchronously, before an existing React handler can clear the form. */
export async function handle(
  binding: Binding,
  event: unknown,
  previous?: () => unknown,
) {
  const e = event as {
    currentTarget?: EventTarget | null;
    preventDefault?: () => void;
  } | null;
  const target =
    e?.currentTarget && typeof e.currentTarget === "object"
      ? e.currentTarget
      : undefined;
  const form =
    typeof HTMLFormElement !== "undefined" && target instanceof HTMLFormElement
      ? target
      : typeof HTMLButtonElement !== "undefined" &&
          target instanceof HTMLButtonElement &&
          target.type === "submit"
        ? target.form
        : undefined;
  if (form) e?.preventDefault?.();
  if (target && busy.has(target)) return;
  if (target) busy.add(target);
  try {
    const values = form
      ? readForm(binding, form)
      : !target && object(event)
        ? event
        : {};
    if (previous && (await previous()) === false) return;
    if (
      binding.fields.length &&
      ((!form && !Object.keys(values).length) ||
        binding.fields.some(
          (f) => f.required && missing(values[f.name] ?? f.initial),
        ))
    ) {
      showForm(binding, values);
      return;
    }
    announce(target, "Starting " + binding.name + "…");
    const receipt = await launch(binding, values);
    announce(target, "Started: " + receipt.executionId);
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("valkyr:workflow-started", { detail: receipt }),
      );
    return receipt;
  } catch (err) {
    announce(
      target,
      err instanceof Error ? err.message : "Workflow launch failed.",
    );
    reportWorkflowError(err);
  } finally {
    if (target) busy.delete(target);
  }
}
