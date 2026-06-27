# ValorIDE Hooks

ValorIDE includes a Cline-compatible hook runtime for task and tool lifecycle
automation. Hooks are disabled by default and can be enabled with:

```json
"valoride.hooks.enabled": true
```

When enabled, ValorIDE looks for hook scripts in:

- `~/.valoride/hooks`
- `<workspace>/.valoride/hooks`
- `<workspace>/.clinerules/hooks`

The `.clinerules/hooks` path is supported for Cline compatibility. ValorIDE
keeps its ThorAPI, GrayMatter, RBAC, and generated-code boundaries intact; hooks
are an extension point around the agent loop, not a replacement for those
systems.

## Supported Hook Names

- `PreToolUse`
- `PostToolUse`
- `TaskStart`
- `TaskResume`
- `TaskCancel`
- `TaskComplete`
- `TaskError`
- `UserPromptSubmit`
- `PreCompact`
- `SessionShutdown`

`PreToolUse` and `PostToolUse` are currently wired into the refactored
ValorIDE tool execution path. The remaining names are reserved for task and
context lifecycle integration.

## Script Format

Hooks receive JSON on stdin and may return either raw JSON or a
`HOOK_CONTROL\t{...}` line on stdout. Supported script extensions are:

- extensionless executable scripts
- `.sh`, `.bash`, `.zsh`
- `.js`, `.mjs`, `.cjs`
- `.py`

Example `PreToolUse.js`:

```js
let body = "";
process.stdin.on("data", (chunk) => (body += chunk));
process.stdin.on("end", () => {
  const payload = JSON.parse(body);
  if (payload.preToolUse?.toolName === "execute_command") {
    console.log(
      "HOOK_CONTROL\t" +
        JSON.stringify({
          review: true,
          context: "Command execution was inspected by the workspace hook.",
        }),
    );
  }
});
```

## Hook Controls

Hooks may return:

- `cancel: true` to block the tool before execution
- `review: true` for future approval UI integration
- `context: string` to append guidance to the next model turn
- `overrideInput: object` to merge replacement tool parameters before execution

Hook errors, timeouts, and non-zero exits are converted into context instead of
crashing the task. A hook must explicitly return `cancel: true` to block a tool.
