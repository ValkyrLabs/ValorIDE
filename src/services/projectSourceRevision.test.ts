import { authorizedGitSourceConnections, fetchAndSelectPushedRevision } from "./projectSourceRevision";
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
