import { describe, expect, it } from "vitest";
import { deriveTaskProgress, TASK_PHASES, phaseToIndex } from "./taskPhase";
const makeMessages = () => {
    let ts = 1;
    return (override) => ({
        ts: ts++,
        type: "say",
        ...override,
    });
};
describe("deriveTaskProgress", () => {
    it("resets to the latest phase when work resumes after completion", () => {
        const nextMessage = makeMessages();
        const messages = [
            nextMessage({ say: "completion_result", text: "done" }),
            nextMessage({ say: "command", text: "ls" }),
        ];
        const progress = deriveTaskProgress(messages);
        expect(progress.phase).toBe("ACT");
        expect(progress.anchors.DONE).toBe(messages[0].ts);
        expect(progress.anchors.ACT).toBe(messages[1].ts);
        const expectedRatio = phaseToIndex("ACT") / (TASK_PHASES.length - 1 || 1);
        expect(progress.ratio).toBeCloseTo(expectedRatio);
    });
    it("flags warning confidence on non-zero exit codes in recent command output", () => {
        const nextMessage = makeMessages();
        const messages = [
            nextMessage({ say: "command", text: "npm test" }),
            nextMessage({
                say: "command_output",
                text: "Command executed with exit code 2.\nOutput:\nfailed tests",
            }),
        ];
        const progress = deriveTaskProgress(messages);
        expect(progress.phase).toBe("RUN");
        expect(progress.confidence).toBe("warning");
    });
    it("flags warning confidence after repeated API retries", () => {
        const nextMessage = makeMessages();
        const messages = [
            nextMessage({ say: "api_req_retried", text: "" }),
            nextMessage({ say: "api_req_retried", text: "" }),
            nextMessage({ say: "command", text: "echo retry" }),
        ];
        const progress = deriveTaskProgress(messages);
        expect(progress.phase).toBe("ACT");
        expect(progress.confidence).toBe("warning");
    });
});
//# sourceMappingURL=taskPhase.test.js.map