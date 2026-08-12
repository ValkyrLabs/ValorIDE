import {
  workflowStudioFrameOrigins,
  workflowStudioWebviewHtml,
} from "./workflowStudioWebview";

describe("Workflow Studio webview", () => {
  const launchUrl =
    "https://api-0.valkyrlabs.com/v1/auth/valoride/webview-session?ticket=opaque-ticket&workflowId=workflow-1";

  it("allows only the API handoff and ValkyrLabs website frame origins", () => {
    expect(workflowStudioFrameOrigins(launchUrl)).toEqual([
      "https://api-0.valkyrlabs.com",
      "https://valkyrlabs.com",
      "https://*.valkyrlabs.com",
    ]);
  });

  it("embeds the opaque handoff and escapes workflow labels", () => {
    const html = workflowStudioWebviewHtml(
      launchUrl,
      'Build <Launch> "Now"\nSafely',
    );

    expect(html).toContain(`src="${launchUrl.replace(/&/g, "&amp;")}"`);
    expect(html).toContain("Build &lt;Launch&gt; &quot;Now&quot;");
    expect(html).toContain(
      'loading " + "Build \\u003cLaunch\\u003e \\"Now\\"\\nSafely" + "…"',
    );
    expect(html).toContain("valkyrai.workflowStudio.ready");
    expect(html).toContain('event.data.workflowId !== "workflow-1"');
    expect(html).toContain("valoride.workflowStudio.retry");
    expect(html).toContain("Retry secure handoff");
    expect(html).toMatch(/script-src 'nonce-[^']+'/);
    expect(html).not.toContain("Authorization");
    expect(html).not.toContain("jwtSession");
  });
});
