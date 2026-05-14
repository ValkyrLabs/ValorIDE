export interface ToolExecutionResultCard {
  toolName: string;
  summary: string;
  logs: string[];
  artifacts: string[];
  output?: string;
}

export function loadToolAllowlist(envValue?: string): Set<string> {
  const configured = envValue?.split(",").map(v => v.trim()).filter(Boolean);
  const defaults = ["read_file", "write_to_file", "replace_in_file", "list_files", "search_files", "list_code_definition_names", "browser_action", "execute_command"];
  return new Set(configured?.length ? configured : defaults);
}

export function loadCommandAllowlist(envValue?: string): RegExp[] {
  const configured = envValue
    ?.split(",")
    .map(v => v.trim())
    .filter(Boolean)
    .map(pattern => new RegExp(pattern));

  return configured?.length ? configured : [/^yarn\b/, /^npm\b/, /^pnpm\b/, /^node\b/, /^git\b/, /^ls\b/, /^cat\b/, /^echo\b/];
}

export function isAllowedCommand(command: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(command));
}

export function toResultCard(toolName: string, rawResult: any): ToolExecutionResultCard {
  if (toolName === "execute_command" && rawResult && typeof rawResult === "object") {
    const stdout = typeof rawResult.stdout === "string" ? rawResult.stdout : "";
    const stderr = typeof rawResult.stderr === "string" ? rawResult.stderr : "";
    const logs = [rawResult.command ? `$ ${rawResult.command}` : "", stdout, stderr].filter(Boolean);

    return {
      toolName,
      summary: stdout || stderr || "Command executed successfully",
      logs,
      artifacts: [],
      output: stdout || stderr || ""
    };
  }

  const summary = typeof rawResult === "string" ? rawResult : rawResult?.message || "Tool command executed";

  return {
    toolName,
    summary,
    logs: [summary],
    artifacts: [],
    output: typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult)
  };
}
