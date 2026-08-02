export const workflowStudioFrameOrigins = (launchUrl: string): string[] => {
  const launchOrigin = new URL(launchUrl).origin;
  const origins = new Set<string>([launchOrigin]);
  if (launchOrigin.endsWith(".valkyrlabs.com")) {
    origins.add("https://valkyrlabs.com");
    origins.add("https://*.valkyrlabs.com");
  } else {
    origins.add("http://localhost:*");
    origins.add("http://127.0.0.1:*");
  }
  return [...origins];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const workflowStudioWebviewHtml = (
  launchUrl: string,
  workflowName: string,
) => {
  const frameOrigins = workflowStudioFrameOrigins(launchUrl).join(" ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${frameOrigins}; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(workflowName)} - Workflow Studio</title>
  <style>
    html, body, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; background: #080a0e; }
  </style>
</head>
<body>
  <iframe src="${escapeHtml(launchUrl)}" title="${escapeHtml(workflowName)} Workflow Studio" allow="clipboard-read; clipboard-write" referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
};
