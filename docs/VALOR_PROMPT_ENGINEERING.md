# Valor IDE Prompt Engineering Updates

## 2025-11-01: Browser-First & No-Block Execution Model

### Core Changes

#### 1. BROWSER-FIRST PROTOCOL (§4)
- **Before:** Check port after starting service
- **After:** Check port 5173 FIRST, open browser, conditionally start service

**4-Step Process:**
1. Check: `lsof -i :5173` — is service already running?
2. If running → Open browser immediately on http://localhost:5173
3. If NOT running → Start in BACKGROUND (never foreground), then open browser
4. Verify UI and proceed with work

**Critical:** Never foreground-wait on `npm run dev` or `mvn spring-boot:run`

#### 2. NO-BLOCKING-SERVICES DISCIPLINE (§4.5)
- Background pattern: `npm run dev > /tmp/dev.log 2>&1 & DEV_PID=$!`
- Kill when done: `kill $DEV_PID 2>/dev/null`
- Safe commands (exit): npm test, npm build, mvn test, mvn package
- Dangerous commands (never foreground): npm run dev, mvn spring-boot:run, yarn dev

#### 3. ANTI-STALL RULES
- NO recursive loops without clear exit condition
- NO re-running same failed command 3+ times without code change
- NO waiting for user input (use ask_followup_question with buttons)
- On blocker: Escalate with ask_followup_question OR move to next milestone

### Files Updated
- `.valoride/memorybank/activeContext.md` — Behavioral update section
- `src/core/prompts/system.ts` — §4 enhanced, §4.5 added

### Implementation Details

**Port Check Pattern:**
```bash
lsof -i :5173 > /dev/null 2>&1 && echo "Service running" || echo "Port free"
```

**Background Service Launch:**
```bash
cd ${cwd} && npm run dev > /tmp/dev.log 2>&1 &
DEV_PID=$!
sleep 3
# ... do work ...
kill $DEV_PID 2>/dev/null
```

### Execution Model Changes

| Before | After |
|--------|-------|
| Start service foreground | Check port first |
| Wait for service | Open browser if running |
| Then open browser | Start in background if not |
| Possible hangs | Kill when done (no blocks) |

### Quality Gates
✓ Port 5173 check FIRST before any service launch
✓ Browser opens immediately if service running
✓ Service starts in background if not running
✓ Never foreground-wait on blocking services
✓ Test/build commands safe to run (they exit)
✓ Escalation protocol on blockers (no infinite loops)

**Result:** Autonomous, non-blocking, browser-first execution model locked in.