import type {
  ExtensionMessage,
  ValorIDEAskUseMcpServer,
  ValorIDEMessage,
  ValorIDESayBrowserAction,
  ValorIDESayTool,
} from "@shared/ExtensionMessage";

export type TaskProgressKind =
  | "phase"
  | "action-start"
  | "action-complete"
  | "blocker"
  | "terminal";

export interface TaskProgressChatUpdate {
  content: string;
  eventKey: string;
  kind: TaskProgressKind;
  messageTs: number;
  phase: "analyze" | "act" | "verify" | "blocked" | "done";
  taskId?: string;
}

interface ActiveAction {
  completion: string;
  label: string;
  messageTs: number;
}

interface ClassifiedUpdate
  extends Omit<TaskProgressChatUpdate, "eventKey" | "taskId"> {
  eventSuffix: string;
}

/**
 * Converts the existing ValorIDE task-message stream into sparse, user-facing
 * progress updates. It deliberately does not relay reasoning, raw tool input,
 * command output, MCP results, or token-by-token assistant text.
 */
export class TaskProgressChatRelay {
  private activeAction?: ActiveAction;
  private currentTaskId?: string;
  private emittedKeys = new Set<string>();
  private initialized = false;
  private messageSignatures = new Map<number, string>();
  private apiCycleCount = 0;
  private shouldReportReviewPhase = false;

  acceptExtensionMessage(
    message: ExtensionMessage,
  ): TaskProgressChatUpdate[] {
    if (message.type === "state" && message.state) {
      const messages = message.state.valorideMessages ?? [];
      const taskId =
        message.state.currentTaskItem?.id ??
        (messages[0]?.ts ? String(messages[0].ts) : undefined);
      return this.acceptSnapshot(messages, taskId);
    }

    if (message.type === "partialMessage" && message.partialMessage) {
      if (!this.initialized) {
        return [];
      }
      return this.acceptMessages([message.partialMessage]);
    }

    return [];
  }

  acceptSnapshot(
    messages: ValorIDEMessage[],
    taskId?: string,
  ): TaskProgressChatUpdate[] {
    if (!taskId && messages.length === 0) {
      return [];
    }

    if (taskId !== this.currentTaskId) {
      this.reset(taskId);
    }

    // Hydration and task creation post a complete snapshot first. Establish a
    // watermark so reopening an old task never replays historical updates.
    if (!this.initialized) {
      for (const message of messages) {
        this.messageSignatures.set(message.ts, signatureFor(message));
      }
      this.initialized = true;
      return [];
    }

    return this.acceptMessages(messages);
  }

  private acceptMessages(
    messages: ValorIDEMessage[],
  ): TaskProgressChatUpdate[] {
    const updates: TaskProgressChatUpdate[] = [];

    for (const message of messages) {
      const signature = signatureFor(message);
      if (this.messageSignatures.get(message.ts) === signature) {
        continue;
      }
      this.messageSignatures.set(message.ts, signature);

      for (const update of this.classify(message)) {
        const eventKey = `${message.ts}:${update.eventSuffix}`;
        if (this.emittedKeys.has(eventKey)) {
          continue;
        }
        this.emittedKeys.add(eventKey);
        const { eventSuffix: _eventSuffix, ...publicUpdate } = update;
        updates.push({
          ...publicUpdate,
          eventKey,
          taskId: this.currentTaskId,
        });
      }
    }

    return updates;
  }

  private classify(message: ValorIDEMessage): ClassifiedUpdate[] {
    if (message.say === "reasoning" || message.say === "command_output") {
      return [];
    }

    if (message.say === "api_req_started") {
      this.apiCycleCount += 1;
      if (this.activeAction) {
        const active = this.activeAction;
        this.activeAction = undefined;
        this.shouldReportReviewPhase = false;
        return [
          {
            content: `${active.completion} Reviewing the result.`,
            eventSuffix: `action-complete:${active.messageTs}`,
            kind: "action-complete",
            messageTs: message.ts,
            phase: "verify",
          },
        ];
      }
      if (this.apiCycleCount === 1) {
        return [phaseUpdate(message.ts, "Analyzing the task.", "analyze")];
      }
      if (this.shouldReportReviewPhase) {
        this.shouldReportReviewPhase = false;
        return [
          phaseUpdate(
            message.ts,
            "Reviewing the latest result and choosing the next step.",
            "verify",
          ),
        ];
      }
      return [];
    }

    if (message.say === "graymatter_context") {
      return [
        phaseUpdate(
          message.ts,
          "Loaded the task context and operating rules.",
          "analyze",
        ),
      ];
    }

    if (message.say === "text" && message.partial !== true) {
      const text = compactText(message.text, 220);
      if (!text) return [];
      return [
        {
          content: `Update: ${text}`,
          eventSuffix: "assistant-update",
          kind: "phase",
          messageTs: message.ts,
          phase: "analyze",
        },
      ];
    }

    if (message.say === "tool" || message.ask === "tool") {
      const action = describeFileTool(message.text);
      if (message.type === "ask" && message.partial !== true) {
        return [this.blocker(message, `Approval needed before ${action.label}.`)];
      }
      if (message.partial === true) {
        return this.startAction(message, action.label, action.completion);
      }
      this.activeAction = undefined;
      this.shouldReportReviewPhase = true;
      return [this.completeAction(message, action.completion)];
    }

    if (message.say === "command" || message.ask === "command") {
      if (message.type === "ask" && message.partial !== true) {
        return [
          this.blocker(
            message,
            "Approval needed before running a shell command.",
          ),
        ];
      }
      if (message.type === "say" && message.partial !== true) {
        return this.startAction(
          message,
          "Running a shell command.",
          "Finished running the shell command.",
        );
      }
      return [];
    }

    if (
      message.say === "use_mcp_server" ||
      message.ask === "use_mcp_server"
    ) {
      const action = describeMcpAction(message.text);
      if (message.type === "ask" && message.partial !== true) {
        return [this.blocker(message, `Approval needed before ${action.label}.`)];
      }
      return this.startAction(message, action.label, action.completion);
    }

    if (message.say === "mcp_server_response") {
      const active = this.activeAction;
      this.activeAction = undefined;
      this.shouldReportReviewPhase = true;
      return [
        this.completeAction(
          message,
          active?.completion ?? "Completed the MCP action.",
        ),
      ];
    }

    if (
      message.say === "browser_action" ||
      message.say === "browser_action_launch"
    ) {
      const action = describeBrowserAction(message.text);
      return this.startAction(message, action.label, action.completion);
    }

    if (message.say === "browser_action_result") {
      const active = this.activeAction;
      this.activeAction = undefined;
      this.shouldReportReviewPhase = true;
      return [
        this.completeAction(
          message,
          active?.completion ?? "Completed the browser action.",
        ),
      ];
    }

    if (message.say === "checkpoint_created") {
      this.shouldReportReviewPhase = true;
      return [this.completeAction(message, "Created a rollback checkpoint.")];
    }

    if (
      message.say === "error" ||
      message.say === "diff_error" ||
      message.say === "valorideignore_error" ||
      message.say === "workspace_access_error" ||
      message.ask === "api_req_failed" ||
      message.ask === "mistake_limit_reached" ||
      message.ask === "auto_approval_max_req_reached"
    ) {
      const detail = compactText(message.text, 180);
      return [
        this.blocker(
          message,
          detail ? `Blocked: ${detail}` : "Blocked and waiting for attention.",
        ),
      ];
    }

    if (message.ask === "followup" && message.partial !== true) {
      const question = compactQuestion(message.text);
      return [
        this.blocker(
          message,
          question ? `Input needed: ${question}` : "Input needed to continue.",
        ),
      ];
    }

    if (
      (message.ask === "completion_result" ||
        message.say === "completion_result") &&
      message.partial !== true
    ) {
      this.activeAction = undefined;
      const result = compactText(message.text, 280);
      return [
        {
          content: result ? `Completed: ${result}` : "Task completed.",
          eventSuffix: "terminal",
          kind: "terminal",
          messageTs: message.ts,
          phase: "done",
        },
      ];
    }

    return [];
  }

  private startAction(
    message: ValorIDEMessage,
    label: string,
    completion: string,
  ): ClassifiedUpdate[] {
    if (
      this.activeAction?.messageTs === message.ts &&
      this.activeAction.label === label
    ) {
      return [];
    }
    this.activeAction = { completion, label, messageTs: message.ts };
    return [
      {
        content: label,
        eventSuffix: "action-start",
        kind: "action-start",
        messageTs: message.ts,
        phase: "act",
      },
    ];
  }

  private completeAction(
    message: ValorIDEMessage,
    content: string,
  ): ClassifiedUpdate {
    return {
      content,
      eventSuffix: "action-complete",
      kind: "action-complete",
      messageTs: message.ts,
      phase: "verify",
    };
  }

  private blocker(
    message: ValorIDEMessage,
    content: string,
  ): ClassifiedUpdate {
    this.activeAction = undefined;
    return {
      content,
      eventSuffix: "blocker",
      kind: "blocker",
      messageTs: message.ts,
      phase: "blocked",
    };
  }

  private reset(taskId?: string): void {
    this.activeAction = undefined;
    this.apiCycleCount = 0;
    this.currentTaskId = taskId;
    this.emittedKeys.clear();
    this.initialized = false;
    this.messageSignatures.clear();
    this.shouldReportReviewPhase = false;
  }
}

const phaseUpdate = (
  messageTs: number,
  content: string,
  phase: "analyze" | "verify",
): ClassifiedUpdate => ({
  content,
  eventSuffix: `phase:${phase}`,
  kind: "phase",
  messageTs,
  phase,
});

const signatureFor = (message: ValorIDEMessage): string =>
  JSON.stringify([
    message.type,
    message.ask,
    message.say,
    message.partial,
    message.text,
    message.images?.length ?? 0,
  ]);

const parseRecord = (value?: string): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const safeName = (value: unknown, maxLength = 100): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\r\n\t]+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trim()}…`;
};

const describeFileTool = (
  text?: string,
): { completion: string; label: string } => {
  const tool = (parseRecord(text) ?? {}) as Partial<ValorIDESayTool>;
  const path = safeName(tool.path);
  switch (tool.tool) {
    case "editedExistingFile":
    case "precisionSearchAndReplace":
      return {
        label: path ? `Updating ${path}.` : "Updating a file.",
        completion: path ? `Updated ${path}.` : "Updated the file.",
      };
    case "newFileCreated":
      return {
        label: path ? `Creating ${path}.` : "Creating a file.",
        completion: path ? `Created ${path}.` : "Created the file.",
      };
    case "readFile":
      return {
        label: path ? `Inspecting ${path}.` : "Inspecting a file.",
        completion: path ? `Inspected ${path}.` : "Inspected the file.",
      };
    case "searchFiles":
      return {
        label: "Searching the workspace.",
        completion: "Completed the workspace search.",
      };
    case "listCodeDefinitionNames":
      return {
        label: "Inspecting code definitions.",
        completion: "Inspected the code definitions.",
      };
    case "listFilesRecursive":
    case "listFilesTopLevel":
      return {
        label: "Inspecting the project structure.",
        completion: "Inspected the project structure.",
      };
    default:
      return {
        label: "Starting a workspace action.",
        completion: "Completed the workspace action.",
      };
  }
};

const describeMcpAction = (
  text?: string,
): { completion: string; label: string } => {
  const action = (parseRecord(text) ?? {}) as Partial<ValorIDEAskUseMcpServer>;
  const toolName = safeName(action.toolName, 80);
  const serverName = safeName(action.serverName, 80);
  const subject = toolName
    ? `${toolName}${serverName ? ` on ${serverName}` : ""}`
    : serverName
      ? `an MCP action on ${serverName}`
      : "an MCP action";
  return {
    label: `Starting ${subject}.`,
    completion: `Completed ${subject}.`,
  };
};

const describeBrowserAction = (
  text?: string,
): { completion: string; label: string } => {
  const action = (parseRecord(text) ?? {}) as Partial<ValorIDESayBrowserAction>;
  const actionName = safeName(action.action, 40) ?? "browser verification";
  return {
    label: `Starting browser action: ${actionName}.`,
    completion: `Completed browser action: ${actionName}.`,
  };
};

const compactQuestion = (text?: string): string | undefined => {
  const record = parseRecord(text);
  const candidate = record
    ? [
        record.question,
        record.prompt,
        record.message,
        record.text,
        record.content,
      ].find((value) => typeof value === "string")
    : text;
  return compactText(typeof candidate === "string" ? candidate : undefined, 180);
};

const compactText = (
  text: string | undefined,
  maxLength: number,
): string | undefined => {
  const normalized = text
    ?.replace(/```[\s\S]*?```/g, " [code omitted] ")
    .replace(/\s+/g, " ")
    .replace(/^[#>*`\-\s]+/, "")
    .trim();
  if (!normalized) return undefined;

  const sentenceEnd = normalized.slice(0, maxLength).search(/[.!?](?:\s|$)/);
  const concise =
    sentenceEnd >= 15 ? normalized.slice(0, sentenceEnd + 1) : normalized;
  return concise.length <= maxLength
    ? concise
    : `${concise.slice(0, maxLength - 1).trim()}…`;
};
