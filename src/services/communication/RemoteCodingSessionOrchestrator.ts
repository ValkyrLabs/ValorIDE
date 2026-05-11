import {
  RemoteCodingSession,
  RemoteCodingSessionRegistry,
} from "./RemoteCodingSessionRegistry";

export type RemoteCodingCommandType =
  | "remote-coding-session-start"
  | "remote-coding-session-heartbeat"
  | "remote-coding-session-log"
  | "remote-coding-session-artifact"
  | "remote-coding-session-stop"
  | "remote-coding-session-cancel"
  | "remote-coding-session-list";

export interface RemoteCodingCommand {
  id: string;
  type: RemoteCodingCommandType;
  payload?: Record<string, any>;
}

export interface RemoteCodingCommandResult {
  event: "session-updated" | "session-list";
  session?: RemoteCodingSession;
  sessions?: RemoteCodingSession[];
}

export class RemoteCodingSessionOrchestrator {
  constructor(private readonly registry: RemoteCodingSessionRegistry) {}

  handle(command: RemoteCodingCommand): RemoteCodingCommandResult {
    const payload = command.payload ?? {};
    const sessionId = payload.sessionId ?? payload.id;

    switch (command.type) {
      case "remote-coding-session-start":
        return {
          event: "session-updated",
          session: this.registry.start({
            id: String(sessionId),
            task: String(payload.task ?? ""),
            timeoutMs: payload.timeoutMs,
          }),
        };
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
      case "remote-coding-session-list":
        return {
          event: "session-list",
          sessions: this.registry.list(),
        };
      default:
        return {
          event: "session-list",
          sessions: this.registry.list(),
        };
    }
  }
}
