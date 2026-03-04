import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"

export type RemoteCodingSessionStatus = "running" | "stopping" | "stopped" | "failed" | "timed_out"

export interface RemoteCodingSessionRecord {
	id: string
	task: string
	repoPath: string
	createdAt: string
	updatedAt: string
	startedAt: string
	endedAt?: string
	status: RemoteCodingSessionStatus
	heartbeatAt: string
	lastHeartbeatMessage?: string
	logPath: string
	artifactsPath: string
	errorMessage?: string
}

export interface StartRemoteCodingSessionInput {
	task: string
	repoPath: string
	sessionId?: string
	now?: Date
}

export class RemoteCodingSessionStore {
	private readonly sessions = new Map<string, RemoteCodingSessionRecord>()

	constructor(private readonly baseDir: string) {
		fs.mkdirSync(this.baseDir, { recursive: true })
	}

	startSession(input: StartRemoteCodingSessionInput): RemoteCodingSessionRecord {
		const now = input.now ?? new Date()
		const sessionId = input.sessionId ?? randomUUID()
		const sessionDir = path.join(this.baseDir, sessionId)
		const artifactsPath = path.join(sessionDir, "artifacts")
		const logPath = path.join(sessionDir, "run.log")

		fs.mkdirSync(artifactsPath, { recursive: true })
		if (!fs.existsSync(logPath)) {
			fs.writeFileSync(logPath, "", "utf8")
		}

		const record: RemoteCodingSessionRecord = {
			id: sessionId,
			task: input.task,
			repoPath: input.repoPath,
			createdAt: now.toISOString(),
			updatedAt: now.toISOString(),
			startedAt: now.toISOString(),
			status: "running",
			heartbeatAt: now.toISOString(),
			logPath,
			artifactsPath,
		}

		this.sessions.set(sessionId, record)
		return record
	}

	listSessions(): RemoteCodingSessionRecord[] {
		return [...this.sessions.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
	}

	updateHeartbeat(sessionId: string, message?: string, now: Date = new Date()): RemoteCodingSessionRecord | null {
		const session = this.sessions.get(sessionId)
		if (!session) {
			return null
		}

		session.heartbeatAt = now.toISOString()
		session.updatedAt = now.toISOString()
		session.lastHeartbeatMessage = message
		this.sessions.set(sessionId, session)
		return session
	}

	appendLog(sessionId: string, line: string): boolean {
		const session = this.sessions.get(sessionId)
		if (!session) {
			return false
		}
		fs.appendFileSync(session.logPath, `${line}\n`, "utf8")
		return true
	}

	stopSession(sessionId: string, now: Date = new Date()): RemoteCodingSessionRecord | null {
		const session = this.sessions.get(sessionId)
		if (!session) {
			return null
		}
		session.status = "stopped"
		session.endedAt = now.toISOString()
		session.updatedAt = now.toISOString()
		this.sessions.set(sessionId, session)
		return session
	}

	markTimedOut(sessionId: string, now: Date = new Date(), message: string = "session timed out"): RemoteCodingSessionRecord | null {
		const session = this.sessions.get(sessionId)
		if (!session) {
			return null
		}
		session.status = "timed_out"
		session.errorMessage = message
		session.endedAt = now.toISOString()
		session.updatedAt = now.toISOString()
		this.sessions.set(sessionId, session)
		return session
	}
}
