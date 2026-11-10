import { refreshHostedProjectRevision } from "./projectHostedRefresh";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(), ValkyrLabsApiError: class extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
}));

const app = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const artifactId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const commitSha = "c".repeat(40);
const revisionRef = `source-snapshot:${app}:${artifactId}`;
const revision = { applicationId: app, artifactId, organizationId: app, projectId: app,
  commitSha, revisionRef, checksumSha256: "a".repeat(64), sizeBytes: 55 };
const options = { applicationId: app, backend: "https://api.example/v1", jwtToken: "session-only", assertCurrent: jest.fn() };
const input = { options, revision, branch: "release", repository: "acme/example" };
const receipt = { applicationId: app, revisionRef, commitSha, queued: 2, alreadyRequested: 0 };
const request = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  request.mockResolvedValue({ data: receipt });
  (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
});
it("requests one guarded server fan-out and reports admission, not deployment", async () => {
  const result = await refreshHostedProjectRevision(input);
  expect(result).toMatchObject({ runningTargets: 2, queued: 2 });
  expect(result.message).toMatch(/queued/);
  expect(options.assertCurrent).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    url: `https://api.example/v1/thorapi/applications/${app}/developer-project/refresh-running`, method: "POST",
    json: { branch: "release", repository: "acme/example", revisionRef, commitSha },
    headers: { Authorization: "Bearer session-only" }, redirect: "error",
  }));
});
it("does not start or provision an instance when server reports no active targets", async () => {
  request.mockResolvedValueOnce({ data: { ...receipt, queued: 0 } });
  expect((await refreshHostedProjectRevision(input)).message).toMatch(/No running Valkyr-hosted/);
  expect(request).toHaveBeenCalledTimes(1);
});
it("does not send a different app's revision", async () => {
  await expect(refreshHostedProjectRevision({ ...input, revision: { ...revision, applicationId: artifactId } }))
    .rejects.toThrow(/immutable/);
  expect(request).not.toHaveBeenCalled();
});
it("rejects a receipt for a different commit", async () => {
  request.mockResolvedValueOnce({ data: { ...receipt, commitSha: "d".repeat(40) } });
  await expect(refreshHostedProjectRevision(input)).rejects.toThrow(/did not match/);
});
it("surfaces a failed refresh without retrying the push or leaking server responses", async () => {
  request.mockRejectedValueOnce(new ValkyrLabsApiError("private context", 409));
  await expect(refreshHostedProjectRevision(input)).rejects.toThrow(/HTTP 409.*Git push remains intact/);
  expect(request).toHaveBeenCalledTimes(1);
});
