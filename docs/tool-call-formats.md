# Assistant Tool Call Formats

ValorIDE's assistant pipeline now recognizes two XML-based formats for tool executions. Understanding the difference helps when inspecting transcripts or crafting custom prompts.

## Legacy Format (`<function_calls>` / `<invoke>`)

Older prompts wrapped every tool invocation inside a `<function_calls>` block, with each tool expressed as an `<invoke>` element. Tool parameters appeared as nested `<parameter>` elements identified by name attributes.

```xml
<function_calls>
  <invoke name="execute_command">
    <parameter name="command">cd /workspace && ls</parameter>
    <parameter name="requires_approval">false</parameter>
  </invoke>
</function_calls>
```

## Current Format (Direct Tool Tags)

The modern contract removes the wrapper elements. Each tool call uses its tool name as the tag, and parameters are expressed directly as child tags that match the documented parameter names.

```xml
<execute_command>
  <command>cd /workspace && ls</command>
  <requires_approval>false</requires_approval>
</execute_command>
```

## Compatibility Notes

- ValorIDE automatically normalizes legacy messages before parsing, so either format will execute.
- New prompts should emit the direct-tag format; it is leaner and avoids the extra wrapper tags that some models forget to close.
- When writing tests or mock transcripts, prefer the current format to avoid confusion and to match the parser's native output.
