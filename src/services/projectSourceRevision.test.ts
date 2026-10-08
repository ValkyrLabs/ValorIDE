import { it } from "@jest/globals";
import { applicationSourceSelection, authorizedGitSourceConnections, fetchAndSelectPushedRevision, selectPublishedApplicationSource } from "./projectSourceRevision";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
jest.mock("./valkyrai/ValkyrLabsRtkApi",()=>({getValkyrLabsRtkApiClient:jest.fn(),ValkyrLabsApiError:class extends Error{constructor(message:string,public status:number){super(message);}}}));
const applicationId="11111111-1111-4111-8111-111111111111",bindingId="22222222-2222-4222-8222-222222222222",projectId="33333333-3333-4333-8333-333333333333",artifactId="44444444-4444-4444-8444-444444444444";
const options={backend:"https://api.example/v1",applicationId,bindingId,projectId,commitSha:"a".repeat(40),sourceDirectory:"project",jwtToken:"ephemeral-app-session",assertCurrent:jest.fn(async()=>{})};
const source={applicationId,artifactId,projectId,organizationId:bindingId,revisionRef:`source-snapshot:${applicationId}:${artifactId}`,checksumSha256:"b".repeat(64),commitSha:options.commitSha,sizeBytes:100};
let request:jest.Mock;
beforeEach(()=>{jest.clearAllMocks();request=jest.fn(async (q)=>({data:q.url.endsWith("/selection")?{applicationId,artifactRef:"existing-build-artifact"}:source}));(getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({request});});
it("fetches the exact pushed commit through an existing server binding and selects against the observed parent revision",async()=>{
 expect(await fetchAndSelectPushedRevision(options)).toEqual(source);
 expect(request.mock.calls.map(([q])=>q.method)).toEqual(["GET","POST","PUT"]);
 const body=request.mock.calls[1][0].json;expect(body).toEqual({bindingId,projectId,commitSha:options.commitSha,sourceDirectory:"project"});expect(JSON.stringify(body)).not.toMatch(/token|credential|password/i);
 expect(request.mock.calls[2][0].json).toEqual({revisionRef:source.revisionRef,expectedArtifactRef:"existing-build-artifact"});
});
it("rejects branch names before any server call",async()=>{await expect(fetchAndSelectPushedRevision({...options,commitSha:"main"})).rejects.toThrow(/immutable/);expect(request).not.toHaveBeenCalled();});
it("does not select source returned for another Application",async()=>{request.mockResolvedValueOnce({data:{applicationId}}).mockResolvedValueOnce({data:{...source,applicationId:bindingId}});await expect(fetchAndSelectPushedRevision(options)).rejects.toThrow(/invalid immutable/);expect(request).toHaveBeenCalledTimes(2);});
it("keeps the pushed commit intact and reports conflict without another selection attempt",async()=>{request.mockResolvedValueOnce({data:{applicationId}}).mockResolvedValueOnce({data:source}).mockRejectedValueOnce(new ValkyrLabsApiError("conflict",409));await expect(fetchAndSelectPushedRevision(options)).rejects.toThrow(/source selection changed/);expect(request).toHaveBeenCalledTimes(3);});
it("reconnects by retrying the same full commit and never transports a GitHub token",async()=>{request.mockResolvedValueOnce({data:{applicationId}}).mockRejectedValueOnce(new Error("interrupted"));await expect(fetchAndSelectPushedRevision(options)).rejects.toThrow(/pushed Git commit remains intact/);await fetchAndSelectPushedRevision(options);expect(request.mock.calls.filter(([q])=>q.method==="POST").every(([q])=>q.json.commitSha===options.commitSha)).toBe(true);});
it("requires authorized binding/project response identifiers",async()=>{request.mockResolvedValueOnce({data:{bindings:[{bindingId:"bad",repository:"fixture/project"}],projects:[{projectId}]}});await expect(authorizedGitSourceConnections(options)).rejects.toThrow(/invalid Application connections/);});

describe("uploaded immutable source selection", () => {
 const uploadOptions = { ...options, sourceKind: "upload" as const };
 const originalGeneratorChecksum = "c".repeat(64);
 const selected = { ...source, originalGeneratorChecksum };
 it("selects the published snapshot against the captured parent without adding credentials to JSON", async () => {
  request.mockResolvedValueOnce({ data: { applicationId, artifactRef: "original-generator" } }).mockResolvedValueOnce({ data: selected });
  expect(await selectPublishedApplicationSource(uploadOptions, source, "original-generator", originalGeneratorChecksum)).toEqual(selected);
  expect(request.mock.calls.map(([q]) => q.method)).toEqual(["GET", "PUT"]);
  const q = request.mock.calls[1][0];
  expect(q.json).toEqual({ revisionRef: source.revisionRef, expectedArtifactRef: "original-generator" });
  expect(JSON.stringify(q.json)).not.toMatch(/token|credential|password/i);
  expect(q.headers).toEqual({ Authorization: `Bearer ${options.jwtToken}` });
 });
 it("recovers a committed selection after response loss without another mutation", async () => {
  request.mockResolvedValueOnce({ data: { applicationId, artifactRef: source.revisionRef, sourceRevision: selected } });
  expect(await selectPublishedApplicationSource(uploadOptions, source, "original-generator", originalGeneratorChecksum)).toEqual(selected);
  expect(request).toHaveBeenCalledTimes(1);
 });
 it("refuses to silently replace a changed parent", async () => {
  request.mockResolvedValueOnce({ data: { applicationId, artifactRef: "newer-generator" } });
  await expect(selectPublishedApplicationSource(uploadOptions, source, "original-generator", originalGeneratorChecksum)).rejects.toThrow(/selection changed after publication/);
  expect(request).toHaveBeenCalledTimes(1);
 });
 it.each([
  ["application", { applicationId: bindingId }], ["artifact", { artifactId: "invalid" }],
  ["checksum", { checksumSha256: "not-a-hash" }], ["size", { sizeBytes: 0 }],
 ])("rejects invalid %s before any request", async (_name, change) => {
  await expect(selectPublishedApplicationSource(uploadOptions, { ...source, ...change }, null, originalGeneratorChecksum)).rejects.toThrow(/invalid immutable/);
  expect(request).not.toHaveBeenCalled();
 });
 it.each([
  ["application", { applicationId: bindingId }], ["project", { projectId: "invalid" }],
  ["organization", { organizationId: "invalid" }], ["baseline", { originalGeneratorChecksum: "d".repeat(64) }],
  ["checksum", { checksumSha256: "d".repeat(64) }], ["size", { sizeBytes: 200 }],
 ])("rejects a selected descriptor with mismatched %s", async (_name, change) => {
  request.mockResolvedValueOnce({ data: { applicationId, artifactRef: source.revisionRef, sourceRevision: { ...selected, ...change } } });
  await expect(selectPublishedApplicationSource(uploadOptions, source, null, originalGeneratorChecksum)).rejects.toThrow(/different or invalid source revision/);
  expect(request).toHaveBeenCalledTimes(1);
 });
 it.each([401, 403, 409])("reports HTTP %s without reflecting the session or changing authorization scope", async status => {
  request.mockRejectedValueOnce(new ValkyrLabsApiError(options.jwtToken, status));
  const error = await applicationSourceSelection(uploadOptions).catch(error => error);
  expect(error.message).toMatch(/authorized account|selection changed/);
  expect(error.message).not.toContain(options.jwtToken);
  expect(request).toHaveBeenCalledTimes(1);
 });
});
