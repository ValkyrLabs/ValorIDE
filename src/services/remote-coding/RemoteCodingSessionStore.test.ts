import fs from "fs"
import os from "os"
import path from "path"
import { afterEach, describe, expect, it } from "vitest"
import { RemoteCodingSessionStore } from "./RemoteCodingSessionStore"

const tempDirs: string[] = []

afterEach(() => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop()
		if (dir && fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true, force: true })
		}
	}
})

describe("RemoteCodingSessionStore", () => {
	it("starts sessions and prepares deterministic log/artifact paths", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "valoride-remote-session-"))
		tempDirs.push(root)

		const store = new RemoteCodingSessionStore(root)
		const now = new Date("2026-03-03T20:06:00.000Z")
		const session = store.startSession({
			sessionId: "session-1",
			task: "Implement detached run mode",
			repoPath: "/tmp/repo",
			now,
		})

		expect(session.status).toBe("running")
		expect(fs.existsSync(session.logPath)).toBe(true)
		expect(fs.existsSync(session.artifactsPath)).toBe(true)
		expect(session.createdAt).toBe(now.toISOString())
		expect(store.listSessions().map((s) => s.id)).toEqual(["session-1"])
	})

	it("updates heartbeat, appends logs, and supports stop/timeout controls", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "valoride-remote-session-"))
		tempDirs.push(root)

		const store = new RemoteCodingSessionStore(root)
		store.startSession({
			sessionId: "session-2",
			task: "Run codegen",
			repoPath: "/tmp/repo",
			now: new Date("2026-03-03T20:06:00.000Z"),
		})

		const heartbeat = store.updateHeartbeat("session-2", "still running", new Date("2026-03-03T20:07:00.000Z"))
		expect(heartbeat?.lastHeartbeatMessage).toBe("still running")

		expect(store.appendLog("session-2", "build passed")).toBe(true)
		expect(fs.readFileSync(heartbeat!.logPath, "utf8")).toContain("build passed")

		const stopped = store.stopSession("session-2", new Date("2026-03-03T20:08:00.000Z"))
		expect(stopped?.status).toBe("stopped")
		expect(stopped?.endedAt).toBe("2026-03-03T20:08:00.000Z")

		const timedOut = store.markTimedOut("session-2", new Date("2026-03-03T20:09:00.000Z"), "worker heartbeat expired")
		expect(timedOut?.status).toBe("timed_out")
		expect(timedOut?.errorMessage).toBe("worker heartbeat expired")
	})
})
