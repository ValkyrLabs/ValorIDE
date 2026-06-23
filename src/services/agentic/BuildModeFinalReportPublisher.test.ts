import { prepareBuildModeFinalReportPublication } from "./BuildModeFinalReportPublisher";

describe("BuildModeFinalReportPublisher", () => {
  it("redacts secret material before final report artifact or memory publication", () => {
    const publication = prepareBuildModeFinalReportPublication(
      [
        "# Deploy OPENAI_API_KEY=sk-title-secretvalue123456",
        "",
        "Authorization: Bearer final-report-secret-token",
        "See https://example.test/logs?access_token=report-secret-token",
      ].join("\n"),
      "Fallback report",
    );

    expect(publication.markdown).toContain("OPENAI_API_KEY=<redacted>");
    expect(publication.markdown).toContain(
      "Authorization: Bearer <redacted-secret>",
    );
    expect(publication.markdown).toContain("access_token=<redacted>");
    expect(publication.title).toBe("Deploy OPENAI_API_KEY=<redacted>");
    expect(publication.byteSize).toBe(
      Buffer.byteLength(publication.markdown, "utf8"),
    );
    expect(publication.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(publication.markdown).not.toContain("sk-title-secretvalue123456");
    expect(publication.markdown).not.toContain("final-report-secret-token");
    expect(publication.markdown).not.toContain("report-secret-token");
  });

  it("falls back to the command label when no report heading is present", () => {
    expect(
      prepareBuildModeFinalReportPublication("No heading.", "Publish report"),
    ).toMatchObject({
      title: "Publish report",
    });
  });
});
