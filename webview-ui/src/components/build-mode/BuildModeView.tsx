import { useMemo, useState, type ReactNode } from "react";
import type {
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModePromptExecutionContext,
  ValorTaskBridgePayload,
} from "@shared/BuildMode";
import {
  createScheduledAutomationCommand,
  createWorkflowMcpCommand,
  deriveBuildModeAutonomousQueuePlan,
  getBuildModeCurrentConsecutiveCommandCount,
  getBuildModeCommandCatalog,
  getBuildModePromptExecutionContext,
  getNextBuildModeExecutionAction,
  formatEvidenceArtifactProof,
  renderBuildModeFinalReport,
} from "./valorTaskBridge";
import "./BuildModeView.css";

interface BuildModeViewProps {
  payload: ValorTaskBridgePayload;
  onClose?: () => void;
  onOpenArtifact?: (uri: string) => void;
  onOpenPreview?: (url: string) => void;
  onRunDueAutomations?: (
    commands: BuildModeCommand[],
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
  ) => void;
  onRunAutonomousQueue?: (
    commands: BuildModeCommand[],
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
    commandCatalog?: BuildModeCommand[],
  ) => void;
  onRunCommand?: (
    command: BuildModeCommand,
    approval?: BuildModeCommandApproval,
    providerRoute?: ValorTaskBridgePayload["selectedProviderRoute"],
    promptContext?: BuildModePromptExecutionContext,
    commandCatalog?: BuildModeCommand[],
  ) => void;
  onSetAutomationStatus?: (id: string, status: "paused" | "scheduled") => void;
}

const routeLabel: Record<
  ValorTaskBridgePayload["selectedProviderRoute"],
  string
> = {
  "bring-your-own-key": "Use my API key",
  "valkyr-credits": "Use Valkyr credits",
  "local-model": "Use local model",
  "enterprise-proxy": "Use enterprise proxy",
};

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="build-mode__panel" aria-label={title}>
    <h2>{title}</h2>
    {children}
  </section>
);

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="build-mode__stat">
    <span className="build-mode__label">{label}</span>
    <span className="build-mode__value">{value}</span>
  </div>
);

const List = ({ values }: { values: string[] }) => (
  <ul className="build-mode__list">
    {values.map((value) => (
      <li key={value}>{value}</li>
    ))}
  </ul>
);

const canOpenBuildModeArtifact = (uri: string): boolean =>
  uri.startsWith("valoride://build-mode/artifacts/");

export const BuildModeView = ({
  payload,
  onClose,
  onOpenArtifact,
  onOpenPreview,
  onRunAutonomousQueue,
  onRunDueAutomations,
  onSetAutomationStatus,
  onRunCommand,
}: BuildModeViewProps) => {
  const [providerRoute, setProviderRoute] = useState(
    payload.selectedProviderRoute,
  );
  const [promptProfileId, setPromptProfileId] = useState(
    payload.selectedPromptProfileId,
  );
  const finalReportMarkdown = useMemo(
    () => renderBuildModeFinalReport(payload),
    [payload],
  );
  const commandById = useMemo(
    () =>
      new Map(
        getBuildModeCommandCatalog(payload).map((command) => [
          command.id,
          command,
        ]),
      ),
    [payload],
  );
  const nextExecutionAction = useMemo(
    () => getNextBuildModeExecutionAction(payload),
    [payload],
  );
  const autonomousQueuePlan = useMemo(
    () => deriveBuildModeAutonomousQueuePlan(payload),
    [payload],
  );
  const currentConsecutiveCommands = useMemo(
    () => getBuildModeCurrentConsecutiveCommandCount(payload.commandReceipts),
    [payload.commandReceipts],
  );
  const canRunNextExecutionStep =
    payload.autonomyDecision.status === "continue";
  const canApproveNextExecutionStep =
    payload.autonomyDecision.status === "approval-required";
  const dispatchableAutonomousCommands =
    autonomousQueuePlan.dispatchableCommandIds
      .map((commandId) => commandById.get(commandId))
      .filter((command): command is BuildModeCommand => Boolean(command));
  const isNextExecutionCommand = (command: BuildModeCommand) =>
    nextExecutionAction?.command.id === command.id;
  const canRunCommandFromRunner = (command: BuildModeCommand) =>
    isNextExecutionCommand(command) && canRunNextExecutionStep;
  const canApproveCommandFromRunner = (command: BuildModeCommand) =>
    isNextExecutionCommand(command) && canApproveNextExecutionStep;
  const canUseGuardedCommandControl = (command: BuildModeCommand) =>
    canRunCommandFromRunner(command) || canApproveCommandFromRunner(command);
  const createApproval = (
    command: BuildModeCommand,
  ): BuildModeCommandApproval => {
    const permission = payload.toolPermissions.find(
      (item) => item.capabilityId === command.capabilityId,
    );
    return {
      approved: true,
      approverPrincipalId: payload.scope.principalId,
      approverRoles: payload.scope.roles,
      threshold: permission?.approvalThreshold ?? "operator",
      reason: `Approved in Build Mode for ${command.label}.`,
      createdAt: new Date().toISOString(),
    };
  };
  const runCommand = (
    command: BuildModeCommand,
    approval?: BuildModeCommandApproval,
  ) =>
    onRunCommand?.(
      command,
      approval,
      providerRoute,
      getBuildModePromptExecutionContext(payload, promptProfileId),
      Array.from(commandById.values()),
    );
  const runGuardedCommand = (command: BuildModeCommand) => {
    if (canApproveCommandFromRunner(command)) {
      runCommand(command, createApproval(command));
      return;
    }
    if (canRunCommandFromRunner(command)) {
      runCommand(command);
    }
  };
  const runAutonomousQueue = () => {
    if (!dispatchableAutonomousCommands.length) {
      return;
    }
    onRunAutonomousQueue?.(
      dispatchableAutonomousCommands,
      providerRoute,
      getBuildModePromptExecutionContext(payload, promptProfileId),
      Array.from(commandById.values()),
    );
  };

  const selectedPromptProfile =
    payload.promptProfiles.find((profile) => profile.id === promptProfileId) ??
    payload.promptProfiles[0];
  const selectedPromptBundle =
    payload.promptBundles.find(
      (bundle) => bundle.id === selectedPromptProfile?.promptBundleRef,
    ) ??
    payload.promptBundles.find(
      (bundle) => bundle.id === payload.selectedPromptBundleId,
    ) ??
    payload.promptBundles[0];

  return (
    <main className="build-mode" data-testid="build-mode-view">
      <header className="build-mode__header">
        <div>
          <h1 className="build-mode__title">
            Build Mode: {payload.appBundle.name}
          </h1>
          <p className="build-mode__primary-line">{payload.primaryLine}</p>
        </div>
        <div className="build-mode__meta">
          <span className="build-mode__chip">{payload.source}</span>
          <span className="build-mode__chip">{payload.taskId}</span>
          <span className="build-mode__chip">
            Context {payload.grayMatterContextPack.id}
          </span>
          {onClose && (
            <button
              className="build-mode__button"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="build-mode__body">
        <div className="build-mode__column">
          <Panel title="App Bundle Inspector">
            <div className="build-mode__grid">
              <Stat label="Bundle ID" value={payload.appBundle.id} />
              <Stat label="Version" value={payload.appBundle.version} />
              <Stat
                label="Product Line"
                value={payload.appBundle.productLine}
              />
              <Stat
                label="Source Session"
                value={payload.appBundle.sourceSessionId}
              />
            </div>
            <h3>Intent</h3>
            <p>{payload.appBundle.intent}</p>
            <h3>Artifacts</h3>
            <List
              values={payload.appBundle.artifacts.map(
                (artifact) => `${artifact.path} (${artifact.kind})`,
              )}
            />
          </Panel>

          <Panel title="Scope And RBAC">
            <div className="build-mode__grid">
              <Stat label="Tenant" value={payload.scope.tenantId} />
              <Stat label="Principal" value={payload.scope.principalId} />
              <Stat label="Workspace" value={payload.scope.workspaceRoot} />
              <Stat
                label="Project"
                value={payload.scope.projectId ?? "not set"}
              />
            </div>
            <h3>Roles</h3>
            <List values={payload.scope.roles} />
            <h3>Policy Refs</h3>
            <List values={payload.scope.policyRefs} />
          </Panel>

          <Panel title="Component Bundle Inspector">
            <div className="build-mode__cards">
              {payload.componentBundles.map((bundle) => (
                <article className="build-mode__item" key={bundle.id}>
                  <div className="build-mode__item-title">{bundle.name}</div>
                  <div className="build-mode__muted">
                    {bundle.framework} - {bundle.generatedBy} - {bundle.status}
                  </div>
                  <h3>Entrypoints</h3>
                  <List values={bundle.entrypoints} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="ExecModule Registry">
            <div className="build-mode__cards">
              {payload.execModules.map((module) => (
                <article className="build-mode__item" key={module.id}>
                  <div className="build-mode__item-title">{module.name}</div>
                  <div>{module.capability}</div>
                  <div className="build-mode__muted">
                    {module.version} - {module.safetyLevel}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="ThorAPI And VAIX">
            <div className="build-mode__cards">
              {payload.thorApiVaixBindings.map((binding) => (
                <article className="build-mode__item" key={binding.id}>
                  <div className="build-mode__item-title">
                    {binding.serviceName}
                  </div>
                  <div className="build-mode__muted">
                    {binding.surface} - {binding.policy}
                  </div>
                  <code>{binding.clientRef}</code>
                  <h3>Operations</h3>
                  <List values={binding.operationRefs} />
                  <h3>Generated</h3>
                  <List values={binding.generatedPaths} />
                  <h3>Editable Adapters</h3>
                  <List values={binding.editableAdapterPaths} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Capability Matrix">
            <div className="build-mode__cards">
              {payload.capabilities.map((capability) => (
                <article className="build-mode__item" key={capability.id}>
                  <div className="build-mode__item-title">
                    {capability.label}
                  </div>
                  <div className="build-mode__muted">
                    {capability.kind} - {capability.risk}
                    {capability.requiresApproval ? " - approval required" : ""}
                  </div>
                  <div>{capability.enabled ? "Enabled" : "Disabled"}</div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Guardrails">
            <div className="build-mode__cards">
              {payload.guardrails.map((guardrail) => (
                <article className="build-mode__item" key={guardrail.id}>
                  <div className="build-mode__item-title">
                    {guardrail.label}
                  </div>
                  <div className="build-mode__muted">
                    {guardrail.enforcement}
                  </div>
                  <div>{guardrail.summary}</div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Tool Permissions">
            <div className="build-mode__cards">
              {payload.toolPermissions.map((permission) => (
                <article className="build-mode__item" key={permission.id}>
                  <div className="build-mode__item-title">
                    {permission.label}
                  </div>
                  <div className="build-mode__muted">
                    {permission.capabilityId} - {permission.decision} -
                    threshold {permission.approvalThreshold}
                  </div>
                  <div>{permission.reason}</div>
                  <div className="build-mode__muted">
                    receipts{" "}
                    {permission.receiptRequired ? "required" : "optional"}
                  </div>
                  <List values={permission.scopeRefs} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Autonomy Policy">
            <p>{payload.autonomyPolicy.label}</p>
            <div className="build-mode__grid">
              <Stat label="Mode" value={payload.autonomyPolicy.mode} />
              <Stat
                label="Command Cap"
                value={payload.autonomyPolicy.maxConsecutiveCommands}
              />
              <Stat label="Current Chain" value={currentConsecutiveCommands} />
              <Stat
                label="Credit Cap"
                value={payload.autonomyPolicy.maxEstimatedCredits}
              />
              <Stat
                label="Estimated Credits"
                value={payload.creditEstimate.estimatedCredits}
              />
              <Stat
                label="Receipts"
                value={
                  payload.autonomyPolicy.receiptRequired
                    ? "required"
                    : "optional"
                }
              />
            </div>
            <h3>Autonomy Decision</h3>
            <div className="build-mode__item">
              <div className="build-mode__item-title">
                {payload.autonomyDecision.status}
              </div>
              <div>{payload.autonomyDecision.summary}</div>
              <div className="build-mode__muted">
                {payload.autonomyDecision.nextCommandId ?? "no next command"} -{" "}
                {payload.autonomyDecision.capabilityId ?? "no capability"}
              </div>
            </div>
            <h3>Decision Reasons</h3>
            <List values={payload.autonomyDecision.reasonCodes} />
            <h3>Autonomous Queue Plan</h3>
            <div className="build-mode__item">
              <div className="build-mode__item-title">
                {autonomousQueuePlan.status}
              </div>
              <div>{autonomousQueuePlan.summary}</div>
              <div className="build-mode__muted">
                dispatchable{" "}
                {autonomousQueuePlan.dispatchableCommandIds.join(", ") ||
                  "none"}{" "}
                - approval{" "}
                {autonomousQueuePlan.approvalCommandIds.join(", ") || "none"}
              </div>
              <div className="build-mode__muted">
                blocked{" "}
                {autonomousQueuePlan.blockedCommandIds.join(", ") || "none"} -
                receipt {autonomousQueuePlan.receiptRequired ? "yes" : "no"}
              </div>
              <div className="build-mode__actions">
                <button
                  aria-label="Run Autonomous Queue"
                  className="build-mode__button"
                  disabled={!dispatchableAutonomousCommands.length}
                  onClick={runAutonomousQueue}
                  type="button"
                >
                  Run Queue
                </button>
              </div>
            </div>
            <h3>Allowed Capabilities</h3>
            <List values={payload.autonomyPolicy.allowedCapabilityIds} />
            <h3>Approval Required</h3>
            <List
              values={payload.autonomyPolicy.approvalRequiredCapabilityIds}
            />
            <h3>Stop Conditions</h3>
            <List values={payload.autonomyPolicy.stopConditions} />
            <h3>Escalation</h3>
            <List values={payload.autonomyPolicy.escalationRefs} />
          </Panel>

          <Panel title="Command Policy">
            <div className="build-mode__cards">
              {payload.commandPolicyRules.map((rule) => (
                <article className="build-mode__item" key={rule.id}>
                  <div className="build-mode__item-title">{rule.label}</div>
                  <div className="build-mode__muted">
                    {rule.effect} - {rule.enabled ? "enabled" : "disabled"}
                  </div>
                  <div>{rule.reason}</div>
                  <code>{rule.pattern}</code>
                  {rule.commandKinds?.length ? (
                    <List values={rule.commandKinds} />
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Checkpoints And Rollback">
            <div className="build-mode__cards">
              {payload.checkpoints.map((checkpoint) => {
                const createCommand = checkpoint.commandId
                  ? commandById.get(checkpoint.commandId)
                  : undefined;
                const rollbackCommand = checkpoint.rollbackCommandId
                  ? commandById.get(checkpoint.rollbackCommandId)
                  : undefined;

                return (
                  <article className="build-mode__item" key={checkpoint.id}>
                    <div className="build-mode__item-title">
                      {checkpoint.label}
                    </div>
                    <div>{checkpoint.summary}</div>
                    <div className="build-mode__muted">
                      {checkpoint.status}
                      {checkpoint.hash ? ` - ${checkpoint.hash}` : ""}
                    </div>
                    <List values={checkpoint.receiptIds} />
                    <div className="build-mode__actions">
                      {createCommand ? (
                        <button
                          aria-label={`Run ${createCommand.label}`}
                          className="build-mode__button"
                          onClick={() => runCommand(createCommand)}
                          type="button"
                        >
                          Create
                        </button>
                      ) : null}
                      {rollbackCommand ? (
                        <button
                          aria-label={`Rollback ${checkpoint.label}`}
                          className="build-mode__button build-mode__button--danger"
                          onClick={() => runCommand(rollbackCommand)}
                          type="button"
                        >
                          Rollback
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Safe Edits">
            <div className="build-mode__cards">
              {payload.safeEditPlans.map((plan) => {
                const editCommand = commandById.get(plan.commandId);

                return (
                  <article className="build-mode__item" key={plan.id}>
                    <div className="build-mode__item-title">{plan.label}</div>
                    <div>{plan.summary}</div>
                    <div className="build-mode__muted">
                      {plan.tool} - {plan.status}
                    </div>
                    <h3>Targets</h3>
                    <List values={plan.targetPaths} />
                    <h3>Protected</h3>
                    <List values={plan.protectedPaths} />
                    {plan.receiptIds.length ? (
                      <>
                        <h3>Receipts</h3>
                        <List values={plan.receiptIds} />
                      </>
                    ) : null}
                    {editCommand ? (
                      <div className="build-mode__actions">
                        <button
                          aria-label={`Apply ${plan.label}`}
                          className="build-mode__button"
                          disabled={!canUseGuardedCommandControl(editCommand)}
                          onClick={() => runGuardedCommand(editCommand)}
                          type="button"
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="build-mode__column">
          <Panel title="Agent Loop">
            <div className="build-mode__cards">
              {payload.agentLoop.map((phase) => (
                <article className="build-mode__item" key={phase.id}>
                  <div className="build-mode__item-title">{phase.label}</div>
                  <div className="build-mode__muted">{phase.status}</div>
                  <h3>Capabilities</h3>
                  <List values={phase.capabilityIds} />
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Readiness Gates">
            <div className="build-mode__cards">
              {payload.readinessGates.map((gate) => (
                <article className="build-mode__item" key={gate.id}>
                  <div className="build-mode__item-title">{gate.label}</div>
                  <div>{gate.summary}</div>
                  <div className="build-mode__muted">
                    {gate.status}
                    {gate.blocksRun ? " - blocks run" : ""}
                  </div>
                  <h3>Capabilities</h3>
                  <List values={gate.requiredCapabilityIds} />
                  {gate.requiredReceiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={gate.requiredReceiptIds} />
                    </>
                  ) : null}
                  {gate.evidenceArtifactIds.length ? (
                    <>
                      <h3>Evidence</h3>
                      <List values={gate.evidenceArtifactIds} />
                    </>
                  ) : null}
                  {gate.commandIds.length ? (
                    <>
                      <h3>Commands</h3>
                      <List values={gate.commandIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Execution Plan">
            {nextExecutionAction ? (
              <article className="build-mode__item build-mode__command">
                <div>
                  <div className="build-mode__item-title">
                    Next: {nextExecutionAction.step.label}
                  </div>
                  <code>{nextExecutionAction.command.command}</code>
                  <div className="build-mode__muted">
                    {nextExecutionAction.command.capabilityId} -{" "}
                    {nextExecutionAction.command.status}
                  </div>
                  {nextExecutionAction.command.assignedSwarmRole ? (
                    <div className="build-mode__muted">
                      role {nextExecutionAction.command.assignedSwarmRole} -{" "}
                      {nextExecutionAction.command.assignedRuntimeId}
                    </div>
                  ) : null}
                </div>
                <div className="build-mode__actions">
                  <button
                    aria-label="Run Next Execution Step"
                    className="build-mode__button"
                    disabled={!canRunNextExecutionStep}
                    onClick={() => runCommand(nextExecutionAction.command)}
                    type="button"
                  >
                    Run Next
                  </button>
                  {nextExecutionAction.command.requiresApproval ||
                  nextExecutionAction.command.status === "approval-required" ? (
                    <button
                      aria-label="Approve Next Execution Step"
                      className="build-mode__button"
                      disabled={!canApproveNextExecutionStep}
                      onClick={() =>
                        runCommand(
                          nextExecutionAction.command,
                          createApproval(nextExecutionAction.command),
                        )
                      }
                      type="button"
                    >
                      Approve & Run Next
                    </button>
                  ) : null}
                </div>
              </article>
            ) : null}
            <div className="build-mode__cards">
              {payload.executionPlan.map((step) => (
                <article className="build-mode__item" key={step.id}>
                  <div className="build-mode__item-title">{step.label}</div>
                  <div>{step.summary}</div>
                  <div className="build-mode__muted">
                    {step.status} - {step.runtimeId}
                  </div>
                  <div>{step.nextAction}</div>
                  {step.dependencyStepIds.length ? (
                    <>
                      <h3>Dependencies</h3>
                      <List values={step.dependencyStepIds} />
                    </>
                  ) : null}
                  {step.commandIds.length ? (
                    <>
                      <h3>Commands</h3>
                      <List values={step.commandIds} />
                    </>
                  ) : null}
                  {step.readinessGateIds.length ? (
                    <>
                      <h3>Gates</h3>
                      <List values={step.readinessGateIds} />
                    </>
                  ) : null}
                  {step.receiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={step.receiptIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Agent Runtime Lanes">
            <div className="build-mode__cards">
              {payload.agentRuntimes.map((runtime) => (
                <article className="build-mode__item" key={runtime.id}>
                  <div className="build-mode__item-title">{runtime.label}</div>
                  <div className="build-mode__muted">
                    {runtime.runtime} - {runtime.status} -{" "}
                    {runtime.handoffPolicy}
                  </div>
                  <div>{runtime.ownerRole}</div>
                  <div className="build-mode__muted">
                    {runtime.promptProfileId} - {runtime.providerRoute}
                  </div>
                  <h3>Loop Phases</h3>
                  <List values={runtime.loopPhaseIds} />
                  {runtime.receiptIds.length ? (
                    <>
                      <h3>Receipts</h3>
                      <List values={runtime.receiptIds} />
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Swarm Roles">
            <div className="build-mode__cards">
              {payload.swarmRoles.map((assignment) => (
                <article className="build-mode__item" key={assignment.role}>
                  <div className="build-mode__item-title">
                    {assignment.role}
                  </div>
                  <div className="build-mode__muted">
                    {assignment.status} - {assignment.owner}
                  </div>
                  <div>{assignment.currentFocus}</div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="GrayMatter Context Pack">
            <div className="build-mode__grid">
              <Stat
                label="Context Pack ID"
                value={payload.grayMatterContextPack.id}
              />
              <Stat
                label="Policy"
                value={payload.grayMatterContextPack.policy}
              />
              <Stat
                label="Answer Policy"
                value={payload.grayMatterContextPack.answerPolicy}
              />
              <Stat
                label="Retrieval Status"
                value={payload.grayMatterContextPack.retrievalStatus}
              />
              <Stat
                label="Invariant Preflight"
                value={payload.grayMatterContextPack.invariantPreflightStatus}
              />
              <Stat
                label="Compiled"
                value={payload.grayMatterContextPack.compiledAt}
              />
              <Stat
                label="Trace"
                value={payload.grayMatterContextPack.retrievalTraceId ?? "none"}
              />
              <Stat
                label="Preflight Receipt"
                value={
                  payload.grayMatterContextPack.preflightReceiptId ?? "none"
                }
              />
            </div>
            <p>{payload.grayMatterContextPack.summary}</p>
            <h3>Receipt IDs</h3>
            <List values={payload.grayMatterContextPack.retrievalReceiptIds} />
            <h3>Memory Entries</h3>
            <List values={payload.grayMatterContextPack.memoryEntryIds} />
            {payload.grayMatterContextPack.sourceRefs.length ? (
              <>
                <h3>Source Refs</h3>
                <List values={payload.grayMatterContextPack.sourceRefs} />
              </>
            ) : null}
            {payload.grayMatterContextPack.majorTaskRefs.length ? (
              <>
                <h3>Major Task Refs</h3>
                <List values={payload.grayMatterContextPack.majorTaskRefs} />
              </>
            ) : null}
          </Panel>

          <Panel title="Receipt Trail">
            <div className="build-mode__cards">
              {payload.receipts.map((receipt) => (
                <article className="build-mode__item" key={receipt.id}>
                  <div className="build-mode__item-title">{receipt.id}</div>
                  <div>{receipt.title}</div>
                  <div className="build-mode__muted">
                    {receipt.kind} - {receipt.status} - {receipt.actor}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Credits And Provider Route">
            <div className="build-mode__grid">
              <Stat
                label="Estimated Credits"
                value={`${payload.creditEstimate.estimatedCredits} ${payload.creditEstimate.currency}`}
              />
              <Stat
                label="Hosted Infrastructure"
                value={`${payload.creditEstimate.estimatedHostedInfrastructureCredits} credits`}
              />
              <Stat
                label="Actual Usage"
                value={`${payload.creditUsageReceipts.reduce((sum, receipt) => sum + receipt.actualCredits, 0)} credits`}
              />
            </div>
            <h3>Provider Route</h3>
            <select
              aria-label="Provider route"
              className="build-mode__select"
              value={providerRoute}
              onChange={(event) =>
                setProviderRoute(
                  event.target
                    .value as ValorTaskBridgePayload["selectedProviderRoute"],
                )
              }
            >
              {payload.providerCredentials.map((credential) => (
                <option key={credential.id} value={credential.route}>
                  {routeLabel[credential.route]} - {credential.displayName}
                </option>
              ))}
            </select>
            <h3>Usage Ledger</h3>
            <List
              values={payload.creditUsageReceipts.map(
                (receipt) =>
                  `${receipt.commandId} (${receipt.capabilityId}, ${receipt.providerRoute}, ${receipt.commandStatus}): ${receipt.actualCredits} credits`,
              )}
            />
            <h3>Credential References</h3>
            <List
              values={payload.providerCredentials.map(
                (credential) =>
                  `${credential.id} (${credential.tenantScoped ? "tenant scoped" : "local"})`,
              )}
            />
          </Panel>

          <Panel title="Prompt Profile">
            <select
              aria-label="Prompt profile"
              className="build-mode__select"
              value={promptProfileId}
              onChange={(event) => setPromptProfileId(event.target.value)}
            >
              {payload.promptProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            {selectedPromptProfile && (
              <p>
                {selectedPromptProfile.description} (
                {selectedPromptProfile.promptBundleRef})
              </p>
            )}
          </Panel>

          <Panel title="Prompt Bundle">
            {selectedPromptBundle ? (
              <>
                <div className="build-mode__grid">
                  <Stat label="Bundle" value={selectedPromptBundle.name} />
                  <Stat label="Version" value={selectedPromptBundle.version} />
                  <Stat label="Source" value={selectedPromptBundle.source} />
                  <Stat label="Policy" value={selectedPromptBundle.policy} />
                </div>
                <h3>Receipts</h3>
                <List values={selectedPromptBundle.receiptIds} />
                <h3>Sections</h3>
                <div className="build-mode__cards">
                  {selectedPromptBundle.sections.map((section) => (
                    <article className="build-mode__item" key={section.id}>
                      <div className="build-mode__item-title">
                        {section.title}
                      </div>
                      <div>{section.purpose}</div>
                      <div className="build-mode__muted">
                        {section.sourceRef}
                      </div>
                      {section.checksum ? (
                        <code>{section.checksum}</code>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p>No prompt bundle loaded.</p>
            )}
          </Panel>

          <Panel title="MCP Server And Workflow Tools">
            <div className="build-mode__cards">
              {payload.workflowMcpBindings.map((binding) => {
                const generatedCommand = createWorkflowMcpCommand(binding);
                const command =
                  commandById.get(generatedCommand.id) ?? generatedCommand;

                return (
                  <article className="build-mode__item" key={binding.id}>
                    <div className="build-mode__item-title">
                      {binding.toolName}
                    </div>
                    <div>{binding.serverName}</div>
                    <div className="build-mode__muted">
                      {binding.workflowRef} -{" "}
                      {binding.approvalRequired ? "approval required" : "auto"}
                    </div>
                    {command.assignedSwarmRole ? (
                      <div className="build-mode__muted">
                        role: {command.assignedSwarmRole} -{" "}
                        {command.assignedRuntimeId}
                      </div>
                    ) : null}
                    <button
                      aria-label={`Run ${binding.toolName}`}
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Run Tool
                    </button>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Scheduled Automations">
            <button
              aria-label="Refresh scheduled automations"
              className="build-mode__button"
              onClick={() =>
                onRunDueAutomations?.(
                  Array.from(commandById.values()),
                  providerRoute,
                  getBuildModePromptExecutionContext(payload, promptProfileId),
                )
              }
              type="button"
            >
              Refresh
            </button>
            <div className="build-mode__cards">
              {payload.scheduledAutomations.map((automation) => {
                const generatedCommand =
                  createScheduledAutomationCommand(automation);
                const command =
                  commandById.get(generatedCommand.id) ?? generatedCommand;

                return (
                  <article className="build-mode__item" key={automation.id}>
                    <div className="build-mode__item-title">
                      {automation.label}
                    </div>
                    <div>{automation.workflowRef}</div>
                    <div className="build-mode__muted">
                      {automation.schedule} - {automation.status}
                      {automation.approvalRequired
                        ? " - approval required"
                        : ""}
                    </div>
                    <div className="build-mode__muted">
                      scheduler: {automation.scheduler ?? "valkyrai-cron"}
                      {automation.valkyraiWorkflowId
                        ? ` - ${automation.valkyraiWorkflowId}`
                        : ""}
                    </div>
                    {command.assignedSwarmRole ? (
                      <div className="build-mode__muted">
                        role: {command.assignedSwarmRole} -{" "}
                        {command.assignedRuntimeId}
                      </div>
                    ) : null}
                    {automation.providerRoute ? (
                      <div className="build-mode__muted">
                        provider: {automation.providerRoute}
                      </div>
                    ) : null}
                    {automation.promptContext ? (
                      <div className="build-mode__muted">
                        prompt: {automation.promptContext.promptProfileName} -{" "}
                        {automation.promptContext.promptBundleId}@
                        {automation.promptContext.promptBundleVersion}
                      </div>
                    ) : null}
                    {automation.nextRunAt && (
                      <div className="build-mode__muted">
                        next run: {automation.nextRunAt}
                      </div>
                    )}
                    {automation.lastRunAt && (
                      <div className="build-mode__muted">
                        last run: {automation.lastRunStatus ?? "unknown"} at{" "}
                        {automation.lastRunAt}
                      </div>
                    )}
                    {automation.lastRunReceiptId && (
                      <code>{automation.lastRunReceiptId}</code>
                    )}
                    {automation.runHistory?.length ? (
                      <>
                        <h3>Recent Runs</h3>
                        <List
                          values={automation.runHistory
                            .slice(0, 3)
                            .map(
                              (run) =>
                                `${run.status} at ${run.completedAt} (${run.receiptId})${run.error ? ` - ${run.error}` : ""}`,
                            )}
                        />
                      </>
                    ) : null}
                    {automation.status === "scheduled" ? (
                      <button
                        aria-label={`Pause ${automation.label}`}
                        className="build-mode__button"
                        onClick={() =>
                          onSetAutomationStatus?.(automation.id, "paused")
                        }
                        type="button"
                      >
                        Pause
                      </button>
                    ) : null}
                    {automation.status === "paused" ? (
                      <button
                        aria-label={`Resume ${automation.label}`}
                        className="build-mode__button"
                        onClick={() =>
                          onSetAutomationStatus?.(automation.id, "scheduled")
                        }
                        type="button"
                      >
                        Resume
                      </button>
                    ) : null}
                    <button
                      aria-label={`Schedule ${automation.label}`}
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Schedule
                    </button>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Command Runner">
            <div className="build-mode__cards">
              {payload.commands.map((payloadCommand) => {
                const command =
                  commandById.get(payloadCommand.id) ?? payloadCommand;
                return (
                  <article
                    className="build-mode__item build-mode__command"
                    key={command.id}
                  >
                    <div>
                      <div className="build-mode__item-title">
                        {command.label}
                      </div>
                      <code>{command.command}</code>
                      <div className="build-mode__muted">
                        {command.kind}
                        {command.requiresApproval ? " - approval required" : ""}
                      </div>
                      <div className="build-mode__muted">
                        {command.capabilityId} - {command.status}
                      </div>
                      {command.assignedSwarmRole ? (
                        <div className="build-mode__muted">
                          role: {command.assignedSwarmRole} -{" "}
                          {command.assignedRuntimeId}
                        </div>
                      ) : null}
                    </div>
                    <div className="build-mode__actions">
                      <button
                        aria-label={`Run ${command.label}`}
                        className="build-mode__button"
                        disabled={!canRunCommandFromRunner(command)}
                        onClick={() => runCommand(command)}
                        type="button"
                      >
                        Run
                      </button>
                      {command.requiresApproval ||
                      command.status === "approval-required" ? (
                        <button
                          aria-label={`Approve ${command.label}`}
                          className="build-mode__button"
                          disabled={!canApproveCommandFromRunner(command)}
                          onClick={() =>
                            runCommand(command, createApproval(command))
                          }
                          type="button"
                        >
                          Approve & Run
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Command Receipts">
            <div className="build-mode__cards">
              {payload.commandReceipts.map((receipt) => (
                <article className="build-mode__item" key={receipt.id}>
                  <div className="build-mode__item-title">{receipt.id}</div>
                  <div>{receipt.summary}</div>
                  <div className="build-mode__muted">
                    {receipt.capabilityId} - {receipt.status}
                    {receipt.requiresApproval ? " - approval required" : ""}
                  </div>
                  <div className="build-mode__muted">
                    {receipt.executionMode ?? "legacy-receipt"} - next:{" "}
                    {receipt.nextOperatorAction ?? "inspect"}
                  </div>
                  {receipt.assignedSwarmRole ? (
                    <div className="build-mode__muted">
                      Role {receipt.assignedSwarmRole} -{" "}
                      {receipt.assignedRuntimeId}
                    </div>
                  ) : null}
                  {receipt.promptContext ? (
                    <div className="build-mode__muted">
                      Prompt {receipt.promptContext.promptProfileName} -{" "}
                      {receipt.promptContext.promptBundleId}@
                      {receipt.promptContext.promptBundleVersion}
                    </div>
                  ) : null}
                  {receipt.grayMatterContextProof ? (
                    <div className="build-mode__muted">
                      Context {receipt.grayMatterContextProof.contextPackId} -{" "}
                      {receipt.grayMatterContextProof.retrievalStatus} -{" "}
                      {receipt.grayMatterContextProof.invariantPreflightStatus}
                    </div>
                  ) : null}
                  {receipt.operatorActionSummary ? (
                    <div>{receipt.operatorActionSummary}</div>
                  ) : null}
                  {receipt.artifacts?.length ? (
                    <List
                      values={receipt.artifacts.map(
                        (artifact) => `${artifact.title} (${artifact.kind})`,
                      )}
                    />
                  ) : null}
                  {receipt.policyReasons?.length ? (
                    <ul className="build-mode__policy-list">
                      {receipt.policyReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  {receipt.approval ? (
                    <div className="build-mode__muted">
                      approved by {receipt.approval.approverPrincipalId} at{" "}
                      {receipt.approval.threshold}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Browser Verification">
            <div className="build-mode__grid">
              <Stat label="Status" value={payload.browserVerification.status} />
              <Stat
                label="Console Errors"
                value={payload.browserVerification.consoleErrorCount}
              />
              <Stat
                label="Preview"
                value={payload.browserVerification.previewUrl ?? "Not ready"}
              />
              <Stat
                label="Artifacts"
                value={payload.browserVerification.artifactIds.length}
              />
            </div>
            {payload.browserVerification.previewUrl && (
              <div className="build-mode__actions">
                <button
                  className="build-mode__button"
                  onClick={() =>
                    onOpenPreview?.(payload.browserVerification.previewUrl!)
                  }
                  type="button"
                >
                  Open Preview
                </button>
                {Array.from(commandById.values())
                  .filter((command) => command.kind === "verify")
                  .map((command) => (
                    <button
                      className="build-mode__button"
                      disabled={!canUseGuardedCommandControl(command)}
                      key={command.id}
                      onClick={() => runGuardedCommand(command)}
                      type="button"
                    >
                      Run Verification
                    </button>
                  ))}
              </div>
            )}
          </Panel>

          <Panel title="Evidence Artifacts">
            <div className="build-mode__cards">
              {payload.evidenceArtifacts.map((artifact) => {
                const proof = formatEvidenceArtifactProof(artifact);
                return (
                  <article className="build-mode__item" key={artifact.id}>
                    <div className="build-mode__item-title">
                      {artifact.title}
                    </div>
                    <div className="build-mode__muted">
                      {artifact.kind} - {artifact.createdAt}
                    </div>
                    <code>{artifact.uri}</code>
                    {artifact.summary ? <div>{artifact.summary}</div> : null}
                    {proof ? (
                      <div className="build-mode__muted">{proof}</div>
                    ) : null}
                    {canOpenBuildModeArtifact(artifact.uri) ? (
                      <button
                        className="build-mode__button"
                        onClick={() => onOpenArtifact?.(artifact.uri)}
                        type="button"
                      >
                        Open Artifact
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="App Bundle Diff">
            {payload.appBundleDiffs.map((diff) => (
              <article className="build-mode__item" key={diff.id}>
                <div className="build-mode__item-title">{diff.title}</div>
                <h3>Added</h3>
                <List values={diff.addedArtifacts} />
                <h3>Changed</h3>
                <List values={diff.changedArtifacts} />
                <h3>Removed</h3>
                <List values={diff.removedArtifacts} />
              </article>
            ))}
          </Panel>

          <Panel title="Final Report">
            <pre className="build-mode__code">{finalReportMarkdown}</pre>
          </Panel>
        </div>
      </div>
    </main>
  );
};

export default BuildModeView;
