import { redactCommandSecrets } from "./BuildModeCommandPolicy";
import { createBuildModeArtifactContentHash } from "./BuildModeArtifactStore";

export interface BuildModeFinalReportPublication {
  byteSize: number;
  contentHash: string;
  markdown: string;
  title: string;
}

export const prepareBuildModeFinalReportPublication = (
  rawMarkdown: string,
  fallbackTitle: string,
): BuildModeFinalReportPublication => {
  const markdown = redactCommandSecrets(rawMarkdown.trim());
  const title =
    markdown.match(/^#\s+(?<title>.+)$/m)?.groups?.title?.trim() ??
    fallbackTitle;

  return {
    byteSize: Buffer.byteLength(markdown, "utf8"),
    contentHash: createBuildModeArtifactContentHash(markdown),
    markdown,
    title,
  };
};
