import {
  RemoteCodingSession,
  RemoteCodingSessionRegistry,
} from "./RemoteCodingSessionRegistry";
import {
  RemoteCodingTaskPresetCatalog,
  RemotePresetScope,
  RemoteTaskTemplate,
  RemoteTaskTemplateId,
  SavedRemoteTaskPreset,
} from "./RemoteCodingTaskPresetCatalog";

export type RemoteCodingCommandType =
  | "remote-coding-session-start"
  | "remote-coding-session-heartbeat"
  | "remote-coding-session-log"
  | "remote-coding-session-artifact"
  | "remote-coding-session-stop"
  | "remote-coding-session-cancel"
  | "remote-coding-session-expire-timeouts"
  | "remote-coding-session-list"
  | "remote-coding-template-list"
  | "remote-coding-preset-save"
  | "remote-coding-preset-list";

export interface RemoteCodingCommand {
  id: string;
  type: RemoteCodingCommandType;
  payload?: Record<string, any>;
}

export interface RemoteCodingCommandResult {
  event: "session-updated" | "session-list" | "template-list" | "preset-list" | "preset-updated";
  session?: RemoteCodingSession;
  sessions?: RemoteCodingSession[];
  templates?: RemoteTaskTemplate[];
  preset?: SavedRemoteTaskPreset;
  presets?: SavedRemoteTaskPreset[];
}

export class RemoteCodingSessionOrchestrator {
  constructor(
    private readonly registry: RemoteCodingSessionRegistry,
    private readonly presetCatalog: RemoteCodingTaskPresetCatalog = new RemoteCodingTaskPresetCatalog(),
  ) {}

  handle(command: RemoteCodingCommand): RemoteCodingCommandResult {
    const payload = command.payload ?? {};
    const sessionId = payload.sessionId ?? payload.id;

    switch (command.type) {
      case "remote-coding-session-start": {
        const task = payload.presetId
          ? this.presetCatalog.renderTaskFromPreset(String(payload.presetId))
          : payload.templateId
            ? this.presetCatalog.renderTask(String(payload.templateId), payload.params ?? {})
            : String(payload.task ?? "");

        return {
          event: "session-updated",
          session: this.registry.start({
            id: String(sessionId),
            task,
            timeoutMs: payload.timeoutMs,
          }),
        };
      }
      case "remote-coding-session-heartbeat":
        return {
          event: "session-updated",
          session: this.registry.heartbeat(String(sessionId)),
        };
      case "remote-coding-session-log":
        return {
          event: "session-updated",
          session: this.registry.appendLog(String(sessionId), String(payload.log ?? "")),
        };
      case "remote-coding-session-artifact":
        return {
          event: "session-updated",
          session: this.registry.addArtifact(String(sessionId), String(payload.artifact ?? "")),
        };
      case "remote-coding-session-stop":
        return {
          event: "session-updated",
          session: this.registry.stop(String(sessionId), payload.status === "failed" ? "failed" : "completed"),
        };
      case "remote-coding-session-cancel":
        return {
          event: "session-updated",
          session: this.registry.cancel(String(sessionId), String(payload.reason ?? "user_cancelled")),
        };
      case "remote-coding-session-expire-timeouts":
        return {
          event: "session-list",
          sessions: this.registry.expireTimedOutSessions(),
        };
      case "remote-coding-session-list":
        return {
          event: "session-list",
          sessions: this.registry.list(),
        };
      case "remote-coding-template-list":
        return {
          event: "template-list",
          templates: this.presetCatalog.listTemplates(),
        };
      case "remote-coding-preset-save":
        return {
          event: "preset-updated",
          preset: this.presetCatalog.savePreset({
            id: String(payload.id ?? sessionId ?? command.id),
            name: String(payload.name ?? ""),
            scope: (payload.scope === "team" ? "team" : "org") as RemotePresetScope,
            ownerId: String(payload.ownerId ?? "default"),
            templateId: String(payload.templateId ?? "bugfix") as RemoteTaskTemplateId,
            params: (payload.params ?? {}) as Record<string, string>,
          }),
        };
      case "remote-coding-preset-list":
        return {
          event: "preset-list",
          presets: this.presetCatalog.listSavedPresets(
            payload.scope === "team" || payload.scope === "org" ? payload.scope : undefined,
            payload.ownerId ? String(payload.ownerId) : undefined,
          ),
        };
      default:
        return {
          event: "session-list",
          sessions: this.registry.list(),
        };
    }
  }
}
