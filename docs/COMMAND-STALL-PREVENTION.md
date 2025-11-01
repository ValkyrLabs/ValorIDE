# Command Execution Anti-Stall Prevention

## Overview

Valor IDE implements **5 strategic mechanisms** to prevent long-running commands from blocking or stalling the application. This ensures that operations like `npm run build`, `cargo build`, and `mvn clean install` complete smoothly without hanging the IDE.

## Problem Statement

Previously, long-running shell commands would:
- Block indefinitely waiting for user feedback on command output
- Provide no progress indication to users
- Timeout after only 30 seconds (insufficient for builds)
- Deadlock the execution loop with nested awaits

## Solution Architecture

### 1. 2-Second Ask Timeout (Auto-Approve)

**Location:** `/src/core/task/index.ts:1785`

```typescript
const askPromise = this.ask("command_output", chunk);
const timeoutPromise = new Promise((resolve) => {
  setTimeout(() => {
    resolve({ response: "yesButtonClicked", text: "", images: [] });
  }, 2000); // Auto-approve after 2s
});

const { response, text, images } = await Promise.race([askPromise, timeoutPromise]);
```

**Behavior:**
- If user doesn't respond within 2 seconds, automatically approve continuation
- Prevents indefinite blocking on user interaction timeouts
- Allows command execution to proceed without user intervention

**Test Coverage:**
- ✅ `command-stall-prevention.test.ts` line ~20

---

### 2. Progress Reporting Every 5 Seconds

**Location:** `/src/core/task/index.ts:1834`

```typescript
const PROGRESS_REPORT_INTERVAL = 5000;
let lastProgressReport = Date.now();

// In process.on("line"):
const now = Date.now();
if (now - lastProgressReport > PROGRESS_REPORT_INTERVAL) {
  lastProgressReport = now;
  const elapsed = Math.round((now - (process as any).startedAt) / 1000);
  void this.say("command_output", `[Still running for ${elapsed}s...]`)
    .catch(() => { });
}
```

**Behavior:**
- Every 5 seconds, emit progress message to user showing elapsed time
- User sees `[Still running for 15s...]`, `[Still running for 20s...]`, etc.
- Non-blocking (fire-and-forget)

**Test Coverage:**
- ✅ `command-stall-prevention.test.ts` line ~68

---

### 3. 60-Second Node Execution Timeout

**Location:** `/src/core/task/index.ts:1656`

```typescript
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    if (childProcess.pid) {
      childProcess.kill("SIGKILL");
    }
    reject(new Error("Command timeout after 60s"));
  }, 60000); // Increased from 30s
});

const result = await Promise.race([childProcess, timeoutPromise]);
```

**Behavior:**
- Commands in Node.js execution mode timeout after 60 seconds (was 30s)
- Process forcefully terminated with SIGKILL
- User receives clear timeout error message

**Test Coverage:**
- ✅ `command-stall-prevention.test.ts` line ~100

---

### 4. Process Start Time Tracking

**Location:** `/src/core/task/index.ts:1727`

```typescript
const process = this.terminalManager.runCommand(terminalInfo, command);
(process as any).startedAt = Date.now(); // Track start time
```

**Behavior:**
- Attach start timestamp to process object
- Used to calculate accurate elapsed time for progress messages
- Enables progress reporting without wall-clock drift

**Test Coverage:**
- ✅ `command-stall-prevention.test.ts` line ~130

---

### 5. Non-Blocking Output Streaming

**Location:** `/src/core/task/index.ts:1863`

```typescript
const streamLine = (line: string) => {
  // Fire-and-forget: don't await, just call
  this.say("command_output", line)
    .catch((error) => {
      Logger.warn(`Failed to stream: ${error}`);
    });
};
```

**Behavior:**
- Output streaming never blocks command execution
- Errors are logged but don't propagate
- Prevents nested awaits that could cause deadlocks

**Test Coverage:**
- ✅ `command-stall-prevention.test.ts` line ~149

---

## Configuration & Rules

These rules are documented in `.valoriderules`:

```markdown
# COMMAND EXECUTION ANTI-STALL RULES

1. **2s timeout on command_output asks** — Auto-approves if user unresponsive
2. **Progress reporting every 5s** — Shows elapsed time (e.g., "[Still running for 45s...]")
3. **60s Node execution timeout** — Increased from 30s for builds/tests
4. **Non-blocking output streaming** — Fire-and-forget `this.say()` without await
5. **Process start tracking** — Accurate elapsed time calculation

Result: `npm run build`, `cargo build`, `mvn clean install` won't stall Valor IDE
```

---

## Test Suite

**File:** `/src/core/task/__tests__/command-stall-prevention.test.ts`

**Test Coverage:**
- ✅ 2-second auto-approval mechanism
- ✅ Progress reporting intervals
- ✅ 60-second timeout enforcement
- ✅ Process start time tracking
- ✅ Non-blocking stream handling
- ✅ Integration test: 30-second command with progress
- ✅ Stress test: 100 auto-approvals without stalling

**Running Tests:**
```bash
npm test -- src/core/task/__tests__/command-stall-prevention.test.ts --run
```

---

## User Experience Flow

### Before (Broken)
```
User starts: npm run build (120s)
     ↓
Valor waits for user response on first output chunk
     ↓
User doesn't respond (assumes IDE is responsive)
     ↓
IDE appears FROZEN (hangs indefinitely)
     ↓
User force-quits IDE
```

### After (Fixed)
```
User starts: npm run build (120s)
     ↓
[0s] Output chunk arrives → Auto-approve after 2s
[5s] Progress: "[Still running for 5s...]"
[10s] Progress: "[Still running for 10s...]"
[15s] Progress: "[Still running for 15s...]"
     ...
[120s] Build completes ✓
```

---

## Performance Impact

- **Memory:** Negligible (single `Date.now()` timestamp)
- **CPU:** Minimal (timer callbacks every 5 seconds)
- **Network:** Zero additional network traffic
- **UX:** Immediate response, progressive feedback

---

## Debugging & Monitoring

Enable debug logging:
```typescript
Logger.info(`Command executed. Elapsed: ${elapsed}s`);
Logger.warn(`Failed to stream output: ${error.message}`);
```

Monitor in production:
- Track timeout rates (should be <1% of commands)
- Log commands that exceed 60s
- Alert on hang patterns

---

## Future Enhancements

- [ ] Configurable timeout per command (e.g., longer for builds)
- [ ] Parallel progress streams from multi-process commands
- [ ] Command cancellation UI with safety prompt
- [ ] Historical elapsed time statistics

---

## References

- **Implementation:** `/src/core/task/index.ts` (lines 1656, 1727, 1785, 1834, 1863)
- **Configuration:** `/.valoriderules` (COMMAND EXECUTION ANTI-STALL RULES section)
- **Tests:** `/src/core/task/__tests__/command-stall-prevention.test.ts`
- **Issue:** Prevent long-running commands from blocking Valor IDE