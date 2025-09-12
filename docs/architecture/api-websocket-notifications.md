# API Websocket Notifications in ValorIDE

## Overview

ValorIDE now emits websocket messages for every API action performed by the agent. This enables real-time synchronization, monitoring, and orchestration across multiple ValorIDE instances or external systems.

## How It Works

- The `Task` class in `src/core/task/index.ts` is responsible for orchestrating API requests and tool operations.
- After every successful API response (i.e., after the assistant's message is processed), the `Task` class checks for an injected `communicationService` instance.
- If present, it calls `communicationService.sendMessage` with a websocket message describing the API action.

## Websocket Message Structure

Each websocket message sent for an API action has the following structure:

```json
{
  "type": "api_action",
  "payload": {
    "taskId": "<string>",
    "message": "<assistantMessage>",
    "timestamp": <number>
  }
}
```

- `type`: Always `"api_action"` for API events.
- `taskId`: The unique identifier for the current task.
- `message`: The assistant's response message (may include tool results, completions, etc).
- `timestamp`: The time the message was sent (milliseconds since epoch).

## Integration Points

- The `communicationService` is injected into the `Task` class (optionally) at construction.
- If not provided, websocket notifications are skipped (backward compatible).
- The websocket message is sent immediately after the assistant's message is added to the API conversation history.

## Use Cases

- **Real-time collaboration:** Keep multiple ValorIDE instances in sync.
- **Remote orchestration:** Trigger actions in other tools or dashboards when API actions occur.
- **Monitoring & analytics:** Track API activity for auditing or visualization.

## Example

When an API action completes, the following message is sent over the websocket:

```json
{
  "type": "api_action",
  "payload": {
    "taskId": "1725997600000",
    "message": "Completed file generation and test run.",
    "timestamp": 1725997600000
  }
}
```

## Extending

- To listen for these events, subscribe to the websocket channel used by `CommunicationService`.
- To customize the payload, modify the logic in `src/core/task/index.ts` where `communicationService.sendMessage` is called.

---

_Last updated: 2025-09-10_
