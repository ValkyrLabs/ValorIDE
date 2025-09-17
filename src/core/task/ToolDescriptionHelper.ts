import { ToolUseName } from "@core/assistant-message";

/**
 * Helper class to generate tool descriptions for UI display
 */
export class ToolDescriptionHelper {
  static getToolDescription(toolName: ToolUseName, params: Record<string, any>): string {
    switch (toolName) {
      case "execute_command":
        return `[${toolName} for '${params.command}']`;
      case "read_file":
        return `[${toolName} for '${params.path}']`;
      case "write_to_file":
        return `[${toolName} for '${params.path}']`;
      case "replace_in_file":
        return `[${toolName} for '${params.path}']`;
      case "search_files":
        return `[${toolName} for '${params.regex}'${
          params.file_pattern ? ` in '${params.file_pattern}'` : ""
        }]`;
      case "list_files":
        return `[${toolName} for '${params.path}']`;
      case "list_code_definition_names":
        return `[${toolName} for '${params.path}']`;
      case "browser_action":
        return `[${toolName} for '${params.action}']`;
      case "use_mcp_tool":
        return `[${toolName} for '${params.server_name}']`;
      case "access_mcp_resource":
        return `[${toolName} for '${params.server_name}']`;
      case "ask_followup_question":
        return `[${toolName} for '${params.question}']`;
      case "plan_mode_respond":
        return `[${toolName}]`;
      case "load_mcp_documentation":
        return `[${toolName}]`;
      case "attempt_completion":
        return `[${toolName}]`;
      case "new_task":
        return `[${toolName} for creating a new task]`;
      case "condense":
        return `[${toolName}]`;
      default:
        return `[${toolName}]`;
    }
  }
}
