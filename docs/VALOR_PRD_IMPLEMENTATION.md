# VALOR IDE PRD Implementation Guide

## Production-Grade App Generation from ThorAPI Specs

**Date:** 2025-11-15  
**Status:** Milestone 1 — Prompt Optimization (Complete)  
**Location:** [Main PRD](../.valoride/memorybank/VALOR_PRD_2025.md)

---

## Overview

This guide explains how to implement the VALOR PRD in production code, following the `.valoriderules` mandate to use ThorAPI-generated services as the single source of truth.

### Architecture

```
User Task
    ↓
src/core/prompts/system.ts (Enhanced with Milestone 1)
    ├── § DOGFOOD MANDATE
    ├── § SWARM COORDINATION LOGIC
    ├── § PROMPT OPTIMIZATION RULES
    └── § ThorAPI SERVICES PRIORITY
    ↓
LLM API Call (Claude, GPT, etc.)
    ↓
Tool Execution (PSR, browser, CLI, MCP)
    ↓
Rating Service (Store outcome)
    ↓
Weekly Analysis Job (Prompt improvement)
    ↓
LLM Details Service (Load better prompt for next task)
```

---

## Phase 1: Prompt Optimization (✅ COMPLETE)

### Completed

✅ **src/core/prompts/system.ts** — Enhanced with:

- § 5.5: PROMPT OPTIMIZATION & SWARM INTELLIGENCE
- ThorAPI services priority order (ApplicationService → RatingService → LLMDetailsService)
- Swarm agent coordination rules (Supervisor + 3 workers)
- Continuous prompt improvement loop documentation
- Task intent detection (app-gen, browser-work, psr-edit, cli-test)

### How It Works

When VALOR executes a task:

1. System prompt § 5.5 instructs to use ThorAPI services FIRST
2. After task completes, create Rating entry (via RatingService)
3. Weekly: Analyze ratings to identify prompt weaknesses
4. Suggest enhancements (via LLM)
5. Next task: Load improved prompt (via LLMDetailsService)

---

## Phase 2: Add Rating & LLMDetails Models (TODO)

### Step 1: Update ThorAPI OpenAPI Spec

Edit: `src/main/resources/openapi/api.hbs.yaml`

Add Rating model:

```yaml
Rating:
  type: object
  x-thorapi-audit: true
  x-thorapi-handler-create: true
  x-thorapi-handler-read: true
  x-thorapi-handler-list: true
  properties:
    taskId:
      type: string
      description: "Task ID from Valor execution"
    llmDetailsId:
      type: string
      description: "Which LLMDetails prompt was used"
    success:
      type: boolean
    tokensCost:
      type: number
      format: double
    duration:
      type: integer
      format: int32
      description: "Seconds elapsed"
    userRating:
      type: integer
      minimum: 1
      maximum: 5
    feedback:
      type: string
    toolFailures:
      type: array
      items:
        type: object
        properties:
          toolName:
            type: string
          failureReason:
            type: string
          retryCount:
            type: integer
```

Add LLMDetails model:

```yaml
LLMDetails:
  type: object
  x-thorapi-audit: true
  x-thorapi-handler-create: true
  x-thorapi-handler-read: true
  x-thorapi-handler-list: true
  properties:
    name:
      type: string
    description:
      type: string
    initialPrompt:
      type: string
      description: "Full custom prompt text"
    promptType:
      type: string
      enum: ["SYSTEM", "APPEND"]
    tags:
      type: array
      items:
        type: string
      description: "app-gen, browser, psr, swarm"
    ratingScore:
      type: number
      format: double
      minimum: 0
      maximum: 5
    ratingCount:
      type: integer
```

### Step 2: Regenerate via Maven

```bash
cd /Users/johnmcmahon/workspace/2025/valkyr/ValorIDE
mvn clean install -DskipTests
```

This auto-generates:

- Java Spring Boot: `generated/src/main/java/com/valkyr/rating/` and `generated/src/main/java/com/valkyr/llmdetails/`
- TypeScript RTK Query: `webview-ui/src//redux/services/RatingService.tsx` and `LLMDetailsService.tsx`
- React Components: `webview-ui/src//redux/components/` (if templates configured)

### Step 3: DO NOT EDIT Generated Files

✅ **CORRECT:** Import and use generated services in production code

```typescript
// ✅ CORRECT: Production code
import { useCreateRatingMutation } from "@thorapi/redux/services/RatingService";
import { useGetLlmDetailsQuery } from "@thorapi/redux/services/LLMDetailsService";

export function TaskCompletionHandler() {
  const [createRating] = useCreateRatingMutation();

  const onTaskComplete = async (result) => {
    await createRating({
      taskId: result.id,
      llmDetailsId: result.promptUsed,
      success: result.exitCode === 0,
      tokensCost: result.cost,
      duration: result.duration,
      userRating: 4, // User feedback
    });
  };
}
```

❌ **WRONG:** Directly editing generated files

```typescript
// ❌ WRONG: Do NOT edit this
// webview-ui/src//redux/services/RatingService.tsx ← GENERATED, READ-ONLY
```

---

## Phase 3: Implement Swarm Orchestration (TODO)

### Create Production Services

Location: `src/services/swarm/`

```
src/services/swarm/
├── SupervisorAgent.ts         # Task routing + prompt selection
├── PSRSpecialistWorker.ts     # Code edit specialist
├── BrowserAutomationWorker.ts # UI testing specialist
├── CLITestRunnerWorker.ts     # Build/test specialist
├── WorkerHealthMonitor.ts     # Health metrics + auto-restart
└── PromptRatingAnalyzer.ts    # Weekly analysis → improvements
```

### SupervisorAgent.ts (Pseudocode)

```typescript
import { useGetLlmDetailsQuery } from "@thorapi/redux/services/LLMDetailsService";
import { useCreateRatingMutation } from "@thorapi/redux/services/RatingService";

class SupervisorAgent {
  async routeTask(task: Task) {
    // 1. Analyze task intent
    const intent = this.analyzeIntent(task.description);
    // "app-gen", "browser-work", "psr-edit", "cli-test"

    // 2. Query LLMDetails by tag
    const bestPrompt = await this.queryLlmDetailsByTag(intent);

    // 3. Select best-fit worker
    const worker = this.selectLeastLoadedWorker(intent);

    // 4. Broadcast prompt + route task
    await this.broadcastPromptSelection(bestPrompt);
    const result = await worker.executeTask(task);

    // 5. Store rating
    await this.createRating({
      taskId: task.id,
      llmDetailsId: bestPrompt.id,
      success: result.success,
      tokensCost: result.cost,
      duration: result.duration,
    });
  }
}
```

---

## Phase 4: Server-Side Generator Workflow (TODO)

### ValkyrAI Backend Endpoint

Location: `src/main/java/com/valkyr/thorapi/controller/GeneratorController.java`

```java
@RestController
@RequestMapping("/thorapi/generate")
public class GeneratorController {

  @PostMapping
  public ResponseEntity<GenerationJobResponse> submitGeneration(
      @RequestBody OpenApiGenerationRequest request) {
    // 1. Queue async job
    String jobId = generatorService.enqueueGenerationJob(request);

    // 2. Return job ID + ETA
    return ResponseEntity.accepted().body(new GenerationJobResponse(
      jobId,
      "QUEUED",
      300  // estimatedSeconds
    ));
  }

  @GetMapping("/{jobId}/status")
  public ResponseEntity<GenerationJobStatus> getStatus(@PathVariable String jobId) {
    return ResponseEntity.ok(generatorService.getStatus(jobId));
  }

  @GetMapping("/{jobId}/download")
  public ResponseEntity<Resource> downloadArtifact(@PathVariable String jobId) {
    File zip = generatorService.getArtifactZip(jobId);
    return ResponseEntity.ok()
      .header("Content-Disposition", "attachment; filename=\"" + jobId + ".zip\"")
      .body(new FileSystemResource(zip));
  }
}
```

### Frontend Usage

Location: `webview-ui/src/services/AppGeneratorService.ts` (production code, NOT generated)

```typescript
export async function generateApp(openApiSpec: string) {
  // 1. Submit to ValkyrAI backend
  const job = await thorapiGeneratorService.submitGeneration({
    openApiSpec,
    appName: "MyApp",
    appType: "FULL_STACK",
  });

  // 2. Poll for completion
  const pollInterval = setInterval(async () => {
    const status = await thorapiGeneratorService.getStatus(job.jobId);

    if (status.state === "COMPLETED") {
      clearInterval(pollInterval);

      // 3. Download artifact
      const artifact = await thorapiGeneratorService.downloadArtifact(
        job.jobId
      );

      // 4. Extract to /thorapi
      await fs.unzip(artifact, "/thorapi");

      // 5. Create Rating entry
      await createRating({
        taskId: job.jobId,
        llmDetailsId: "server-generator",
        success: true,
        tokensCost: status.tokensCost,
        duration: status.duration,
      });
    }
  }, 3000);
}
```

---

## Milestones Checklist

### ✅ Milestone 1: Prompt Optimization (COMPLETE)

- [x] Enhanced system.ts with §5.5
- [x] Documented ThorAPI services priority
- [x] Documented swarm coordination
- [x] Documented prompt improvement loop
- [x] Created PRD (VALOR_PRD_2025.md)

### ⏳ Milestone 2: Swarm Management (TODO)

- [ ] Create SupervisorAgent.ts
- [ ] Create WorkerAgent classes (PSR, Browser, CLI)
- [ ] Implement least-loaded worker selection
- [ ] Add health monitoring + auto-restart

### ⏳ Milestone 3: Tool Efficiency (TODO)

- [ ] Implement tool ranking engine
- [ ] Force PSR-first for TS/TSX
- [ ] Browser error capture + auto-fix
- [ ] MCP auto-installer

### ⏳ Milestone 4: App Generation Pipeline (TODO)

- [ ] Implement 6-stage workflow
- [ ] Add Rating model to ThorAPI spec
- [ ] Add LLMDetails model to ThorAPI spec
- [ ] Run Maven regeneration
- [ ] Server-side generator integration

### ⏳ Milestone 5: QA & Hardening (TODO)

- [ ] 100x scenario testing
- [ ] Security audit
- [ ] Cost analysis
- [ ] Release v1.0

---

## Key References

- **Main PRD:** [VALOR_PRD_2025.md](../.valoride/memorybank/VALOR_PRD_2025.md)
- **System Prompt:** [src/core/prompts/system.ts](../src/core/prompts/system.ts)
- **ThorAPI Catalog:** [thorapi-catalog.json](../.valoride/prompts/thorapi-catalog.json)
- **Swarm Rules:** [swarm-rules.json](../.valoride/prompts/swarm-rules.json)
- **.valoriderules:** [.valoriderules](../.valoriderules)

---

## Testing & Validation

Before proceeding to next milestone:

```bash
# Verify system prompt syntax
npm run lint src/core/prompts/system.ts

# Test that system prompt loads correctly
npm test src/core/prompts/system.test.ts

# Build & verify no errors
npm run compile

# Run existing tests to ensure no regression
npm test
```

---

**Next:** Review this guide, then execute Milestone 2 (Swarm Management & Orchestration).
